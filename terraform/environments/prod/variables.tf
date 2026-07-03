variable "environment" {
  description = "Platform environment name."
  type        = string
  default     = "prod"

  validation {
    condition     = var.environment == "prod"
    error_message = "This environment root must be used with environment=prod."
  }
}

variable "vault_addr" {
  description = "Vault API address."
  type        = string
  default     = "https://vault.prod.example.com"
}

variable "vault_token" {
  description = "Vault token used by Terraform. Prefer CI OIDC/AppRole for real environments."
  type        = string
  sensitive   = true
}

variable "secret_mount" {
  description = "Vault KV v2 mount for application secrets."
  type        = string
  default     = "secret"
}
