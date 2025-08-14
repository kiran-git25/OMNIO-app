import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Check if building for Electron
const isElectron = process.env.ELECTRON === 'true';

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/',
  optimizeDeps: {
    include: ['xlsx', 'mammoth', 'fflate', 'simple-peer', 'crypto-js'],
    exclude: ['signaldb', 'events', 'fs'].concat(isElectron ? ['electron', 'electron-fetch'] : [])
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/]
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          media: ['simple-peer', 'react-player'],
          utils: ['crypto-js', 'fflate', 'uuid'],
          encryption: ['@/utils/e2ee']
        }
      },
      external: isElectron ? [] : ['fs', 'events'],
      ...(isElectron ? {} : {
        output: {
          globals: {
            'fs': '{}',
            'events': 'EventTarget'
          },
          manualChunks: {
            vendor: ['react', 'react-dom'],
            media: ['simple-peer', 'react-player'],
            utils: ['crypto-js', 'fflate', 'uuid'],
            encryption: ['@/utils/e2ee']
          }
        }
      })
    },
    minify: 'esbuild',
    cssCodeSplit: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5174,
    strictPort: false,
    host: '0.0.0.0',
    cors: true
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'import.meta.env.VITE_IS_ELECTRON': isElectron,
    global: 'globalThis',
    ...(isElectron ? {
      'process.env.ELECTRON_DISABLE_SECURITY_WARNINGS': 'true'
    } : {})
  }
});
