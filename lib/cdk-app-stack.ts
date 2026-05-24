import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as ce from 'aws-cdk-lib/aws-ce';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { PlatformConfig } from './platform-config';
import { enforceAlbWafAssociations } from './security-guardrails';

export interface CdkAppStackProps extends cdk.StackProps {
  readonly platformConfig: PlatformConfig;
  readonly finOps?: {
    readonly alertEmail?: string;
    readonly monthlyBudgetAmount?: number;
  };
}

const itemsByCreatedAtIndexName = 'ItemsByCreatedAtIndex';

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkAppStackProps) {
    super(scope, id, props);

    const stageName = props.platformConfig.environment;
    const finOpsAlertEmail = props.finOps?.alertEmail;
    const monthlyBudgetAmount = props.finOps?.monthlyBudgetAmount ?? 50;

    enforceAlbWafAssociations(this);

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

    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: 'DemoTable',
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
    });

    table.addGlobalSecondaryIndex({
      indexName: itemsByCreatedAtIndexName,
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

    const retryQueue = new sqs.Queue(this, 'RetryQueue', {
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
      retentionPeriod: cdk.Duration.days(14),
    });

    const backend = new NodejsFunction(this, 'function', {
      entry: path.join(__dirname, 'function.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        APP_LOG_LEVEL: 'INFO',
        CATALOG_ENTITY_REF: 'component:default/infra-as-code-with-cdk',
        DYNAMODB: table.tableName,
        ITEMS_BY_CREATED_AT_INDEX: itemsByCreatedAtIndexName,
        NODE_OPTIONS: '--enable-source-maps',
        RECOMMENDED_PATH_CATALOG_PATH: 'catalog-info.yaml',
        RECOMMENDED_PATH_TEMPLATE_NAME: 'recommended-path-service',
        RECOMMENDED_PATH_TEMPLATE_PATH: 'backstage/templates/recommended-path-service/template.yaml',
        SERVICE_NAME: 'demo-api',
        STAGE: stageName,
      },
      environmentEncryption: encryptionKey,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
        target: 'node18',
      },
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      deadLetterQueueEnabled: true,
      deadLetterQueue: retryQueue,
      reservedConcurrentExecutions: 10,
      vpc: appVpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    table.grantReadWriteData(backend);

    const apiAccessLogs = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      encryptionKey,
      retention: logs.RetentionDays.TWO_YEARS,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const lambdaAppLogs = new logs.LogGroup(this, 'LambdaApplicationLogs', {
      logGroupName: `/aws/lambda/${backend.functionName}`,
      encryptionKey,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const api = new apigateway.RestApi(this, 'RestAPI', {
      restApiName: 'Demo API',
      description: 'Demo API with Lambda and DynamoDB',
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM,
      },
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
        accessLogDestination: new apigateway.LogGroupLogDestination(apiAccessLogs),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5',
        cachingEnabled: true,
      },
    });

    const integration = new apigateway.LambdaIntegration(backend);
    api.root.addMethod('GET', integration);

    const health = api.root.addResource('health');
    health.addMethod('GET', integration);

    const items = api.root.addResource('items');
    items.addMethod('GET', integration);
    items.addMethod('POST', integration);

    const platform = api.root.addResource('platform');
    platform.addMethod('GET', integration);

    const recommendedPath = platform.addResource('recommended-path');
    recommendedPath.addMethod('GET', integration);

    const budgetNotifications = finOpsAlertEmail
      ? [
          budgetNotificationWithEmail(finOpsAlertEmail, 'ACTUAL', 80),
          budgetNotificationWithEmail(finOpsAlertEmail, 'FORECASTED', 100),
        ]
      : undefined;
    const monthlyBudgetName = `platform-product-${stageName}-monthly-cost`;

    const monthlyBudget = new budgets.CfnBudget(this, 'MonthlyCostBudget', {
      budget: {
        budgetName: monthlyBudgetName,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: monthlyBudgetAmount,
          unit: 'USD',
        },
        costFilters: {
          TagKeyValue: [`user:project$${props.platformConfig.project}`],
        },
      },
      notificationsWithSubscribers: budgetNotifications,
    });

    const anomalyMonitor = new ce.CfnAnomalyMonitor(this, 'ServiceCostAnomalyMonitor', {
      monitorName: `platform-product-${stageName}-service-costs`,
      monitorType: 'DIMENSIONAL',
      monitorDimension: 'SERVICE',
      resourceTags: [
        {
          key: 'project',
          value: props.platformConfig.project,
        },
        {
          key: 'environment',
          value: stageName,
        },
      ],
    });

    if (finOpsAlertEmail) {
      new ce.CfnAnomalySubscription(this, 'CostAnomalySubscription', {
        subscriptionName: `platform-product-${stageName}-cost-anomalies`,
        frequency: 'DAILY',
        monitorArnList: [anomalyMonitor.attrMonitorArn],
        subscribers: [
          {
            type: 'EMAIL',
            address: finOpsAlertEmail,
          },
        ],
        threshold: Math.max(10, monthlyBudgetAmount * 0.2),
        resourceTags: [
          {
            key: 'project',
            value: props.platformConfig.project,
          },
          {
            key: 'environment',
            value: stageName,
          },
        ],
      });
    }

    const alarmTopic = new sns.Topic(this, 'ObservabilityAlarmTopic', {
      displayName: 'Platform Observability Alerts',
      masterKey: encryptionKey,
    });

    const lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: backend.metricErrors({
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
      metric: backend.metricDuration({
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
        left: [backend.metricInvocations(), backend.metricErrors()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration (p50/p95)',
        left: [
          backend.metricDuration({ statistic: 'p50' }),
          backend.metricDuration({ statistic: 'p95' }),
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

    new cdk.CfnOutput(this, 'ItemsByCreatedAtIndexName', {
      value: itemsByCreatedAtIndexName,
      description: 'DynamoDB GSI used for createdAt-ordered item pagination',
      exportName: `${this.stackName}-items-by-created-at-index-name`,
    });

    new cdk.CfnOutput(this, 'PlatformCatalogEntityRef', {
      value: 'component:default/infra-as-code-with-cdk',
      description: 'Backstage catalog entity reference for the platform product',
      exportName: `${this.stackName}-catalog-entity-ref`,
    });

    new cdk.CfnOutput(this, 'RecommendedPathTemplateName', {
      value: 'recommended-path-service',
      description: 'Backstage recommended path template name',
      exportName: `${this.stackName}-recommended-path-template-name`,
    });

    new cdk.CfnOutput(this, 'MonthlyCostBudgetName', {
      value: monthlyBudgetName,
      description: 'FinOps monthly cost budget name',
      exportName: `${this.stackName}-monthly-cost-budget-name`,
    });

    new cdk.CfnOutput(this, 'CostAnomalyMonitorArn', {
      value: anomalyMonitor.attrMonitorArn,
      description: 'FinOps Cost Explorer anomaly monitor ARN',
      exportName: `${this.stackName}-cost-anomaly-monitor-arn`,
    });

    new cdk.CfnOutput(this, 'ObservabilityDashboardName', {
      value: observabilityDashboard.dashboardName,
      description: 'CloudWatch dashboard for platform observability',
      exportName: `${this.stackName}-observability-dashboard-name`,
    });

    new cdk.CfnOutput(this, 'ObservabilityAlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'SNS topic ARN for observability alarms',
      exportName: `${this.stackName}-observability-alarm-topic-arn`,
    });

    new cdk.CfnOutput(this, 'LambdaApplicationLogGroupName', {
      value: lambdaAppLogs.logGroupName,
      description: 'Application log group name used by Lambda structured logs',
      exportName: `${this.stackName}-lambda-application-log-group-name`,
    });

    cdk.Tags.of(this).add('environment', props.platformConfig.environment);
    cdk.Tags.of(this).add('project', props.platformConfig.project);
    cdk.Tags.of(this).add('owner', props.platformConfig.owner);
    cdk.Tags.of(this).add('cost-center', props.platformConfig.costCenter);
    cdk.Tags.of(this).add('data-classification', props.platformConfig.dataClassification);
    cdk.Tags.of(this).add('finops-managed', 'true');
  }
}

function budgetNotificationWithEmail(
  alertEmail: string,
  notificationType: 'ACTUAL' | 'FORECASTED',
  threshold: number,
): budgets.CfnBudget.NotificationWithSubscribersProperty {
  return {
    notification: {
      comparisonOperator: 'GREATER_THAN',
      notificationType,
      threshold,
      thresholdType: 'PERCENTAGE',
    },
    subscribers: [
      {
        subscriptionType: 'EMAIL',
        address: alertEmail,
      },
    ],
  };
}
