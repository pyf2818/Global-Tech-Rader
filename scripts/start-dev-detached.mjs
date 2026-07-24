import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'dev-server.log');
const errPath = path.join(root, 'dev-server.err.log');
const pidPath = path.join(root, 'dev-server.pid');
const stamp = new Date().toISOString();
writeFileSync(outPath, `\n[dev:detached] starting ${stamp}\n`, { flag: 'a' });
writeFileSync(errPath, `\n[dev:detached] starting ${stamp}\n`, { flag: 'a' });
const command = process.platform === 'win32'
  ? 'cmd.exe'
  : 'sh';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', `npm run dev >> "${outPath}" 2>> "${errPath}"`]
  : ['-c', `npm run dev >> "${outPath}" 2>> "${errPath}"`];

const child = spawn(command, args, {
  cwd: root,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
});

child.unref();
writeFileSync(pidPath, `${child.pid}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  pid: child.pid,
  url: 'http://127.0.0.1:5175/',
  stdout: outPath,
  stderr: errPath,
}, null, 2));
