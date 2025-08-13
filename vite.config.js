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
    exclude: ['signaldb', 'fs'].concat(isElectron ? ['electron', 'electron-fetch'] : [])
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/]
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          media: ['simple-peer', 'react-player'],
          utils: ['crypto-js', 'fflate', 'uuid', 'signaldb'],
          encryption: ['@/utils/e2ee']
        },
        globals: !isElectron
          ? { fs: '{}', events: 'EventTarget' }
          : undefined
      },
      external: !isElectron ? ['fs'] : ['fs', 'events']
    },
    assetsInlineLimit: isElectron ? 0 : 4096,
    target: isElectron ? 'esnext' : 'es2022' // allow top-level await in browsers
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Only polyfill "events" for browser builds
      ...(isElectron ? {} : { events: 'events/' })
    }
  },
  server: {
    port: 5174,
    strictPort: false,
    host: '0.0.0.0',
    cors: true
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.npm_package_version || '1.0.0'
    ),
    'import.meta.env.VITE_IS_ELECTRON': isElectron,
    global: 'globalThis',
    ...(isElectron
      ? { 'process.env.ELECTRON_DISABLE_SECURITY_WARNINGS': 'true' }
      : {})
  }
});
