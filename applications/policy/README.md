# Application GitOps Policy Bundle

This directory contains OPA/Rego policies evaluated in CI with `conftest`.

## Scope

Policies currently validate Kubernetes manifests in `applications/gitops/base` and enforce:

- non-`latest` immutable image tags
- CPU/memory requests and limits
- secure container defaults (`runAsNonRoot`, `allowPrivilegeEscalation: false`)

## Local validation

```bash
conftest test applications/gitops/base/*.yaml -p applications/policy
```
