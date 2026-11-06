/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build for Hostinger shared hosting (Apache/LiteSpeed, no Node runtime needed).
// `base: '/'` assumes the site is served from the domain root (public_html).
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2019',
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
  test: { environment: 'node' },
});
