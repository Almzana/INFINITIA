import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Unit tests for the frontend's pure logic (src/**/*.test.ts). Same "@" alias as vite.config.ts.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
