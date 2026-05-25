# First Service Onboarding

This tutorial provisions a service through the platform golden path in less than 30 minutes.

## Prerequisites

- Node.js 20
- AWS credentials for the target sandbox account
- CDK bootstrap completed for the target account and region

## 1. Start from the canonical consumer

Use `applications/examples/orders-service/infra/orders-service-stack.ts` as the reference implementation. It consumes `ApiLambdaDynamoService`, which provides:

- IAM-authenticated API Gateway routes
- VPC-isolated Lambda with tracing, reserved concurrency, encrypted environment variables, and a retry queue
- KMS-encrypted DynamoDB with point-in-time recovery and the standard pagination index
- API and application log groups with retention defaults

## 2. Configure the environment

Set the platform environment explicitly:

```bash
export PLATFORM_ENV=dev
```

Allowed values are `dev`, `stage`, and `prod`.

## 3. Validate locally

Run the same quality gates used in CI:

```bash
npm run build
npm test
npm run synth
```

## 4. Register ownership

Set the service catalog reference in the construct props:

```ts
catalogEntityRef: 'component:default/orders-service'
```

The value must match the Backstage entity for the service.

## 5. Promote through environments

Create one stack instance per environment and keep promotion artifact-based:

1. Merge to `main` after build, test, synth, and policy checks pass.
2. Deploy to `dev`.
3. Promote the same reviewed change to `stage`.
4. Promote to `prod` after smoke tests and approval.

## Done

The service is onboarded when it has a catalog entity, passes CI quality gates, emits logs and traces by default, and uses the platform construct instead of hand-rolled API/Lambda/DynamoDB resources.
