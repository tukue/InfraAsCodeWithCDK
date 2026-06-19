import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export interface PlatformObservabilityProps {
  readonly stageName: string;
  readonly backend: lambda.IFunction;
  readonly backendLogGroup: logs.ILogGroup;
  readonly api: apigateway.RestApi;
  readonly alarmTopic: sns.ITopic;
}

export class PlatformObservability extends Construct {
  public readonly compositeAlarm: cloudwatch.CompositeAlarm;
  public readonly lambdaErrorsAlarm: cloudwatch.Alarm;
  public readonly lambdaDurationAlarm: cloudwatch.Alarm;
  public readonly api5xxAlarm: cloudwatch.Alarm;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: PlatformObservabilityProps) {
    super(scope, id);

    this.lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: props.backend.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda function has errors in the last 5 minutes',
    });

    this.lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationP95Alarm', {
      metric: props.backend.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      threshold: 2000,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda p95 duration is above 2 seconds',
    });

    this.api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      metric: props.api.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway has 5xx responses in the last 5 minutes',
    });

    this.lambdaErrorsAlarm.addAlarmAction(new cloudwatch.actions.SnsAction(props.alarmTopic));
    this.lambdaDurationAlarm.addAlarmAction(new cloudwatch.actions.SnsAction(props.alarmTopic));
    this.api5xxAlarm.addAlarmAction(new cloudwatch.actions.SnsAction(props.alarmTopic));

    this.compositeAlarm = new cloudwatch.CompositeAlarm(this, 'PlatformCompositeAlarm', {
      alarmRule: cloudwatch.AlarmRule.anyOf(
        this.lambdaErrorsAlarm,
        this.lambdaDurationAlarm,
        this.api5xxAlarm,
      ),
      compositeAlarmName: `platform-product-${props.stageName}-composite`,
      actionsEnabled: true,
    });

    this.compositeAlarm.addAlarmAction(new cloudwatch.actions.SnsAction(props.alarmTopic));

    this.dashboard = new cloudwatch.Dashboard(this, 'ObservabilityDashboard', {
      dashboardName: `platform-product-${props.stageName}-observability`,
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations / Errors',
        left: [props.backend.metricInvocations(), props.backend.metricErrors()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration (p50/p95/p99)',
        left: [
          props.backend.metricDuration({ statistic: 'p50' }),
          props.backend.metricDuration({ statistic: 'p95' }),
          props.backend.metricDuration({ statistic: 'p99' }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests / 5XX',
        left: [props.api.metricCount(), props.api.metricServerError()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency (p50/p95/p99)',
        left: [
          props.api.metricLatency({ statistic: 'p50' }),
          props.api.metricLatency({ statistic: 'p95' }),
          props.api.metricLatency({ statistic: 'p99' }),
        ],
        width: 12,
      }),
      new cloudwatch.TextWidget({
        markdown: [
          '# SLO Targets',
          '',
          `- **Availability**: 99.9% uptime (API Gateway)`,
          `- **Latency (p95)**: < 2000ms (Lambda duration)`,
          `- **Error Rate**: < 0.1% (Lambda + API 5xx)`,
          `- **Environment**: ${props.stageName}`,
        ].join('\n'),
        width: 12,
        height: 4,
      }),
      new cloudwatch.LogQueryWidget({
        title: 'Lambda Error Logs',
        width: 12,
        height: 8,
        logGroupNames: [props.backendLogGroup.logGroupName],
        queryString: [
          'fields @timestamp, @message, @requestId',
          '| filter @message like /(?i)(error|exception|fail|timeout)/',
          '| sort @timestamp desc',
          '| limit 50',
        ].join('\n'),
      }),
      new cloudwatch.LogQueryWidget({
        title: 'API Access Logs',
        width: 12,
        height: 8,
        logGroupNames: [`API-Gateway-Execution-Logs_${props.api.restApiId}/${props.stageName}`],
        queryString: [
          'fields @timestamp, @message',
          '| filter @message like /(?i)(4\\d\\d|5\\d\\d)/',
          '| sort @timestamp desc',
          '| limit 50',
        ].join('\n'),
      }),
    );
  }
}
