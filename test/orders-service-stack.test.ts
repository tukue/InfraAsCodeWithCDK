import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { OrdersServiceStack } from '../applications/examples/orders-service/infra/orders-service-stack';
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

describe('OrdersServiceStack', () => {
  it('consumes the platform API/Lambda/Dynamo golden-path construct', () => {
    const app = new cdk.App();
    const stack = new OrdersServiceStack(app, 'OrdersServiceDev', {
      platformConfig: loadPlatformConfig('dev'),
    });

    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
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
  });
});
