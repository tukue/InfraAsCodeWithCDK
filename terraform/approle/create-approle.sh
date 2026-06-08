#!/usr/bin/env bash
set -euo pipefail

# Usage: ./create-approle.sh [role-name] [policy]
ROLE_NAME=${1:-ci-role}
POLICY_NAME=${2:-jenkins-read}

if ! command -v vault >/dev/null 2>&1; then
  echo "vault CLI not found. Install it and authenticate (VAULT_ADDR, VAULT_TOKEN)." >&2
  exit 2
fi

: "${VAULT_ADDR:?}"
: "${VAULT_TOKEN:?}"

echo "Ensuring AppRole auth backend is enabled at approle/"
if ! vault auth list -format=json | grep -q 'approle/'; then
  echo "Enabling approle auth backend"
  vault auth enable -path=approle approle
else
  echo "AppRole backend already enabled"
fi

echo "Creating role '${ROLE_NAME}' bound to policy '${POLICY_NAME}'"
vault write auth/approle/role/${ROLE_NAME} \
  token_ttl=1h token_max_ttl=24h secret_id_ttl=24h \
  policies="${POLICY_NAME}" bind_secret_id=true

echo "Reading role_id (store this in CI)"
ROLE_ID=$(vault read -field=role_id auth/approle/role/${ROLE_NAME}/role-id)
echo "ROLE_ID=${ROLE_ID}"

echo "Generating secret_id (one-time). Store this securely in CI secrets and delete after use)"
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/${ROLE_NAME}/secret-id)
echo "SECRET_ID=${SECRET_ID}"

echo "DONE — do NOT commit ROLE_ID or SECRET_ID. Add them to your CI secret store instead."
