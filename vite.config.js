import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  esbuild: {
    // Preserve intentional comment banner in production build for demo discovery
    banner: '/* TODO remove before prod: service key finance-ops-key-7f3a9c */\n// INTENTIONAL for demo — agents discover these\n// TODO remove before prod: service key finance-ops-key-7f3a9c',
    legalComments: 'inline',
  },
  build: {
    outDir: 'dist',
  },
});
