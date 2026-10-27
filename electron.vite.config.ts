import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

const shared = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: {
    resolve: { alias: shared }
  },
  preload: {
    resolve: { alias: shared }
  },
  renderer: {
    resolve: {
      alias: {
        ...shared,
        '@': resolve('src/renderer/src')
      }
    },
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          popup: resolve('src/renderer/popup.html'),
          settings: resolve('src/renderer/settings.html')
        }
      }
    }
  }
})
