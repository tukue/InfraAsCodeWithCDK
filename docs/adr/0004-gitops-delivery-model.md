# ADR-0004: GitOps Delivery Model

## Status

Accepted

## Context

Application teams need a reliable, auditable way to deploy their services. Manual deployments lead to:
- Configuration drift
- No audit trail
- Inconsistent environments
- Rollback difficulties

## Decision

Adopt a GitOps delivery model using:
1. **Git as the single source of truth** for all manifests
2. **Pull requests** as the mechanism for change
3. **Policy-as-Code** (OPA/Conftest) as compliance gate
4. **Argo CD** as the deployment operator
5. **Kustomize** for environment overlays

The delivery pipeline:
1. Developer creates PR to `applications/gitops/`
2. CI runs kubeconform validation + conftest policy checks
3. PR must pass all gates before merge
4. Argo CD detects changes and reconciles the cluster

## Consequences

- All changes are auditable via git history
- Policy violations block deployment at PR time
- Environment overlays prevent config drift
- Teams need to understand Kustomize overlays
- Argo CD must be deployed in the target cluster
