// useTranslationSummary - 翻译与摘要，从 App.jsx 1243-1245 + 1276-1282 + 4216-4498 行提取
// 含 6 个 useState + 7 个函数 (cleanSummaryText / getSummaryEntry / buildLocalShortSummary /
// buildArticleEvidence / scrapeArticleForSummary / normalizeModelSummary / ensureSummary /
// handleSummaryToggle / requestTranslation / getTranslation / toggleGithubTranslation)
// llmConfig 通过参数注入

import { useEffect, useState } from 'react';
import { loadLS, saveLS } from '../utils/localStorage.js';
import { showToast } from '../utils/toast.js';
import { isEnglishText } from '../utils/format.js';

export function useTranslationSummary(llmConfig) {
  const [expandedSummary, setExpandedSummary] = useState({});
  const [summaryCache, setSummaryCache] = useState(() => loadLS('summaryCache', {}));
  const [summaryLoading, setSummaryLoading] = useState({});
  const [translations, setTranslations] = useState(() => loadLS('translations', {}));
  const [translationOpen, setTranslationOpen] = useState({});
  const [translatingItems, setTranslatingItems] = useState({});

  useEffect(() => { saveLS('translations', translations); }, [translations]);

  function cleanSummaryText(text = '', max = 160) {
    const normalized = String(text || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/arXiv:\S+\s+Announce Type:\s*\w+\s+Abstract:\s*/i, '')
      .replace(/Nature [^,]+,\s*Published online:[^;]+;\s*doi:\S+\s*/i, '')
      .replace(/\bdoi:\s*10\.\S+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return '';
    return normalized.length > max ? `${normalized.slice(0, max).trim()}...` : normalized;
  }

  function getSummaryEntry(item) {
    const cached = summaryCache[item.id];
    if (!cached) return null;
    if (typeof cached === 'object' && cached.text) return cached;
    if (typeof cached === 'string') {
      const isOldTemplate = cached.includes('场景:') || cached.includes('行动:') || cached.includes('核心:');
      if (!isOldTemplate && cached.length <= 220) return { text: cached, mode: 'legacy' };
    }
    return null;
  }

  function buildLocalShortSummary(item) {
    const sourceText = item.bodyIntro || item.fullContent || item.content || item.summary || item.title || '';
    const cleaned = cleanSummaryText(sourceText, 140);
    if (cleaned) return cleaned;
    return cleanSummaryText(`${item.title || ''} ${item.source ? `（${item.source}）` : ''}`, 100);
  }

  function buildArticleEvidence(item, scraped = null) {
    const tags = Array.isArray(item.tags) ? item.tags.join('、') : (item.tags || '');
    return [
      `标题：${item.title || ''}`,
      `来源：${item.source || ''}`,
      tags ? `标签：${tags}` : '',
      item.publishedAt ? `发布时间：${item.publishedAt}` : '',
      item.url ? `链接：${item.url}` : '',
      item.summary ? `RSS摘要：${cleanSummaryText(item.summary, 500)}` : '',
      item.bodyIntro ? `RSS正文片段：${cleanSummaryText(item.bodyIntro, 1400)}` : '',
      item.fullContent ? `素材全文：${cleanSummaryText(item.fullContent, 1400)}` : '',
      item.content ? `内容片段：${cleanSummaryText(item.content, 1000)}` : '',
      scraped?.summary ? `网页抓取摘要：${cleanSummaryText(scraped.summary, 1400)}` : '',
      scraped?.description ? `网页描述：${cleanSummaryText(scraped.description, 500)}` : ''
    ].filter(Boolean).join('\n');
  }

  async function scrapeArticleForSummary(item) {
    if (!item.url) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, mode: 'basic', timeout: 8 }),
        signal: controller.signal
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.error) return null;
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeModelSummary(text, fallback) {
    const cleaned = cleanSummaryText(text, 120)
      .replace(/^摘要[:：]\s*/i, '')
      .replace(/^一句话[:：]\s*/i, '')
      .trim();
    return cleaned || fallback;
  }

  async function ensureSummary(item) {
    if (getSummaryEntry(item) || summaryLoading[item.id]) return;
    const fallback = buildLocalShortSummary(item);
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      setSummaryCache(prev => ({
        ...prev,
        [item.id]: { text: fallback, mode: 'local', createdAt: new Date().toISOString() }
      }));
      return;
    }

    setSummaryLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      const scraped = await scrapeArticleForSummary(item);
      const evidence = buildArticleEvidence(item, scraped);
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'chat',
          systemPrompt: '你是资讯平台的短摘要助手。只能根据用户提供的文章信息总结，不得编造未给出的事实。',
          messages: [{ role: 'user', content: evidence.slice(0, 6000) }],
          content: '请用中文输出一句不超过70字的真实短摘要，只说这条资讯在讲什么，不要写推荐理由、场景、行动，也不要分点。'
        })
      });
      const data = await res.json();
      const text = data.ok ? normalizeModelSummary(data.content, fallback) : fallback;
      setSummaryCache(prev => ({
        ...prev,
        [item.id]: {
          text,
          mode: data.ok ? (scraped ? 'llm-scraped' : 'llm-card') : 'fallback',
          createdAt: new Date().toISOString()
        }
      }));
    } catch {
      setSummaryCache(prev => ({
        ...prev,
        [item.id]: { text: fallback, mode: 'fallback', createdAt: new Date().toISOString() }
      }));
    } finally {
      setSummaryLoading(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  function handleSummaryToggle(item) {
    const willOpen = !expandedSummary[item.id];
    setExpandedSummary(prev => ({ ...prev, [item.id]: willOpen }));
    if (willOpen) ensureSummary(item);
  }

  async function requestTranslation(item) {
    const existing = translations[item.id];
    // 如果存在旧翻译且格式正确（有 summary 字段），直接返回；否则重新翻译
    if (existing && existing.title && existing.title !== item.title && existing.summary !== undefined) {
      return existing;
    }
    if (translatingItems[item.id]) {
      return null;
    }

    const isEnglish = isEnglishText(item.title);
    if (!isEnglish) {
      return null;
    }

    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      showToast('请先在设置中配置大模型 API');
      return null;
    }

    setTranslatingItems(prev => ({ ...prev, [item.id]: true }));

    try {
      const content = `title: ${item.title}\nsummary: ${item.summary || ''}`;
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'translate_zh',
          content
        })
      });

      const data = await response.json();
      if (data.error) {
        showToast(`翻译失败: ${data.error}`);
        return null;
      }

      const lines = (data.content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // 跳过 LLM 添加的说明文字前缀
      const skipPrefixes = ['以下是', 'Here is', 'Translation:', '翻译：', 'Translated:', '翻译结果', '以下是翻译结果'];
      const filteredLines = lines.filter(line => !skipPrefixes.some(prefix => line.toLowerCase().startsWith(prefix.toLowerCase())));
      const finalLines = filteredLines.length > 0 ? filteredLines : lines;

      if (finalLines.length === 0) {
        showToast('翻译返回空内容');
        return null;
      }

      // 第一行作为标题，其余作为摘要
      const title = finalLines[0] || item.title;
      const summary = finalLines.slice(1).join('\n') || '';

      if (!title || title === item.title) {
        showToast('翻译失败：无法获取翻译结果');
        return null;
      }

      // 检查翻译是否包含中文
      const hasChinese = /[一-鿿]/.test(title);
      if (!hasChinese) {
        showToast('翻译结果不包含中文，请重试');
        return null;
      }

      const translated = { title, summary };
      setTranslations(prev => ({ ...prev, [item.id]: translated }));
      return translated;
    } catch (e) {
      showToast(`翻译失败: ${e.message}`);
      return null;
    } finally {
      setTranslatingItems(prev => ({ ...prev, [item.id]: false }));
    }
  }

  function getTranslation(item) {
    return translations[item.id] || null;
  }

  // GitHub 翻译：切换开关 + 打开时触发请求
  function toggleGithubTranslation(repo) {
    const id = repo.id;
    setTranslationOpen(prev => {
      const next = { ...prev, [id]: !prev[id] };
      // 打开且无缓存时触发翻译
      if (next[id] && !translations[id] && !translatingItems[id]) {
        requestTranslation({ id, title: repo.fullName, summary: repo.description });
      }
      return next;
    });
  }

  return {
    expandedSummary,
    setExpandedSummary,
    summaryCache,
    setSummaryCache,
    summaryLoading,
    setSummaryLoading,
    translations,
    setTranslations,
    translationOpen,
    setTranslationOpen,
    translatingItems,
    setTranslatingItems,
    getSummaryEntry,
    handleSummaryToggle,
    requestTranslation,
    getTranslation,
    toggleGithubTranslation,
  };
}
