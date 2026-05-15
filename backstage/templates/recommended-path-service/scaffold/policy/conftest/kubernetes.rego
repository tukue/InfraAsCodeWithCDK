package main

deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.containers[_].resources.limits.cpu
  msg := "container cpu limits are required"
}

deny[msg] {
  input.kind == "Deployment"
  not input.spec.template.spec.containers[_].readinessProbe
  msg := "readinessProbe is required"
}

deny[msg] {
  input.kind == "Deployment"
  image := input.spec.template.spec.containers[_].image
  endswith(image, ":latest")
  msg := "latest tag is not allowed in deployment manifests"
}
