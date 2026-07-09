module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  clearMocks: true,
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/platform-observability.ts',
    '!lib/platform-version.ts',
    '!lib/platform-feature-flags.ts',
    'packages/platform-constructs/src/**/*.ts',
    'applications/examples/**/*.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },
};
