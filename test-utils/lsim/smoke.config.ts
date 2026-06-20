/**
 * Dedicated on-demand config for the Opus scaled independent reproduction.
 * Outside the characterized suite (the .scenario.ts is not auto-discovered).
 *
 * RUN: NODE_ENV= npx vitest run -c test-utils/lsim/smoke.config.ts
 */
import path from 'path';
import { defineConfig } from 'vitest/config';

const ROOT = path.resolve(__dirname, '../..');

export default defineConfig({
  root: ROOT,
  resolve: {
    alias: {
      '@': path.resolve(ROOT, 'src/src_figma'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(ROOT, 'src/test-setup.ts')],
    include: ['test-utils/lsim/smoke.scenario.ts'],
    testTimeout: 900_000,
  },
});
