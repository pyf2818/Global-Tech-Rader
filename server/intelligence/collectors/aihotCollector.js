const AIHOT_BASE_URL = 'https://aihot.virxact.com';
const AIHOT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const VALID_MODES = new Set(['selected', 'all']);
const VALID_CATEGORIES = new Set(['ai-models', 'ai-products', 'industry', 'paper', 'tip']);

function boundedTake(value) {
  const parsed = Number.parseInt(value ?? '50', 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, parsed));
}

function normalizeMode(value) {
  return VALID_MODES.has(value) ? value : 'selected';
}

function normalizeCategory(value) {
  return VALID_CATEGORIES.has(value) ? value : '';
}

function normalizeSince(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  if (date.getTime() > Date.now()) return '';
  return date.toISOString();
}

export function buildAiHotItemsUrl(options = {}) {
  const url = new URL('/api/public/items', AIHOT_BASE_URL);
  url.searchParams.set('mode', normalizeMode(options.mode));
  url.searchParams.set('take', String(boundedTake(options.take)));

  const category = normalizeCategory(options.category);
  if (category) url.searchParams.set('category', category);

  const since = normalizeSince(options.since);
  if (since) url.searchParams.set('since', since);

  const query = String(options.q || '').trim().slice(0, 200);
  if (query.length >= 2) url.searchParams.set('q', query);

  const cursor = String(options.cursor || '').trim();
  if (cursor) url.searchParams.set('cursor', cursor);

  return url;
}

export async function fetchAiHotItems(options = {}) {
  const url = buildAiHotItemsUrl(options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 12_000));

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': AIHOT_USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw Object.assign(new Error(`AI HOT responded ${response.status}`), {
        status: response.status,
        detail: detail.slice(0, 240),
      });
    }

    const data = await response.json();
    return {
      provider: 'aihot',
      mode: normalizeMode(options.mode),
      fetchedAt: new Date().toISOString(),
      count: Number(data.count || data.items?.length || 0),
      hasNext: Boolean(data.hasNext),
      nextCursor: data.nextCursor || null,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
