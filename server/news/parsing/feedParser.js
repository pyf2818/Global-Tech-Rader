import { cleanText, decodeEntities, trimSummary, trimIntro, normalizeDate, detectCategory, detectTags, detectMode, hash, escapeRegExp } from '../utils/textProcessing.js';
import { extractImageUrl, extractVideoUrl } from '../images/imageProcessing.js';

export function parseFeed(xml, source) {
  const blocks = matchBlocks(xml, 'item').length ? matchBlocks(xml, 'item') : matchBlocks(xml, 'entry');
  return blocks.map((block, index) => normalizeItem(block, source, index)).filter(item => item.title && item.url);
}

export function normalizeItem(block, source, index) {
  const title = cleanText(pick(block, ['title']));
  const rawSummary = cleanText(pick(block, ['description', 'summary']));
  const rawContent = pick(block, ['content:encoded', 'content']);
  const bodyIntro = trimIntro(cleanText(rawContent));
  const summary = trimSummary(rawSummary || bodyIntro);
  const url = cleanText(pick(block, ['link'])) || pickAtomLink(block);
  const publishedAt = normalizeDate(pick(block, ['pubDate', 'published', 'updated', 'dc:date']));
  const text = `${title} ${summary} ${bodyIntro} ${source.name}`;
  const category = detectCategory(text, source.defaultCategory);
  const tags = detectTags(text, category);

  const imageUrl = extractImageUrl(block, rawContent);
  const videoUrl = extractVideoUrl(block);

  return {
    id: hash(`${source.name}-${url}-${index}`),
    title,
    summary,
    bodyIntro,
    url,
    source: source.name,
    sourceUrl: source.url,
    region: source.region,
    category,
    mode: detectMode(text, source.name),
    publishedAt,
    tags,
    imageUrl,
    videoUrl
  };
}

export function matchBlocks(xml, tag) {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  return [...xml.matchAll(pattern)].map(match => match[1]);
}

export function pick(block, tags) {
  for (const tag of tags) {
    const pattern = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'i');
    const match = block.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

export function pickAtomLink(block) {
  const href = block.match(/<link\\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return href ? decodeEntities(href) : '';
}
