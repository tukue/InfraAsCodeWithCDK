package main

import rego.v1

deny contains msg if {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.securityContext.runAsNonRoot
  msg := sprintf("deployment %q container %q must set securityContext.runAsNonRoot=true", [input.metadata.name, container.name])
}

deny contains msg if {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  container.securityContext.allowPrivilegeEscalation != false
  msg := sprintf("deployment %q container %q must set securityContext.allowPrivilegeEscalation=false", [input.metadata.name, container.name])
}

deny contains msg if {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.requests.cpu
  msg := sprintf("deployment %q container %q must define resources.requests.cpu", [input.metadata.name, container.name])
}

deny contains msg if {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.requests.memory
  msg := sprintf("deployment %q container %q must define resources.requests.memory", [input.metadata.name, container.name])
}

deny contains msg if {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.limits.cpu
  msg := sprintf("deployment %q container %q must define resources.limits.cpu", [input.metadata.name, container.name])
}

deny contains msg if {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  not container.resources.limits.memory
  msg := sprintf("deployment %q container %q must define resources.limits.memory", [input.metadata.name, container.name])
}

deny contains msg if {
  input.kind == "Deployment"
  container := input.spec.template.spec.containers[_]
  endswith(container.image, ":latest")
  msg := sprintf("deployment %q container %q must not use mutable image tags like :latest", [input.metadata.name, container.name])
}
