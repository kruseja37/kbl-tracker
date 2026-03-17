/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
