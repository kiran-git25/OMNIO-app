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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          media: ['simple-peer', 'react-player'],
          utils: ['crypto-js', 'fflate', 'uuid', 'signaldb'],
          encryption: ['@/utils/e2ee']
        }
      }
    },
    // Avoid inlining assets when building for Electron
    assetsInlineLimit: isElectron ? 0 : 4096,
    // Configure for Electron or Web
    target: isElectron ? 'esnext' : 'modules'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5174,
    strictPort: false,
    // Allow connections from all sources for development
    host: '0.0.0.0',
    // Add proper CORS headers for development
    cors: true
  },
  // Electron-specific configurations
  define: {
    // Define global constants
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'import.meta.env.VITE_IS_ELECTRON': isElectron,
    global: 'globalThis',
    // Add security policies for content-security-policy
    ...(isElectron ? {
      'process.env.ELECTRON_DISABLE_SECURITY_WARNINGS': 'true'
    } : {})
  },
  build: {
    ...(!isElectron && {
      rollupOptions: {
        external: ['fs', 'events'],
        output: {
          globals: {
            'fs': '{}',
            'events': 'EventTarget'
          }
        }
      }
    })
  },

});
