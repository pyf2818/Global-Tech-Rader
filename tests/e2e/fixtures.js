import { expect } from '@playwright/test';

export const NEWS_FIXTURES = [
  { id: 'openai-agent-1', canonicalId: 'event-openai-agent', title: 'OpenAI releases a new agent platform today', source: 'OpenAI Blog', category: 'ai', publishedAt: '2026-07-14T01:00:00Z', summary: 'Official agent platform release.', url: 'https://openai.com/index/agents' },
  { id: 'openai-agent-2', canonicalId: 'event-openai-agent', title: 'OpenAI releases new Agent platform', source: 'TechCrunch', category: 'ai', publishedAt: '2026-07-14T02:00:00Z', summary: 'Media coverage of the same agent platform.', url: 'https://techcrunch.com/openai-agent' },
  { id: 'anthropic-safety', canonicalId: 'event-anthropic-safety', title: 'Anthropic publishes safety evaluation update', source: 'Anthropic News', category: 'ai', publishedAt: '2026-07-14T03:00:00Z', summary: 'Safety evaluation update.', url: 'https://anthropic.com/news/safety' },
  { id: 'nvidia-chip', canonicalId: 'event-nvidia-chip', title: 'NVIDIA expands AI accelerator supply', source: 'NVIDIA Blog', category: 'chips', publishedAt: '2026-07-14T04:00:00Z', summary: 'Accelerator supply update.', url: 'https://nvidia.com/blog/ai-chip' },
  { id: 'tsmc-capacity', canonicalId: 'event-tsmc-capacity', title: 'TSMC adds advanced packaging capacity', source: 'Reuters', category: 'chips', publishedAt: '2026-07-14T05:00:00Z', summary: 'Packaging capacity expands.', url: 'https://reuters.com/tsmc-packaging' },
  { id: 'google-cloud-ai', canonicalId: 'event-google-cloud-ai', title: 'Google Cloud adds enterprise AI controls', source: 'Google Cloud Blog', category: 'cloud', publishedAt: '2026-07-14T06:00:00Z', summary: 'Enterprise AI control plane.', url: 'https://cloud.google.com/blog/ai-controls' },
  { id: 'aws-agents', canonicalId: 'event-aws-agents', title: 'AWS launches managed agent workflows', source: 'AWS Blog', category: 'cloud', publishedAt: '2026-07-14T07:00:00Z', summary: 'Managed workflow launch.', url: 'https://aws.amazon.com/blogs/agents' },
  { id: 'robotics-foundation', canonicalId: 'event-robotics-foundation', title: 'Robotics foundation model reaches factories', source: 'MIT Technology Review', category: 'robotics', publishedAt: '2026-07-14T08:00:00Z', summary: 'Factory robotics adoption.', url: 'https://technologyreview.com/robotics-foundation' },
  { id: 'humanoid-supply', canonicalId: 'event-humanoid-supply', title: 'Humanoid robot suppliers report new orders', source: 'Bloomberg', category: 'robotics', publishedAt: '2026-07-14T09:00:00Z', summary: 'Supplier order signal.', url: 'https://bloomberg.com/humanoid-orders' },
  { id: 'github-framework', canonicalId: 'event-github-framework', title: 'GitHub trending AI framework gains adoption', source: 'GitHub Trending', category: 'ai', publishedAt: '2026-07-14T10:00:00Z', summary: 'Open-source adoption signal.', url: 'https://github.com/example/agent-framework' },
  { id: 'funding-aiops', canonicalId: 'event-funding-aiops', title: 'AIOps startup raises new funding', source: 'The Verge', category: 'funding', publishedAt: '2026-07-14T11:00:00Z', summary: 'Funding event.', url: 'https://theverge.com/aiops-funding' },
  { id: 'paper-eval', canonicalId: 'event-paper-eval', title: 'Researchers publish agent evaluation benchmark', source: 'arXiv', category: 'research', publishedAt: '2026-07-14T12:00:00Z', summary: 'Benchmark paper.', url: 'https://arxiv.org/abs/2607.00001' },
];

export function assertFixtureContract(items = NEWS_FIXTURES) {
  expect(new Set(items.map(item => item.id)).size).toBe(items.length);
  expect(items.filter(item => item.canonicalId === 'event-openai-agent')).toHaveLength(2);
  for (const item of items) {
    expect(item.title).toBeTruthy();
    expect(item.source).toBeTruthy();
    expect(item.category).toBeTruthy();
    expect(item.publishedAt).toMatch(/^2026-07-14T/);
  }
}

export async function installExternalFixtures(page) {
  assertFixtureContract();
  await page.route('**/api/intelligence/events**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, events: NEWS_FIXTURES, updatedAt: '2026-07-14T12:30:00Z' }),
  }));
  await page.route('**/api/intelligence/items**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, items: NEWS_FIXTURES, updatedAt: '2026-07-14T12:30:00Z' }),
  }));
  await page.route('**/api/intelligence/opportunities**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, opportunities: [] }),
  }));
  await page.route('**/api/intelligence/weekly-sectors**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, sectors: [] }),
  }));
  await page.route('**/api/intelligence/alerts**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, alerts: [] }),
  }));
  await page.route('**/api/news**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, items: NEWS_FIXTURES, total: NEWS_FIXTURES.length }),
  }));
  await page.route('**/api/meta**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data: { sources: [...new Set(NEWS_FIXTURES.map(item => item.source))] } }),
  }));
  await page.route('**/api/trending**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, items: NEWS_FIXTURES.slice(0, 5) }),
  }));
  await page.route('**/api/github-trending**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, repos: [{ id: 'repo-1', name: 'agent-framework', fullName: 'example/agent-framework', stars: 12000 }] }),
  }));
}
