# Terraform Vault Setup

This folder contains a minimal Terraform configuration for integrating with a local Vault instance.

## What it does

- Connects Terraform to Vault through the Vault provider
- Creates a sample read policy for Jenkins
- Writes a configurable KV v2 secret with a username and password

## Prerequisites

- Vault running locally at `http://127.0.0.1:8200`
- A valid Vault token
- Terraform installed

## Quick Start

```bash
cd terraform
copy terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

If you prefer environment variables, you can also export:

```bash
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_TOKEN=root
```

Then pass the username and password through `terraform.tfvars`, `-var` flags, or `TF_VAR_` environment variables:

```bash
export TF_VAR_vault_username=alice
export TF_VAR_vault_password='Str0ngP@ssw0rd!'
```

or:

```bash
terraform apply -var="vault_username=alice" -var="vault_password=Str0ngP@ssw0rd!"
```

## Example secret path

- `jenkins/demo`

## Example policy

- `jenkins-read`
