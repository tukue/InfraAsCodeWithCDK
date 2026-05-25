import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiLambdaDynamoService } from '../../../../packages/platform-constructs/src';
import { PlatformConfig } from '../../../../lib/platform-config';

export interface OrdersServiceStackProps extends cdk.StackProps {
  readonly platformConfig: PlatformConfig;
}

export class OrdersServiceStack extends cdk.Stack {
  public readonly service: ApiLambdaDynamoService;

  constructor(scope: Construct, id: string, props: OrdersServiceStackProps) {
    super(scope, id, props);

    this.service = new ApiLambdaDynamoService(this, 'OrdersApiService', {
      serviceName: 'orders-api',
      stageName: props.platformConfig.environment,
      catalogEntityRef: 'component:default/orders-service',
      recommendedPathTemplateName: 'recommended-path-service',
      recommendedPathTemplatePath: 'backstage/templates/recommended-path-service/template.yaml',
      handlerEntry: `${__dirname}/../../../../lib/function.ts`,
      environment: {
        SERVICE_NAME: 'orders-api',
      },
    });

    cdk.Tags.of(this).add('environment', props.platformConfig.environment);
    cdk.Tags.of(this).add('project', props.platformConfig.project);
    cdk.Tags.of(this).add('owner', props.platformConfig.owner);
    cdk.Tags.of(this).add('cost-center', props.platformConfig.costCenter);
    cdk.Tags.of(this).add('data-classification', props.platformConfig.dataClassification);
    cdk.Tags.of(this).add('finops-managed', 'true');
  }
}
