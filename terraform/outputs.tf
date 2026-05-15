output "vault_addr" {
  description = "Vault address used by Terraform."
  value       = var.vault_addr
}

output "secret_path" {
  description = "Path of the sample secret written to Vault."
  value       = vault_kv_secret_v2.sample_secret.name
}

output "policy_name" {
  description = "Name of the sample Vault policy."
  value       = vault_policy.jenkins_read.name
}
