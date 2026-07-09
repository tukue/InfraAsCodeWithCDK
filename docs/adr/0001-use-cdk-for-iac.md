# ADR-0001: Use AWS CDK for Infrastructure as Code

## Status

Accepted

## Context

The platform team needs an Infrastructure as Code (IaC) tool to define, deploy, and manage AWS infrastructure. Options include:
- AWS CloudFormation (native YAML/JSON)
- AWS CDK (TypeScript/Python/etc.)
- Terraform
- Pulumi

## Decision

Use AWS CDK v2 with TypeScript for the following reasons:
1. **Familiar language**: TypeScript enables reuse of existing JavaScript/Node.js expertise
2. **Type safety**: TypeScript provides compile-time type checking
3. **AWS-native**: First-class AWS integration and immediate support for new services
4. **Construct pattern**: Enables building reusable, composable infrastructure components
5. **cdk-nag**: Built-in compliance checking framework
6. **Team alignment**: The team has stronger TypeScript skills than HCL

## Consequences

- All infrastructure is defined in TypeScript
- CDK synth compiles to CloudFormation templates
- Terraform is used alongside where needed (Vault provider, which lacks CDK support)
- Requires Node.js 20 runtime in CI/CD pipelines
- Platform constructs can be published as an npm package for app teams
