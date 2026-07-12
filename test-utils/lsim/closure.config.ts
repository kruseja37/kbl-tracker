/**
 * FIDELITY-1 ratings-feedback closure proof. This is intentionally separate
 * from the canonical H2 baseline config and writes no H2 baseline artifacts.
 *
 * RUN: NODE_ENV= npx vitest run -c test-utils/lsim/closure.config.ts
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
    include: ['test-utils/lsim/closure.scenario.ts'],
    testTimeout: 900_000,
  },
});
