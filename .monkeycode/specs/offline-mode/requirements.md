# PWA 离线模式 - 需求与技术设计

## 需求概述 (EARS)

### REQ-1: 离线缓存
**系统 SHALL** 缓存已加载内容：
- Service Worker 拦截请求
- IndexedDB 存储资讯详情
- 缓存策略（先缓存后网络）

### REQ-2: 离线阅读
**系统 SHALL** 支持离线功能：
- 浏览已缓存资讯
- 搜索本地内容
- 离线书签

### REQ-3: 后台同步
**系统 SHALL** 网络恢复后同步：
- 后台更新订阅源
- 同步离线操作（书签、评论）
- 增量更新

## 技术要点

### Service Worker
```typescript
// sw.ts
const CACHE_NAME = 'tech-radar-v1';
const CACHE_LIMIT = 100; // 最多缓存 100 篇文章

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
            pruneCache(CACHE_LIMIT);
          });
        }
        return response;
      });
    })
  );
});
```

### IndexedDB 存储
```typescript
const dbSchema = {
  name: 'TechRadarDB',
  version: 1,
  stores: [
    { name: 'news', keyPath: 'id', indexes: ['publishedAt', 'category'] },
    { name: 'bookmarks', keyPath: 'newsId' },
    { name: 'readingQueue', keyPath: 'newsId' }
  ]
};
```

### PWA Manifest
```json
{
  "name": "Global Tech Radar",
  "short_name": "TechRadar",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0c10",
  "theme_color": "#22d3ee",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

**优先级**: P2 | **开发成本**: 中 | **预计工时**: 4 天
