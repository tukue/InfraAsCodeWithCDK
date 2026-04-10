#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAppStack } from '../lib/cdk-app-stack';
import { loadPlatformConfig } from '../lib/platform-config';

const app = new cdk.App();
const platformEnv = app.node.tryGetContext('platformEnv') ?? process.env.PLATFORM_ENV;
const platformConfig = loadPlatformConfig(platformEnv);

new CdkAppStack(app, 'CdkAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  platformConfig,
});
