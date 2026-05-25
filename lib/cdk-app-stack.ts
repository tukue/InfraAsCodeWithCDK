import * as cdk from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as ce from 'aws-cdk-lib/aws-ce';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { ApiLambdaDynamoService } from '../packages/platform-constructs/src';
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

    const service = new ApiLambdaDynamoService(this, 'DemoApiService', {
      serviceName: 'demo-api',
      stageName,
      catalogEntityRef: 'component:default/infra-as-code-with-cdk',
      recommendedPathTemplateName: 'recommended-path-service',
      recommendedPathTemplatePath: 'backstage/templates/recommended-path-service/template.yaml',
      handlerEntry: `${__dirname}/function.ts`,
      itemsByCreatedAtIndexName,
    });

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
      masterKey: service.encryptionKey,
    });

    const lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: service.backend.metricErrors({
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
      metric: service.backend.metricDuration({
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
      metric: service.api.metricServerError({
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
        left: [service.backend.metricInvocations(), service.backend.metricErrors()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration (p50/p95)',
        left: [
          service.backend.metricDuration({ statistic: 'p50' }),
          service.backend.metricDuration({ statistic: 'p95' }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests / 5XX',
        left: [service.api.metricCount(), service.api.metricServerError()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency (p50/p95)',
        left: [
          service.api.metricLatency({ statistic: 'p50' }),
          service.api.metricLatency({ statistic: 'p95' }),
        ],
        width: 12,
      }),
    );

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: service.api.url,
      description: 'API Gateway URL',
      exportName: `${this.stackName}-api-url`,
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: service.table.tableName,
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
      value: service.lambdaApplicationLogs.logGroupName,
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
