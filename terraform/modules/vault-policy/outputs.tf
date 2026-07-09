output "name" {
  description = "Vault policy name."
  value       = vault_policy.this.name
}

output "policy" {
  description = "Rendered Vault policy document."
  value       = vault_policy.this.policy
}
