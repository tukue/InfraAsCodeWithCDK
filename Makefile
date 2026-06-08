SHELL := /bin/bash
ENV ?= dev
SERVICE ?= sample-service
TAG ?= latest

.PHONY: help build test lint format coverage synth clean \
        platform-check platform-plan platform-apply \
        app-bootstrap app-deploy app-policy-test \
        precommit setup

help:
	@echo '──────────────────────────────────────────────────────'
	@echo '  InfraAsCodeWithCDK — Platform as a Product'
	@echo '──────────────────────────────────────────────────────'
	@echo ''
	@echo '  Development:'
	@echo '    make setup              # Install dependencies'
	@echo '    make build              # TypeScript compile (tsc)'
	@echo '    make lint               # ESLint check'
	@echo '    make format             # Prettier check'
	@echo '    make format:fix         # Prettier auto-fix'
	@echo '    make test               # Run unit tests'
	@echo '    make coverage           # Run tests with coverage report'
	@echo '    make synth              # CDK synth (PLATFORM_ENV=$(ENV))'
	@echo '    make clean              # Remove build artifacts'
	@echo ''
	@echo '  Pipeline:'
	@echo '    make precommit          # build + lint + test (pre-push gate)'
	@echo '    make platform-check     # build + test + synth (full gate)'
	@echo '    make platform-plan      # Plan platform changes for ENV'
	@echo '    make platform-apply     # Apply platform changes for ENV'
	@echo ''
	@echo '  Application Lifecycle:'
	@echo '    make app-bootstrap      # Scaffold new service from Backstage template'
	@echo '    make app-deploy         # Update GitOps manifest and let Argo CD reconcile'
	@echo '    make app-policy-test    # Run conftest against gitops manifests'
	@echo ''
	@echo '  Parameters:'
	@echo '    ENV=dev|stage|prod      # Target environment (default: dev)'
	@echo '    SERVICE=name            # Service name for app commands'
	@echo '    TAG=v1.0.0              # Container image tag'
	@echo ''

setup:
	npm ci

build:
	npm run build

lint:
	npm run lint

format:
	npm run format

format-fix:
	npm run format:fix

test:
	npm test

coverage:
	npm run coverage

synth:
	PLATFORM_ENV=$(ENV) npm run synth

clean:
	rm -rf dist cdk.out coverage

precommit:
	npm run precommit

platform-check: build test synth
	@echo '[platform-check] build, tests, and synth completed for ENV=$(ENV)'

platform-plan:
	@echo '[platform-plan] ENV=$(ENV)'
	@echo 'Use environment overlays in platform/environments/$(ENV)'

platform-apply:
	@echo '[platform-apply] ENV=$(ENV)'
	@echo 'Run approved deploy pipeline for $(ENV)'

app-bootstrap:
	@echo '[app-bootstrap] SERVICE=$(SERVICE)'
	@echo 'Scaffold from templates/service-catalog/template.yaml via Backstage'

app-deploy:
	@echo '[app-deploy] ENV=$(ENV) SERVICE=$(SERVICE) TAG=$(TAG)'
	@echo 'Update GitOps manifest tag and let Argo CD reconcile'

app-policy-test:
	@echo '[app-policy-test] run conftest against applications/gitops/base with applications/policy'
	conftest test applications/gitops/base/*.yaml -p applications/policy
