variable "name" {
  description = "Vault policy name."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,63}$", var.name))
    error_message = "name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "mount" {
  description = "Vault KV v2 mount name."
  type        = string
  default     = "secret"
}

variable "secret_path" {
  description = "Vault KV v2 secret path covered by the policy."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9][A-Za-z0-9_./-]*$", var.secret_path))
    error_message = "secret_path must be a non-empty Vault path using letters, numbers, underscore, dot, slash, or hyphen."
  }
}

variable "capabilities" {
  description = "Vault capabilities granted on the secret path."
  type        = list(string)
  default     = ["read"]

  validation {
    condition = alltrue([
      for capability in var.capabilities :
      contains(["create", "read", "update", "delete", "list", "sudo"], capability)
    ])
    error_message = "capabilities may only contain valid Vault ACL capabilities."
  }
}
