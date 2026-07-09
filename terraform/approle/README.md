Vault AppRole integration (CI-friendly)

This guide shows how to provision a Vault AppRole for CI (e.g., GitHub Actions) and bind it to a read policy created by Terraform.

Security notes:
- Do NOT commit role_id or secret_id to VCS.
- Generate secret_id at creation time and store it in your CI secret store (GitHub Actions secrets, AWS Secrets Manager, etc.).
- Prefer short TTLs and periodic rotation of secret_id.

Prerequisites:
- Vault CLI installed and authenticated (VAULT_ADDR, VAULT_TOKEN set locally)
- A Vault read policy is created by `terraform/main.tf` for local demos or by `terraform/environments/{dev,stage,prod}` for environment-specific usage.

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

Ordered integration (easy step-by-step)

1) Provision baseline policy
   - Run `terraform init` and `terraform apply` in `/terraform` for a local demo, or in `terraform/environments/<env>` for an environment-specific policy.
   - Terraform creates the policy only; write the actual secret value through Vault operational workflows so secret material is not stored in Terraform state.

2) Create an AppRole for CI
   - From a secure admin session run `./terraform/approle/create-approle.sh ci-role jenkins-read`.
   - The script prints ROLE_ID and SECRET_ID. Copy these values securely; do NOT commit them.

3) Store credentials in CI
   - Add the following repository secrets in GitHub (or your CI secret store):
     - VAULT_ADDR (e.g., https://vault.example.com)
     - VAULT_ROLE_ID
     - VAULT_SECRET_ID
   - Prefer using a short-lived SECRET_ID and rotate regularly.

4) Demo / CI usage (example workflow provided)
   - A demo workflow `.github/workflows/vault-approle-demo.yml` is included. Trigger it via the Actions UI (workflow_dispatch) and provide the secret_path input (default `jenkins/demo`).
   - The workflow logs in via AppRole and fetches the secret; it masks the secret in logs.

5) Optional: avoid storing SECRET_ID by using OIDC-based Vault auth
   - For production CI, prefer OIDC (GitHub Actions → Vault) to remove long-lived CI secrets.

Security notes & recommendations
- Never commit ROLE_ID or SECRET_ID to the repository. Treat SECRET_ID like a password.
- Use short TTLs and rotate SECRET_ID frequently. Automate rotation where possible.
- Scope AppRole policies to the minimum required paths (e.g., `path "secret/data/jenkins/*" { capabilities = ["read"] }`).
- If you need Terraform-managed AppRole resources, create only the role (not secret_ids) and avoid storing secrets in state.
