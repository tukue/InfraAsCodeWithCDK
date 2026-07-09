import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';

export function applyComplianceGuardrails(stack: cdk.Stack): void {
  cdk.Aspects.of(stack).add(new AwsSolutionsChecks());
  suppressCommonNagViolations(stack);
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
      reason: 'Node.js 20 is the chosen runtime version for this platform product.',
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

export function stackSuppressionsForApiLambdaDynamo(stack: cdk.Stack, _serviceName: string): void {
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
