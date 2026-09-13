import nextJest from 'next/jest.js';
import type { Config } from 'jest';

// next/jest wires up the SWC transform and the `@/` alias from tsconfig, so
// tests can import app code directly without a separate babel setup.
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  clearMocks: true,
  testEnvironment: 'jest-environment-node',
  // next/jest reads tsconfig paths for imports, but jest.mock() resolves its
  // argument itself, so the alias has to be spelled out here too.
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

export default createJestConfig(config);
