# 知识导出与整合 - 需求与技术设计

## 需求概述 (EARS)

### REQ-1: 多格式导出
**系统 SHALL** 支持导出为：
- Markdown（带元数据）
- PDF（排版美观）
- Notion（API 集成）
- Obsidian（vault 导入）

### REQ-2: 定期归档
**系统 SHALL** 自动归档：
- 每周/每月打包
- 按赛道/时间分类
- 生成目录索引

### REQ-3: 双向同步
**系统 SHALL** 支持与外部工具同步：
- RSS 阅读器（如 Feedly）
- 书签工具（如 Pocket）
- 笔记软件（如 Notion）

## 技术要点

### 导出服务
```typescript
interface ExportService {
  exportToMarkdown(items: NewsItem[], options: ExportOptions): Promise<Blob>;
  exportToPDF(items: NewsItem[], template: string): Promise<Blob>;
  exportToNotion(items: NewsItem[], databaseId: string): Promise<void>;
  exportToObsidian(items: NewsItem[], vaultPath: string): Promise<void>;
}

function generateMarkdown(item: NewsItem): string {
  return `
# ${item.title}

**来源**: ${item.source}
**时间**: ${item.publishedAt}
**赛道**: ${item.category}
**标签**: ${item.tags.join(', ')}
**链接**: ${item.url}

## 摘要
${item.summary}

---
*Exported from Global Tech Radar*
  `.trim();
}
```

---

**优先级**: P2 | **开发成本**: 中 | **预计工时**: 4 天
