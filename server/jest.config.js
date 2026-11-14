export default {
  testEnvironment: 'node',
  transform: {},
  testTimeout: 20000,
  verbose: true,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};

