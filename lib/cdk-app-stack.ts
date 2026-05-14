import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as ce from 'aws-cdk-lib/aws-ce';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { enforceAlbWafAssociations } from './security-guardrails';

type CdkAppStackProps = cdk.StackProps & {
  stageName?: string;
  finOps?: {
    alertEmail?: string;
    monthlyBudgetAmount?: number;
  };
};

export class CdkAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkAppStackProps = {}) {
    super(scope, id, props);

    const stageName = props.stageName ?? 'dev';
    const isProduction = stageName === 'prod';
    const finOpsAlertEmail = props.finOps?.alertEmail;
    const monthlyBudgetAmount = props.finOps?.monthlyBudgetAmount ?? 50;

    enforceAlbWafAssociations(this);

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
        CATALOG_ENTITY_REF: 'component:default/infra-as-code-with-cdk',
        DYNAMODB: table.tableName,
        NODE_OPTIONS: '--enable-source-maps',
        RECOMMENDED_PATH_CATALOG_PATH: 'catalog-info.yaml',
        RECOMMENDED_PATH_TEMPLATE_NAME: 'recommended-path-service',
        RECOMMENDED_PATH_TEMPLATE_PATH: 'backstage/templates/recommended-path-service/template.yaml',
        STAGE: stageName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
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
          TagKeyValue: [`user:Project$PlatformProduct`],
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
          key: 'Project',
          value: 'PlatformProduct',
        },
        {
          key: 'Environment',
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
            key: 'Project',
            value: 'PlatformProduct',
          },
          {
            key: 'Environment',
            value: stageName,
          },
        ],
      });
    }

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

    cdk.Tags.of(this).add('Environment', stageName);
    cdk.Tags.of(this).add('Project', 'PlatformProduct');
    cdk.Tags.of(this).add('CostCenter', 'PlatformEngineering');
    cdk.Tags.of(this).add('FinOpsManaged', 'true');
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
