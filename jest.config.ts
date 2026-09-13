import nextJest from 'next/jest.js';
import type { Config } from 'jest';

// next/jest wires up the SWC transform and the `@/` alias from tsconfig, so
// tests can import app code directly without a separate babel setup.
const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  clearMocks: true,
  testEnvironment: 'jest-environment-node',
};

export default createJestConfig(config);
