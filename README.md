# SiliconStream · 万般硅川

> 面向 AI 时代的个人智能情报、市场洞察、知识创作与社区协作平台。

SiliconStream 将公开 RSS/Atom 资讯、GitHub 趋势、A 股行情、用户画像、AI 分析、创作资产和真实社区整合到一个工作台中。系统既能在没有大模型配置时使用确定性算法生成推荐与简报，也可以接入 OpenAI 兼容模型获得增强分析。

## 核心模块

| 模块 | 能力 |
| --- | --- |
| 今日情报 | 按新鲜度、热度、信源等级和个人画像生成公共热点与个人必看简报 |
| 精准推荐 | 时间线与日历视图管理每日推荐，保留评分组成、推荐原因和算法版本 |
| 全部动态 | 聚合多领域 RSS/Atom 信源，支持分类、地区、模式、关键词和信源过滤 |
| 股市动向 | A 股搜索、自选股、实时行情、分时、K 线、板块排行和 AI/算法双模式分析 |
| GitHub 热门 | 日榜、周榜、月榜与语言筛选，展示增量 Star、主题和 AI 情报入口 |
| 智创空间 | 素材库、文章编辑、智能体工作流、引用管理、版本保存与本地导出 |
| 用户广场 | 真实账户、发布、详情、评论、点赞、收藏和关注，数据持久化到 PostgreSQL |
| 个人画像 | 领域与信源分层、特别关注、行为信号、画像置信度和乐观锁同步 |

## 界面预览

| 情报工作台 | AI Copilot |
| --- | --- |
| ![情报工作台](public/screenshots/main-interface.png) | ![AI Copilot](public/screenshots/ai-elf-interface.png) |

| 信源管理 | 智创素材 |
| --- | --- |
| ![信源管理](public/screenshots/settings-sources.png) | ![智创素材](public/screenshots/materials.png) |

## 技术架构

- **前端**：React 19、Vite 7、原生 CSS 设计系统
- **可视化**：KLineCharts、react-globe.gl、Three.js
- **Node API**：统一的资讯、GitHub、股市、认证、画像、社区和 AI 网关
- **数据层**：PostgreSQL 15，事务迁移、画像版本控制和社区持久化
- **抓取增强**：可选 Scrapling Flask 服务，支持 basic、dynamic、stealth 模式
- **部署**：Node 生产服务器与 Docker Compose；部分公开 API 支持 Vercel Serverless

```text
Browser
  ├─ React application
  └─ /api/*
       ├─ Node API and domain services
       ├─ PostgreSQL
       ├─ RSS / GitHub / market providers
       └─ optional Scrapling service
```

## 快速开始

### 环境要求

- Node.js `20.19+` 或 `22.12+`
- npm 10+
- PostgreSQL 15+，或使用 Docker 启动数据库
- Python 3.11+，仅在启用 Scrapling 时需要

### 本地开发

```bash
git clone https://github.com/pyf2818/siliconstream.git
cd siliconstream
npm install
```

创建本地配置：

```bash
cp .env.example .env
```

至少修改以下两项，并确保密码一致：

```dotenv
DB_PASSWORD=replace_with_a_long_random_password
DATABASE_URL=postgresql://meridian:replace_with_a_long_random_password@localhost:5433/silicon_meridian
DATABASE_SSL=false
```

启动 PostgreSQL、执行迁移并启动应用：

```bash
docker compose up -d postgres
npm run db:migrate
npm run dev
```

