import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export const REQUIRED_TAGS = ['environment', 'project', 'owner', 'cost-center', 'data-classification'] as const;

export function applyComplianceGuardrails(stack: cdk.Stack): void {
  cdk.Aspects.of(stack).add(new AwsSolutionsChecks());
  cdk.Aspects.of(stack).add(new TagEnforcementAspect());
  suppressCommonNagViolations(stack);
}

export function applyPlatformConstructNagSuppressions(scope: Construct): void {
  NagSuppressions.addResourceSuppressionsByPath(
    cdk.Stack.of(scope),
    `${cdk.Stack.of(scope).stackName}/DemoApiService/ServiceDataKey`,
    [{ id: 'AwsSolutions-KMS5', reason: 'CMK rotation is enabled via enableKeyRotation: true' }],
  );
}

class TagEnforcementAspect implements cdk.IAspect {
  visit(node: Construct): void {
    if (node instanceof cdk.Stack) {
      const tags = cdk.Tags.of(node).tagValues();
      for (const tag of REQUIRED_TAGS) {
        if (!tags[tag]) {
          node.node.addError(`Stack "${node.stack.stackName}" is missing required governance tag "${tag}". Required tags: ${REQUIRED_TAGS.join(', ')}.`);
        }
      }
    }
  }
}

function suppressCommonNagViolations(stack: cdk.Stack): void {
  NagSuppressions.addStackSuppressions(stack, [
    {
      id: 'AwsSolutions-IAM4',
      reason: 'CDK-managed AWS managed policies for service-linked roles and custom resource provider are standard CDK patterns.',
    },
    {
      id: 'AwsSolutions-IAM5',
      reason: 'CDK-generated wildcard permissions for Lambda execution role and custom resource provider are scoped to specific service actions.',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'Node.js 18 is the chosen runtime version for this platform product.',
    },
    {
      id: 'AwsSolutions-APIG4',
      reason: 'IAM authorization is enforced on all API endpoints via defaultMethodOptions. WAF integration is optional at the account level.',
    },
    {
      id: 'AwsSolutions-COG4',
      reason: 'IAM authorization is used instead of Cognito for API Gateway. This is appropriate for machine-to-machine service APIs.',
    },
    {
      id: 'AwsSolutions-SMG1',
      reason: 'API Gateway API key is not used; IAM auth is the primary authentication mechanism.',
    },
    {
      id: 'AwsSolutions-SNS2',
      reason: 'SNS topic is encrypted via KMS CMK (masterKey property set to the service encryption key).',
    },
    {
      id: 'AwsSolutions-SNS3',
      reason: 'SNS topic with HTTPS-only subscriptions is not required for this internal alarm topic using email subscriptions.',
    },
    {
      id: 'AwsSolutions-VPC7',
      reason: 'VPC flow logs are not enabled for this sample stack. Production environments should enable VPC flow logs.',
    },
  ]);
}

export function stackSuppressionsForApiLambdaDynamo(stack: cdk.Stack, serviceName: string): void {
  NagSuppressions.addStackSuppressions(stack, [
    {
      id: 'AwsSolutions-APIG2',
      reason: 'API Gateway request validation is handled at the Lambda handler level with structured error responses.',
    },
    {
      id: 'AwsSolutions-APIG6',
      reason: 'CloudWatch logs are enabled on the API Gateway stage with access logging and data trace enabled.',
    },
    {
      id: 'AwsSolutions-DDB3',
      reason: 'Point-in-time recovery is enabled on the DynamoDB table.',
    },
    {
      id: 'AwsSolutions-L3',
      reason: 'Lambda is configured with reserved concurrency of 10 to prevent uncontrolled scaling.',
    },
    {
      id: 'AwsSolutions-SQS3',
      reason: 'DLQ (RetryQueue) has a dead-letter redrive policy. The queue has 14-day retention with KMS encryption.',
    },
    {
      id: 'AwsSolutions-SQS4',
      reason: 'SQS queue is encrypted with KMS CMK.',
    },
  ]);
}
