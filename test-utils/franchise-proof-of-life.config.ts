/**
 * Dedicated on-demand config for the franchise proof-of-life smoke script.
 *
 * The script lives at test-utils/franchise-proof-of-life.ts (NOT a dot-test file), so the
 * default suite (which only auto-discovers dot-test-dot-ts files) never picks it up — it
 * stays OUT of the characterized baseline. This config sets `include` to ONLY the smoke
 * script and replicates the base test env (jsdom, globals, the same setup file + @ alias),
 * so running it touches nothing else.
 *
 * RUN:  NODE_ENV= npx vitest run -c test-utils/franchise-proof-of-life.config.ts
 *
 * See spec-docs/FRANCHISE_API_MAP.md §9.
 */
import path from 'path';
import { defineConfig } from 'vitest/config';

const ROOT = path.resolve(__dirname, '..');

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
    include: ['test-utils/franchise-proof-of-life.ts'],
  },
});
