import { parseFeed } from '../parsing/feedParser.js';
import { trimSummary, trimIntro } from '../utils/textProcessing.js';

// ========== Jina AI Reader（绕过反爬虫，获取全文）==========
// 从顶级项目（AI News Radar/Horizon）学来的技术
// Jina AI Reader：免费、无需API Key、绕过所有反爬虫机制
export async function jinaFetch(url, timeoutMs = 8000) {
  try {
    const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(jinaUrl, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const text = await response.text();
    // Jina returns clean text, extract first 500 chars as summary
    return text.trim().slice(0, 500);
  } catch {
    return null;
  }
}

// ========== 增强的获取源函数（支持 Jina AI Reader 回退）==========
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function fetchSource(source, options = {}) {
  const timeoutMs = options.timeoutMs || 10_000;
  console.log('[fetchSource] Fetching:', source.name, source.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': BROWSER_UA },
      signal: controller.signal
    });

    if (!response.ok) {
      console.log('[fetchSource] Failed:', source.name, response.status);
      throw new Error(`${source.name} responded ${response.status}`);
    }

    const xml = await response.text();
    const items = parseFeed(xml, source).slice(0, 20);
    console.log('[fetchSource] Success:', source.name, items.length, 'items');

    // 尝试用 Jina AI Reader 增强摘要
    if (items.length > 0) {
      const topItems = items.slice(0, 3); // 只处理前3条，避免过多请求
      await Promise.allSettled(topItems.map(async (item) => {
        if (!item.summary || item.summary.length < 100) {
          const enhanced = await jinaFetch(item.url, 5000);
          if (enhanced) {
            item.summary = trimSummary(enhanced);
            item.bodyIntro = trimIntro(enhanced);
          }
        }
      }));
    }

    return { source: source.name, items };
  } catch (err) {
    console.log('[fetchSource] Error:', source.name, err.name, err.message, err.cause?.code || err.cause?.message || '');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
