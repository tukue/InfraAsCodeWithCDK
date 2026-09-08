# Terraform Platform Foundations

This folder contains the Terraform slice of the platform reference implementation. CDK remains the primary AWS application/platform IaC in this repository; Terraform is intentionally scoped to external platform integrations where it is a strong fit, starting with Vault policy management.

## What Terraform manages

- Reusable Vault policy modules.
- Per-environment Vault policy roots for `dev`, `stage`, and `prod`.
- Backend configuration examples for remote state and locking.

Terraform does **not** write application secret values. Secret values should be written through Vault operational workflows, CI runtime injection, or short-lived identity-based access. This avoids storing passwords in Terraform state.

## Structure

```text
terraform/
  modules/
    vault-policy/                  # Reusable least-privilege Vault policy module
  environments/
    dev/
      backend.hcl.example          # S3 state + DynamoDB lock example
      main.tf
      variables.tf
      outputs.tf
      terraform.tfvars.example
    stage/
    prod/
  approle/                         # CI AppRole helper scripts and docs
  main.tf                          # Local compatibility example using the same module
  variables.tf
  outputs.tf
  terraform.tfvars.example
```

## Remote state and locking

Each environment includes a `backend.hcl.example` file:

```bash
cd terraform/environments/dev
cp backend.hcl.example backend.hcl
terraform init -backend-config=backend.hcl
```

The backend examples use:

- S3 for encrypted remote state.
- DynamoDB for state locking.
- One state key per environment.

For local portfolio demos, use `terraform init -backend=false` during validation or keep the root `terraform/` example with local state. Do not use local state for shared environments.

## Environment validation

```bash
cd terraform/environments/dev
terraform init -backend=false
terraform validate
terraform plan -var-file=terraform.tfvars
```

Repeat for `stage` and `prod`, or rely on `.github/workflows/terraform-iac-ci.yml` to validate all three environment roots on pull requests.

## Secrets model

Terraform creates policies such as:

```hcl
path "secret/data/apps/dev/ci" {
  capabilities = ["read"]
}
```

It does not create the secret payload at that path. Write secret values through an operational command such as:

```bash
vault kv put secret/apps/dev/ci username=ci password=REPLACE_WITH_RUNTIME_SECRET
```

For CI, prefer Vault OIDC auth. AppRole is included as a demo fallback under `terraform/approle/`.

## CI expectations

The Terraform CI workflow runs:

- `terraform fmt -check`
- `terraform init -backend=false`
- `terraform validate`
- Checkov Terraform scan
- Trivy config scan

Apply should be a separate protected workflow with GitHub Environments, environment-specific Vault auth, and approval for production.
