import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  base: env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: Number(env.VITE_PORT || process.env.INTERNAL_PORTAL_PORT || 5174),
    strictPort: true,
    proxy: {
      '/api': {
        target: env.VITE_PROXY_TARGET || process.env.VITE_PROXY_TARGET || `http://127.0.0.1:${process.env.GATEWAY_PORT || 8080}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  }
})
