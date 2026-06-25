import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/queueHub': {
        target: 'http://127.0.0.1:5001',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/appHub': {
        target: 'http://127.0.0.1:5001',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/whatsapp': {
        target: 'http://127.0.0.1:3101',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/whatsapp/, '')
      }
    }
  }
})
