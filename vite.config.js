import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { newsPlugin } from './server/newsPlugin.js';

export default defineConfig({
  plugins: [newsPlugin(), react()],
  server: {
    allowedHosts: ['.monkeycode-ai.online']
  }
});
