import { spawn } from 'node:child_process';
import { createServer } from 'vite';

process.env.SILICON_E2E = '1';
process.env.DATABASE_URL = '';
process.env.SCRAPLING_URL = '';

const server = await createServer({
  configFile: 'vite.config.js',
  server: {
    host: '127.0.0.1',
    port: 5176,
    strictPort: true,
  },
});

await server.listen();
server.printUrls();

const args = ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)];
const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    SILICON_E2E: '1',
    DATABASE_URL: '',
    SCRAPLING_URL: '',
  },
});

const exitCode = await new Promise(resolve => {
  child.on('close', code => resolve(code ?? 1));
  child.on('error', () => resolve(1));
});

await server.close();
process.exit(exitCode);
