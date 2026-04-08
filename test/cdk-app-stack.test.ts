import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkAppStack } from '../lib/cdk-app-stack';

const buildTemplate = (stackName: string): Template => {
  const app = new cdk.App();
  const stack = new CdkAppStack(app, stackName, {
    env: { account: '111111111111', region: 'us-east-1' },
  });

  return Template.fromStack(stack);
};

describe('CdkAppStack', () => {
  test('creates core resources', () => {
    const template = buildTemplate('TestStack');

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('matches synthesized snapshot', () => {
    const template = buildTemplate('SnapshotStack');
    const templateJson = template.toJSON() as {
      Resources?: Record<string, { Type?: string; Properties?: Record<string, unknown> }>;
    };

    const resources = templateJson.Resources ?? {};

    for (const resource of Object.values(resources)) {
      if (resource.Type === 'AWS::Lambda::Function') {
        const code = resource.Properties?.Code as Record<string, unknown> | undefined;
        if (code && code.S3Key) {
          code.S3Key = '<ASSET_HASH>.zip';
        }
      }
    }

    expect(templateJson).toMatchSnapshot();
  });
});
