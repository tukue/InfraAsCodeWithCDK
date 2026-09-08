import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CdkAppStack } from '../lib/cdk-app-stack';
import { loadPlatformConfig } from '../lib/platform-config';

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => {
  const lambda = jest.requireActual('aws-cdk-lib/aws-lambda');

  return {
    NodejsFunction: class NodejsFunction extends lambda.Function {
      constructor(scope: any, id: string, props: Record<string, unknown>) {
        const { bundling: _bundling, entry: _entry, ...lambdaProps } = props;

        super(scope, id, {
          ...lambdaProps,
          code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "{}" });'),
        });
      }
    },
  };
});

function synthCdkAppStack(env: string, budgetAmount = 50): Template {
  const app = new cdk.App();
  const stack = new CdkAppStack(app, 'TestStack', {
    env: { account: '111111111111', region: 'us-east-1' },
    platformConfig: loadPlatformConfig(env as any),
    finOps: {
      alertEmail: 'platform-team@example.com',
      monthlyBudgetAmount: budgetAmount,
    },
  });
  return Template.fromStack(stack);
}

describe('CdkAppStack snapshot', () => {
  it('creates FinOps budget with expected config', () => {
    const template = synthCdkAppStack('dev', 50);
    expect(() =>
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
          BudgetName: 'platform-product-dev-monthly-cost',
          BudgetType: 'COST',
          TimeUnit: 'MONTHLY',
          BudgetLimit: { Amount: 50, Unit: 'USD' },
          CostFilters: { TagKeyValue: ['user:project$DemoAPI'] },
        },
      }),
    ).not.toThrow();
  });

  it('creates anomaly monitor with expected config', () => {
    const template = synthCdkAppStack('dev');
    expect(() =>
      template.hasResourceProperties('AWS::CE::AnomalyMonitor', {
        MonitorName: 'platform-product-dev-service-costs',
        MonitorType: 'DIMENSIONAL',
        MonitorDimension: 'SERVICE',
      }),
    ).not.toThrow();
  });

  it('creates anomaly subscription with expected config', () => {
    const template = synthCdkAppStack('dev');
    expect(() =>
      template.hasResourceProperties('AWS::CE::AnomalySubscription', {
        SubscriptionName: 'platform-product-dev-cost-anomalies',
        Frequency: 'DAILY',
        Subscribers: [{ Address: 'platform-team@example.com', Type: 'EMAIL' }],
        Threshold: 10,
      }),
    ).not.toThrow();
  });

  it('has expected core resource counts', () => {
    const template = synthCdkAppStack('dev');
    expect(() => template.resourceCountIs('AWS::ApiGateway::RestApi', 1)).not.toThrow();
    expect(() => template.resourceCountIs('AWS::DynamoDB::Table', 1)).not.toThrow();
    expect(() => template.resourceCountIs('AWS::SQS::Queue', 1)).not.toThrow();
    expect(() => template.resourceCountIs('AWS::CloudWatch::Dashboard', 1)).not.toThrow();
  });

  it('has governance tags on DynamoDB table', () => {
    const template = synthCdkAppStack('dev');
    expect(() =>
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        Tags: Match.arrayWith([
          { Key: 'cost-center', Value: 'ENG-PLATFORM' },
          { Key: 'data-classification', Value: 'internal' },
          { Key: 'environment', Value: 'dev' },
          { Key: 'owner', Value: 'platform-engineering' },
          { Key: 'project', Value: 'DemoAPI' },
        ]),
      }),
    ).not.toThrow();
  });
});

describe('CdkAppStack environment config', () => {
  it('uses stage-specific budget name', () => {
    const template = synthCdkAppStack('stage', 200);
    expect(() =>
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
          BudgetName: 'platform-product-stage-monthly-cost',
          BudgetLimit: { Amount: 200, Unit: 'USD' },
        },
      }),
    ).not.toThrow();
  });

  it('uses prod-specific data classification', () => {
    const template = synthCdkAppStack('prod', 200);
    expect(() =>
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        Tags: Match.arrayWith([
          { Key: 'data-classification', Value: 'confidential' },
        ]),
      }),
    ).not.toThrow();
  });
});
