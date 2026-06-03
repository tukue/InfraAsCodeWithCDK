export type PlatformEnvironment = 'dev' | 'stage' | 'prod';

export interface PlatformConfig {
  readonly environment: PlatformEnvironment;
  readonly owner: string;
  readonly costCenter: string;
  readonly dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  readonly project: string;
}

export const PLATFORM_PRODUCT_CONTRACT = {
  name: 'InfraAsCodeWithCDK Platform',
  version: '0.1.0',
  personas: [
    {
      role: 'application-developer',
      capabilities: [
        'Self-service scaffolding via Backstage templates',
        'Secure-by-default infrastructure constructs',
        'CI/CD pipelines with built-in quality gates',
        'Observability dashboards and alerts',
        'GitOps deployment workflows',
      ],
    },
    {
      role: 'platform-engineer',
      capabilities: [
        'Extensible CDK construct library',
        'Policy-as-code enforcement framework',
        'Environment composition and promotion model',
        'FinOps cost visibility and anomaly detection',
        'Compliance and security guardrails (cdk-nag)',
      ],
    },
  ],
  supportModel: {
    channels: [
      { type: 'documentation', url: 'docs/onboarding/first-service.md', sla: 'self-service' },
      { type: 'github-issues', url: 'https://github.com/anomalyco/InfraAsCodeWithCDK/issues', sla: '2 business days' },
      { type: 'platform-team', sla: '4 business hours for critical issues' },
    ],
    severityLevels: [
      { level: 'critical', responseTime: '4 business hours', definition: 'Platform outage blocking all deployments' },
      { level: 'high', responseTime: '1 business day', definition: 'Single environment degradation' },
      { level: 'medium', responseTime: '3 business days', definition: 'Feature request or non-blocking bug' },
      { level: 'low', responseTime: '1 week', definition: 'Documentation or cosmetic issue' },
    ],
  },
  compatibilityPolicy: {
    apiStability: 'experimental',
    deprecationNotice: '1 release cycle',
    versioning: 'semantic versioning for platform-constructs package',
    migrationSupport: 'Deprecated APIs include migration guide and test coverage for old/new behavior',
  },
  releaseChannels: [
    {
      name: 'stable',
      description: 'Production-ready releases with full support',
      updateCadence: 'Monthly',
    },
    {
      name: 'beta',
      description: 'Pre-release features for early adopters',
      updateCadence: 'Bi-weekly',
    },
    {
      name: 'canary',
      description: 'Daily builds from main branch',
      updateCadence: 'Continuous',
    },
  ],
  slos: {
    platformApiAvailability: '99.9% uptime for construct APIs (measured per release)',
    synthTime: '< 2 minutes for standard stacks',
    testPassRate: '100% pass rate on main branch before release',
    policyCompliance: '> 95% policy compliance rate for application manifests',
    timeToFirstDeploy: '< 30 minutes for new services using golden-path template',
  },
} as const;

const CONFIG_BY_ENV: Record<PlatformEnvironment, Omit<PlatformConfig, 'environment'>> = {
  dev: {
    owner: 'platform-engineering',
    costCenter: 'ENG-PLATFORM',
    dataClassification: 'internal',
    project: 'DemoAPI',
  },
  stage: {
    owner: 'platform-engineering',
    costCenter: 'ENG-PLATFORM',
    dataClassification: 'confidential',
    project: 'DemoAPI',
  },
  prod: {
    owner: 'platform-engineering',
    costCenter: 'ENG-PLATFORM',
    dataClassification: 'confidential',
    project: 'DemoAPI',
  },
};

export const resolvePlatformEnvironment = (value?: string): PlatformEnvironment => {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    throw new Error(
      'Platform environment must be explicitly specified via platformEnv context or PLATFORM_ENV. Allowed values: dev, stage, prod.',
    );
  }

  if (normalized === 'dev' || normalized === 'stage' || normalized === 'prod') {
    return normalized;
  }

  throw new Error(
    `Invalid platform environment \"${value}\". Allowed values: dev, stage, prod.`,
  );
};

export const loadPlatformConfig = (environmentValue?: string): PlatformConfig => {
  const environment = resolvePlatformEnvironment(environmentValue);

  return {
    environment,
    ...CONFIG_BY_ENV[environment],
  };
};
