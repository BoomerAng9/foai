/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: false,
            dynamicImport: true,
          },
          target: 'es2022',
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  // Keep output quiet enough to read
  verbose: false,
  // Bail on first failure so CI fails fast
  bail: 0,
};

export default config;
