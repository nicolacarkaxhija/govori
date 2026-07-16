import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // main.ts is the process entry (composition root + listen): excluded
      // by convention, everything it wires is covered through buildApp.
      exclude: ['src/**/*.test.ts', 'src/main.ts', 'src/import-cli.ts'],
      thresholds: {
        branches: 85,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    },
  },
});
