import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as gateway from 'aws-cdk-lib/aws-apigateway';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as path from 'path';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table Definition
    const dynamodbTable = new dynamodb.Table(this, "DemoTable", {
      partitionKey: { 
      name: "id", 
      type: dynamodb.AttributeType.STRING 
      },
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: 'DemoTable',
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // Enable encryption at rest
    });

    // Lambda Function Definition
    const lambdaBackend = new NodejsFunction(this, 'DemoFunction', {
      entry: path.join(__dirname, 'function.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_24_X,
      environment: {
      DYNAMODB_TABLE_NAME: dynamodbTable.tableName,
      NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
      minify: true,
      sourceMap: true,
      target: 'node24',
      },
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK, // Set log retention
    });

    // Grant DynamoDB Permissions to Lambda
    dynamodbTable.grantReadWriteData(lambdaBackend.role!);

    // WAFv2 Web ACL for API Gateway
    const webAcl = new wafv2.CfnWebACL(this, 'ApiWebAcl', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'apiWebAcl',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'awsCommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWS-AWSManagedRulesSQLiRuleSet',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'awsSqliRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'awsKnownBadInputsRuleSet',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // API Gateway Definition
    const api = new gateway.RestApi(this, "DemoApi", {
      restApiName: "Demo API",
      description: "Demo API with Lambda and DynamoDB",
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
      deployOptions: {
      accessLogDestination: new gateway.LogGroupLogDestination(new cdk.aws_logs.LogGroup(this, 'ApiGatewayAccessLogs', {
        retention: cdk.aws_logs.RetentionDays.ONE_WEEK, // Set log retention
      })),
      accessLogFormat: gateway.AccessLogFormat.jsonWithStandardFields(),
      loggingLevel: gateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
      tracingEnabled: true,
      },
    });

    // Associate WAFv2 Web ACL with API Gateway deployment stage
    const deploymentStage = api.deploymentStage;
    new wafv2.CfnWebACLAssociation(this, 'ApiWebAclAssociation', {
      webAclArn: webAcl.attrArn,
      resourceArn: deploymentStage.stageArn,
    });

    // API Resources and Methods
    const rootIntegration = new gateway.LambdaIntegration(lambdaBackend);
    api.root.addMethod('GET', rootIntegration);
    api.root.addMethod('POST', rootIntegration);

    const items = api.root.addResource('items');
    items.addMethod('GET', rootIntegration);
    items.addMethod('POST', rootIntegration);

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'apiUrl',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: dynamodbTable.tableName,
      description: 'DynamoDB table name',
      exportName: 'tableName',
    });

    // Add Tags to Resources
    cdk.Tags.of(this).add('Environment', 'Development');
    cdk.Tags.of(this).add('Project', 'DemoAPI');
    }
  }
