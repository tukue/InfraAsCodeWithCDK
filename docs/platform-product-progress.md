# Platform as a Product Progress Tracker

_Last updated: 2026-04-01_

## Delivery status snapshot

| Workstream | Status | Progress | Notes |
|---|---|---:|---|
| Repository product model (platform vs applications) | ✅ Complete | 100% | Baseline folder model and docs are in place. |
| Golden-path scaffolding (Backstage template) | ✅ Complete | 100% | Template + runnable repo structure added and parameterized org support enabled. |
| Platform IaC CI guardrails | ✅ Complete | 100% | Build/synth/checkov workflow configured. |
| App GitOps guardrails | ✅ Complete | 100% | kubeconform validation enabled and fail-fast behavior enforced. |
| Secure-by-default CDK sample hardening | ✅ Complete | 100% | KMS, VPC, DLQ, IAM auth, caching, encrypted logs implemented. |
| Environment overlays (dev/stage/prod) | 🟡 In Progress | 40% | Structure exists; env-specific manifests and policy sets pending. |
| Policy-as-code enforcement (OPA/Kyverno) | 🟡 In Progress | 60% | Conftest policy bundle and CI enforcement added for deployment security/image/resource guardrails. |
| Observability productization | 🟡 In Progress | 60% | CloudWatch dashboard, alerts, and structured logging baseline implemented; Prometheus/Grafana/Loki/OTel deployments pending. |
| EKS + Argo CD platform runtime | ⏳ Planned | 20% | Target model documented; implementation modules still to be added. |
| Backstage portal deployment | ⏳ Planned | 15% | Template exists; portal deployment and catalog automation pending. |

## Completed outcomes

- Platform-as-a-product architecture documented with phased rollout and operating model.
- CI guardrails introduced for both platform and application change paths.
- Developer command interface established through `Makefile` targets.
- Backstage self-service template now executable from a real scaffold repo structure.
- Sample GitOps base manifests added for validation and onboarding reference.

## Current quarter priorities

1. Implement EKS runtime module under `platform/modules/eks` and bootstrap cluster add-ons.
2. Stand up Argo CD in `platform/services/argocd` with app-of-apps model.
3. Expand policy bundle coverage beyond Deployment controls (Ingress, NetworkPolicy, PodDisruptionBudget).
4. Add observability baseline (Prometheus, Grafana, Loki, OpenTelemetry Collector).
5. Expand service repo structure with CI, Dockerfile, Helm chart, and SLO/runbook assets.

## Latest implementation increment

- Added a concrete "observability as a service" baseline to the CDK sample stack:
  - CloudWatch dashboard for API + Lambda recommended baseline telemetry signals.
  - Encrypted SNS-backed alarm fan-out for Lambda and API failures/latency.
  - Structured Lambda JSON logging and correlation-ID propagation.
- See `docs/observability-as-a-service.md` for assessment details and rollout recommendations.

## Definition of done for next milestone

- [ ] `platform/environments/{dev,stage,prod}` contain concrete compositions.
- [ ] Argo CD continuously reconciles at least one sample app per environment.
- [ ] Policy checks block non-compliant manifests in PR workflows.
- [ ] Backstage template provisions repo + registers catalog entity end-to-end.
- [ ] Standard app template emits traces/metrics/logs without extra developer setup.

## Suggested KPIs

- Lead time to first deployment for a new service (target: < 30 minutes).
- Percentage of services onboarded through recommended-path template (target: > 80%).
- Policy compliance pass rate in app PRs (target: > 95%).
- Mean time to detect deployment issues (target: < 10 minutes).
- Platform adoption by team count (target: all product teams by Q+2).
