export interface PlatformFeatureFlags {
  readonly enableVpcFlowLogs: boolean;
  readonly enableWafForApi: boolean;
  readonly enableXRayTracing: boolean;
  readonly enableAutoScaling: boolean;
  readonly enableDetailedMonitoring: boolean;
}

export type EnvironmentFlags = Record<string, PlatformFeatureFlags>;

const DEFAULT_FLAGS: PlatformFeatureFlags = {
  enableVpcFlowLogs: false,
  enableWafForApi: false,
  enableXRayTracing: true,
  enableAutoScaling: true,
  enableDetailedMonitoring: false,
};

const ENVIRONMENT_FLAGS: EnvironmentFlags = {
  dev: {
    ...DEFAULT_FLAGS,
    enableDetailedMonitoring: false,
    enableXRayTracing: false,
  },
  stage: {
    ...DEFAULT_FLAGS,
    enableVpcFlowLogs: true,
    enableDetailedMonitoring: true,
  },
  prod: {
    ...DEFAULT_FLAGS,
    enableVpcFlowLogs: true,
    enableWafForApi: true,
    enableDetailedMonitoring: true,
    enableAutoScaling: true,
  },
};

export function loadFeatureFlags(environment: string): PlatformFeatureFlags {
  return ENVIRONMENT_FLAGS[environment] || DEFAULT_FLAGS;
}
