# Platform Improvement Plan

_Last updated: 2026-07-20_

This file tracks the practical platform engineering improvements being made on the `feature/terraform-platform-foundations` branch before more implementation work is added.

## Current PR Scope

| Area | Improvement | Status |
|---|---|---|
| Terraform structure | Add reusable module and environment roots for `dev`, `stage`, and `prod`. | Complete |
| Terraform state | Add S3 backend examples with DynamoDB locking. | Complete |
| Region consistency | Standardize deployment and backend examples on `eu-west-1`. | Complete |
| Secrets management | Stop writing secret payloads through Terraform state. | Complete |
| CI validation | Add Terraform formatting, init, validation, Checkov, and Trivy workflow. | Complete |
| CI coverage | Validate root Terraform example and per-environment roots. | Complete |
| CDK deployment auth | Configure AWS OIDC credentials before CDK diff/deploy. | Complete |
| Environment isolation | Use environment-specific CDK construct ids and CloudFormation stack names. | Complete |
| Scaffold hardening | Generate non-root containers and secure Kubernetes runtime defaults. | Complete |

## Remaining Practical Improvements

| Priority | Improvement | Rationale | Suggested Next Step |
|---|---|---|---|
| High | Add protected Terraform apply workflow. | Current Terraform workflow validates only; apply should be explicit and environment-gated. | Add manual `workflow_dispatch` apply with GitHub Environments and approval for `prod`. |
| High | Add AWS role documentation. | `AWS_DEPLOY_ROLE_ARN` is required but not yet documented with trust policy examples. | Add `docs/onboarding/github-oidc-aws.md`. |
| Medium | Add root Terraform validation to local Makefile docs. | CI now validates root and environments, but local docs should show the same path. | Update `terraform/README.md` with root plus env validation commands. |
| Medium | Expand GitOps overlay validation. | Current policy checks are strongest on base manifests. | Validate `applications/gitops/overlays/{dev,stage,prod}` as they gain real manifests. |
| Medium | Add platform change runbook. | Engineers need a clear path from local check to PR to environment promotion. | Add `docs/onboarding/platform-change.md`. |

## Validation Expectations

Before merge, the PR should pass:

- `terraform -chdir=terraform fmt -check -recursive`
- Terraform CI matrix for root, `dev`, `stage`, and `prod`
- Checkov Terraform scan
- Trivy Terraform/config scan
- CDK build, tests, synth, and security scans from existing platform workflows

## Notes

- Terraform remains scoped to Vault/platform integration examples. CDK remains the primary AWS application/platform IaC in this repository.
- Secret values should not be committed, passed through Terraform variables, or written into Terraform state.
- `eu-west-1` is the default target region for this portfolio branch.
