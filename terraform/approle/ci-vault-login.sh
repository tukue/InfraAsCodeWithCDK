#!/usr/bin/env bash
set -euo pipefail

# Usage: ROLE_ID=... SECRET_ID=... SECRET_PATH=jenkins/demo ./ci-vault-login.sh
ROLE_ID=${ROLE_ID:-}
SECRET_ID=${SECRET_ID:-}
SECRET_PATH=${SECRET_PATH:-jenkins/demo}

if [ -z "$ROLE_ID" ] || [ -z "$SECRET_ID" ]; then
  echo "ROLE_ID and SECRET_ID must be provided via environment variables." >&2
  exit 2
fi

if ! command -v vault >/dev/null 2>&1; then
  echo "vault CLI not found. Install it and authenticate (VAULT_ADDR)." >&2
  exit 2
fi

# Login via AppRole
echo "Logging into Vault via AppRole (role_id from CI secret)"
vault login -method=approle role_id="$ROLE_ID" secret_id="$SECRET_ID" >/dev/null

# Fetch secret from KV v2 at secret/<path>
# This example reads the field 'password' from the secret; adjust as needed.
echo "Fetching secret at 'secret/${SECRET_PATH}' (field: password)"
SECRET_VALUE=$(vault kv get -field=password "secret/${SECRET_PATH}")

# Mask the secret in logs if running in CI (GitHub Actions supports ::add-mask::)
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "::add-mask::$SECRET_VALUE"
fi

# Print success without exposing secret
echo "Fetched secret for ${SECRET_PATH} (value masked)."

# Optionally export for downstream steps
export VAULT_SECRET_VALUE="$SECRET_VALUE"
