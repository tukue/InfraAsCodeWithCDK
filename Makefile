SHELL := /bin/bash
ENV ?= dev
SERVICE ?= sample-service
TAG ?= latest

.PHONY: help build test synth platform-check platform-plan platform-apply app-bootstrap app-deploy

help:
	@echo "make build                      # Build TypeScript"
	@echo "make test                       # Run tests"
	@echo "make synth                      # CDK synth"
	@echo "make platform-check             # Build + synth + lint placeholder"
	@echo "make platform-plan ENV=dev      # Plan platform changes"
	@echo "make platform-apply ENV=dev     # Apply platform changes"
	@echo "make app-bootstrap SERVICE=name # Bootstrap app from template"
	@echo "make app-deploy ENV=dev SERVICE=name TAG=v1.0.0"

build:
	npm run build

test:
	npm test

synth:
	npx cdk synth

platform-check: build synth
	@echo "[platform-check] add checkov/tfsec/cdk-nag in CI"

platform-plan:
	@echo "[platform-plan] ENV=$(ENV)"
	@echo "Use environment overlays in platform/environments/$(ENV)"

platform-apply:
	@echo "[platform-apply] ENV=$(ENV)"
	@echo "Run approved deploy pipeline for $(ENV)"

app-bootstrap:
	@echo "[app-bootstrap] SERVICE=$(SERVICE)"
	@echo "Scaffold from templates/service-catalog/template.yaml via Backstage"

app-deploy:
	@echo "[app-deploy] ENV=$(ENV) SERVICE=$(SERVICE) TAG=$(TAG)"
	@echo "Update GitOps manifest tag and let Argo CD reconcile"
