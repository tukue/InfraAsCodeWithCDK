# Recommended Path Service Template

This Backstage software template is the simplified platform-engineering example in this repository.

It scaffolds one service repository end to end with:

- Service source
- GitHub Actions CI and release flow
- GHCR image build and tag publication
- Kubernetes manifest tag update
- Argo CD application definition
- Default Grafana dashboard and Prometheus alerts
- OPA policy checks for Kubernetes manifests

The template lives in `template.yaml` and the generated repository structure is under `scaffold/`.
