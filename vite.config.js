import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forwards /api calls to the Express backend (server.js)
      '/api': 'http://localhost:3001',
    },
  },
})
