/**
 * Dedicated on-demand config for the L-SIM H1 flags-on sandbox harness.
 *
 * RUN: NODE_ENV= npx vitest run -c test-utils/lsim/preflight.config.ts
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
    include: ['test-utils/lsim/preflight.ts'],
  },
});
