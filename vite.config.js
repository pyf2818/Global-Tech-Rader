import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { newsPlugin } from './server/newsPlugin.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!process.env.DATABASE_URL && env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  return {
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
  };
});
