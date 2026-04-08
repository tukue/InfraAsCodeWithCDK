# Platform as a Product Review (CDK Repository)

Date: 2026-04-08

## Assumptions

This review is based on the current repository content and existing documentation. Where implementation modules are placeholders, recommendations assume an AWS enterprise setup with multiple accounts and environments (dev, stage, prod) and internal app teams as primary consumers.

---

## 1) Executive summary

This repository has a strong **intentional Platform-as-a-Product direction** (clear architecture narrative, templates, policy examples, and operating model docs), but the **implementation is still concentrated in a single sample stack** and lacks packaged platform APIs that application teams can consume safely at scale.

The highest-leverage move is to convert this from “documented target state” to “productized platform SDK + reference implementations” by:

- Creating reusable, versioned high-level CDK constructs (L3) with secure defaults.
- Separating platform modules from app composition stacks.
- Standardizing environment configuration and deployment orchestration.
- Enforcing policy and quality gates in CI (cdk-nag, synth/snapshot tests, policy checks).
- Shipping golden-path examples + self-service documentation that optimize for app-team time-to-first-deploy.

---

## 2) Current-state risks and gaps

### Product mindset

- Good: Repo messaging strongly frames internal developers as customers.
- Gap: No explicit platform product contract (SLOs, support model, release channels, compatibility guarantees).
- Risk: Teams may consume patterns inconsistently because interfaces are mostly documentation-driven, not API-driven.

### Repository and architecture

- Gap: Runtime IaC is still primarily in `lib/cdk-app-stack.ts` as a broad, mixed-responsibility stack.
- Gap: Limited separation between:
  - shared platform capabilities,
  - environment orchestration,
  - application-facing consumption interfaces.
- Risk: Copy/paste stack growth and drift across teams/environments.

### CDK implementation

- Gap: No reusable opinionated constructs package (e.g., `ApiService`, `DataService`, `SecureFunction`).
- Gap: No formal environment config model (typed config + schema validation + per-account mapping).
- Gap: No enforceable guardrails at synth/test time (aspects, cdk-nag, custom policy validations).

### Developer experience

- Good: Makefile targets are straightforward.
- Gap: onboarding path lacks “first 30 minutes” runnable golden-path journey with expected outputs.
- Gap: discoverability of abstractions is low; no construct catalog/reference docs generated from code.

### Security/compliance

- Good: encryption, observability, and IAM defaults are present in the sample stack.
- Gap: security posture is not consistently enforced across all future stacks through centralized constructs/aspects.
- Gap: CI policy checks are mostly placeholders vs mandatory gates.

### CI/CD and operations

- Gap: no explicit staged pipeline contract (validate → synth → diff approval → deploy).
- Gap: no drift detection job and no release/version lifecycle for platform modules.

---

## 3) Recommended target-state architecture

Adopt a **three-layer platform architecture**:

1. **Core Platform Modules (L2/L3 constructs)**
   - Reusable, security-hardened building blocks.
   - Published as internal packages.
2. **Platform Product APIs**
   - Opinionated higher-level abstractions for app teams.
   - Stable interfaces and migration guides.
3. **Environment Composition**
   - Account/region-specific stack assembly and deployment orchestration.

### Design principles

- Secure and observable by default.
- Opinionated defaults + explicit escape hatches.
- Backward-compatible API evolution with semantic versioning.
- Fast feedback loops: local validation and pre-merge policy checks.

---

## 4) Concrete repository structure proposal

```text
.
├── packages/
│   ├── platform-constructs/               # Reusable L3 constructs (versioned)
│   │   ├── src/
│   │   │   ├── api-service/
│   │   │   ├── data-service/
│   │   │   ├── observability/
│   │   │   ├── security/
│   │   │   └── index.ts
│   │   ├── test/
│   │   └── package.json
│   ├── platform-config/                   # Typed config model + validation
│   └── platform-policies/                 # cdk-nag/custom aspects/policy packs
├── platform/
│   ├── environments/
│   │   ├── dev/
│   │   ├── stage/
│   │   └── prod/
│   ├── apps/                              # CDK app entrypoints per domain
│   │   ├── networking/
│   │   ├── shared-services/
│   │   └── tenant-foundations/
│   └── pipelines/
├── applications/
│   ├── templates/
│   ├── examples/                          # Example consuming apps using platform APIs
│   └── gitops/
├── docs/
│   ├── adr/
│   ├── runbooks/
│   ├── onboarding/
│   └── api-reference/
├── tools/
│   ├── scripts/
│   └── lint-rules/
└── .github/workflows/
```

Trade-off: monorepo improves discoverability and shared tooling; independent repos can isolate blast radius but increase integration overhead. For this platform stage, monorepo + package boundaries is recommended.

---

## 5) Prioritized improvement plan

