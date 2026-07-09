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

Cross-origin requests are disabled by default. If browser access is required, provide explicit origins:

```ts
cors: {
  allowOrigins: ['https://app.example.com'],
}
```

Use `applications/examples/orders-service/infra/orders-service-stack.ts` as the canonical consumer example.
