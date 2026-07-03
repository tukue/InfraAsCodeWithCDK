terraform {
  required_version = ">= 1.6.0"

  backend "s3" {}

  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 4.0"
    }
  }
}

provider "vault" {
  address = var.vault_addr
  token   = var.vault_token
}

module "ci_secret_read_policy" {
  source = "../../modules/vault-policy"

  name        = "ci-read-${var.environment}"
  mount       = var.secret_mount
  secret_path = "apps/${var.environment}/ci"
}
