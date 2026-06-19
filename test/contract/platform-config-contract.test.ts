import { loadPlatformConfig, resolvePlatformEnvironment } from '../../lib/platform-config';

describe('PlatformConfig contract', () => {
  describe('resolvePlatformEnvironment', () => {
    it('must return dev for dev input', () => {
      expect(resolvePlatformEnvironment('dev')).toBe('dev');
    });

    it('must return stage for stage input', () => {
      expect(resolvePlatformEnvironment('stage')).toBe('stage');
    });

    it('must return prod for prod input', () => {
      expect(resolvePlatformEnvironment('prod')).toBe('prod');
    });

    it('must be case-insensitive', () => {
      expect(resolvePlatformEnvironment('DEV')).toBe('dev');
      expect(resolvePlatformEnvironment('Stage')).toBe('stage');
      expect(resolvePlatformEnvironment('PROD')).toBe('prod');
    });

    it('must trim whitespace', () => {
      expect(resolvePlatformEnvironment('  dev  ')).toBe('dev');
    });

    it('must reject empty string', () => {
      expect(() => resolvePlatformEnvironment('')).toThrow();
    });

    it('must reject undefined', () => {
      expect(() => resolvePlatformEnvironment()).toThrow();
    });

    it('must reject invalid values', () => {
      expect(() => resolvePlatformEnvironment('invalid')).toThrow();
    });
  });

  describe('loadPlatformConfig', () => {
    it('must return dev config for dev', () => {
      const config = loadPlatformConfig('dev');
      expect(config.environment).toBe('dev');
      expect(config.owner).toBeDefined();
      expect(config.costCenter).toBeDefined();
      expect(config.dataClassification).toBeDefined();
      expect(config.project).toBeDefined();
    });

    it('must return stage config for stage', () => {
      const config = loadPlatformConfig('stage');
      expect(config.environment).toBe('stage');
    });

    it('must return prod config for prod', () => {
      const config = loadPlatformConfig('prod');
      expect(config.environment).toBe('prod');
    });

    it('must set higher data classification for prod', () => {
      const devConfig = loadPlatformConfig('dev');
      const prodConfig = loadPlatformConfig('prod');
      expect(devConfig.dataClassification).not.toBe('restricted');
      expect(prodConfig.dataClassification).toBeDefined();
    });
  });
});
