# ADR-0002: Golden-Path Construct Pattern for App Teams

## Status

Accepted

## Context

Application teams need to deploy microservices on AWS. Without guardrails, teams may:
- Use insecure defaults
- Skip observability
- Mismanage IAM permissions
- Create inconsistent architectures

## Decision

Provide a golden-path CDK construct (`ApiLambdaDynamoService`) that encapsulates:
1. **API Gateway** (REST, IAM auth)
2. **Lambda** (Node.js, VPC, SQS DLQ, X-Ray)
3. **DynamoDB** (KMS encryption, PITR, GSI)
4. **KMS** (Customer-managed key with rotation)
5. **VPC** (Isolated subnets)
6. **Observability** (Dashboards, alarms)
7. **Security** (cdk-nag compliance, WAF guardrails)

App teams consume the construct with minimal configuration and cannot bypass security controls.

## Consequences

- App teams get production-hardened infrastructure by default
- Platform team maintains a single construct library
- Construct versioning must follow semantic versioning
- Breaking changes require migration guides
- Some flexibility is sacrificed for consistency
