/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@mindsphere/shared$': '<rootDir>/../packages/shared/src/index.ts',
  },
};
