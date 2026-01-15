import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['@xmtp/browser-sdk'],
  },
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      // Proxy gateway requests to avoid CORS issues
      '/gateway': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gateway/, ''),
      },
    },
  },
})
