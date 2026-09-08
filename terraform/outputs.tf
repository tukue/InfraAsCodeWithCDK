output "vault_addr" {
  description = "Vault address used by Terraform."
  value       = var.vault_addr
}

output "secret_path" {
  description = "Vault secret path covered by the read policy. Terraform does not write the secret value."
  value       = var.secret_path
}

output "policy_name" {
  description = "Name of the Vault policy."
  value       = module.jenkins_read_policy.name
}
