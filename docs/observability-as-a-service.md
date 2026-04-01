# Observability as a Service (OaaS) - Assessment and Implementation

_Last updated: 2026-04-01_

## Objective

Provide a platform-managed observability baseline for workloads so teams get actionable telemetry by default, without creating custom dashboards, alarms, or logging pipelines per service.

## Current-state assessment (this repo)

### Strengths already present

- API Gateway execution/access logging is enabled with CloudWatch log delivery.
- Lambda tracing is enabled (`Tracing.ACTIVE`) and API Gateway tracing is enabled.
- Shared KMS encryption is already used for API logs and other platform resources.

### Gaps identified

- No pre-provisioned dashboard that aggregates API and Lambda golden signals.
- No default alerting path for operational failures (e.g., Lambda errors, API 5xx).
- Lambda application logs were not standardized for correlation and service-level context.
- No explicit service-level observability outputs for integration into runbooks/portal metadata.

## Implemented OaaS baseline in this change

### 1) Platform alerting channel

- Added an encrypted SNS topic (`ObservabilityAlarmTopic`) for alarm fan-out.
- Wired core alarms to this topic to establish a shared notification mechanism.

### 2) Recommended baseline recommendations for alarms

- Added Lambda error alarm (sum errors over 5 minutes).
- Added Lambda latency alarm (p95 duration over 2 seconds).
- Added API Gateway 5xx alarm (sum server errors over 5 minutes).

### 3) Shared dashboard

- Added CloudWatch dashboard with:
  - Lambda invocations/errors
  - Lambda duration p50/p95
  - API requests/5xx
  - API latency p50/p95

### 4) Structured application logging contract

- Updated Lambda handler to emit JSON logs with:
  - timestamp
  - level
  - service name
  - correlation ID
  - request metadata (method/path/request ID)
- Added correlation ID propagation in API responses (`x-correlation-id`).

### 5) Discoverability outputs

- Added stack outputs for dashboard name, alarm topic ARN, and application log group name to simplify integration with platform docs and runbooks.

## Recommended next steps (Phase 2+)

1. Subscribe Slack/Email/PagerDuty endpoints to the SNS alarm topic via environment-specific config.
2. Add metric filters and alarms for error-rate SLO burn thresholds.
3. Standardize alarm severity labels and route high/medium/low priorities separately.
4. Introduce OpenTelemetry collector path for vendor-neutral traces/metrics export.
5. Export dashboard links into Backstage component annotations for developer self-service.
