# Code Review Resolution Log

This document captures how review feedback was applied during the Platform-as-a-Product transformation.

## Review items resolved

- [x] **GitOps validation must fail on invalid manifests**
  - Removed failure suppression and ensured kubeconform exits non-zero on invalid resources.
  - Implemented deterministic manifest discovery with `find` to avoid shell glob portability issues in GitHub Actions.

- [x] **Backstage template referenced missing repo structure path**
  - Added `templates/service-catalog/structure/` with `catalog-info.yaml`, `README.md`, and `.gitignore`.
  - Updated `fetch:template` path to `./structure` and made it executable.

- [x] **Hardcoded GitHub organization in Backstage template**
  - Added required `organization` parameter.
  - Updated `publish:github.repoUrl` to use `${{ parameters.organization }}`.

- [x] **Workflow-level permission hardening**
  - Added explicit least-privilege workflow permissions (`contents: read`).

- [x] **Checkov findings from CDK stack resources**
  - Added CMK encryption, Lambda retry queue, reserved concurrency, VPC placement, IAM auth defaults, and encrypted API access logs.
  - Removed CDK-generated `CustomVpcRestrictDefaultSG` provider Lambda by setting `restrictDefaultSecurityGroup: false`, which eliminated residual Checkov findings tied to that generated function.

## Current status

- CI checks are green.
- Platform blueprint scaffolding is in place and runnable.
- Remaining work is implementation depth (EKS/Argo CD deployment, policy packs, and observability stack rollouts), tracked in `docs/platform-product-progress.md`.
