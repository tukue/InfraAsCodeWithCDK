import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

type CdkAppStackProps = cdk.StackProps & {
  stageName?: string;
};

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkAppStackProps = {}) {
    super(scope, id, props);

    const stageName = props.stageName ?? 'dev';
    const isProduction = stageName === 'prod';

    const table = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      tableName: `demo-items-${stageName}`,
    });

    const backend = new NodejsFunction(this, 'BackendFunction', {
      entry: path.join(__dirname, 'function.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        DYNAMODB: table.tableName,
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: stageName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
        target: 'node18',
      },
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
    });

    table.grantReadWriteData(backend);

    const accessLogs = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `Demo API (${stageName})`,
      description: 'Serverless API with Lambda and DynamoDB',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        maxAge: cdk.Duration.days(1),
      },
      deployOptions: {
        stageName,
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        tracingEnabled: true,
      },
    });

    const integration = new apigateway.LambdaIntegration(backend);

    api.root.addMethod('GET', integration);

    const health = api.root.addResource('health');
    health.addMethod('GET', integration);

    const items = api.root.addResource('items');
    items.addMethod('GET', integration);
    items.addMethod('POST', integration);

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: `${this.stackName}-api-url`,
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: table.tableName,
      description: 'DynamoDB table name',
      exportName: `${this.stackName}-table-name`,
    });

    cdk.Tags.of(this).add('Environment', stageName);
    cdk.Tags.of(this).add('Project', 'DemoAPI');
  }
}
