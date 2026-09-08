import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

export function createTestStack(): cdk.Stack {
  const app = new cdk.App();
  return new cdk.Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
}

export function synthToTemplate(stack: cdk.Stack): Template {
  return Template.fromStack(stack);
}

export function expectResourceCount(template: Template, type: string, count: number): void {
  const resources = template.findResources(type);
  expect(Object.keys(resources).length).toBe(count);
}

export function expectNoResources(template: Template, type: string): void {
  expectResourceCount(template, type, 0);
}
