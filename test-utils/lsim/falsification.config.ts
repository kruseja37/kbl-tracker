/**
 * Dedicated on-demand config for the L-SIM invariant FALSIFICATION audit.
 * Lives outside the characterized suite (the .ts is not auto-discovered).
 *
 * RUN: NODE_ENV= npx vitest run -c test-utils/lsim/falsification.config.ts
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
    include: ['test-utils/lsim/falsification.ts'],
  },
});
