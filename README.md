# InfraAsCodeWithCDK

# Overview
This project deploys a serverless application using AWS CDK with TypeScript, including API Gateway, Lambda, and DynamoDB.

## Prerequisites
- Node.js 18.x or later
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)

## Quick Start

1. **Install dependencies**
```bash
npm install

AWS_ACCOUNT_ID=your-account-id
AWS_REGION=your-region

Deploy
cdk bootstrap   # First time only
cdk deploy

Stack Components
API Gateway REST API
Lambda Function (Node.js)
DynamoDB Table
CloudWatch Logging

Useful Commands
npm run build   # Compile TypeScript
npm run test    # Run tests
cdk diff       # Compare changes
cdk synth      # Generate CloudFormation

API Endpoints
GET /scan - Returns log stream name

Security
IAM authentication enabled

Environment variables for sensitive data
AWS managed encryption


## Security & Monitoring
- API Gateway logs to CloudWatch
- Lambda execution tracing with X-Ray
- IAM roles with least privilege
- CORS configured for API endpoints

## Infrastructure as Code
- Defined using AWS CDK in TypeScript
- Automated deployment via CloudFormation
- Environment-specific tagging
  - Environment: Development
  - Project: DemoAPI

## Stack Outputs
- API Gateway URL
- DynamoDB table name

## Scaling
- Lambda: Auto-scales based on demand
- DynamoDB: Pay-per-request auto-scaling
- API Gateway: Handles scaling automatically 
