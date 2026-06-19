SHELL := /bin/bash
ENV ?= dev
SERVICE ?= sample-service
TAG ?= latest

.PHONY: help setup build lint format format-fix test coverage \
        synth diff deploy destroy clean precommit audit \
        platform-check platform-plan platform-apply \
        app-bootstrap app-deploy app-policy-test \
        dev-deps dev-start dev-stop dev-status \
        docs-serve security-check scorecard

help:
	@echo '──────────────────────────────────────────────────────'
	@echo '  InfraAsCodeWithCDK — Platform as a Product'
	@echo '──────────────────────────────────────────────────────'
	@echo ''
	@echo '  Development:'
	@echo '    make setup              # Install dependencies (npm ci)'
	@echo '    make build              # TypeScript compile (tsc)'
	@echo '    make lint               # ESLint check'
	@echo '    make format             # Prettier check'
	@echo '    make format-fix         # Prettier auto-fix'
	@echo '    make test               # Run unit tests'
	@echo '    make coverage           # Run tests with coverage report'
	@echo '    make synth              # CDK synth (PLATFORM_ENV=$(ENV))'
	@echo '    make diff               # CDK diff against deployed'
	@echo '    make deploy             # CDK deploy (PLATFORM_ENV=$(ENV))'
	@echo '    make destroy            # CDK destroy (careful!)'
	@echo '    make clean              # Remove build artifacts'
	@echo '    make audit              # npm audit'
	@echo ''
	@echo '  Pipeline (Quality Gates):'
	@echo '    make precommit          # build + lint + test (pre-push gate)'
	@echo '    make platform-check     # build + test + synth (full gate)'
	@echo '    make platform-plan      # Plan platform changes for ENV'
	@echo '    make platform-apply     # Apply platform changes for ENV'
	@echo '    make security-check     # Run Checkov + Trivy IaC scanning'
	@echo '    make scorecard          # Generate platform scorecard'
	@echo ''
	@echo '  Local Development:'
	@echo '    make dev-deps           # Install dev dependencies'
	@echo '    make dev-start          # Start LocalStack (Docker)'
	@echo '    make dev-stop           # Stop LocalStack'
	@echo '    make dev-status         # Check LocalStack status'
	@echo ''
	@echo '  Application Lifecycle:'
	@echo '    make app-bootstrap      # Scaffold new service from Backstage template'
	@echo '    make app-deploy         # Update GitOps manifest and let Argo CD reconcile'
	@echo '    make app-policy-test    # Run conftest against gitops manifests'
	@echo '    make docs-serve         # Preview documentation locally'
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

diff:
	PLATFORM_ENV=$(ENV) npx cdk diff

deploy:
	PLATFORM_ENV=$(ENV) npx cdk deploy --all --require-approval never

destroy:
	@echo '[WARN] This will destroy the platform stack for ENV=$(ENV)!'
	@read -p "Type DESTROY to confirm: " confirm; \
	if [ "$$confirm" = "DESTROY" ]; then \
		PLATFORM_ENV=$(ENV) npx cdk destroy --all --force; \
	else \
		echo "Aborted."; \
	fi

clean:
	rm -rf dist cdk.out coverage .localstack

audit:
	npm audit

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

security-check:
	@echo '[security-check] Running Checkov scan...'
	@if command -v checkov &>/dev/null; then \
		checkov -d . --framework cloudformation,terraform,github_actions --quiet; \
	else \
		echo 'Checkov not installed locally. Use CI pipeline or Docker.'; \
	fi
	@echo '[security-check] Running Trivy scan...'
	@if command -v trivy &>/dev/null; then \
		trivy config --severity CRITICAL,HIGH --skip-dirs cdk.out,node_modules .; \
	else \
		echo 'Trivy not installed locally. Use CI pipeline or Docker.'; \
	fi

scorecard:
	@echo '[scorecard] Platform Health Report for ENV=$(ENV)'
	@echo '  Build:    $(shell npm run build 2>/dev/null && echo "OK" || echo "FAIL")'
	@echo '  Lint:     $(shell npm run lint 2>/dev/null && echo "OK" || echo "FAIL")'
	@echo '  Tests:    $(shell npm test 2>/dev/null && echo "OK" || echo "FAIL")'
	@echo '  Synth:    $(shell PLATFORM_ENV=$(ENV) npm run synth 2>/dev/null && echo "OK" || echo "FAIL")'
	@echo '  Stacks:   $$(find lib -name "*.ts" | wc -l) platform modules'
	@echo '  Constructs: $$(find packages -name "*.ts" | wc -l) construct files'
	@echo '  Tests:    $$(find test -name "*.test.ts" | wc -l) test files'
	@echo '  Docs:     $$(find docs -name "*.md" | wc -l) doc files'

dev-deps:
	@echo '[dev-deps] Check prerequisites...'
	@command -v node >/dev/null 2>&1 || { echo 'Node.js is required. Install from https://nodejs.org'; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo 'Docker is required for LocalStack. Install from https://docker.com'; exit 1; }
	npm ci

dev-start:
	docker compose up -d localstack
	@echo 'Waiting for LocalStack to be ready...'
	@sleep 5
	@curl -s http://localhost:4566/_localstack/health | head -c 200 || echo 'LocalStack not ready yet'

dev-stop:
	docker compose down

dev-status:
	@echo 'LocalStack status:'
	@curl -s http://localhost:4566/_localstack/health | python3 -m json.tool 2>/dev/null || echo 'LocalStack not running'

app-bootstrap:
	@echo '[app-bootstrap] SERVICE=$(SERVICE)'
	@echo 'Scaffold from templates/service-catalog/template.yaml via Backstage'

app-deploy:
	@echo '[app-deploy] ENV=$(ENV) SERVICE=$(SERVICE) TAG=$(TAG)'
	@echo 'Update GitOps manifest tag and let Argo CD reconcile'

app-policy-test:
	@echo '[app-policy-test] run conftest against applications/gitops/base with applications/policy'
	conftest test applications/gitops/base/*.yaml -p applications/policy

docs-serve:
	@echo '[docs-serve] Starting documentation preview...'
	@if command -v grip &>/dev/null; then \
		grip README.md 0.0.0.0:8080; \
	else \
		echo 'Install grip: pip install grip'; \
		echo 'Or open Markdown files in VS Code with preview.'; \
	fi
