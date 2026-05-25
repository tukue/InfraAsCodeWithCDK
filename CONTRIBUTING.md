# Contributing

## Platform API compatibility

The platform construct APIs are treated as internal product contracts.

- Additive optional props are minor-compatible changes.
- Changing defaults that affect deployed infrastructure requires a migration note.
- Removing props, changing required props, or replacing resources requires a deprecation cycle.

## Deprecation policy

Deprecated construct props and behavior remain available for at least one release train before removal.

Every deprecation must include:

- replacement guidance,
- migration steps,
- target removal release,
- test coverage for both old and new behavior during the deprecation window.

## Pull request expectations

Platform changes must include:

- `npm run build`
- `npm test`
- `npm run synth`
- focused tests for new constructs, policies, or environment behavior
- documentation updates when the consumer contract changes

## Ownership

The platform team owns reusable constructs, configuration contracts, policy packs, and CI gates. Application teams own service-specific code and configuration that consumes those platform APIs.
