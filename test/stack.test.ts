import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { CdkAppStack } from '../lib/cdk-app-stack';
import { loadPlatformConfig } from '../lib/platform-config';
import { enforceAlbWafAssociations } from '../lib/security-guardrails';

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

describe('CdkAppStack infrastructure', () => {
  it('adds FinOps cost visibility resources and cost allocation tags', () => {
    const app = new cdk.App();
    const stack = new CdkAppStack(app, 'TestStack', {
      finOps: {
        alertEmail: 'finops@example.com',
        monthlyBudgetAmount: 125,
      },
      platformConfig: loadPlatformConfig('dev'),
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: {
        BudgetName: 'platform-product-dev-monthly-cost',
        BudgetType: 'COST',
        TimeUnit: 'MONTHLY',
        BudgetLimit: {
          Amount: 125,
          Unit: 'USD',
        },
        CostFilters: {
          TagKeyValue: ['user:project$DemoAPI'],
        },
      },
      NotificationsWithSubscribers: [
        {
          Notification: {
            ComparisonOperator: 'GREATER_THAN',
            NotificationType: 'ACTUAL',
            Threshold: 80,
            ThresholdType: 'PERCENTAGE',
          },
          Subscribers: [
            {
              Address: 'finops@example.com',
              SubscriptionType: 'EMAIL',
            },
          ],
        },
        {
          Notification: {
            ComparisonOperator: 'GREATER_THAN',
            NotificationType: 'FORECASTED',
            Threshold: 100,
            ThresholdType: 'PERCENTAGE',
          },
          Subscribers: [
            {
              Address: 'finops@example.com',
              SubscriptionType: 'EMAIL',
            },
          ],
        },
      ],
    });

    template.hasResourceProperties('AWS::CE::AnomalyMonitor', {
      MonitorName: 'platform-product-dev-service-costs',
      MonitorType: 'DIMENSIONAL',
      MonitorDimension: 'SERVICE',
    });

    template.hasResourceProperties('AWS::CE::AnomalySubscription', {
      SubscriptionName: 'platform-product-dev-cost-anomalies',
      Frequency: 'DAILY',
      Subscribers: [
        {
          Address: 'finops@example.com',
          Type: 'EMAIL',
        },
      ],
      Threshold: 25,
    });

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      Tags: Match.arrayWith([
        {
          Key: 'cost-center',
          Value: 'ENG-PLATFORM',
        },
        {
          Key: 'environment',
          Value: 'dev',
        },
        {
          Key: 'finops-managed',
          Value: 'true',
        },
        {
          Key: 'project',
          Value: 'DemoAPI',
        },
      ]),
    });

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'ItemsByCreatedAtIndex',
          KeySchema: [
            {
              AttributeName: 'entityType',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'createdAt',
              KeyType: 'RANGE',
            },
          ],
        }),
      ]),
    });
  });

  it('allows stacks without application load balancers', () => {
    const app = new cdk.App();

    new CdkAppStack(app, 'NoAlbStack', {
      platformConfig: loadPlatformConfig('dev'),
    });

    expect(() => app.synth()).not.toThrow();
  });
});

describe('ALB WAF guardrail', () => {
  it('fails synth when an Application Load Balancer is missing a WAF association', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'BadAlbStack');
    enforceAlbWafAssociations(stack);

    new elbv2.CfnLoadBalancer(stack, 'PublicAlb', {
      subnets: ['subnet-12345', 'subnet-67890'],
      type: 'application',
    });

    expect(() => app.synth()).toThrow(
      /Application Load Balancer "BadAlbStack\/PublicAlb" must have an AWS::WAFv2::WebACLAssociation/,
    );
  });

  it('passes synth when an Application Load Balancer has a WAF association', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'GoodAlbStack');
    enforceAlbWafAssociations(stack);

    const alb = new elbv2.CfnLoadBalancer(stack, 'PublicAlb', {
      subnets: ['subnet-12345', 'subnet-67890'],
      type: 'application',
    });
    const webAcl = new wafv2.CfnWebACL(stack, 'AlbWebAcl', {
      defaultAction: {
        allow: {},
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'alb-web-acl',
        sampledRequestsEnabled: true,
      },
    });

    new wafv2.CfnWebACLAssociation(stack, 'AlbWebAclAssociation', {
      resourceArn: alb.ref,
      webAclArn: webAcl.attrArn,
    });

    expect(() => app.synth()).not.toThrow();
  });
});
