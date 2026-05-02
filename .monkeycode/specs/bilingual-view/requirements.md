# 跨语言对照阅读 - 需求与技术设计

## 需求概述 (EARS)

### REQ-1: 机器翻译
**系统 SHALL** 提供资讯的机器翻译：
- 支持英译中、中译英
- 侧边栏对照模式（原文 + 译文并排）
- 行间对照模式（段落级切换）

### REQ-2: 专业术语解释
**系统 SHALL** 对技术术语提供解释：
- 悬浮显示术语定义
- 链接到相关知识库
- 支持用户贡献术语解释

### REQ-3: 翻译历史
**系统 SHALL** 缓存已翻译内容：
- 避免重复翻译相同文章
- 支持用户标记翻译质量
- 优先展示高质量翻译

## 技术要点

### 翻译 API 集成
```typescript
interface TranslationService {
  translate(text: string, from: string, to: string): Promise<string>;
  batchTranslate(items: NewsItem[]): Promise<NewsItem[]>;
  getTermDefinition(term: string): Promise<TermDefinition>;
}

// 可用服务：DeepL、Google Translate、有道
```

### 组件设计
```tsx
function BilingualView({ news }: { news: NewsItem }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [mode, setMode] = useState<'side' | 'inline' | 'overlay'>('side');
  
  return (
    <div className={`bilingual-view mode-${mode}`}>
      <div className="original">{news.content}</div>
      {translation && <div className="translated">{translation}</div>}
      <TranslateButton onClick={() => doTranslate(news)} />
    </div>
  );
}
```

### 术语高亮
```typescript
const TECH_TERMS = ['LLM', 'RAG', 'Transformer', 'Fine-tuning'];

function highlightTerms(text: string): React.ReactNode {
  return text.split(/(\b[A-Z]{2,}\b)/g).map((part, i) => {
    if (TECH_TERMS.includes(part)) {
      return <TermPopup key={i} term={part}>{part}</TermPopup>;
    }
    return part;
  });
}
```

---

**优先级**: P1 | **开发成本**: 中 | **预计工时**: 4 天
