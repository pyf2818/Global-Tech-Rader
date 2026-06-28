// useTrending — 热门榜单 + GitHub 热门，从 App.jsx 1179-1207 + 4232-4305 行提取
// 含 11 个 useState + loadTrending / loadGithub 两个 handler

import { useState } from 'react';

export function useTrending() {
  const [trendingItems, setTrendingItems] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingPlatform, setTrendingPlatform] = useState('all');
  const [trendingType, setTrendingType] = useState('24h');
  const [trendingPage, setTrendingPage] = useState(0);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [trendingLoadingMore, setTrendingLoadingMore] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubLang, setGithubLang] = useState('');
  const [githubSince, setGithubSince] = useState('weekly');

  function loadTrending(append = false, platform = trendingPlatform, type = trendingType) {
    if (!append) {
      setTrendingLoading(true);
      setTrendingPage(0);
      setTrendingHasMore(true);
    } else {
      setTrendingLoadingMore(true);
    }
    const params = new URLSearchParams();
    if (platform !== 'all') params.set('platform', platform);
    if (type !== '24h') params.set('type', type);
    const page = append ? trendingPage + 1 : 0;
    params.set('page', page);
    params.set('pageSize', 20);
    const url = `/api/trending?${params}`;
    fetch(url).then(r => r.json()).then(d => {
      let items = d.items || [];
      if (type === '24h') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        items = items.filter(item => item.publishedAt && item.publishedAt > oneDayAgo);
        items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      } else if (type === '7d') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        items = items.filter(item => {
          const within7Days = !item.publishedAt || item.publishedAt > sevenDaysAgo;
          const financeRelated = item.category === 'economy-stock' ||
                                item.category === 'fintech' ||
                                item.category === 'policy-finance' ||
                                (item.tags && item.tags.some(tag => ['财经', '金融', '股市', '经济', '投资', '加息', '通胀'].includes(tag)));
          return within7Days && financeRelated;
        });
        items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      } else if (type === 'politics') {
        items = items.filter(item => {
          const politicsRelated = item.category === 'policy-finance' ||
                                  (item.tags && item.tags.some(tag => ['政治', '外交', '国际', '地缘', '冲突', '选举', '政府'].includes(tag))) ||
                                  (item.title && /政治|外交|国际|地缘|冲突|选举|政府|国际关系/.test(item.title));
          return politicsRelated;
        });
        items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      }
      if (append) {
        setTrendingItems(prev => [...prev, ...items]);
        setTrendingHasMore(d.hasMore ?? false);
        setTrendingPage(page);
      } else {
        setTrendingItems(items);
        setTrendingHasMore(d.hasMore ?? true);
        setTrendingPage(page);
      }
    }).catch(() => {}).finally(() => {
      setTrendingLoading(false);
      setTrendingLoadingMore(false);
    });
  }

  function loadGithub(lang = githubLang, since = githubSince) {
    setGithubLoading(true);
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    params.set('since', since);
    fetch(`/api/github-trending?${params}`).then(r => r.json()).then(d => setGithubRepos(d.repos || [])).catch(() => {}).finally(() => setGithubLoading(false));
  }

  return {
    trendingItems, setTrendingItems,
    trendingLoading, trendingPlatform, setTrendingPlatform,
    trendingType, setTrendingType,
    trendingPage, trendingHasMore, trendingLoadingMore,
    githubRepos, githubLoading,
    githubLang, setGithubLang,
    githubSince, setGithubSince,
    loadTrending, loadGithub,
  };
}
