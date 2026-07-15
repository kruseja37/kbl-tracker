import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { companionAddressPlugin } from './scripts/viteCompanionAddress'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version?: string };

function readGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function firstEnvValue(names: string[]): string | undefined {
  return names.map((name) => process.env[name]).find((value): value is string => Boolean(value));
}

const appVersion = process.env.VITE_APP_VERSION || packageJson.version || 'unknown';
const buildSha = process.env.VITE_BUILD_SHA || firstEnvValue([
  'GITHUB_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'CF_PAGES_COMMIT_SHA',
  'RENDER_GIT_COMMIT',
  'COMMIT_SHA',
])?.slice(0, 12) || readGitSha();
const buildTime = process.env.VITE_BUILD_TIME || new Date().toISOString();
const buildId = process.env.VITE_BUILD_ID || firstEnvValue([
  'VERCEL_DEPLOYMENT_ID',
  'CF_PAGES_COMMIT_SHA',
  'RENDER_GIT_COMMIT',
  'GITHUB_RUN_ID',
]) || `${buildSha}-${buildTime}`;

const buildMetadata = {
  id: buildId,
  version: appVersion,
  sha: buildSha,
  builtAt: buildTime,
};

function buildMetadataPlugin(): Plugin {
  return {
    name: 'kbl-build-metadata',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-meta.json',
        source: `${JSON.stringify(buildMetadata, null, 2)}\n`,
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_BUILD_SHA': JSON.stringify(buildSha),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
  plugins: [
    react(),
    buildMetadataPlugin(),
    companionAddressPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Super Mega Baseball',
        short_name: 'SMB',
        description: 'Super Mega Baseball Stat Tracker',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to src/src_figma for Figma imports
      '@': path.resolve(__dirname, './src/src_figma'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/.claude/worktrees/**',
      'src/archived-tests/**',
      '.worktrees/**/archived-tests/**',
      // Dead legacy code — not routed by App.tsx
      'src/components/**',
      'src/pages/**',
    ],
  },
})
