import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as gateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDB Table Definition
    const dynamodb_table = new dynamodb.Table(this, "Table", {
      partitionKey: { 
        name: "id", 
        type: dynamodb.AttributeType.STRING 
      },
      // Table will be deleted when stack is destroyed
      removalPolicy: RemovalPolicy.DESTROY,
      // Optional: Enable point-in-time recovery
      pointInTimeRecovery: true,
      // Optional: Set billing mode
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // Optional: Set table name explicitly
      tableName: 'my-demo-table'
    });

    // 2. Lambda Function Definition
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
    });

    // 3. Grant DynamoDB Permissions to Lambda
    dynamodb_table.grantReadWriteData(lambda_backend.role!);

    // 4. API Gateway Definition
    const api = new gateway.RestApi(this, "RestAPI", {
      restApiName: "Demo API",
      description: "Demo API with Lambda and DynamoDB",
      // Configure CORS
      defaultCorsPreflightOptions: {
        allowOrigins: gateway.Cors.ALL_ORIGINS,
        allowMethods: gateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ],
        maxAge: cdk.Duration.days(1),
      },
      // Optional: Enable logging
      deployOptions: {
        accessLogDestination: new gateway.LogGroupLogDestination(new cdk.aws_logs.LogGroup(this, 'ApiGatewayAccessLogs')),
        accessLogFormat: gateway.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: gateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
    });

    // 5. API Resources and Methods
    // Root resource
    const rootIntegration = new gateway.LambdaIntegration(lambda_backend);
    api.root.addMethod('GET', rootIntegration);
    api.root.addMethod('POST', rootIntegration);

    // Optional: Add a specific resource path
    const items = api.root.addResource('items');
    items.addMethod('GET', rootIntegration);
    items.addMethod('POST', rootIntegration);

    // 6. Stack Outputs
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

    // 7. Optional: Add Tags to Resources
    cdk.Tags.of(this).add('Environment', 'Development');
    cdk.Tags.of(this).add('Project', 'DemoAPI');
  }
}
