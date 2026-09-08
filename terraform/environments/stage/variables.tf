variable "environment" {
  description = "Platform environment name."
  type        = string
  default     = "stage"

  validation {
    condition     = var.environment == "stage"
    error_message = "This environment root must be used with environment=stage."
  }
}

variable "vault_addr" {
  description = "Vault API address."
  type        = string
  default     = "https://vault.stage.example.com"
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
