export const PLATFORM_VERSION = '0.2.0';
export const PLATFORM_BUILD = process.env['PLATFORM_BUILD'] || 'local';

export interface PlatformMetadata {
  readonly version: string;
  readonly build: string;
  readonly releasedAt: string;
  readonly compatibility: string;
}

export function getPlatformMetadata(): PlatformMetadata {
  return {
    version: PLATFORM_VERSION,
    build: PLATFORM_BUILD,
    releasedAt: new Date().toISOString(),
    compatibility: '>= 0.1.0',
  };
}
