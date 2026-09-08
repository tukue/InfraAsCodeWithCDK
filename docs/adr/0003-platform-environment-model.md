# ADR-0003: Platform Environment Model

## Status

Accepted

## Context

The platform supports multiple environments (dev, stage, prod) with different configuration requirements. A clear environment model is needed for:
- Consistent configuration management
- Promotion gates between environments
- Cost allocation and governance
- Security boundary enforcement

## Decision

Adopt a three-environment model with strict promotion order:

1. **dev**: Development environment
   - Data classification: internal
   - Feature flags: relaxed defaults
   - Budget: $50/month
   - No approval needed for deployment

2. **stage**: Pre-production validation
   - Data classification: confidential
   - Feature flags: production-like
   - Budget: $100/month
   - Auto-promotion from dev

3. **prod**: Production
   - Data classification: confidential
   - Feature flags: hardened defaults
   - Budget: $500/month
   - Manual approval gate required

## Consequences

- Environment configs are defined in `platform-config.ts`
- Pipeline promotes dev -> stage -> prod sequentially
- Each environment has separate AWS account (recommended) or separate stack
- Feature flags can vary by environment
- Platform config is type-safe via TypeScript
