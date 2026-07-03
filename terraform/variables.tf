variable "vault_addr" {
  description = "Vault API address for the local or remote Vault instance."
  type        = string
  default     = "http://127.0.0.1:8200"
}

variable "vault_token" {
  description = "Vault token used by Terraform to authenticate."
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Environment name used for policy naming and secret path conventions."
  type        = string
  default     = "local"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}$", var.environment))
    error_message = "environment must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "secret_mount" {
  description = "Vault KV v2 mount that contains application secrets."
  type        = string
  default     = "secret"
}

variable "secret_path" {
  description = "Vault KV v2 secret path that CI is allowed to read. Terraform creates policy only; it does not write secret values."
  type        = string
  default     = "jenkins/demo"

  validation {
    condition     = can(regex("^[A-Za-z0-9][A-Za-z0-9_./-]*$", var.secret_path))
    error_message = "secret_path must be a non-empty Vault path using letters, numbers, underscore, dot, slash, or hyphen."
  }
}
