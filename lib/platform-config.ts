export type PlatformEnvironment = 'dev' | 'stage' | 'prod';

export interface PlatformConfig {
  readonly environment: PlatformEnvironment;
  readonly owner: string;
  readonly costCenter: string;
  readonly dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  readonly project: string;
}

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
    return 'dev';
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
