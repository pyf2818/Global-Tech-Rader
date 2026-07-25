import { spawn } from 'node:child_process';

function runCommand(name, command, { required = true, env = process.env } = {}) {
  const startedAt = Date.now();
  return new Promise(resolve => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
      env,
    });
    child.on('close', code => {
      resolve({
        name,
        status: code === 0 ? 'passed' : 'failed',
        required,
        exitCode: code,
        durationMs: Date.now() - startedAt,
      });
    });
    child.on('error', error => {
      resolve({
        name,
        status: 'failed',
        required,
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        error: error.message,
      });
    });
  });
}

const results = [];
results.push(await runCommand('unit', 'npm run test'));
results.push(await runCommand('build', 'npm run build'));

if (process.env.TEST_DATABASE_URL) {
  results.push(await runCommand('integration', 'npm run test:integration'));
} else {
  results.push({
    name: 'integration',
    status: 'skipped',
    required: false,
    reason: 'TEST_DATABASE_URL is not set',
  });
}

if (process.env.RUN_E2E === '1') {
  results.push(await runCommand('e2e', 'npm run test:e2e'));
} else {
  results.push({
    name: 'e2e',
    status: 'skipped',
    required: false,
    reason: 'RUN_E2E is not 1',
  });
}

const failed = results.filter(result => result.required && result.status !== 'passed');
const summary = {
  ok: failed.length === 0,
  generatedAt: new Date().toISOString(),
  results,
};

console.log(JSON.stringify(summary, null, 2));
if (failed.length) process.exit(1);