### Quick wins (0–30 days)

- Define and publish platform product contract:
  - supported personas,
  - support channels,
  - compatibility and deprecation policy.
- Add mandatory CI checks:
  - `npm run build`, `cdk synth`, unit tests, snapshot tests.
  - `cdk-nag` + policy scan gates.
- Create one golden-path construct (`ApiLambdaDynamoService`) and one example app consuming it.
- Add typed environment config with schema validation and fail-fast errors.

### Medium-term improvements (1–2 quarters)

- Split code into internal packages (`platform-constructs`, `platform-config`, `platform-policies`).
- Implement multi-account deployment orchestration with clear promotion flow (dev → stage → prod).
- Add automated docs generation for constructs and usage examples.
- Introduce drift detection and scheduled compliance scans.

### Long-term maturity (2+ quarters)

- Backstage plugin integration for platform API catalog + scorecards.
- Progressive delivery support (feature flags, canary/blue-green patterns).
- SLO-driven platform operations and developer-experience telemetry loops.

---

## 6) Example folder structure for a CDK repository

```text
packages/platform-constructs/src/
  api-service/
    index.ts
    props.ts
    defaults.ts
  data-service/
  security/
  observability/
platform/apps/tenant-foundations/
  bin/app.ts
  lib/tenant-foundation.stack.ts
platform/environments/dev/config.yaml
applications/examples/orders-service/
  infra/stack.ts
  app/
```

---

## 7) Example standards for constructs, stacks, and configuration

### Construct standards

- Every L3 construct must include:
  - secure defaults (encryption, logging, least privilege),
  - observability defaults (metrics/log retention/tracing),
  - input validation and descriptive error messages,
  - escape hatch props under `overrides`.

### Stack standards

- Stacks should compose constructs; avoid direct raw resource definitions except inside platform construct packages.
- Enforce tags (`owner`, `cost-center`, `data-classification`, `environment`).
- Use aspects to enforce org rules (no public S3 unless explicitly approved, mandatory encryption, etc.).

### Configuration standards

- Single typed config model per environment/account.
- No implicit environment variables for critical config.
- Validate configuration before synth and fail with actionable messages.

### Example API pattern

```ts
export interface ApiLambdaDynamoServiceProps {
  serviceName: string;
  runtime?: lambda.Runtime;
  alarms?: { enableP95LatencyAlarm?: boolean };
  overrides?: {
    lambda?: Partial<lambda.FunctionOptions>;
    apiGateway?: Partial<apigw.StageOptions>;
  };
}
```

---

## 8) Example CI/CD workflow for the repository

1. **PR pipeline**
   - lint/type-check/unit tests
   - synth + snapshot tests
   - cdk-nag and policy checks
   - `cdk diff` summary artifact/comment
2. **Main pipeline**
   - package/version internal modules
   - publish release notes
   - deploy to dev account
3. **Promotion pipeline**
   - manual approval + automated integration smoke tests
   - promote stage then prod with immutable artifacts
4. **Scheduled jobs**
   - drift detection
   - dependency/security scan
   - compliance posture report

---

## 9) Example developer journey for internal consumers

1. Developer opens Backstage and selects `recommended-path-k8s-service`.
2. Template scaffolds service repo with platform SDK dependency.
3. Developer selects required capabilities through simple construct props.
4. Local `make validate` catches config/policy issues before PR.
5. PR shows infra diff, policy results, and cost/security hints.
6. Merge triggers GitOps deployment to dev.
7. Promotion happens via controlled workflow with quality gates.
8. Runbook links and operational dashboards are generated automatically.

---

## 10) Metrics to measure adoption and developer satisfaction

### Adoption metrics

- % of new services using golden-path templates.
- % of services consuming platform constructs vs custom stacks.
- Platform API version adoption curve.

### DX metrics

- Time-to-first-deploy (new service).
- PR lead time for infrastructure changes.
- Failed deployment rate and mean time to recovery.
- Developer satisfaction (quarterly platform NPS/CSAT).

### Reliability/security metrics

- Drift incidents per month.
- Policy violation rate at PR vs post-deploy.
- % resources compliant with tagging/encryption/least-privilege baselines.

---

## Recommended immediate implementation backlog (top 8)

1. Build `packages/platform-constructs` with one production-grade L3 construct.
2. Add `platform-config` package with JSON schema + runtime validation.
3. Wire `cdk-nag` and custom aspects into synth tests.
4. Create `applications/examples/orders-service` as canonical consumer.
5. Add GitHub workflow for PR quality gates and diff comments.
6. Add release/versioning policy document and changelog automation.
7. Add `docs/onboarding/first-service.md` with 30-minute tutorial.
8. Define deprecation policy and contribution governance in `CONTRIBUTING.md`.
