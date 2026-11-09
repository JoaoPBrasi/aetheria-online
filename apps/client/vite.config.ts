import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:2567',
      '/health': 'http://127.0.0.1:2567',
      '/matchmake': 'http://127.0.0.1:2567',
      '/socket': {
        target: 'ws://127.0.0.1:2567',
        ws: true,
        rewrite: (p) => p.replace(/^\/socket/, ''),
      },
    },
  },
  build: {
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
});
