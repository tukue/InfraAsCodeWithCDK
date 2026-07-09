# Platform Maturity Scorecard

_Last updated: 2026-07-01_

Use this scorecard during discovery, quarterly platform reviews, or roadmap planning. Scores should be evidence-based: code, workflow runs, templates, documentation, platform telemetry, and adoption data count more than stated intent.

## Scoring model

| Score | Meaning |
|---:|---|
| 0 | Not present |
| 1 | Ad hoc or documented only |
| 2 | Implemented for a pilot path |
| 3 | Standardized for most services |
| 4 | Measured, governed, and continuously improved |

## Current assessment

| Capability | Current Score | Target Score | Evidence in Repository | Consulting Outcome |
|---|---:|---:|---|---|
| Platform product strategy | 3 | 4 | Operating model, consulting profile, KPI definitions | Stakeholders can fund and prioritize platform work by outcome. |
| Golden-path onboarding | 2 | 4 | Backstage templates, first-service guide, catalog metadata | New services start with secure defaults and less manual coordination. |
| Reusable infrastructure patterns | 2 | 4 | CDK construct package, typed env config, canonical orders-service consumer | Teams reuse patterns instead of rebuilding infrastructure per service. |
| GitOps delivery | 2 | 4 | Argo CD-ready manifests, Kustomize structure, GitOps guardrail workflow | Deployments become auditable and environment promotion becomes explicit. |
| Policy-as-code | 2 | 4 | OPA/Conftest rules, CI validation, CDK WAF aspect | Compliance feedback shifts left into pull requests. |
| Runtime platform | 1 | 4 | Target EKS architecture documented, environment folders present | Workloads need a standardized runtime before broad adoption. |
| Observability and reliability | 2 | 4 | CloudWatch dashboard, alarms, structured logging, X-Ray, OaaS docs | Teams detect service health issues earlier with less setup. |
| FinOps | 2 | 3 | AWS Budgets, Cost Explorer anomaly detection, governance tags | Cost accountability becomes part of the platform contract. |
| Secrets management | 1 | 3 | Minimal Terraform Vault policy and secret example | Secrets ownership can be standardized incrementally. |
| Developer experience | 2 | 4 | Makefile targets, templates, onboarding docs | Developers get a repeatable workflow instead of platform tribal knowledge. |

## Score summary

| Area | Current Average | Target Average | Priority |
|---|---:|---:|---|
| Strategy and operating model | 3.0 | 4.0 | Medium |
| Developer self-service | 2.0 | 4.0 | High |
| Delivery and governance | 2.0 | 4.0 | High |
| Runtime and operations | 1.7 | 3.7 | High |
| Cost and secrets controls | 1.5 | 3.0 | Medium |

## Engagement recommendations

| Recommendation | Why It Matters | Practical Next Step |
|---|---|---|
| Prove one full golden path end to end. | Adoption improves when teams can see a working service path, not only architecture. | Scaffold one service, validate policy, deploy through GitOps, and capture onboarding time. |
| Keep Terraform scoped to secrets and external service configuration. | Terraform is useful here, but duplicating the CDK platform stack would add unnecessary complexity. | Expand the Vault example only when a real identity or CI integration needs it. |
| Build EKS and Argo CD as the next runtime slice. | Current docs describe the target, but broad client value requires a live runtime path. | Add a minimal environment module and reconcile one sample app. |
| Expand policy in thin layers. | Broad policy programs fail when every rule blocks at once. | Add ingress, network policy, and PDB checks with warn-before-block rollout guidance. |
| Tie every new platform feature to a metric. | Maturity must be visible to leadership and useful to delivery teams. | Add metric owner, baseline, and target to each roadmap item. |

## KPI mapping

| KPI | Platform Capability | Evidence Source |
|---|---|---|
| Lead time to first deployment | Backstage template, GitOps flow, onboarding docs | Template execution time, first successful deploy timestamp |
| Policy compliance pass rate | OPA/Conftest, Checkov, Trivy | CI workflow results |
| Mean time to detect | Observability baseline | Alarm and dashboard coverage |
| Template adoption rate | Developer portal and catalog | Catalog entries created from recommended-path template |
| Cost attribution coverage | FinOps tags and budgets | Tagged resource inventory and budget reports |

## Review cadence

- Run the scorecard at discovery, after the first implemented golden path, and quarterly thereafter.
- Keep the score evidence-linked.
- Treat target score gaps as roadmap inputs, not as a generic maturity checklist.
