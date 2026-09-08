# ADR-0005: Observability Foundation

## Status

Accepted

## Context

Platform and application teams need visibility into system health, performance, and costs. Without a standard observability foundation:
- Each team builds custom monitoring
- Alert fatigue from inconsistent thresholds
- No centralized view of platform health
- Cost overruns go undetected

## Decision

Adopt a three-pillar observability foundation:

1. **Metrics** (CloudWatch):
   - Lambda invocations, errors, duration (p50/p95/p99)
   - API Gateway request count, 5XX errors, latency
   - Composite alarm for platform health
   - Dashboard with per-environment views

2. **Logs** (CloudWatch Logs Insights):
   - Structured JSON logging from Lambda
   - API Gateway access logs
   - Error-focused log queries on dashboard

3. **Cost** (AWS Budgets + Cost Explorer):
   - Monthly budget with 80%/100% thresholds
   - Cost anomaly detection per service
   - FinOps tags for cost allocation

## Consequences

- All resources are tagged for cost allocation
- Alarms route to SNS topic (KMS-encrypted)
- Dashboard provides single-pane-of-glass view
- SLO targets displayed on dashboard
- Log queries are pre-built for common troubleshooting
