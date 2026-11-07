import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { rolldownOptions: { output: { strictExecutionOrder: true, codeSplitting: { groups: [{ name: 'analytics', test: /node_modules[\\/](recharts|victory-vendor|d3-|redux|react-redux|reselect|immer|use-sync-external-store)/ }] } } } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}'],
    clearMocks: true,
    // Keep jsdom suites responsive on shared desktop CPUs as coverage grows.
    maxWorkers: 1,
  },
})
