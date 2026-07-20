---
name: platform-engineering-best-practices
description: Use when reviewing or improving infrastructure/platform repositories from a senior platform engineering perspective, especially for Terraform, CDK, GitOps, CI/CD, security, observability, environment separation, and developer self-service. Apply this skill before proposing or implementing platform improvements so recommendations map technical changes to practical engineering outcomes.
---

# Platform Engineering Best Practices

Use this skill whenever the task is to review, improve, refactor, or extend a platform engineering repository.

The goal is practical maturity: improve reusable platform foundations, secure defaults, automated validation, clear environment separation, and developer-friendly workflows without overbuilding.

## Review Principles

Start by understanding the repository before changing it:

- Inspect the current branch, diff, and uncommitted changes.
- Identify the base branch if reviewing a PR.
- Read README, architecture docs, Terraform/CDK entry points, CI workflows, policy files, and onboarding docs.
- Prefer existing project conventions over new abstractions.
- Separate current implementation facts from target-state recommendations.

When reviewing, lead with findings:

- Prioritize bugs, security risks, workflow failures, environment-isolation issues, and missing validation.
- Ground each finding in file and line references.
- Avoid generic best-practice lists unless they are tied to concrete repo changes.
- Call out validation gaps honestly.

## Platform Engineering Checklist

Use this checklist as the default assessment frame.

### IaC Structure

- Root modules should be small composition layers.
- Reusable modules or constructs should own repeatable patterns.
- Avoid duplicating equivalent infrastructure across CDK and Terraform.
- Keep Terraform scoped to areas where it is the right tool, such as external integrations, bootstrap resources, Vault, or cross-account/account-level setup.
- Keep CDK constructs typed, tested, and versionable.

### Environment Separation

- `dev`, `stage`, and `prod` must have explicit configuration.
- Stack names, state keys, resource names, tags, and deployment jobs must include the environment.
- Promotion should be visible and ordered.
- Production should require protected environment approval.
- Avoid deploying multiple environments into the same stack name unless it is intentionally a shared global stack.

### State And Backends

- Terraform shared environments should use remote state.
- Prefer S3 with encryption and DynamoDB locking for AWS-backed examples.
- State keys should be environment-specific.
- Backend examples should match the repository's default region.
- Do not store secret payloads in Terraform state.

### Naming And Tags

- Use consistent lowercase resource naming.
- Include environment, owner, project, cost center, and data classification tags where applicable.
- Use stable names for externally referenced resources and generated names where replacement safety matters.
- Make tags part of tests or policy checks for critical resources.

### Security And IAM

- Prefer OIDC federation for CI cloud credentials.
- Avoid long-lived cloud access keys in GitHub secrets.
- Use environment-scoped deploy roles.
- Grant least privilege and avoid broad wildcard policies.
- Configure AWS credentials before CDK/Terraform deployment steps.
- Validate that `id-token: write` is paired with an explicit credential configuration action.

### Secrets Management

- Do not commit secrets, tokens, AppRole secret IDs, or generated credentials.
- Do not write application secret payloads through Terraform unless the state backend and access model are explicitly designed for that risk.
- Prefer managing Vault policies, mounts, auth roles, and paths in Terraform.
- Fetch runtime secrets without logging values.
- Mask fetched values before any later step can print them.

### CI/CD

- Pull requests should run formatting, linting, tests, synth/plan, and security scans.
- Terraform PRs should run `terraform fmt`, `init -backend=false`, `validate`, and plan where credentials are available.
- CDK PRs should run build, lint, tests, synth, cdk-nag, Checkov, and Trivy.
- Apply/deploy should be separate from validation and gated by GitHub Environments.
- Keep CI paths aligned with changed files so relevant checks always run.

### Policy As Code

- Use OPA/Conftest, Checkov, Trivy, cdk-nag, or equivalent tools for early feedback.
- Start with high-signal rules: non-root runtime, no privilege escalation, resource requests/limits, immutable images, encryption, and public exposure.
- Add rules gradually and document warn-before-block rollout where relevant.
- Validate generated templates, not only hand-written examples.

### Cost Optimization

- Add budget and anomaly detection where supported.
- Tag resources for ownership and cost attribution.
- Set environment-appropriate retention and scaling defaults.
- Avoid expensive defaults in portfolio/demo paths unless they demonstrate a specific platform capability.

### Observability

- Provide baseline logs, metrics, traces, dashboards, and alarms for golden paths.
- Include correlation IDs where APIs or async flows exist.
- Make operational outputs discoverable: dashboard names, log groups, alarm topics, and runbook links.
- Avoid creating alerts without ownership and routing context.

### GitOps And Self-Service

- Backstage templates should generate secure-by-default service repos.
- GitOps examples should include base plus environment overlays.
- Application manifests should include ownership labels and policy-compliant runtime settings.
- Self-service paths should map to measurable outcomes such as time to first deploy and policy compliance rate.

### Documentation And Onboarding

- Add docs for new platform capabilities, not just code.
- Include prerequisites, local commands, CI expectations, and operating model impact.
- Provide clear examples for environment promotion, rollback, and ownership.
- Keep docs realistic for the maturity level of the repository.

## Implementation Guidance

When asked to implement improvements:

1. Inspect the repo and identify the smallest high-impact change.
2. Prefer changes that strengthen existing architecture rather than introducing a parallel platform.
3. Patch code and docs together when behavior or workflows change.
4. Add or update tests/checks when the change affects shared contracts.
5. Run the most relevant local validation available.
6. If local validation is blocked by missing tools, old versions, or network/certificate issues, report that precisely.

## Default Improvement Priorities

Use this order unless the user asks for something more specific:

1. Fix security issues and credential handling.
2. Fix environment isolation and state separation.
3. Add validation and CI gates.
4. Improve reusable modules or constructs.
5. Improve secrets handling.
6. Improve generated golden-path templates.
7. Improve observability and cost controls.
8. Improve documentation and onboarding.

## Response Format For Reviews

When the user asks for a review, answer in this order:

1. Findings, ordered by severity.
2. Open questions or assumptions.
3. Summary of what the PR implements.
4. Validation performed and validation gaps.

Keep findings concrete and tied to exact files.

## Response Format For Implementation

When the user asks to implement improvements, answer with:

- What changed.
- Why it matters from a platform engineering perspective.
- Validation performed.
- Remaining practical next step.

Do not overbuild. Favor small, demonstrable platform improvements that would make sense in a backend/platform engineering portfolio project.
