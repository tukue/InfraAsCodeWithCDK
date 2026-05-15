#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAppStack } from '../lib/cdk-app-stack';
import { loadPlatformConfig } from '../lib/platform-config';

const app = new cdk.App();
const platformEnv = app.node.tryGetContext('platformEnv') ?? process.env.PLATFORM_ENV ?? 'dev';
const platformConfig = loadPlatformConfig(platformEnv);
const finOpsAlertEmail = app.node.tryGetContext('finOpsAlertEmail') ?? process.env.FINOPS_ALERT_EMAIL;
const monthlyBudgetAmount = parseMonthlyBudgetAmount(
  app.node.tryGetContext('monthlyBudgetAmount') ?? process.env.MONTHLY_BUDGET_AMOUNT,
);

new CdkAppStack(app, 'CdkAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  finOps: {
    alertEmail: finOpsAlertEmail,
    monthlyBudgetAmount,
  },
  platformConfig,
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
