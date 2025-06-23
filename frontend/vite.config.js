// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import https from 'https' // Add https module

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
    proxy: {
      '/api': {
        target: 'https://localhost:7135',
        changeOrigin: true,
        secure: false,
        agent: new https.Agent({  
          rejectUnauthorized: false // Ignore self-signed cert errors
        }),
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
