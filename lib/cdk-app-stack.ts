import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as gateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as logs from 'aws-cdk-lib/aws-logs';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const encryptionKey = new kms.Key(this, 'PlatformDataKey', {
      enableKeyRotation: true,
      description: 'CMK for DynamoDB, Lambda environment, and API access logs',
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const appVpc = new ec2.Vpc(this, 'AppVpc', {
      maxAzs: 2,
      natGateways: 1,
      restrictDefaultSecurityGroup: false,
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

    //  DynamoDB Table Definition
    const dynamodb_table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      // Table will be deleted when stack is destroyed
      removalPolicy: RemovalPolicy.DESTROY,
      // Optional: Enable point-in-time recovery
      pointInTimeRecovery: true,
      // Optional: Set billing mode
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // Optional: Set table name explicitly
      tableName: 'DemoTable',
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
    });

    const lambdaDlq = new sqs.Queue(this, 'LambdaDlq', {
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
      retentionPeriod: cdk.Duration.days(14),
    });

    //  Lambda Function Definition
    const lambda_backend = new NodejsFunction(this, 'function', {
      // Path to your Lambda function code
      entry: path.join(__dirname, 'function.ts'),
      // Name of the exported handler function
      handler: 'handler',
      // Runtime version
      runtime: lambda.Runtime.NODEJS_18_X,
      // Environment variables available to function
      environment: {
        DYNAMODB: dynamodb_table.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      environmentEncryption: encryptionKey,
      // Bundling options for esbuild
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
        target: 'node18',
      },
      // Optional: Configure memory and timeout
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      // Optional: Enable tracing
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueueEnabled: true,
      deadLetterQueue: lambdaDlq,
      reservedConcurrentExecutions: 10,
      vpc: appVpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    //  Grant DynamoDB Permissions to Lambda
    dynamodb_table.grantReadWriteData(lambda_backend.role!);

    const apiAccessLogs = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      encryptionKey,
      retention: logs.RetentionDays.TWO_YEARS,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // 4. API Gateway Definition
    const api = new gateway.RestApi(this, 'RestAPI', {
      restApiName: 'Demo API',
      description: 'Demo API with Lambda and DynamoDB',
      defaultMethodOptions: {
        authorizationType: gateway.AuthorizationType.IAM,
      },
      // Configure CORS
      defaultCorsPreflightOptions: {
        allowOrigins: gateway.Cors.ALL_ORIGINS,
        allowMethods: gateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        maxAge: cdk.Duration.days(1),
      },
      // Optional: Enable logging
      deployOptions: {
        accessLogDestination: new gateway.LogGroupLogDestination(apiAccessLogs),
        accessLogFormat: gateway.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: gateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5',
        cachingEnabled: true,
      },
    });

    //  API Resources and Methods
    // Root resource
    const rootIntegration = new gateway.LambdaIntegration(lambda_backend);
    api.root.addMethod('GET', rootIntegration);
    api.root.addMethod('POST', rootIntegration);

    // Optional: Add a specific resource path
    const items = api.root.addResource('items');
    items.addMethod('GET', rootIntegration);
    items.addMethod('POST', rootIntegration);

    //  Stack Outputs
    // Export important information
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'apiUrl',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: dynamodb_table.tableName,
      description: 'DynamoDB table name',
      exportName: 'tableName',
    });

    //  Optional: Add Tags to Resources
    cdk.Tags.of(this).add('Environment', 'Development');
    cdk.Tags.of(this).add('Project', 'DemoAPI');
  }
}
