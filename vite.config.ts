import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // SPA 라우팅을 위한 fallback 설정
    historyApiFallback: {
      rewrites: [
        { from: /^\/lineguide3\/.*$/, to: '/lineguide3/index.html' }
      ]
    }
  },
  // GitHub Pages 배포용 설정
  base: process.env.NODE_ENV === 'production' ? '/lineguide3/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})