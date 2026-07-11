import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((_req, _res, next) => {
          const url = _req.url || '';
          if (!url.startsWith('/@') && !url.startsWith('/src/') && !url.includes('.') && !url.startsWith('/api/')) {
            _req.url = '/index.html';
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((_req, _res, next) => {
          const url = _req.url || '';
          if (!url.startsWith('/@') && !url.startsWith('/src/') && !url.includes('.') && !url.startsWith('/api/')) {
            _req.url = '/index.html';
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
