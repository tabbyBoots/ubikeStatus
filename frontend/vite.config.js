import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})
