resource "vault_policy" "this" {
  name = var.name

  policy = <<EOT
path "${var.mount}/data/${var.secret_path}" {
  capabilities = [${join(", ", [for capability in var.capabilities : format("%q", capability)])}]
}
EOT
}
