import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {
          types: ['node', 'jest', 'express', 'cors', 'bcrypt', 'jsonwebtoken', 'express-rate-limit'],
        },
      },
    ],
  },
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Allow absolute imports from src root
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Don't log Prisma queries during tests
  setupFilesAfterEnv: [],
  coverageDirectory: '../coverage',
  collectCoverageFrom: [
    'modules/**/*.service.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testTimeout: 15000,
};

export default config;
