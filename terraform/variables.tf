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

variable "secret_path" {
  description = "Path for the sample secret written by Terraform."
  type        = string
  default     = "jenkins/demo"
}

variable "vault_username" {
  description = "Username stored in Vault for the sample secret."
  type        = string

  validation {
    condition     = trimspace(var.vault_username) != ""
    error_message = "vault_username must not be empty."
  }
}

variable "vault_password" {
  description = "Password stored in Vault for the sample secret."
  type        = string
  sensitive   = true

  validation {
    condition     = trimspace(var.vault_password) != ""
    error_message = "vault_password must not be empty."
  }
}
