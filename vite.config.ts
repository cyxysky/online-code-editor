import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve('src/index.ts'),
      name: 'ReactLib',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'react-lib.css'
          return assetInfo.name || 'asset'
        }
      }
    },
    sourcemap: true,
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve('src')
    }
  }
}) 