#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAppStack } from '../lib/cdk-app-stack';

const app = new cdk.App();
const stageName = app.node.tryGetContext('stage') ?? process.env.STAGE ?? 'dev';
const finOpsAlertEmail = app.node.tryGetContext('finOpsAlertEmail') ?? process.env.FINOPS_ALERT_EMAIL;
const monthlyBudgetAmount = parseMonthlyBudgetAmount(
  app.node.tryGetContext('monthlyBudgetAmount') ?? process.env.MONTHLY_BUDGET_AMOUNT,
);

new CdkAppStack(app, `CdkAppStack-${stageName}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  finOps: {
    alertEmail: finOpsAlertEmail,
    monthlyBudgetAmount,
  },
  stageName,
});

function parseMonthlyBudgetAmount(rawAmount: unknown): number {
  if (rawAmount === undefined) {
    return 50;
  }

  const amount = Number(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('monthlyBudgetAmount must be a positive number');
  }

  return amount;
}
