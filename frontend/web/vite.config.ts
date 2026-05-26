import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/main.tsx', 'src/App.tsx', 'src/demoData.ts', 'src/vite-env.d.ts'],
      thresholds: {
        lines: 70,
        branches: 60,
      },
    },
  },
})
