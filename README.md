# Global Tech Radar

全球科技圈实时资讯聚合平台，聚合公开 RSS/Atom 科技资讯源，展示 AI、大模型、芯片、开源、科研、政策、投融资、硬件与云计算动态。

## 核心能力

- 真实公开 RSS/Atom 实时拉取：The Verge、TechCrunch、MIT News AI、GitHub Blog、Google AI Blog、OpenAI News、Solidot、Cnblogs News、ArXiv CS AI。
- 首页聚合信息流、分类导航、热搜科技榜、搜索、来源标注和时间线排序。
- 实时快讯、深度解读、技术干货三类内容模式。
- 国内源、海外源、全球源标识。
- 深色/浅色双主题和响应式布局。
- 屏蔽词过滤和合规来源说明。
- AI 摘要、翻译、订阅、收藏、定时采集接口预留。

## 技术栈

- React + Vite
- Tailwind CSS 配置预留
- Vite middleware 轻量 API 聚合层
- 原生 `fetch` 拉取公开 RSS/Atom

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

开发服务器会暴露以下接口：

- `GET /api/news`：聚合实时资讯。
- `GET /api/news?blocked=word1,word2`：按屏蔽词过滤资讯。
- `GET /api/meta`：返回分类、模式、来源与扩展能力元信息。
- `POST /api/ai/summary`、`POST /api/translate`、`POST /api/subscriptions`、`POST /api/bookmarks`：后续扩展接口占位。

## 合规说明

平台仅展示标题、短摘要、来源、发布时间、标签和原文链接，内容版权归原发布方所有。上线生产环境时建议增加来源白名单、缓存策略、速率限制、 robots 与服务条款审查流程。
