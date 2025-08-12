import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => ({
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
  // 배포 환경별 base 설정
  base: mode === 'production' 
    ? '/lineguide3/' 
    : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // GitHub Pages용 최적화
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  // 개발 서버에서도 base 경로 처리
  define: {
    __BASE_URL__: JSON.stringify(
      mode === 'production' 
        ? '/lineguide3/' 
        : '/'
    )
  }
}))