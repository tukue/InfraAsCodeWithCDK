import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkAppStack } from '../lib/cdk-app-stack';
import { loadPlatformConfig } from '../lib/platform-config';

jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => {
  const lambda = jest.requireActual('aws-cdk-lib/aws-lambda');

  return {
    NodejsFunction: class NodejsFunction extends lambda.Function {
      constructor(scope: any, id: string, props: Record<string, unknown>) {
        const { bundling, entry, ...lambdaProps } = props;

        super(scope, id, {
          ...lambdaProps,
          code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "{}" });'),
        });
      }
    },
  };
});

describe('CdkAppStack snapshot', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new CdkAppStack(app, 'SnapshotTestStack', {
      env: { account: '111111111111', region: 'us-east-1' },
      platformConfig: loadPlatformConfig('dev'),
      finOps: {
        alertEmail: 'platform-team@example.com',
        monthlyBudgetAmount: 50,
      },
    });
    template = Template.fromStack(stack);
  });

  it('matches the FinOps budget snapshot', () => {
    expect(template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: {
        BudgetName: 'platform-product-dev-monthly-cost',
        BudgetType: 'COST',
        TimeUnit: 'MONTHLY',
        BudgetLimit: {
          Amount: 50,
          Unit: 'USD',
        },
        CostFilters: {
          TagKeyValue: ['user:project$DemoAPI'],
        },
      },
    })).toBe(true);
  });

  it('matches the anomaly monitor snapshot', () => {
    expect(template.hasResourceProperties('AWS::CE::AnomalyMonitor', {
      MonitorName: 'platform-product-dev-service-costs',
      MonitorType: 'DIMENSIONAL',
      MonitorDimension: 'SERVICE',
    })).toBe(true);
  });

  it('matches the anomaly subscription snapshot', () => {
    expect(template.hasResourceProperties('AWS::CE::AnomalySubscription', {
      SubscriptionName: 'platform-product-dev-cost-anomalies',
      Frequency: 'DAILY',
      Subscribers: [
        {
          Address: 'platform-team@example.com',
          Type: 'EMAIL',
        },
      ],
      Threshold: 10,
    })).toBe(true);
  });

  it('matches resource count snapshot', () => {
    expect(template.resourceCountIs('AWS::Lambda::Function', 1)).toBe(true);
    expect(template.resourceCountIs('AWS::ApiGateway::RestApi', 1)).toBe(true);
    expect(template.resourceCountIs('AWS::DynamoDB::Table', 1)).toBe(true);
    expect(template.resourceCountIs('AWS::KMS::Key', 1)).toBe(true);
    expect(template.resourceCountIs('AWS::SQS::Queue', 1)).toBe(true);
    expect(template.resourceCountIs('AWS::CloudWatch::Dashboard', 1)).toBe(true);
  });
});

describe('CdkAppStack stage snapshot', () => {
  it('produces distinct config for stage environment', () => {
    const app = new cdk.App();
    const stack = new CdkAppStack(app, 'SnapshotStageTestStack', {
      env: { account: '222222222222', region: 'us-east-1' },
      platformConfig: loadPlatformConfig('stage'),
      finOps: {
        alertEmail: 'platform-team@example.com',
        monthlyBudgetAmount: 200,
      },
    });
    const template = Template.fromStack(stack);

    expect(template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: {
        BudgetName: 'platform-product-stage-monthly-cost',
        BudgetType: 'COST',
        TimeUnit: 'MONTHLY',
        BudgetLimit: {
          Amount: 200,
          Unit: 'USD',
        },
      },
    })).toBe(true);
  });
});
