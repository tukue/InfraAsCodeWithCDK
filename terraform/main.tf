resource "vault_policy" "jenkins_read" {
  name = "jenkins-read"

  policy = <<EOT
path "secret/data/${var.secret_path}" {
  capabilities = ["read"]
}
EOT
}

resource "vault_kv_secret_v2" "sample_secret" {
  mount     = "secret"
  name      = var.secret_path
  data_json = jsonencode({
    username = var.vault_username
    password = var.vault_password
  })
}
