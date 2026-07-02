# Platform Engagement Plan and Progress Tracker

_Last updated: 2026-07-01_

This document turns the improvement roadmap into a client engagement plan. Each workstream connects a technical platform capability to a consulting outcome, delivery evidence, and a measurable adoption signal.

## Engagement phases

| Phase | Consulting Focus | Technical Scope | Client Outcome |
|---|---|---|---|
| 1. Discover and assess | Establish the baseline and prioritize risk. | Repository review, maturity scorecard, current-state architecture. | Stakeholders agree on the highest-value platform gaps. |
| 2. Design the platform product | Define the target operating model and ownership boundaries. | Platform architecture, team responsibilities, platform contracts, KPIs. | Platform work is funded and managed as a product. |
| 3. Build the first golden path | Implement a thin, usable platform slice. | CDK construct, Backstage template, GitOps manifests, CI policy checks. | One service path can be repeated without bespoke platform support. |
| 4. Operationalize guardrails | Make reliability, security, and cost controls default. | Observability baseline, OPA rules, Checkov/Trivy, FinOps tags and budgets. | Risk controls move into normal delivery workflows. |
| 5. Scale adoption | Expand runtime and template coverage based on measured demand. | EKS, Argo CD, portal deployment, expanded policy and observability. | More teams onboard through the platform with visible maturity gains. |

## Workstream status

| Workstream | Status | Progress | Consulting Outcome | Evidence |
|---|---|---:|---|---|
| Repository product model | Complete | 100% | Clear platform vs application ownership boundaries. | Folder model, construct package, canonical consumer example. |
| Golden-path scaffolding | Complete | 100% | Faster service onboarding with consistent defaults. | Backstage template and runnable scaffold repo structure. |
| Platform IaC CI guardrails | Complete | 100% | Infrastructure changes receive repeatable quality and security feedback. | Build, synth, Checkov, and Trivy workflow. |
| App GitOps guardrails | Complete | 100% | Application manifests are validated before merge. | kubeconform and Conftest workflow. |
| Secure-by-default CDK sample hardening | Complete | 100% | Baseline services inherit encryption, network, auth, and retry controls. | KMS, VPC Lambda, queue, IAM auth, encrypted logs. |
| Consulting packaging | Complete | 100% | Technical capabilities can be presented as client outcomes. | Consulting profile, landing README, case study, scorecard. |
| Environment overlays | In progress | 40% | Teams can reason about dev, stage, and prod promotion boundaries. | Environment folders exist; richer env-specific manifests pending. |
| Policy-as-code expansion | In progress | 60% | Compliance expectations become fast feedback for product teams. | Deployment policy bundle exists; ingress/network/PDB coverage pending. |
| Observability productization | In progress | 60% | Teams get default visibility into health and failure modes. | CloudWatch dashboard, alarms, structured logs; broader stack pending. |
| EKS and Argo CD runtime | Planned | 20% | The target platform becomes deployable beyond reference docs. | Target model documented; runtime modules still to be added. |
| Backstage portal deployment | Planned | 15% | Self-service becomes executable through a real portal flow. | Template exists; portal deployment and catalog automation pending. |

## Client engagement plan

| Sprint | Outcome | Technical Activities | Acceptance Evidence |
|---|---|---|---|
| Sprint 0: Assessment | Shared baseline and roadmap. | Run repository review, score maturity, confirm service onboarding path, identify platform risks. | Updated scorecard, prioritized backlog, current-vs-target diagrams. |
| Sprint 1: Golden path | A service can be created from standard patterns. | Validate Backstage template, CDK construct consumer, GitOps sample, and policy checks. | Service scaffold passes CI and documents owner, tier, runtime, and environment. |
| Sprint 2: Guardrails | Security and delivery controls become normal workflow checks. | Expand OPA policy coverage, tune Checkov/Trivy expectations, document staged enforcement. | Non-compliant manifests fail in CI with clear remediation guidance. |
| Sprint 3: Operations | Services have default telemetry and cost accountability. | Extend observability baseline, add SLO/runbook expectations, validate cost tags and budget signals. | Dashboard, alarms, logs, traces, and cost tags exist for the sample path. |
| Sprint 4: Runtime | The target runtime is ready for a pilot workload. | Add minimal EKS and Argo CD composition, reconcile one sample app. | GitOps reconciles the app into a dev environment with policy gates. |
| Sprint 5: Adoption | Platform use becomes measurable. | Connect portal workflow, catalog registration, adoption metrics, and quarterly review process. | Adoption dashboard or report shows template usage, compliance pass rate, and onboarding time. |

## Practical implementation boundaries

- Keep CDK focused on AWS application and platform infrastructure patterns that benefit from typed constructs and tests.
- Keep Terraform focused on external platform integrations such as Vault policy and secret setup; do not duplicate the CDK stack in Terraform.
- Keep GitOps examples small enough to demonstrate promotion, validation, and ownership without creating a full production cluster distribution in this repository.
- Add platform runtime modules only when they support the next measurable adoption outcome.

## Completed outcomes

- Platform-as-a-product architecture documented with phased rollout and operating model.
- Consulting landing narrative added to the README.
- Case study and maturity scorecard added as client-facing engagement artifacts.
- CI guardrails introduced for both platform and application change paths.
- Developer command interface established through `Makefile` targets.
- Backstage self-service template now executable from a real scaffold repo structure.
- Sample GitOps base manifests added for validation and onboarding reference.
- First golden-path CDK construct added under `packages/platform-constructs` with `applications/examples/orders-service` as a canonical consumer.

## Definition of done for next milestone

- [ ] `platform/environments/{dev,stage,prod}` contain concrete compositions.
- [ ] Argo CD continuously reconciles at least one sample app per environment.
- [ ] Policy checks block non-compliant manifests in PR workflows with useful remediation messages.
- [ ] Backstage template provisions repo and registers catalog entity end to end.
- [ ] Standard app template emits traces, metrics, logs, ownership metadata, and runbook links without extra developer setup.
- [ ] Maturity score improves by at least one point in developer self-service or delivery governance after the pilot.

## Success metrics

| KPI | Target | Consulting Interpretation |
|---|---:|---|
| Lead time to first deployment for a new service | Less than 30 minutes | The golden path is usable without a platform engineer manually assembling every piece. |
| Services onboarded through recommended-path template | More than 80% | Product teams trust the platform path. |
| Policy compliance pass rate in app PRs | More than 95% | Guardrails are clear enough for teams to comply before review. |
| Mean time to detect deployment issues | Less than 10 minutes | Observability defaults catch failures early. |
| Platform adoption by team count | All product teams by Q+2 | The operating model scales beyond the first pilot. |
