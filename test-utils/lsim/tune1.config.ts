/**
 * TUNE-1 relationship-hazard sweep. Writes only under results/tune1.
 *
 * RUN: NODE_ENV= npx vitest run -c test-utils/lsim/tune1.config.ts
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
    include: ['test-utils/lsim/tune1.scenario.ts'],
    testTimeout: 1_800_000,
  },
});
