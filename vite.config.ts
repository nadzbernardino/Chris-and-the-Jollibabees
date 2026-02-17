import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    host: true,   // expose on LAN for mobile QR testing
    port: 5173,
  },
});
