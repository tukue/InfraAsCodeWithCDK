# Platform as a Product Operating Model

_Last updated: 2026-03-26_

This guide defines how the platform is managed as an internal product, not only as infrastructure.

## Product mission

Enable product teams to ship secure, observable services to production quickly by providing paved roads with self-service workflows and built-in guardrails.

## Product users and ownership

| Area | Owner | Responsibility |
|---|---|---|
| Platform product strategy | Platform Product Manager | Roadmap, prioritization, adoption, stakeholder communication |
| Runtime and infrastructure | Platform Engineering | EKS, networking, compute, shared services |
| Security guardrails | Security + Platform | Policy bundles, IAM patterns, vulnerability controls |
| Developer portal and templates | Platform Developer Experience | Backstage catalog, templates, golden paths |
| Service onboarding consumers | Product Engineering Teams | Build services using templates and follow platform contracts |

## Product capabilities

The platform product is organized into capabilities with explicit contracts:

1. **Service scaffolding**
   - Backstage template-driven repository bootstrap
   - Standardized service metadata and ownership tags
2. **Delivery orchestration**
   - CI checks for manifest validation and policy enforcement
   - GitOps reconciliation through Argo CD
3. **Runtime baseline**
   - EKS runtime and namespace conventions
   - Network, compute, and secret management patterns
4. **Security and policy**
   - OPA/Conftest policy checks in PR workflow
   - Secure defaults for workload manifests
5. **Observability and reliability**
   - Metrics, logs, traces and SLO conventions
   - Alerting integration and runbook expectations

## Platform contracts (golden path)

Every onboarded service is expected to provide:

- a catalog entry with service owner and tier
- deployable GitOps manifests for `dev`, `stage`, and `prod`
- CPU/memory requests and limits on workload containers
- non-root runtime and no privilege escalation
- immutable image references (no `:latest`)
- minimum observability signals (health, metrics, logs)

## Intake and prioritization workflow

1. Teams submit platform requests through backlog intake.
2. Requests are triaged weekly by Platform PM + lead engineer.
3. Prioritization uses impact, adoption, risk reduction, and effort.
4. Decisions are published in roadmap updates.
5. Completed features include migration docs and rollout notes.

## Release and change management

- **Cadence**: bi-weekly platform release train.
- **Change types**:
  - additive (non-breaking): immediate release
  - behavioral (potentially breaking): release note + deprecation window
- **Versioning approach**:
  - templates and policy bundles use semantic tags
  - breaking policy changes require staged enforcement (warn -> block)

## Adoption metrics

Track platform outcomes as product KPIs:

- lead time to first deployment
- percentage of services onboarded via template
- PR policy compliance pass rate
- failed deployment rollback rate
- developer satisfaction (quarterly pulse)

## Operating rituals

- Weekly platform triage and incident review
- Bi-weekly roadmap/demo for stakeholders
- Monthly policy and compliance review with security
- Quarterly platform maturity review against success metrics

## Documentation standards

For every new platform capability, include:

- capability description and user story
- onboarding instructions
- operational runbook and escalation path
- rollback/deprecation guidance
- success metric and owner
