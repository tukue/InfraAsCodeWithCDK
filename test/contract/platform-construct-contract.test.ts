import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApiLambdaDynamoService } from '../../packages/platform-constructs/src';
import { createTestStack } from '../helpers';

describe('ApiLambdaDynamoService contract', () => {
  const baseProps = {
    serviceName: 'contract-test',
    stageName: 'test',
    catalogEntityRef: 'component:default/test-service',
    recommendedPathTemplateName: 'test-path',
    recommendedPathTemplatePath: 'test/template.yaml',
    handlerEntry: `${__dirname}/../../lib/function.ts`,
    itemsByCreatedAtIndexName: 'ItemsByCreatedAtIndex',
  };

  it('must create an API Gateway REST API', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  it('must create a Lambda function for the backend', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::Function', 2);
  });

  it('must create a DynamoDB table', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
  });

  it('must create a KMS key', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  it('must not create an ALB', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0);
  });

  it('must encrypt DynamoDB with KMS CMK', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      SSESpecification: {
        SSEEnabled: true,
      },
    });
  });

  it('must have point-in-time recovery enabled on DynamoDB', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
    });
  });

  it('must have IAM auth on API Gateway', () => {
    const stack = createTestStack();
    new ApiLambdaDynamoService(stack, 'TestService', baseProps);
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      AuthorizationType: 'AWS_IAM',
    });
  });

  it('must reject invalid service names', () => {
    const stack = createTestStack();
    expect(() => {
      new ApiLambdaDynamoService(stack, 'InvalidService', {
        ...baseProps,
        serviceName: 'INVALID_SERVICE_NAME',
      });
    }).toThrow();
  });

  it('must reject empty service names', () => {
    const stack = createTestStack();
    expect(() => {
      new ApiLambdaDynamoService(stack, 'EmptyService', {
        ...baseProps,
        serviceName: '',
      });
    }).toThrow();
  });
});
