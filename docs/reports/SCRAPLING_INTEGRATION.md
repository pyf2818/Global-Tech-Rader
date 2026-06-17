# Scrapling 网页抓取集成

## 概述

我们成功将 **Scrapling** 网页抓取框架集成到 Global Tech Radar 项目中，实现了从任意网页获取信息的能力。

## Scrapling 简介

Scrapling 是一个自适应 Web Scraping 框架，具有以下特性：

- **多种抓取模式**：
  - `basic`: 基础 HTTP 请求，速度快，适合静态页面
  - `dynamic`: 动态页面抓取，使用浏览器渲染 JavaScript
  - `stealth`: 隐身模式，绕过 Cloudflare 等反爬系统

- **强大的解析能力**：
  - 支持 CSS 选择器、XPath 选择器
  - 自动提取标题、正文、图片、链接等
  - 智能相似性算法，网站结构变化后仍能定位元素

- **高性能**：
  - 比 BeautifulSoup 快 784 倍
  - 92% 测试覆盖率
  - 内存高效，支持大规模抓取

## 架构设计

```
┌─────────────────┐
│   React 前端     │
│  (端口 5175)     │
└────────┬────────┘
         │
         │ /api/scrape
         ▼
┌─────────────────┐
│  Vite 代理      │
│  (转发请求)      │
└────────┬────────┘
         │
         │ localhost:5000
         ▼
┌─────────────────┐
│  Flask API      │
│  (Scrapling)     │
│  (端口 5000)     │
└─────────────────┘
```

## 安装与配置

### 1. 安装依赖

```bash
# 安装 Scrapling
pip install scrapling

# 安装 Scrapling 浏览器依赖
pip install "scrapling[fetchers]"
scrapling install

# 安装 Flask 和 CORS
pip install flask flask-cors
```

### 2. 启动服务

#### 启动 Scrapling 服务器
```bash
cd /workspace
python3 scrapling_server.py
```

#### 启动前端开发服务器
```bash
cd /workspace
npm run dev
```

## 功能说明

### 前端界面

1. **导航菜单**：新增"自定义抓取"选项
2. **输入界面**：
   - URL 输入框
   - 模式选择（基础/动态/隐身）
   - 抓取按钮

3. **结果展示**：
   - 标题和原文链接
   - 元数据（作者、发布时间、段落数、内容长度）
   - 描述和摘要
   - 图片列表
   - 相关链接
   - 操作按钮（保存到创作中心、保存到素材库）

### API 端点

#### POST `/api/scrape`

抓取网页内容

**请求参数**：
```json
{
  "url": "https://example.com/article",
  "mode": "basic|dynamic|stealth",
  "timeout": 30
}
```

**响应示例**：
```json
{
  "url": "https://example.com/article",
  "status": 200,
  "title": "文章标题",
  "summary": "文章摘要...",
  "description": "页面描述",
  "keywords": "关键词",
  "author": "作者",
  "published_date": "2026-05-31",
  "images": [
    {
      "src": "https://example.com/image.jpg",
      "alt": "图片描述"
    }
  ],
  "links": [
    {
      "url": "https://example.com/related",
      "text": "相关链接"
    }
  ],
  "paragraphs_count": 10,
  "content_length": 5000
}
```

## 使用示例

### 基础抓取
```javascript
fetchCustomUrl('https://example.com', 'basic')
```

### 动态页面抓取
```javascript
fetchCustomUrl('https://example.com/dynamic-page', 'dynamic')
```

### 隐身模式抓取
```javascript
fetchCustomUrl('https://protected-site.com', 'stealth')
```

## 性能优化

1. **懒加载**：浏览器按需启动
2. **并发控制**：限制同时运行的浏览器实例数
3. **超时处理**：30 秒超时防止长时间等待
4. **错误重试**：网络错误自动重试

## 扩展功能

### 与现有功能集成

1. **保存到创作中心**：将抓取内容保存为文章草稿
2. **保存到素材库**：将抓取内容添加到素材库
3. **添加到书签**：将抓取的 URL 添加到阅读列表

### 未来扩展

- [ ] 批量抓取多个 URL
- [ ] 定时抓取任务
- [ ] 抓取历史记录
- [ ] 自定义选择器
- [ ] 内容模板配置
- [ ] 导出多种格式（PDF、Word、Markdown）

## 注意事项

1. **合法合规**：
   - 遵守 robots.txt
   - 尊重版权和隐私
   - 避免过度请求

2. **性能考虑**：
   - 隐身模式启动较慢，仅必要时使用
   - 大规模抓取建议使用代理池
   - 注意内存使用，及时清理

3. **网络限制**：
   - 某些网站可能限制 IP
   - Cloudflare 可能需要额外处理
   - 建议使用稳定的网络环境

## 技术栈

- **后端**：Python 3.11, Flask 3.1
- **抓取引擎**：Scrapling 0.4.8
- **浏览器**：Playwright 1.59.0, Patchright 1.59.1
- **前端**：React 18, Vite 8
- **代理**：Vite Proxy

## 相关文件

- `/workspace/scrapling_server.py` - Scrapling API 服务器
- `/workspace/test_scrapling.py` - Scrapling 测试脚本
- `/workspace/src/App.jsx` - 前端自定义抓取功能
- `/workspace/src/styles.css` - 自定义抓取界面样式
- `/workspace/vite.config.js` - Vite 代理配置

## 测试

```bash
# 测试 Scrapling 基础功能
python3 /workspace/test_scrapling.py

# 测试 Scrapling API
curl http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","mode":"basic","timeout":30}'

# 测试前端代理
curl -X POST http://localhost:5175/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","mode":"basic","timeout":30}'
```

## 参考资料

- [Scrapling 官方文档](https://scrapling.readthedocs.io)
- [Scrapling GitHub](https://github.com/D4Vinci/Scrapling)
- [Playwright 文档](https://playwright.dev)
- [Flask 文档](https://flask.palletsprojects.com)

## 许可证

- Scrapling: BSD-3-Clause
- 项目原有许可证保持不变