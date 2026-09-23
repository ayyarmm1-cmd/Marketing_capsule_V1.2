import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/marketing_capsule_V1.2/',

  server: {
    port: 3000,
    host: '0.0.0.0',
  },

  plugins: [react()],

  publicDir: 'public',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: true,
  },
});
