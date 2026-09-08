output "policy_name" {
  description = "Vault policy name for CI secret reads."
  value       = module.ci_secret_read_policy.name
}

output "secret_path" {
  description = "Secret path covered by the CI read policy."
  value       = "apps/${var.environment}/ci"
}
