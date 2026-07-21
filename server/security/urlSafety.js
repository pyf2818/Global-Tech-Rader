import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function safetyError(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

function isPrivateIp(address) {
  const normalized = String(address || '').toLowerCase().split('%')[0];
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) !== 6) return true;
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

function configuredHosts() {
  return new Set(String(process.env.AI_ALLOWED_HOSTS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean));
}

export async function assertSafeExternalUrl(rawUrl, options = {}) {
  let url;
  try { url = new URL(rawUrl); } catch { throw safetyError('INVALID_UPSTREAM_URL', '外部服务地址格式无效'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw safetyError('INVALID_UPSTREAM_URL', '外部服务地址必须是无凭据的 HTTP(S) URL');
  }

  const hostname = url.hostname.toLowerCase();
  const allowPrivate = options.allowPrivate === true;
  const allowedHosts = configuredHosts();
  if (allowedHosts.size && !allowedHosts.has(hostname)) {
    throw safetyError('UPSTREAM_HOST_NOT_ALLOWED', '外部服务域名不在允许列表中', 403);
  }
  if (!allowPrivate && (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal'))) {
    throw safetyError('PRIVATE_NETWORK_BLOCKED', '生产环境禁止访问本地或私网服务', 403);
  }

  let addresses;
  try {
    addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw safetyError('UPSTREAM_DNS_FAILED', '外部服务域名无法解析', 502);
  }
  if (!addresses.length) throw safetyError('UPSTREAM_DNS_FAILED', '外部服务域名没有可用地址', 502);
  if (!allowPrivate && addresses.some(entry => isPrivateIp(entry.address))) {
    throw safetyError('PRIVATE_NETWORK_BLOCKED', '生产环境禁止访问本地或私网服务', 403);
  }
  return url;
}

export async function safeExternalFetch(rawUrl, options = {}) {
  const { allowPrivate = false, ...fetchOptions } = options;
  const url = await assertSafeExternalUrl(rawUrl, { allowPrivate });
  const response = await fetch(url, { ...fetchOptions, redirect: 'manual' });
  if (response.status >= 300 && response.status < 400) {
    response.body?.cancel().catch(() => {});
    throw safetyError('UPSTREAM_REDIRECT_BLOCKED', '外部服务重定向已被安全策略阻止', 502);
  }
  return response;
}

export function allowPrivateAiNetwork() {
  return process.env.AI_ALLOW_PRIVATE_NETWORK === 'true' || process.env.NODE_ENV !== 'production';
}
