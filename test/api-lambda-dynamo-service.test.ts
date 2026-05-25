import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApiLambdaDynamoService } from '../packages/platform-constructs/src';

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

describe('ApiLambdaDynamoService', () => {
  it('creates a secure-by-default API, Lambda, DynamoDB, and retry queue baseline', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'ConstructConsumerStack');

    new ApiLambdaDynamoService(stack, 'OrdersApiService', {
      serviceName: 'orders-api',
      stageName: 'dev',
      catalogEntityRef: 'component:default/orders-service',
      recommendedPathTemplateName: 'recommended-path-service',
      recommendedPathTemplatePath: 'backstage/templates/recommended-path-service/template.yaml',
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.resourceCountIs('AWS::SQS::Queue', 1);
    template.resourcePropertiesCountIs('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          SERVICE_NAME: 'orders-api',
        }),
      },
    }, 1);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      SSESpecification: {
        SSEEnabled: true,
        SSEType: 'KMS',
      },
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'ItemsByCreatedAtIndex',
        }),
      ]),
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs18.x',
      TracingConfig: {
        Mode: 'Active',
      },
      ReservedConcurrentExecutions: 10,
      Environment: {
        Variables: Match.objectLike({
          CATALOG_ENTITY_REF: 'component:default/orders-service',
          ITEMS_BY_CREATED_AT_INDEX: 'ItemsByCreatedAtIndex',
          RECOMMENDED_PATH_TEMPLATE_NAME: 'recommended-path-service',
          SERVICE_NAME: 'orders-api',
          STAGE: 'dev',
        }),
      },
    });

    template.hasResourceProperties('AWS::ApiGateway::Method', {
      AuthorizationType: 'AWS_IAM',
    });

    template.resourceCountIs('Custom::VpcRestrictDefaultSG', 1);

    expect(JSON.stringify(template.toJSON())).not.toContain("'Access-Control-Allow-Origin':'*'");
  });

  it('fails fast on invalid service names', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'InvalidConsumerStack');

    expect(
      () =>
        new ApiLambdaDynamoService(stack, 'InvalidApiService', {
          serviceName: 'Orders API',
          stageName: 'dev',
          catalogEntityRef: 'component:default/orders-service',
          recommendedPathTemplateName: 'recommended-path-service',
          recommendedPathTemplatePath: 'backstage/templates/recommended-path-service/template.yaml',
        }),
    ).toThrow(
      'ApiLambdaDynamoService serviceName must be 3-40 characters and use lowercase letters, numbers, and hyphens.',
    );
  });

  it('rejects wildcard CORS origins', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'InvalidCorsStack');

    expect(
      () =>
        new ApiLambdaDynamoService(stack, 'InvalidCorsApiService', {
          serviceName: 'orders-api',
          stageName: 'dev',
          catalogEntityRef: 'component:default/orders-service',
          recommendedPathTemplateName: 'recommended-path-service',
          recommendedPathTemplatePath: 'backstage/templates/recommended-path-service/template.yaml',
          cors: {
            allowOrigins: ['*'],
          },
        }),
    ).toThrow('ApiLambdaDynamoService cors.allowOrigins must not include wildcard origins.');
  });
});
