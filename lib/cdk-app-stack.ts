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
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';

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
        APP_LOG_LEVEL: 'INFO',
        SERVICE_NAME: 'demo-api',
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

    const lambdaAppLogs = new logs.LogGroup(this, 'LambdaApplicationLogs', {
      logGroupName: `/aws/lambda/${lambda_backend.functionName}`,
      encryptionKey,
      retention: logs.RetentionDays.ONE_MONTH,
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

    const alarmTopic = new sns.Topic(this, 'ObservabilityAlarmTopic', {
      displayName: 'Platform Observability Alerts',
      masterKey: encryptionKey,
    });

    const lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: lambda_backend.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda function has errors in the last 5 minutes',
    });

    const lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationP95Alarm', {
      metric: lambda_backend.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      threshold: 2000,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda p95 duration is above 2 seconds',
    });

    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      metric: api.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway has 5xx responses in the last 5 minutes',
    });

    lambdaErrorsAlarm.addAlarmAction(new cwActions.SnsAction(alarmTopic));
    lambdaDurationAlarm.addAlarmAction(new cwActions.SnsAction(alarmTopic));
    api5xxAlarm.addAlarmAction(new cwActions.SnsAction(alarmTopic));

    const observabilityDashboard = new cloudwatch.Dashboard(this, 'PlatformObservabilityDashboard', {
      dashboardName: `${cdk.Stack.of(this).stackName}-platform-observability`,
    });

    observabilityDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations / Errors',
        left: [lambda_backend.metricInvocations(), lambda_backend.metricErrors()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration (p50/p95)',
        left: [
          lambda_backend.metricDuration({ statistic: 'p50' }),
          lambda_backend.metricDuration({ statistic: 'p95' }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests / 5XX',
        left: [api.metricCount(), api.metricServerError()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency (p50/p95)',
        left: [
          api.metricLatency({ statistic: 'p50' }),
          api.metricLatency({ statistic: 'p95' }),
        ],
        width: 12,
      }),
    );

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

    new cdk.CfnOutput(this, 'ObservabilityDashboardName', {
      value: observabilityDashboard.dashboardName,
      description: 'CloudWatch dashboard for platform observability',
      exportName: 'observabilityDashboardName',
    });

    new cdk.CfnOutput(this, 'ObservabilityAlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'SNS topic ARN for observability alarms',
      exportName: 'observabilityAlarmTopicArn',
    });

    new cdk.CfnOutput(this, 'LambdaApplicationLogGroupName', {
      value: lambdaAppLogs.logGroupName,
      description: 'Application log group name used by Lambda structured logs',
      exportName: 'lambdaApplicationLogGroupName',
    });

    //  Optional: Add Tags to Resources
    cdk.Tags.of(this).add('Environment', 'Development');
    cdk.Tags.of(this).add('Project', 'DemoAPI');
  }
}
