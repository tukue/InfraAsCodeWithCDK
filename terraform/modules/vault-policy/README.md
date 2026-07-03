# Vault Policy Module

Creates a least-privilege Vault ACL policy for a single KV v2 secret path.

This module intentionally does not write secret values. Terraform state should hold platform configuration such as policies and auth roles, not application passwords.
