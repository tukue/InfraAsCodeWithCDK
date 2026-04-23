#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAppStack } from '../lib/cdk-app-stack';

const app = new cdk.App();
const stageName = app.node.tryGetContext('stage') ?? process.env.STAGE ?? 'dev';

new CdkAppStack(app, `CdkAppStack-${stageName}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stageName,
});
