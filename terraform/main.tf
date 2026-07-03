module "jenkins_read_policy" {
  source = "./modules/vault-policy"

  name        = "jenkins-read-${var.environment}"
  mount       = var.secret_mount
  secret_path = var.secret_path
  capabilities = [
    "read",
  ]
}
