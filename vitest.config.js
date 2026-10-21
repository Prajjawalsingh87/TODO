import { defineConfig } from 'vitest/config'

// Separate from vite.config.js so tests don't load the PWA plugin.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
