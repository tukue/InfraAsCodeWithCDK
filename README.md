# InfraAsCodeWithCDK

Serverless demo platform built with AWS CDK, API Gateway, Lambda, and DynamoDB. The repository now also includes a Backstage recommended path template that shows how platform teams can scaffold and deliver a service end to end.

## Overview

The stack deploys:

- API Gateway REST API
- Lambda function bundled from TypeScript
- DynamoDB table for item storage
- CloudWatch access logs and Lambda tracing

Request flow:

`Client -> API Gateway -> Lambda -> DynamoDB`

## Backstage Recommended Path

The repository now includes a concrete, simplified Backstage software template at [backstage/templates/recommended-path-service/template.yaml](/mnt/c/Users/tukue/InfraAsCodeWithCDK/backstage/templates/recommended-path-service/template.yaml).

That template scaffolds one service repository with:

- Service scaffold
- GitHub Actions CI
- GHCR image build and publish
- Kubernetes manifest tag update on release
- Argo CD application for deployment
- Default Grafana dashboard and Prometheus alerts
- OPA policy checks in CI

The registered Backstage catalog entry for this repository lives at [catalog-info.yaml](/mnt/c/Users/tukue/InfraAsCodeWithCDK/catalog-info.yaml).

## Prerequisites

- Node.js 18.x or later
- AWS CLI configured with credentials for the target account
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Quick Start

Install dependencies:

```bash
npm install
```

Bootstrap the target environment the first time:

```bash
cdk bootstrap
```

Deploy the default `dev` stage:

```bash
npm run deploy
```

Deploy a named stage:

```bash
npm run cdk -- deploy --context stage=prod
```

## API Endpoints

- `GET /` returns service metadata and the supported routes
- `GET /health` returns a lightweight health response
- `GET /items` lists items from DynamoDB
- `POST /items` creates a new item

Example request:

```bash
curl -X POST "$API_URL/items" \
  -H "Content-Type: application/json" \
  -d '{"name":"example item"}'
```

## Useful Commands

```bash
npm run build     # Compile TypeScript
npm test          # Run tests
npm run synth     # Generate CloudFormation
npm run cdk -- diff
```

## Security and Operations

- DynamoDB uses AWS-managed encryption
- Lambda tracing is enabled with AWS X-Ray
- API Gateway access logs are enabled
- Non-production tables are destroyed with the stack, production tables are retained

## Stack Outputs

- API Gateway URL
- DynamoDB table name
