/**
 * TUNE-0 one-factor sensitivity harness. Writes only under results/tune0 and
 * never touches the canonical lsim-h2 baseline artifacts.
 *
 * RUN: NODE_ENV= npx vitest run -c test-utils/lsim/tune0.config.ts
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
    include: ['test-utils/lsim/tune0.scenario.ts'],
    testTimeout: 1_800_000,
  },
});
