import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkAppStack } from '../lib/cdk-app-stack';

describe('CdkAppStack', () => {
  test('creates core resources', () => {
    const app = new cdk.App();
    const stack = new CdkAppStack(app, 'TestStack', {
      env: { account: '111111111111', region: 'us-east-1' },
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('matches synthesized snapshot', () => {
    const app = new cdk.App();
    const stack = new CdkAppStack(app, 'SnapshotStack', {
      env: { account: '111111111111', region: 'us-east-1' },
    });

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
