import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { newsPlugin } from './server/newsPlugin.js';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  if (process.env.SILICON_E2E !== '1' && !process.env.DATABASE_URL && env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  return {
    root: projectRoot,
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
