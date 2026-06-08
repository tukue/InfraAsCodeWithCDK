Vault AppRole integration (CI-friendly)

This guide shows how to provision a Vault AppRole for CI (e.g., GitHub Actions) and bind it to the `jenkins-read` policy created by Terraform.

Security notes:
- Do NOT commit role_id or secret_id to VCS.
- Generate secret_id at creation time and store it in your CI secret store (GitHub Actions secrets, AWS Secrets Manager, etc.).
- Prefer short TTLs and periodic rotation of secret_id.

Prerequisites:
- Vault CLI installed and authenticated (VAULT_ADDR, VAULT_TOKEN set locally)
- The `vault_policy.jenkins_read` is created by terraform/main.tf in this repo.

Create AppRole (example):

  # Enable AppRole backend (idempotent)
  vault auth enable -path=approle approle

  # Create a role bound to the jenkins-read policy
  vault write auth/approle/role/ci-role \
    token_ttl=1h token_max_ttl=24h secret_id_ttl=24h \
    policies="jenkins-read" bind_secret_id=true

  # Read the stable role_id
  vault read -field=role_id auth/approle/role/ci-role/role-id

  # Generate a one-time secret_id (store it in CI secrets; rotate as needed)
  vault write -f -field=secret_id auth/approle/role/ci-role/secret-id

CI usage example (GitHub Actions):
- Store ROLE_ID and SECRET_ID in repository secrets (or use OIDC to avoid long-lived secrets)
- In workflow, obtain Vault token via AppRole login:

  response=$(vault write -format=json auth/approle/login role_id="$ROLE_ID" secret_id="$SECRET_ID")
  VAULT_TOKEN=$(echo "$response" | jq -r .auth.client_token)

- Use VAULT_TOKEN to read secrets during the job (or use short-lived tokens only to fetch encrypted values)

Further hardening:
- Consider using OIDC-based Vault auth where GitHub Actions can obtain short-lived tokens without storing SECRET_ID.
- Use AWS KMS or transit secrets for encryption of stored values if required.
