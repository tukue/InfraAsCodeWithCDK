# Platform as a Product Blueprint (AWS + CDK)

This repository has been transformed from a single-stack IaC project into a **Platform Engineering starter** with a clear separation between:

- **Platform layer** (shared capabilities operated by platform team)
- **Application layer** (self-service onboarding and app delivery operated by developers)

It now provides opinionated architecture, repository layout, templates, and delivery workflows to support a scalable **Internal Developer Platform (IDP)**.

## What is included

- A target platform architecture with:
  - Amazon EKS for workload runtime
  - GitOps with Argo CD
  - Backstage as the developer portal
  - Secure-by-default guardrails and policy checks
- Repository structure for multi-team and multi-environment operation
- Backstage software template example for self-service service creation
- CI pipeline for platform IaC quality gates (fmt/validate/lint/security)
- GitOps-oriented app delivery guardrails
- Day-2 DX helpers via `Makefile`

## Repository structure

```text
.
├── platform/
│   ├── modules/                # Reusable building blocks (network, EKS, observability, security)
│   ├── services/               # Platform services (argocd, backstage, observability, security)
│   └── environments/
│       ├── dev/
│       ├── stage/
│       └── prod/
├── applications/
│   ├── templates/              # Golden path app templates
│   └── gitops/
│       ├── base/
│       └── overlays/
│           ├── dev/
│           ├── stage/
│           └── prod/
├── templates/
│   └── service-catalog/        # Backstage software template example
├── docs/
│   └── platform-product-architecture.md
├── .github/workflows/          # Platform CI and GitOps checks
└── Makefile
```

## Golden-path developer workflow

1. Developer opens Backstage and chooses the **golden path** service template.
2. Template scaffolds:
   - service repo skeleton
   - Kubernetes manifests/Helm chart
   - CI pipeline and GitOps app definition
   - observability and security defaults
3. Developer merges app code to main.
4. CI builds/tests/scans image, updates GitOps manifest/tag.
5. Argo CD reconciles environment cluster automatically.
6. Service is deployed with metrics, logs, traces, and policy validation enabled by default.

See detailed architecture and workflows in:

- `docs/platform-product-architecture.md`
- `templates/service-catalog/template.yaml`


## Code review resolution

Review feedback and implemented fixes are tracked in:

- `docs/code-review-resolution.md`

## Platform progress

Track implementation maturity and next milestones in:

- `docs/platform-product-progress.md`

## Quick commands

```bash
make help
make platform-check
make platform-plan ENV=dev
make platform-apply ENV=dev
make app-bootstrap SERVICE=my-api
make app-deploy ENV=dev SERVICE=my-api TAG=v1.2.3
```

## Notes

- Existing CDK sample stack code is preserved for continuity and can be refactored incrementally into `platform/` and `applications/` domains.
- This repo now documents and scaffolds a platform operating model even where implementation modules are placeholders.
