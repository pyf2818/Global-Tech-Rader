import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { newsPlugin } from './server/newsPlugin.js';

export default defineConfig({
  plugins: [newsPlugin(), react()],
  server: {
    port: 5175,
    allowedHosts: ['.monkeycode-ai.online'],
    proxy: {
      '/api/scrape': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
