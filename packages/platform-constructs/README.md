# Platform Constructs

Reusable CDK constructs for the internal developer platform.

## ApiLambdaDynamoService

`ApiLambdaDynamoService` is the first golden-path L3 construct. It packages the standard API Gateway, Lambda, DynamoDB, logging, tracing, retry, and encryption baseline behind a small consumer API.

```ts
new ApiLambdaDynamoService(this, 'OrdersApiService', {
  serviceName: 'orders-api',
  stageName: 'dev',
  catalogEntityRef: 'component:default/orders-service',
  recommendedPathTemplateName: 'recommended-path-service',
  recommendedPathTemplatePath: 'backstage/templates/recommended-path-service/template.yaml',
});
```

Use `applications/examples/orders-service/infra/orders-service-stack.ts` as the canonical consumer example.
