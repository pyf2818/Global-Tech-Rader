import { useMemo } from 'react';

// Extracted from App.jsx - intelligence-related useMemo computations.
// Logic is unchanged; only moved into a hook for maintainability.
// Deps arrays are preserved exactly as they were in App.jsx.
export function useIntelligenceMemos({
  items,
  followKeywords,
  briefingConfig,
  trackTargets,
  categories,
  trendData,
  bookmarks,
}) {
  const dailyBriefing = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const todayItems = items.filter(i => new Date(i.publishedAt) >= yesterday);

    const sourceWeight = { 'TechCrunch': 1.5, 'MIT Technology Review': 1.5, 'The Verge': 1.3, 'Wired': 1.3, 'Ars Technica': 1.3, 'OpenAI Blog': 1.4, 'Anthropic News': 1.4, 'Google DeepMind': 1.4, '量子位': 1.2, '机器之心': 1.2 };

    const scored = todayItems.map(item => {
      let score = 100;
      const age = (now - new Date(item.publishedAt)) / (1000 * 60 * 60);
      score += Math.max(0, 50 - age * 2);
      score *= sourceWeight[item.source] || 1;
      if (followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))) score += 30;
      if (/\b(ai|llm|gpt|大模型|芯片|融资|发布)\b/i.test(item.title)) score += 20;
      return { ...item, score };
    }).sort((a, b) => b.score - a.score);

    const count = briefingConfig.length === 'compact' ? 5 : briefingConfig.length === 'detailed' ? 20 : 10;
    const topNews = scored.slice(0, count);

    const categoryGroups = {};
    topNews.forEach(item => {
      if (!categoryGroups[item.category]) categoryGroups[item.category] = [];
      categoryGroups[item.category].push(item);
    });

    const emergingKeywords = [...new Set(todayItems.flatMap(i => {
      const words = i.title.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      return words.filter(w => !['this', 'that', 'with', 'from', 'have', 'will', 'been', 'were', 'they', 'their', 'what', 'when', 'more', 'some', 'time', 'very', 'just', 'know', 'take', 'come', 'made', 'could', 'after', 'also', 'than', 'them', 'other', 'into', 'your', 'about', 'over', 'such', 'only', 'then', 'most', 'would'].includes(w));
    }))].slice(0, 10);

    return { topNews, categoryGroups, emergingKeywords, totalToday: todayItems.length, generatedAt: now.toISOString() };
  }, [items, followKeywords, briefingConfig.length]);

  const trackerData = useMemo(() => {
    const result = {};
    trackTargets.forEach(target => {
      const matched = items.filter(i => {
        const text = `${i.title} ${i.summary}`.toLowerCase();
        return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
      });
      const last7Days = matched.filter(i => new Date(i.publishedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const last30Days = matched.filter(i => new Date(i.publishedAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      result[target.id] = { all: matched, last7Days, last30Days, total: matched.length, weekly: last7Days.length };
    });
    return result;
  }, [items, trackTargets]);

  // 洞察分析数据层
  const insightData = useMemo(() => {
    const now = new Date();
    const buildDayKeys = (days) => Array.from({ length: days }).map((_, idx) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1 - idx));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const day14 = buildDayKeys(14);
    const day7 = day14.slice(7);
    const day7prev = day14.slice(0, 7);
    const day30 = buildDayKeys(30);

    // 近30天赛道趋势数据（用于趋势对比图）
    const categoryTrend30 = categories.map(cat => {
      const daily30 = day30.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length);
      return { id: cat.id, label: cat.label, daily30 };
    }).filter(c => c.daily30.some(v => v > 0));

    // 赛道关联分析：统计同一篇文章中同时出现的赛道对
    const categoryCorrelations = [];
    const catPairCounts = new Map();
    items.forEach(item => {
      const itemCats = new Set([item.category]);
      // 查找同一来源同一天的其他文章
      const sameDayItems = items.filter(i => i.source === item.source && i.publishedAt?.slice(0, 10) === item.publishedAt?.slice(0, 10) && i.id !== item.id);
      sameDayItems.forEach(other => {
        if (other.category !== item.category) {
          const pair = [item.category, other.category].sort().join('::');
          catPairCounts.set(pair, (catPairCounts.get(pair) || 0) + 1);
        }
      });
    });
    catPairCounts.forEach((count, pair) => {
      const [cat1, cat2] = pair.split('::');
      const label1 = categories.find(c => c.id === cat1)?.label || cat1;
      const label2 = categories.find(c => c.id === cat2)?.label || cat2;
      categoryCorrelations.push({ cat1, cat2, label1, label2, count });
    });
    categoryCorrelations.sort((a, b) => b.count - a.count);

    // 赛道增长率（近7天 vs 前7天）+ 7日趋势线
    const categoryGrowth = categories.map(cat => {
      const daily7 = day7.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length);
      const recent = daily7.reduce((a, b) => a + b, 0);
      const prev = day7prev.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length).reduce((a, b) => a + b, 0);
      const growth = prev === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - prev) / prev) * 100);
      return { id: cat.id, label: cat.label, recent, prev, growth, daily7 };
    }).sort((a, b) => b.growth - a.growth);

    // 赛道动量分数（近3天加权）
    const day3 = day7.slice(4);
    const categoryMomentum = categories.map(cat => {
      const weights = [1, 2, 3];
      const score = day3.reduce((sum, d, idx) => {
        return sum + items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length * weights[idx];
      }, 0);
      return { id: cat.id, label: cat.label, score };
    }).sort((a, b) => b.score - a.score);

    // 来源区域分布
    const regionDistribution = { domestic: 0, overseas: 0, global: 0 };
    items.forEach(i => { regionDistribution[i.region] = (regionDistribution[i.region] || 0) + 1; });
    const regionPct = {
      domestic: items.length ? Math.round(regionDistribution.domestic / items.length * 100) : 0,
      overseas: items.length ? Math.round(regionDistribution.overseas / items.length * 100) : 0,
      global: items.length ? Math.round(regionDistribution.global / items.length * 100) : 0
    };

    // 异常检测：近7天日均 vs 前7天日均，变化超过50%标记异常
    const anomalies = categoryGrowth.filter(c => Math.abs(c.growth) > 50).map(c => ({
      ...c, type: c.growth > 0 ? 'surge' : 'drop'
    }));

    // 今日 vs 昨日
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    const todayCount = items.filter(i => i.publishedAt?.slice(0, 10) === today).length;
    const yesterdayCount = items.filter(i => i.publishedAt?.slice(0, 10) === yesterdayStr).length;
    const dailyChange = yesterdayCount === 0 ? 0 : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);

    // 热门赛道排行（综合计数+增长率）
    const categoryRanking = categoryGrowth.map(c => ({
      ...c,
      momentum: categoryMomentum.find(m => m.id === c.id)?.score || 0,
      heatScore: c.recent * 2 + c.momentum
    })).sort((a, b) => b.heatScore - a.heatScore);

    // 关键词动量（近3天出现频次加权）
    const keywordMomentum = new Map();
    items.forEach(item => {
      if (item.publishedAt && day3.some(d => item.publishedAt.slice(0, 10) === d)) {
        item.tags?.forEach(tag => {
          keywordMomentum.set(tag, (keywordMomentum.get(tag) || 0) + 1);
        });
      }
    });
    const risingKeywords = [...keywordMomentum.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

    // TF-IDF 词频分析：提取标题+摘要中的高频技术词
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'whose', 'about', 'up', 'new', 'one', 'two', 'three', 'first', 'also', 'more', 'say', 'says', 'said', 'make', 'made', 'take', 'get', 'got', 'use', 'used', 'find', 'found', 'come', 'came', 'go', 'went', 'know', 'think', 'see', 'give', 'want', 'work', 'try', 'ask', 'seem', 'feel', 'leave', 'call', 'keep', 'let', 'begin', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull']);
    const wordFreq = new Map();
    const wordSources = new Map(); // 每个词被多少不同来源报道
    items.forEach(item => {
      const text = `${item.title} ${item.summary || ''}`.toLowerCase();
      const words = text.match(/\b[a-z]{4,}\b/g) || [];
      const seenInItem = new Set();
      words.forEach(w => {
        if (!stopWords.has(w) && !/^(this|that|with|from|have|been|were|they|their|what|when|more|some|time|very|just|know|take|come|made|could|after|also|than|them|other|into|your|about|over|such|only|then|most|would|which|there|these|being|will|each|does|did|into|many|through|back|much|well|where|because|before|those|even|around|between|while|still|during|without|however|people|thing|things|think|like|things|thing|says|said|says|make|made|take|get|got|find|found|come|came|go|went|see|seen|give|gave|want|work|try|ask|keep|kept|let|show|showed|hear|heard|play|played|run|ran|move|moved|live|lived|believe|believed|bring|brought|seem|seemed|feel|felt|leave|left|call|called|need|needed|become|became|becomes|turn|turned|put|puts|means|mean|meant|help|helped|helps|high|low|big|small|long|short|old|young|good|bad|new|right|wrong|real|true|false|last|next|early|late|soon|far|near|here|there|every|any|some|none|all|both|few|many|most|other|another|such|only|own|same|so|than|too|very|just|because|but|and|or|if|while|yet|since|until|whether|although|though|unless|whereas|whilst|provided|assuming|given|supposing|considering|regarding|concerning|including|excluding|except|besides|apart|along|across|behind|beneath|beside|beyond|inside|outside|upon|within|without|among|amid|amongst|against|towards|unto|underneath|notwithstanding)$/.test(w)) {
          wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
          if (!seenInItem.has(w)) {
            seenInItem.add(w);
            wordSources.set(w, (wordSources.get(w) || 0) + 1);
          }
        }
      });
    });
    // TF-IDF 简化：freq * log(source_count + 1)
    const techKeywords = [...wordFreq.entries()]
      .filter(([w]) => w.length >= 4)
      .map(([word, freq]) => ({
        word,
        freq,
        sourceCount: wordSources.get(word) || 1,
        score: freq * Math.log((wordSources.get(word) || 1) + 1)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    // 跨源交叉验证：同一关键词被≥3个不同来源报道 = 高置信度
    const crossSourceSignals = techKeywords
      .filter(k => k.sourceCount >= 3)
      .slice(0, 10)
      .map(k => ({
        keyword: k.word,
        sourceCount: k.sourceCount,
        freq: k.freq,
        confidence: k.sourceCount >= 5 ? 'high' : k.sourceCount >= 3 ? 'medium' : 'low'
      }));

    // 技术雷达四象限数据
    // 采用(Adopt): 高频 + 高源覆盖 + 成熟赛道
    // 试验(Trial): 中高频 + 增长快
    // 评估(Assess): 低频但增长极快（新兴）
    // 暂缓(Hold): 低频 + 负增长或持平
    const techRadar = categories.map(cat => {
      const growth = categoryGrowth.find(c => c.id === cat.id)?.growth || 0;
      const recent = categoryGrowth.find(c => c.id === cat.id)?.recent || 0;
      const sources = trendData.categoryStats.find(([id]) => id === cat.id)?.[1]?.sources?.size || 0;
      let quadrant = 'hold';
      if (recent >= 10 && sources >= 5 && growth >= -10) quadrant = 'adopt';
      else if (recent >= 5 && growth > 20) quadrant = 'trial';
      else if (growth > 50 || (recent >= 3 && growth > 30)) quadrant = 'assess';
      return { id: cat.id, label: cat.label, quadrant, recent, growth, sources };
    });

    // 源质量评分
    const sourceQuality = trendData.sourceStats.map(([name, data]) => {
      const srcItems = items.filter(i => i.source === name);
      const avgLen = srcItems.reduce((s, i) => s + (i.summary || '').length + (i.title || '').length, 0) / (srcItems.length || 1);
      const updateFreq = srcItems.length;
      const qualityScore = Math.min(100, Math.round(updateFreq * 5 + avgLen / 10));
      return { name, count: data.count, categories: data.categories.size, avgLen: Math.round(avgLen), qualityScore };
    }).sort((a, b) => b.qualityScore - a.qualityScore);

    // 机会雷达：低热度但高价值的资讯（来源权威 × 新鲜度 / 常见度）
    const opportunityRadar = items.map(item => {
      const highWeightSources = ['OpenAI', 'Google', 'Anthropic', 'Meta', 'Microsoft', 'Nature', 'MIT Technology Review', 'ArXiv', 'Stanford'];
      const sourceWeight = highWeightSources.some(s => item.source?.includes(s)) ? 2.0 : 1.0;
      const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
      const freshness = Math.max(0, 1 - age / 48);
      const titleWords = (item.title || '').toLowerCase().split(/\s+/);
      const commonality = titleWords.reduce((sum, word) => {
        if (word.length < 4) return sum;
        const freq = items.filter(i => i.title?.toLowerCase().includes(word)).length;
        return sum + (freq > 0 ? Math.log(freq + 1) : 0);
      }, 0) / Math.max(titleWords.length, 1);
      const score = (sourceWeight * freshness * 100) / (commonality + 1);
      const isRelevant = followKeywords.length === 0 || followKeywords.some(kw =>
        `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())
      );
      return { ...item, opportunityScore: score, isRelevant };
    }).filter(item => item.opportunityScore > 5).sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 10);

    return {
      categoryGrowth,
      categoryMomentum,
      categoryRanking,
      regionDistribution,
      regionPct,
      anomalies,
      todayCount,
      yesterdayCount,
      dailyChange,
      risingKeywords,
      techKeywords,
      crossSourceSignals,
      techRadar,
      sourceQuality,
      day7,
      day7prev,
      day3,
      day14,
      day30,
      categoryTrend30,
      categoryCorrelations,
      opportunityRadar
    };
  }, [items]);

  // 阅读行为分析
  const readingProfile = useMemo(() => {
    const now = new Date();
    const buildDayKeys = (days) => Array.from({ length: days }).map((_, idx) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1 - idx));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    // 连续阅读天数
    let streak = 0;
    const sorted = [...bookmarks].sort((a, b) => new Date(b.readAt || 0) - new Date(a.readAt || 0));
    const readDates = new Set(sorted.filter(b => b.readAt).map(b => b.readAt.slice(0, 10)));
    let checkDate = new Date(now);
    if (!readDates.has(`${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`)) {
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
    while (true) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (readDates.has(ds)) { streak++; checkDate = new Date(checkDate.getTime() - 86400000); } else break;
    }

    // 阅读时段分布（24小时）
    const hourDist = Array(24).fill(0);
    sorted.filter(b => b.readAt).forEach(b => {
      const h = new Date(b.readAt).getHours();
      hourDist[h]++;
    });
    const peakHour = hourDist.indexOf(Math.max(...hourDist));

    // 兴趣画像
    const interestDist = {};
    bookmarks.forEach(b => {
      const cat = b.category || 'unknown';
      interestDist[cat] = (interestDist[cat] || 0) + 1;
    });
    const topInterests = Object.entries(interestDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({
      id, label: categories.find(c => c.id === id)?.label || id, count,
      pct: bookmarks.length ? Math.round(count / bookmarks.length * 100) : 0
    }));

    // 阅读速度（近7天平均每日阅读数）
    const day7 = buildDayKeys(7);
    const weekReads = day7.map(d => sorted.filter(b => (b.readAt || '').slice(0, 10) === d).length);
    const avgDailyRead = Math.round(weekReads.reduce((a, b) => a + b, 0) / 7 * 10) / 10;

    // 收藏转阅读率
    const readRate = bookmarks.length ? Math.round(bookmarks.filter(b => b.isRead).length / bookmarks.length * 100) : 0;

    // 7天阅读热力图数据
    const heatData = day7.map(d => sorted.filter(b => (b.readAt || '').slice(0, 10) === d).length);
    const maxHeat = Math.max(...heatData, 1);

    // 来源偏好分析
    const sourceDist = {};
    bookmarks.forEach(b => {
      const source = b.source || '未知来源';
      sourceDist[source] = (sourceDist[source] || 0) + 1;
    });
    const topSources = Object.entries(sourceDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({
      name, count,
      pct: bookmarks.length ? Math.round(count / bookmarks.length * 100) : 0
    }));

    // 近30天阅读趋势
    const day30 = buildDayKeys(30);
    const trendData = day30.map(d => sorted.filter(b => (b.readAt || '').slice(0, 10) === d).length);
    const maxTrend = Math.max(...trendData, 1);

    // 阅读深度分析（基于摘要长度估算）
    const avgSummaryLength = bookmarks.length
      ? Math.round(bookmarks.reduce((sum, b) => sum + (b.summary?.length || 0), 0) / bookmarks.length)
      : 0;
    const deepReads = bookmarks.filter(b => (b.summary?.length || 0) > 200).length;
    const shallowReads = bookmarks.filter(b => (b.summary?.length || 0) <= 100).length;

    // 标签偏好
    const tagDist = {};
    bookmarks.forEach(b => {
      (b.tags || []).forEach(tag => {
        tagDist[tag] = (tagDist[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagDist).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({
      name, count,
      pct: Object.values(tagDist).reduce((a, b) => a + b, 0) ? Math.round(count / Object.values(tagDist).reduce((a, b) => a + b, 0) * 100) : 0
    }));

    return {
      streak,
      peakHour,
      hourDist,
      topInterests,
      avgDailyRead,
      readRate,
      heatData,
      maxHeat,
      day7,
      topSources,
      trendData,
      maxTrend,
      day30,
      avgSummaryLength,
      deepReads,
      shallowReads,
      topTags,
      totalBookmarks: bookmarks.length
    };
  }, [bookmarks]);

  return { dailyBriefing, trackerData, insightData, readingProfile };
}
