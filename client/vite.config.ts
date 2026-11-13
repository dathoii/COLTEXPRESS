import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: process.env.VITE_SERVER_URL ?? 'http://localhost:3001',
        ws: true,
      },
      '/api': {
        target: process.env.VITE_SERVER_URL ?? 'http://localhost:3001',
      },
    },
  },
  build: {
    outDir: resolve(__dirname, '../release/client'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three'],
        },
      },
    },
  },
});