访问 [http://localhost:5175](http://localhost:5175)。

### 可选：Scrapling

Scrapling 用于动态网页与图片解析；未启动时系统仍会使用直接请求和 RSS 内容降级运行。

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
scrapling install
python scrapling_server.py
```

服务默认监听 `http://localhost:5000`，Vite 会将 `/api/scrape` 代理到该地址。

## AI 配置

在应用设置中填写 OpenAI 兼容接口的 `Base URL`、模型和 API Key。未配置模型时，今日情报、精准推荐和股市分析会自动使用内置算法，不会阻断主要工作流。

生产环境建议配置：

```dotenv
AI_ALLOWED_HOSTS=api.openai.com,api.deepseek.com
AI_ALLOW_PRIVATE_NETWORK=false
```

AI 与网页抓取网关包含请求体限制、超时、频率限制、私网地址拦截、DNS 校验和重定向阻断。开发环境如需连接本地 Ollama，可显式设置 `AI_ALLOW_PRIVATE_NETWORK=true`。

## 生产构建

```bash
npm run build
npm start
```

`npm start` 会从 `dist/` 提供前端文件，并在同一进程中提供完整 `/api/*` 路由。首次启动前需要执行 `npm run db:migrate`。

### Docker Compose

设置 `.env` 后执行：

```bash
docker compose up --build -d
```

默认访问地址为 `http://localhost`，可通过 `APP_PORT` 修改宿主机端口。容器启动时会自动执行数据库迁移。Scrapling 是可选外部服务，可通过 `SCRAPLING_URL` 指定。

### Vercel

`api/` 目录提供资讯、趋势、GitHub、信源发现、AI 生成和网页读取等公开 Serverless API。认证、社区、画像和完整股市模块依赖 PostgreSQL 与 Node 长驻服务，因此完整部署建议使用 Docker/Node 方案。

## 主要 API

| Endpoint | Method | 说明 |
| --- | --- | --- |
| `/api/news` | GET | 聚合资讯、搜索、分页和个性兴趣过滤 |
| `/api/meta` | GET | 分类、模式、信源和等级元数据 |
| `/api/trending` | GET | 多平台热点 |
| `/api/github-trending` | GET | GitHub 日/周/月趋势 |
| `/api/stock/*` | GET | 行情、K 线、分时、搜索与板块数据 |
| `/api/auth/*` | GET/POST | 注册、登录、会话与退出 |
| `/api/community/*` | GET/POST/PATCH/DELETE | 动态、评论、点赞、收藏与关注 |
| `/api/profile/state` | GET/PUT | 用户画像读取与版本化保存 |
| `/api/ai-generate` | POST | 对话、摘要、改写、翻译与创作 |
| `/api/fetch-page` | GET | 受限的外部页面文本读取 |
| `/api/verify-source` | GET | RSS/Atom 信源验证 |
| `/api/discover-source` | GET | 自动发现站点订阅地址 |

## 数据与隐私

- 账户、社区、画像、推荐快照和创作版本保存在 PostgreSQL。
- UI 偏好、未登录状态下的素材和 AI 会话保存在浏览器本地。
- 错误恢复不会自动清空 `localStorage`。
- `.env`、密钥、数据库密码、依赖目录和构建产物已被 `.gitignore` 排除。
- AI Key 只用于用户主动发起的模型请求；生产部署应使用可信 HTTPS 模型网关。

## 项目结构

```text
api/                         Vercel Serverless 入口
server/
  db/                        PostgreSQL 客户端与迁移
  domain/                    简报、推荐、画像和工作流算法
  http/                      认证、社区、画像、AI 与抓取处理器
  news/                      RSS、图片、趋势、GitHub 与股市服务
  productionServer.js        Node 生产入口
src/
  components/                通用与业务组件
  hooks/                     数据和交互状态 Hook
  pages/                     情报、推荐、社区和股市页面
  App.jsx                    主应用编排
public/screenshots/          README 截图
scrapling_server.py          可选网页抓取服务
```

## 验证

```bash
npm run build
git diff --check
```

仓库还包含 Vitest 配置与领域层测试。第三方 RSS、GitHub 和行情接口存在可用性与限流差异，生产部署应持续监控来源健康度。

## 当前边界

- GitHub 未认证请求受官方速率限制，建议在服务端增加 Token。
- 部分中文站点有反爬策略，Scrapling 只能提高成功率，不能保证所有来源可用。
- 3D 地球依赖体积较大，弱网环境首次加载时间会更长。
- Vercel 部署不包含需要长驻 PostgreSQL 连接的完整账户和社区能力。

## 许可证

本仓库当前未附加开源许可证。未经项目所有者明确授权，不代表授予复制、修改或分发权利。
