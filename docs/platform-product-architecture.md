# Platform as a Product Transformation Plan

## 1) Architecture transformation (IDP model)

### Current state (observed)
- Single-stack IaC deployment centered on API Gateway + Lambda + DynamoDB.
- Infrastructure lifecycle and app lifecycle are tightly coupled.

### Target state (platform model)
Build an **Internal Developer Platform** with product thinking:

- **Platform control plane**
  - Backstage for service catalog, templates, docs, ownership, scorecards.
  - Self-service workflows for new service provisioning.
- **Runtime plane**
  - Amazon EKS as standardized runtime for containerized workloads.
- **Delivery plane**
  - GitOps controller (Argo CD preferred) for declarative deployments.
- **Governance plane**
  - Policy-as-code (OPA/Gatekeeper or Kyverno), IAM guardrails, supply-chain checks.
- **Observability plane**
  - Prometheus, Grafana, Loki, OpenTelemetry collector.

### Platform layering
- **Platform layer** (owned by platform team)
  - VPC/network baseline, EKS, ingress, secrets integration, observability stack, policy engine, CI runners.
- **Application layer** (owned by app teams)
  - Service code, Dockerfile, Helm/Kustomize manifests, SLOs, runbooks, API specs.

## 2) Repository restructuring

Recommended logical model:

```text
platform/
  modules/
    networking/
    eks/
    iam-baseline/
    observability/
    security/
  services/
    argocd/
    backstage/
    observability/
    security/
  environments/
    dev/
    stage/
    prod/
applications/
  templates/
    service-node/
    service-python/
  gitops/
    base/
    overlays/dev/
    overlays/stage/
    overlays/prod/
```

Guidance:
- Environment folders contain composition and variables only.
- Modules are reusable, versioned, and tested independently.
- Platform and application delivery use separate pipelines and approval boundaries.

## 3) Self-service capabilities

### What developers should get from one template action
- Repo scaffold with standard build/test/deploy pipeline.
- Service manifest with default requests/limits, probes, HPA.
- Namespace, network policy, Pod security defaults.
- Observability bundle:
  - Prometheus scrape annotations
  - OpenTelemetry SDK setup
  - Structured logging format
  - Standard Grafana dashboard skeleton
- Security defaults:
  - Non-root container, read-only root fs where possible
  - Image scan gate
  - Secret references from AWS Secrets Manager/External Secrets

### Example workflow
1. Go to Backstage → “Create Service”.
2. Choose template (`recommended-path-k8s-service`).
3. Enter service name, owner, tier, runtime, environment targets.
4. Template creates repo + registers component in Backstage.
5. First PR includes generated CI, Helm/Kustomize, policy, and observability assets.
6. Merge triggers CI; Argo CD deploys to dev.

## 4) CI/CD and GitOps design

### Platform pipeline (IaC changes)
Stages:
1. `fmt` / static checks
2. `validate` / synth
3. lint (`tflint` or `cdk-nag`/eslint)
4. security scan (`checkov`, `tfsec`, `trivy config`)
5. plan/synth artifact upload
6. manual approval for stage/prod
7. apply/deploy

### App pipeline (service changes)
Stages:
1. unit tests + lint
2. SAST + dependency + container scan
3. image build and sign (cosign)
4. update GitOps manifests (image tag bump)
5. Argo CD sync (pull-based)

### Separation of concerns
- **Platform changes**: mutate shared infra; higher controls and approvals.
- **App changes**: mutate service code/manifests; fast path with policy gates.

## 5) Security and governance by default

- IAM:
  - least privilege roles per workload (IRSA)
  - permission boundaries for platform automation roles
- Secrets:
  - AWS Secrets Manager + External Secrets Operator
  - no plaintext secrets in repos or CI variables
- Policy as code:
  - Enforce required labels, resource limits, non-root, approved registries
  - Block privileged pods and public load balancers unless exception-approved
- Supply chain:
  - SBOM generation + image signing + admission verification

## 6) Observability defaults

Baseline stack:
- Metrics: Prometheus
- Dashboards: Grafana
- Logs: Loki (or ELK if enterprise standard)
- Traces: OpenTelemetry Collector + Tempo/Jaeger

Per-service defaults:
- Standard labels (`service`, `team`, `env`, `version`)
- RED metrics (Rate, Errors, Duration)
- Trace propagation enabled
- Structured logs with correlation IDs

## 7) Developer experience (DX)

Provide consistent CLI/Make targets:
- `make platform-check`
- `make platform-plan ENV=dev`
- `make platform-apply ENV=dev`
- `make app-bootstrap SERVICE=<name>`
- `make app-deploy ENV=dev SERVICE=<name> TAG=<tag>`

DX principles:
- paved roads over one-off scripts
- docs-as-code + runbooks in service templates
- fast local feedback and pre-commit checks

## 8) Suggested rollout plan

1. **Phase 1**: repo restructure, CI guardrails, environment split.
2. **Phase 2**: EKS baseline + Argo CD + observability stack.
3. **Phase 3**: Backstage templates + scorecards + SLO framework.
4. **Phase 4**: policy hardening, cost governance, multi-team onboarding.
