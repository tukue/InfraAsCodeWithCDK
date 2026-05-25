import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface ApiLambdaDynamoServiceProps {
  readonly serviceName: string;
  readonly stageName: string;
  readonly catalogEntityRef: string;
  readonly recommendedPathTemplateName: string;
  readonly recommendedPathTemplatePath: string;
  readonly handlerEntry?: string;
  readonly itemsByCreatedAtIndexName?: string;
  readonly vpc?: ec2.IVpc;
  readonly encryptionKey?: kms.IKey;
  readonly environment?: Record<string, string>;
  readonly cors?: {
    readonly allowOrigins: string[];
    readonly allowMethods?: string[];
    readonly allowHeaders?: string[];
    readonly maxAge?: cdk.Duration;
  };
  readonly alarms?: {
    readonly enableP95LatencyAlarm?: boolean;
  };
  readonly overrides?: {
    readonly lambda?: Partial<ApiLambdaDynamoServiceLambdaOverrides>;
    readonly apiGateway?: Partial<apigateway.StageOptions>;
    readonly table?: Partial<dynamodb.TableProps>;
  };
}

export interface ApiLambdaDynamoServiceLambdaOverrides {
  readonly memorySize: number;
  readonly reservedConcurrentExecutions: number;
  readonly timeout: cdk.Duration;
  readonly runtime: lambda.Runtime;
}

export class ApiLambdaDynamoService extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly backend: NodejsFunction;
  public readonly table: dynamodb.Table;
  public readonly apiAccessLogs: logs.LogGroup;
  public readonly lambdaApplicationLogs: logs.LogGroup;
  public readonly retryQueue: sqs.Queue;
  public readonly encryptionKey: kms.IKey;
  public readonly itemsByCreatedAtIndexName: string;

  constructor(scope: Construct, id: string, props: ApiLambdaDynamoServiceProps) {
    super(scope, id);

    validateProps(props);

    this.itemsByCreatedAtIndexName = props.itemsByCreatedAtIndexName ?? 'ItemsByCreatedAtIndex';
    this.encryptionKey =
      props.encryptionKey ??
      new kms.Key(this, 'ServiceDataKey', {
        enableKeyRotation: true,
        description: `CMK for ${props.serviceName} data, Lambda environment, and API access logs`,
        removalPolicy: RemovalPolicy.RETAIN,
      });

    const vpc =
      props.vpc ??
      new ec2.Vpc(this, 'ServiceVpc', {
        maxAzs: 2,
        natGateways: 1,
        restrictDefaultSecurityGroup: true,
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'public',
            subnetType: ec2.SubnetType.PUBLIC,
          },
          {
            cidrMask: 24,
            name: 'private',
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },
        ],
      });

    this.table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: `${props.serviceName}-${props.stageName}`,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.encryptionKey,
      ...props.overrides?.table,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: this.itemsByCreatedAtIndexName,
      partitionKey: {
        name: 'entityType',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.retryQueue = new sqs.Queue(this, 'RetryQueue', {
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: this.encryptionKey,
      retentionPeriod: cdk.Duration.days(14),
    });

    this.backend = new NodejsFunction(this, 'Function', {
      entry: props.handlerEntry ?? path.join(__dirname, '../../../../lib/function.ts'),
      handler: 'handler',
      runtime: props.overrides?.lambda?.runtime ?? lambda.Runtime.NODEJS_18_X,
      environment: {
        APP_LOG_LEVEL: 'INFO',
        CATALOG_ENTITY_REF: props.catalogEntityRef,
        DYNAMODB: this.table.tableName,
        ITEMS_BY_CREATED_AT_INDEX: this.itemsByCreatedAtIndexName,
        NODE_OPTIONS: '--enable-source-maps',
        RECOMMENDED_PATH_CATALOG_PATH: 'catalog-info.yaml',
        RECOMMENDED_PATH_TEMPLATE_NAME: props.recommendedPathTemplateName,
        RECOMMENDED_PATH_TEMPLATE_PATH: props.recommendedPathTemplatePath,
        SERVICE_NAME: props.serviceName,
        STAGE: props.stageName,
        ...props.environment,
      },
      environmentEncryption: this.encryptionKey,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
        target: 'node18',
      },
      memorySize: props.overrides?.lambda?.memorySize ?? 1024,
      timeout: props.overrides?.lambda?.timeout ?? cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueue: this.retryQueue,
      reservedConcurrentExecutions: props.overrides?.lambda?.reservedConcurrentExecutions ?? 10,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    this.table.grantReadWriteData(this.backend);

    this.apiAccessLogs = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      encryptionKey: this.encryptionKey,
      retention: logs.RetentionDays.TWO_YEARS,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.lambdaApplicationLogs = new logs.LogGroup(this, 'LambdaApplicationLogs', {
      logGroupName: `/aws/lambda/${this.backend.functionName}`,
      encryptionKey: this.encryptionKey,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.api = new apigateway.RestApi(this, 'RestAPI', {
      restApiName: `${props.serviceName}-${props.stageName}`,
      description: `${props.serviceName} API with Lambda and DynamoDB`,
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM,
      },
      defaultCorsPreflightOptions: props.cors
        ? {
            allowOrigins: props.cors.allowOrigins,
            allowMethods: props.cors.allowMethods ?? apigateway.Cors.ALL_METHODS,
            allowHeaders: props.cors.allowHeaders ?? [
              'Content-Type',
              'X-Amz-Date',
              'Authorization',
              'X-Api-Key',
              'X-Amz-Security-Token',
            ],
            maxAge: props.cors.maxAge ?? cdk.Duration.days(1),
          }
        : undefined,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(this.apiAccessLogs),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5',
        cachingEnabled: true,
        ...props.overrides?.apiGateway,
      },
    });

    const integration = new apigateway.LambdaIntegration(this.backend);
    this.api.root.addMethod('GET', integration);

    const health = this.api.root.addResource('health');
    health.addMethod('GET', integration);

    const items = this.api.root.addResource('items');
    items.addMethod('GET', integration);
    items.addMethod('POST', integration);

    const platform = this.api.root.addResource('platform');
    platform.addMethod('GET', integration);

    const recommendedPath = platform.addResource('recommended-path');
    recommendedPath.addMethod('GET', integration);
  }
}

function validateProps(props: ApiLambdaDynamoServiceProps): void {
  if (!props.serviceName.trim()) {
    throw new Error('ApiLambdaDynamoService serviceName must be a non-empty string.');
  }

  if (!/^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(props.serviceName)) {
    throw new Error(
      'ApiLambdaDynamoService serviceName must be 3-40 characters and use lowercase letters, numbers, and hyphens.',
    );
  }

  if (!props.stageName.trim()) {
    throw new Error('ApiLambdaDynamoService stageName must be a non-empty string.');
  }

  if (!props.catalogEntityRef.trim()) {
    throw new Error('ApiLambdaDynamoService catalogEntityRef must be a non-empty string.');
  }

  if (!props.recommendedPathTemplateName.trim()) {
    throw new Error('ApiLambdaDynamoService recommendedPathTemplateName must be a non-empty string.');
  }

  if (!props.recommendedPathTemplatePath.trim()) {
    throw new Error('ApiLambdaDynamoService recommendedPathTemplatePath must be a non-empty string.');
  }

  if (props.cors?.allowOrigins.some((origin) => origin === '*')) {
    throw new Error('ApiLambdaDynamoService cors.allowOrigins must not include wildcard origins.');
  }
}
