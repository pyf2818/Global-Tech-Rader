import { IMAGE_BLACKLIST_RE, IMAGE_MIN_DIM_HINT, LAZY_LOAD_ATTRS } from '../config/constants.js';
import { decodeEntities, escapeRegExp } from '../utils/textProcessing.js';

export function normalizeImageKey(url) {
  try {
    const urlObj = new URL(url);
    urlObj.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 'ref', 'referrer'].forEach(param => urlObj.searchParams.delete(param));
    return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase()
      .replace(/-\d+x\d+(?=\.(jpg|jpeg|png|webp|avif)$)/i, '')
      .replace(/_(small|thumb|thumbnail|mini|icon|logo)(?=\.)/i, '');
  } catch {
    return String(url || '').split('?')[0].toLowerCase();
  }
}

export function getImageDimensionHint(context = '', url = '') {
  const escaped = escapeRegExp(url);
  const tagMatch = escaped
    ? context.match(new RegExp(`<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'i'))
    : context.match(/<img[^>]*>/i);
  const tag = tagMatch?.[0] || context;
  const width = tag.match(/\bwidth=["']?(\d{2,5})["']?/i)?.[1];
  const height = tag.match(/\bheight=["']?(\d{2,5})["']?/i)?.[1];
  return {
    width: width ? parseInt(width, 10) : 0,
    height: height ? parseInt(height, 10) : 0
  };
}

export function isLikelySiteAsset(url, context = '') {
  const urlText = String(url || '').toLowerCase();
  const localContext = String(context || '').length <= 2000 ? String(context || '').toLowerCase() : '';

  if (/(favicon|apple-touch-icon|android-chrome|mstile|mask-icon|site-logo|brand-logo|company-logo|logo\.|\/logo[-_.\/]|\/icons?\/|sprite|avatar|badge|placeholder|default-image|no-image|og-image-default)/i.test(urlText)) {
    return true;
  }
  if (localContext && /\b(class|id|alt|title)=["'][^"']*(logo|icon|sprite|avatar|badge|placeholder|default-image|no-image)[^"']*["']/i.test(localContext)) return true;

  const { width, height } = getImageDimensionHint(context, url);
  if (width && height) {
    if (width < 160 || height < 100) return true;
    const ratio = width / height;
    if (ratio < 0.45 || ratio > 4.5) return true;
  }
  return false;
}

export function parseSrcset(srcset) {
  const candidates = srcset.split(',').map(s => {
    const parts = s.trim().split(/\s+/);
    if (parts.length < 2) return null;
    const url = parts[0];
    const widthMatch = parts[1].match(/(\d+)w/);
    const width = widthMatch ? parseInt(widthMatch[1], 10) : 0;
    return { url, width };
  }).filter(Boolean);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.width - a.width);
  return candidates[0].url;
}

export function optimizeImageUrl(url) {
  if (!url) return url;

  try {
    const urlObj = new URL(url);

    // WordPress thumbnail 闂?full size
    url = url.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp))/i, '$1');

    // Cloudinary: remove resize parameters.
    url = url.replace(/\/upload\/(q_\d+,c_scale,w_\d+,h_\d+|c_fill,w_\d+,h_\d+|w_\d+,h_\d+,c_scale)/, '/upload');

    // Unsplash: prefer larger image variants.
    url = url.replace(/\/w=\d+&h=\d+&fit=crop/, '/w=1600&fit=cover');
    url = url.replace(/\/w=\d+&q=\d+/, '/w=1600&q=90');

    // Imgix: remove optimization query.
    url = url.replace(/\?.*$/, '');

    // WordPress.com: remove size query.
    url = url.replace(/\?w=\d+(&h=\d+)?(&fit=crop)?/, '');

    // Remove common resize/query parameters.
    url = url.replace(/[?&](width|height|w|h|size|resize|scale|quality|q)=\d+/gi, '');
    url = url.replace(/[?&](fit|crop|fill|pad)=\w+/gi, '');

    // 缂佺虎鍙庨崰鏇犳崲濮樿泛鐭楁い蹇撴噺缁犳帒鈽夐幘顖氫壕婵??
    url = url.replace(/[?&]+/, '?').replace(/\?$/, '');

    return url;
  } catch {
    return url;
  }
}

export function isGoodImageUrl(url, htmlSource) {
  if (!url) return false;
  if (IMAGE_BLACKLIST_RE.test(url)) return false;
  if (isLikelySiteAsset(url, htmlSource)) return false;

  const trackingDomains = /\/\/(gravatar\.|disqus\.|pixel\.|tracking\.|analytics\.|doubleclick\.|adsense\.|adnxs\.|moatads\.|chartbeat\.|newrelic\.|pingdom\.|taboola\.|outbrain\.|zemanta\.)/i;
  if (trackingDomains.test(url)) return false;

  const iconPatterns = /\/(favicon|apple-touch-icon|android-chrome|mstile|browserconfig|tile|icon-|logo[-_]?icon|site[-_]?icon|touch[-_]?icon|bookmark[-_]?icon|shortcut[-_]?icon)/i;
  if (iconPatterns.test(url)) return false;

  if (/\.(ico|cur|bmp|svg)$/i.test(url)) {
    if (!/\/(screenshot|demo|preview|featured|hero|article|post|content)\b/i.test(url)) return false;
  }

  const dimHint = getImageDimensionHint(htmlSource, url);
  if (dimHint.width && dimHint.height && (dimHint.width < 240 || dimHint.height < 140)) return false;

  const genericPatterns = /\/(logo|header[-_]?bg|footer[-_]?bg|nav[-_]?bg|hero[-_]?bg|banner[-_]?bg|site[-_]?logo|brand[-_]?logo|company[-_]?logo|organization[-_]?logo|placeholder|no[-_]?image|image[-_]?not[-_]?found|default[-_]?image|generic[-_]?image|common[-_]?image|shared[-_]?image|global[-_]?image|empty|blank|skeleton|loading|spinner|pulse|dots|badge|shield|button[-_]?icon|nav[-_]?icon|menu[-_]?icon|social[-_]?icon|share[-_]?icon|notification[-_]?icon|push[-_]?icon|web[-_]?push[-_]?icon)([-_]|$)/i;
  if (genericPatterns.test(url)) return false;

  const placeholderServices = /\/(via\.placeholder\.com|placehold\.co|dummyimage\.com|placehold\.it|fakeimg\.pl|loremflickr\.com|placekitten\.com|baconmockup\.com|placebear\.com)/i;
  if (placeholderServices.test(url)) return false;

  if (/\/(16x16|24x24|32x32|40x40|48x48|64x64)\b/i.test(url)) return false;

  const trackingPatterns = /\/(tracking|pixel|beacon|stat|analytics|log|impression|click|view|counter|tracker|monitor|telemetry|hit|collect|event|session|user[-_]?id|visitor[-_]?id|page[-_]?view)/i;
  if (trackingPatterns.test(url)) return false;

  return true;
}
function pushImageCandidate(candidates, url, context, source) {
  if (!url || !isGoodImageUrl(url, context)) return;
  const optimized = optimizeImageUrl(url);
  if (!optimized) return;
  candidates.push({ url: optimized, context, source });
}

export function normalizeCandidateImageUrl(url, baseUrl = '') {
  if (!url) return '';
  try {
    const cleaned = decodeEntities(String(url))
      .replace(/\\u002[fF]/g, '/')
      .replace(/\\\//g, '/')
      .trim();
    if (!cleaned || /^(data|blob):/i.test(cleaned)) return '';
    if (cleaned.startsWith('//')) return `https:${cleaned}`;
    return baseUrl ? new URL(cleaned, baseUrl).href : cleaned;
  } catch {
    return '';
  }
}

export function collectStructuredImageCandidates(htmlSource = '', baseUrl = '') {
  const candidates = [];
  const push = (url, context, source) => {
    const normalized = normalizeCandidateImageUrl(url, baseUrl);
    pushImageCandidate(candidates, normalized, context, source);
  };

  const metaImagePattern = /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["'][^>]*>/gi;
  [...htmlSource.matchAll(metaImagePattern)].forEach(match => {
    push(match[1] || match[2], match[0], /twitter/i.test(match[0]) ? 'twitter' : 'og');
  });

  const linkImagePattern = /<link[^>]+rel=["'][^"']*(?:image_src|preload)[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*(?:image_src|preload)[^"']*["'][^>]*>/gi;
  [...htmlSource.matchAll(linkImagePattern)].forEach(match => push(match[1] || match[2], match[0], 'link'));

  const jsonImagePatterns = [
    /"image"\s*:\s*"([^"]+)"/gi,
    /"thumbnailUrl"\s*:\s*"([^"]+)"/gi,
    /"url"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"]*)?)"/gi
  ];
  jsonImagePatterns.forEach(pattern => {
    [...htmlSource.matchAll(pattern)].slice(0, 20).forEach(match => push(match[1], match[0], 'json'));
  });

  return candidates;
}

function selectBestImageCandidate(candidates) {
  const seen = new Set();
  return candidates
    .filter(candidate => {
      const key = normalizeImageKey(candidate.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(candidate => {
      const { score, reasons } = scoreImageUrl(candidate.url, candidate.context);
      const sourceBonus = candidate.source === 'og' ? 18
        : candidate.source === 'twitter' ? 16
        : candidate.source === 'json' ? 12
        : candidate.source === 'media' ? 10
        : candidate.source === 'enclosure' ? 8
        : candidate.source === 'srcset' ? 6
        : candidate.source === 'lazy' ? 5
        : candidate.source === 'link' ? 5
        : 0;
      return { ...candidate, score: score + sourceBonus, reasons };
    })
    .filter(candidate => candidate.score >= 20)
    .sort((a, b) => b.score - a.score)[0]?.url || '';
}

export function extractImageUrl(block, rawContent) {
  const candidates = [];

  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["'][^"']*image[^"']*["']/i)
    || block.match(/<enclosure[^>]+type=["'][^"']*image[^"']*["'][^>]+url=["']([^"']+)["']/i);
  if (enclosure) pushImageCandidate(candidates, enclosure[1], block, 'enclosure');

  const mediaThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mediaThumb) pushImageCandidate(candidates, mediaThumb[1], block, 'media');

  const mediaContent = block.match(/<media:content[^>]+(?:medium|type)=["']image["'][^>]+url=["']([^"']+)["']/i)
    || block.match(/<media:content[^>]+url=["']([^"']+)["'][^>]+(?:medium|type)=["']image["']/i);
  if (mediaContent) pushImageCandidate(candidates, mediaContent[1], block, 'media');

  const encNoType = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (encNoType && /\.(jpg|jpeg|png|gif|webp|avif)/i.test(encNoType[1])) {
    pushImageCandidate(candidates, encNoType[1], block, 'enclosure');
  }

  const htmlSource = `${block || ''}\n${rawContent || ''}`;
  candidates.push(...collectStructuredImageCandidates(htmlSource));

  for (const attr of LAZY_LOAD_ATTRS) {
    const lazyMatches = [...htmlSource.matchAll(new RegExp(`<img[^>]+${attr}=["']([^"']+)["'][^>]*>`, 'gi'))];
    lazyMatches.forEach(match => pushImageCandidate(candidates, match[1], match[0], 'lazy'));
  }

  const srcsetMatches = [...htmlSource.matchAll(/<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi)];
  srcsetMatches.forEach(match => {
    const maxSrc = parseSrcset(match[1]);
    pushImageCandidate(candidates, maxSrc, match[0], 'srcset');
  });

  const allImages = [...htmlSource.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  allImages.forEach(imgMatch => {
    const src = imgMatch[1];
    if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(src)) {
      pushImageCandidate(candidates, src, imgMatch[0], 'img');
    }
  });

  return selectBestImageCandidate(candidates);
}
export function extractVideoUrl(block) {
  // 1. <enclosure> with video type
  const videoEnc = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["'][^"']*video[^"']*["']/i)
    || block.match(/<enclosure[^>]+type=["'][^"']*video[^"']*["'][^>]+url=["']([^"']+)["']/i);
  if (videoEnc) return videoEnc[1];

  // 2. <media:content> with video
  const mediaVideo = block.match(/<media:content[^>]+(?:medium|type)=["']video["'][^>]+url=["']([^"']+)["']/i);
  if (mediaVideo) return mediaVideo[1];

  // 3. YouTube formats
  const ytWatch = block.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i);
  if (ytWatch) return ytWatch[0];

  const ytShort = block.match(/https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/i);
  if (ytShort) return `https://www.youtube.com/watch?v=${ytShort[1]}`;

  const ytEmbed = block.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i);
  if (ytEmbed) return `https://www.youtube.com/watch?v=${ytEmbed[1]}`;

  // 4. Vimeo
  const vimeo = block.match(/https?:\/\/vimeo\.com\/(\d+)/i);
  if (vimeo) return vimeo[0];

  // 5. Bilibili
  const bili = block.match(/https?:\/\/(?:www\.)?bilibili\.com\/video\/([a-zA-Z0-9]+)/i);
  if (bili) return bili[0];

  // 6. HTML5 video tag
  const videoTag = block.match(/<video[^>]*>\s*<source[^>]+src=["']([^"']+)["'][^>]*>/is);
  if (videoTag) return videoTag[1];

  const videoTagDirect = block.match(/<video[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (videoTagDirect) return videoTagDirect[1];

  return '';
}

// ========== 闂佸搫鎳樼紓姘跺礂濮椻偓瀹曞爼宕滆椤ｅ鎮归崶褍顏╅柛銊ユ捣閸栨牠鎳￠妶鍥х厷 ==========

export function scoreImageUrl(url, context) {
  if (!url) return { score: -1, reasons: [] };

  let score = 0;
  const reasons = [];

  // 缂傚倷鐒﹀娆戔偓?1闂佹寧绋掗懝楣冨及閸屾壕鍋撻崹顐ゆ憙闁伙箑閰ｅ畷?(0-30闂?
  const dimScore = scoreDimensions(url, context);
  score += dimScore;
  if (dimScore > 0) reasons.push(`闁诲繐绻愰幖顐︻敋?${dimScore}`);
  if (dimScore < 0) reasons.push(`闁诲繐绻愰幖顐︻敋?${dimScore}`);

  // 缂傚倷鐒﹀娆戔偓?2闂佹寧绋掓穱娲儗閹屽殫闁告洦鍠氬Σ鎴︽煕?(0-20闂?
  const pathScore = scorePath(url);
  score += pathScore;
  if (pathScore > 0) reasons.push(`闁荤姳璀﹂崹鎵?${pathScore}`);
  if (pathScore < 0) reasons.push(`闁荤姳璀﹂崹鎵?${pathScore}`);

  // 缂傚倷鐒﹀娆戔偓?3闂佹寧绋掗悺鐜猼 闂佸搫鍊稿ú锕€锕㈤幍顔藉珰闁告洦鍋勯悗?(0-15闂?
  const altScore = scoreAltText(url, context);
  score += altScore;
  if (altScore > 0) reasons.push(`Alt:${altScore}`);
  if (altScore < 0) reasons.push(`Alt:${altScore}`);

  // 缂傚倷鐒﹀娆戔偓?4闂佹寧绋掗惌顔剧礊閸涱垳纾炬い鏃囨硶濡叉垿鏌?(0-25闂?
  const posScore = scorePosition(url, context);
  score += posScore;
  if (posScore > 0) reasons.push(`婵炶揪绲界粔鍫曟偪?${posScore}`);
  if (posScore < 0) reasons.push(`婵炶揪绲界粔鍫曟偪?${posScore}`);

  // 缂傚倷鐒﹀娆戔偓?5闂佹寧绋掑銊ф偖椤愶箑鍨傞悗锝庡幘濡叉垿鏌?(0-15闂?
  const typeScore = scoreType(url);
  score += typeScore;
  if (typeScore > 0) reasons.push(`缂備緡鍋夐褔鎮?${typeScore}`);
  if (typeScore < 0) reasons.push(`缂備緡鍋夐褔鎮?${typeScore}`);

  // 缂傚倷鐒﹀娆戔偓?6闂佹寧绋掓穱娲敋閵忥紕鈻曞璺烘捣濡叉垿鏌?(0-20闂?
  const semanticScore = scoreSemantic(url, context);
  score += semanticScore;
  if (semanticScore > 0) reasons.push(`闁荤姴娴傞崢铏圭不?${semanticScore}`);
  if (semanticScore < 0) reasons.push(`闁荤姴娴傞崢铏圭不?${semanticScore}`);

  return { score, reasons };
}

export function scoreDimensions(url, context) {
  let score = 0;
  const hint = getImageDimensionHint(context, url);
  if (hint.width && hint.height) {
    const { width, height } = hint;
    if (width >= 800 && height >= 400) score += 15;
    else if (width >= 600 && height >= 300) score += 10;
    else if (width >= 400 && height >= 200) score += 5;
    else if (width >= 300 && height >= 150) score += 3;
    const ratio = width / height;
    if (ratio >= 0.8 && ratio <= 3.0) score += 3;
  }
  if (/full|large|xl|xxl|2x|3x|original|hd|highres|maxi|grande/i.test(url)) score += 5;
  if (/thumbnail|thumb|small|tiny|mini|icon|logo|square|avatar|profile/i.test(url)) score -= 5;
  return score;
}

export function scorePath(url) {
  let score = 0;
  if (/(img|images|assets|static|public|media|photos|screenshots|pictures|gallery|content|article|post|featured|hero|cover|main|lead|primary|display)/i.test(url)) score += 5;
  if (/\/(cover|hero|featured|main|lead|primary|headline|article-img|screenshot|demo|screen)(\/|$)/i.test(url)) score += 5;
  if (/(icon|logo|avatar|badge|shield|button|btn|nav|header|footer|sidebar|widget|share|social|tracking|pixel|analytics|ad|advertisement|sponsor|promo|popup|overlay|separator|divider|spacer|texture|pattern|watermark|brand|identity|template|default|generic|common|shared|global|menu-btn|nav-btn|close-btn|icon-btn|social-icon|share-icon|notification-icon|push-icon|web-push-icon|mstile|apple-touch-icon|android-chrome|safari-pinned|ticker|subscribe|related-post|og-image-default)/i.test(url)) score -= 8;
  if (/(logo|site-logo|brand-logo|company-logo|organization-logo|tracking|pixel|beacon|stat|analytics|ad-server|adsense|doubleclick|adnxs|moatads|chartbeat|newrelic|pingdom|taboola|outbrain|zemanta|share-bar|social-bar|gravatar|feedburner|rss)/i.test(url)) score -= 12;
  if (/(recommendation|related|trending|popular|sponsored|promo|advertisement|sidebar|widget|footer)/i.test(url)) score -= 10;
  return score;
}

export function scoreAltText(url, context) {
  if (!context) return 0;
  const escaped = escapeRegExp(url);
  const altMatch = context.match(new RegExp(`<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["'][^"']*${escaped}[^"']*["'][^>]*alt=["']([^"']+)["']`, 'i'));
  if (!altMatch) return 0;
  const alt = altMatch[1].toLowerCase();
  let score = 0;
  if (/(screenshot|demo|preview|illustration|chart|graph|diagram|example|result|output|interface|infographic|visual|mockup|prototype|product|device|scene|scenario|landscape|portrait)/i.test(alt)) score += 8;
  if (alt.length >= 10 && alt.length <= 100) score += 2;
  if (/^(image|img|pic|photo|picture|logo|icon|a|an|the)$/i.test(alt)) score -= 5;
  if (/^(banner|ad|advertisement|sponsor|promo|button|btn|icon|logo|avatar|badge)$/i.test(alt)) score -= 8;
  return score;
}

export function scorePosition(url, context) {
  if (!context) return 0;
  const escaped = escapeRegExp(url);
  const imgMatch = context.match(new RegExp(`<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'i'));
  if (!imgMatch) return 0;
  const imgIndex = context.indexOf(imgMatch[0]);
  const beforeContext = context.substring(Math.max(0, imgIndex - 1000), imgIndex);
  const afterContext = context.substring(imgIndex + imgMatch[0].length, Math.min(context.length, imgIndex + imgMatch[0].length + 1000));
  const surroundingContext = `${beforeContext} ${afterContext}`.toLowerCase();
  let score = 0;
  if (/related|recommended|you might also like|also read|trending|popular|sponsored|promoted|advertisement|sidebar|footer|widget/i.test(surroundingContext)) score -= 40;
  const articleMatch = context.match(/<(article|main)\b[^>]*>|<div[^>]*(class|id)=["'][^"']*(article|content|post|entry|body|story)[^"']*["'][^>]*>/i);
  if (articleMatch) {
    const articleStart = context.indexOf(articleMatch[0]);
    if (imgIndex >= articleStart) {
      score += 25;
      if (imgIndex - articleStart < 1200) score += 10;
      else if (imgIndex - articleStart < 3000) score += 5;
    }
  }
  return score;
}
export function scoreType(url) {
  let score = 0;

  // 闂佸搫绉堕崢褏妲愰敍鍕珰闁告洦鍋勯悗濠氭煥濞戞澧旂紒槌栧弮瀹曟宕奸妷褍钂嬮柣鐘冲姂閸旀垿宕冲ú顏勫唨闁绘挸娴风涵鈧梺?  if (/\.webp$/i.test(url)) score += 15;
  if (/\.png$/i.test(url)) score += 10;
  if (/(jpg|jpeg)$/i.test(url)) score += 8;
  if (/\.gif$/i.test(url)) score -= 5; // GIF 闂備緡鍋呴懝楣冩偉閸洖鍙婃い鏍ㄨ壘琚熼梺鎼炲劤閸嬫捇宕归妸褌鐒婇煫鍥ㄦ尰缁?  if (/\.svg$/i.test(url)) score -= 10; // SVG 闂備緡鍋呴懝楣冩偉閸洖鍙婃い鏍ㄧ缁傚牓鏌?  if (/\.ico$/i.test(url)) score -= 20; // ICO 闂佸搫瀚烽崹鏉棵瑰鈧?
  return score;
}

export function scoreSemantic(url, context) {
  if (!context) return 0;
  const escaped = escapeRegExp(url);
  const imgMatch = context.match(new RegExp(`<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'i'));
  if (!imgMatch) return 0;
  const imgIndex = context.indexOf(imgMatch[0]);
  const beforeText = context.substring(Math.max(0, imgIndex - 500), imgIndex);
  const afterText = context.substring(imgIndex + imgMatch[0].length, Math.min(context.length, imgIndex + imgMatch[0].length + 500));
  const surroundingText = `${beforeText} ${afterText}`.toLowerCase();
  let score = 0;
  if (/related|recommended|you might also like|also read|trending|popular|sponsored|promoted|affiliate|tracking|pixel|analytics|骞垮憡|璧炲姪/i.test(surroundingText)) score -= 35;
  if (/(shown|above|below|graph|chart|diagram|illustration|screenshot|example|demonstrat|depict|display|feature|figure|product|device|interface|姝ｆ枃|鍐呭|鏂囩珷)/i.test(surroundingText)) score += 5;
  if (/(advertisement|ad|sponsor|promoted|promotional|affiliate|referral|tracking|pixel|analytics|骞垮憡|璧炲姪)/i.test(surroundingText)) score -= 10;
  if (/<figcaption[\s\S]{0,500}<\/figcaption>/i.test(surroundingText)) score += 5;
  return score;
}
