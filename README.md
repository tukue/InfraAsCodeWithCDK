# Platform as a Product Blueprint (AWS + CDK)

This repository has been transformed from a single-stack IaC project into a **Platform Engineering starter** with a clear separation between:

- **Platform layer** (shared capabilities operated by platform team)
- **Application layer** (self-service onboarding and app delivery operated by developers)

It now provides opinionated architecture, repository layout, templates, and delivery workflows to support a scalable **Internal Developer Platform (IDP)**.

It is also curated as a **Platform Engineering consulting profile project** that demonstrates strategy, architecture, implementation, and measurable outcomes for platform transformations.

## What is included

- A target platform architecture with:
  - Amazon EKS for workload runtime
  - GitOps with Argo CD
  - Backstage as the developer portal
  - Secure-by-default guardrails and policy checks
- Repository structure for multi-team and multi-environment operation
- Backstage software template example for self-service service creation
- CI pipeline for platform IaC quality gates (build/test/synth + Checkov + Trivy security scans)
- GitOps-oriented app delivery guardrails
- OPA/Conftest policy bundle for Kubernetes deployment security checks
- Day-2 DX helpers via `Makefile`
- Serverless CDK sample stack with API Gateway, Lambda, DynamoDB, observability, and FinOps visibility

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

## Recommended-path developer workflow

Template ID: `recommended-path-k8s-service`

1. Developer opens Backstage and chooses the **recommended path** service template.
2. Template scaffolds:
   - service repo structure
   - Kubernetes manifests/Helm chart
   - CI pipeline and GitOps app definition
   - observability and security defaults
3. Developer merges app code to main.
4. CI builds/tests/scans image, updates GitOps manifest/tag.
5. Argo CD reconciles environment cluster automatically.
6. Service is deployed with metrics, logs, traces, and policy validation enabled by default.

See detailed architecture and workflows in:

- `docs/platform-product-architecture.md`
- `docs/oaas-implementation-flow.md`
- `templates/service-catalog/template.yaml`

## Implemented platform product guardrails

The CDK app applies productized guardrails from the platform review recommendations:

- **Typed environment configuration** via `lib/platform-config.ts` with explicit `dev|stage|prod` validation and fail-fast errors for missing or invalid values.
- **Mandatory governance tags** standardized at stack level and validated in tests for key resources: `environment`, `project`, `owner`, `cost-center`, and `data-classification`.
- **FinOps visibility** through AWS Budgets, Cost Explorer anomaly monitoring, and `finops-managed` resource tagging.
- **ALB security enforcement** through a CDK validation that fails synth when an Application Load Balancer has no AWS WAFv2 association.

Set the environment explicitly with either CDK context or environment variable:

```bash
npm run synth                 # defaults to dev when PLATFORM_ENV is unset
PLATFORM_ENV=stage npm run synth
# or, direct CDK command
npm run cdk -- synth -c platformEnv=prod
```

Deploy with FinOps notifications:

```bash
npm run cdk -- deploy \
  --context platformEnv=prod \
  --context finOpsAlertEmail=finops@example.com \
  --context monthlyBudgetAmount=250
```

## API Endpoints

- `GET /` returns platform metadata and the supported routes
- `GET /health` returns a lightweight health response
- `GET /platform` returns the platform-product contract and available capabilities
- `GET /platform/recommended-path` returns the recommended-path delivery stages and template metadata
- `GET /items` lists items from DynamoDB with `limit` and `cursor` pagination ordered by `createdAt`
- `POST /items` creates a new item

List items with pagination:

```bash
curl "$API_URL/items?limit=25"
curl "$API_URL/items?limit=25&cursor=$NEXT_CURSOR"
```

## FinOps

- Monthly cost budget defaults to `50 USD` and can be changed with `--context monthlyBudgetAmount=<amount>` or `MONTHLY_BUDGET_AMOUNT`
- Budget alerts and Cost Explorer anomaly notifications are added when `finOpsAlertEmail` or `FINOPS_ALERT_EMAIL` is provided
- Cost Explorer anomaly detection monitors service-level spend for the platform product

## Code review resolution

Review feedback and implemented fixes are tracked in:

- `docs/code-review-resolution.md`

## Platform progress

Track implementation maturity and next milestones in:

- `docs/platform-product-progress.md`
- `docs/platform-product-operating-model.md`
- `docs/platform-engineering-consulting-profile.md`
- `docs/platform-product-repository-review-2026-04-08.md`

## Quick commands

```bash
make help
make platform-check
make platform-plan ENV=dev
make platform-apply ENV=dev
make app-bootstrap SERVICE=my-api
make app-deploy ENV=dev SERVICE=my-api TAG=v1.2.3
make app-policy-test
```

## Useful CDK commands

```bash
npm run build
npm test
npm run synth
npm run cdk -- diff
```

## Stack Outputs

- API Gateway URL
- DynamoDB table name
- DynamoDB `createdAt` pagination GSI name
- Backstage catalog entity reference
- Recommended path template name
- Monthly cost budget name
- Cost anomaly monitor ARN
- Observability dashboard name
- Observability alarm topic ARN
- Lambda application log group name

## Notes

- Existing CDK sample stack code is preserved for continuity and can be refactored incrementally into `platform/` and `applications/` domains.
- This repo now documents and scaffolds a platform operating model even where implementation modules are placeholders.
