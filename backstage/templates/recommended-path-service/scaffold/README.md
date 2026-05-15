# ${{ values.name }}

Recommended path service generated from Backstage.

## What is included

- TypeScript service scaffold
- GitHub Actions CI and release pipelines
- Docker image build and publish flow
- Kubernetes manifests with image tag updates
- Argo CD application for the `dev` environment
- Grafana dashboard and Prometheus alert rules
- OPA policy checks for manifests

## Simplified flow

1. Change service code in `src/`.
2. CI builds the app and checks Kubernetes policy.
3. Merges to `main` build an image and update the dev image tag in Git.
4. Argo CD syncs the `deploy/overlays/dev` state into the cluster.
