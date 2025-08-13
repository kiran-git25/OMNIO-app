import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isElectron = process.env.ELECTRON === 'true';

export default defineConfig({
  plugins: [react()],
  base: isElectron ? './' : '/', // ✅ SPA root for Vercel
  optimizeDeps: {
    include: ['xlsx', 'mammoth', 'fflate', 'simple-peer', 'crypto-js'],
    exclude: [
      'signaldb',
      'fs',
      ...(isElectron ? ['electron', 'electron-fetch'] : [])
    ]
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
          encryption: [path.resolve(__dirname, 'src/utils/e2ee.js')]
        }
      },
      external: isElectron ? [] : [] // ✅ No external deps for web
    },
    target: isElectron ? 'esnext' : 'es2022',
    assetsInlineLimit: isElectron ? 0 : 4096
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    cors: true
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'import.meta.env.VITE_IS_ELECTRON': isElectron,
    global: 'globalThis',
    ...(isElectron ? { 'process.env.ELECTRON_DISABLE_SECURITY_WARNINGS': 'true' } : {})
  }
});
