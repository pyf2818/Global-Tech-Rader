# 每日/每周简报 - 需求文档

## 概述
自动生成每日/每周核心资讯简报，帮助用户在 5 分钟内掌握关键动态。

---

## 需求规格 (EARS 模式)

### REQ-1: 生成时间配置
**系统 SHALL** 允许用户设置简报生成时间，包括：
- 每日简报：可选 06:00-23:00 整点
- 每周简报：可选周一至周日 + 具体时间
- 时区自动检测（默认为本地时间）

### REQ-2: 简报内容结构
**系统 SHALL** 生成包含以下模块的简报：
1. **头条要闻** (Top 5) - 按热度算法排序
2. **赛道动态** - 按用户关注的赛道分类（AI、芯片、开源等）
3. **爆款文章** - 互动量最高的 3 篇文章
4. **新兴话题** - 本周突然增长的技术关键词
5. **来源统计** - 各资讯源的发布数量

### REQ-3: 算法优先级
**系统 SHALL** 按以下权重计算资讯重要性：
- 来源权威度 (30%)：The Verge、MIT Tech 等权重更高
- 时效性 (25%)：越新权重越高
- 关键词热度 (25%)：AI、LLM 等热门话题加权
- 用户兴趣匹配度 (20%)：与用户关注赛道/关键词匹配

### REQ-4: 推送渠道
**系统 SHALL** 支持以下推送方式：
- 站内通知（PWA push）
- 邮件发送（需配置 SMTP）
- 生成分享图片（长图模式）
- 导出 PDF 文档

### REQ-5: 历史记录
**系统 SHALL** 保存用户所有历史简报：
- 按日期归档
- 支持重新查看/下载
- 支持搜索历史简报内容

### REQ-6: 个性化配置
**系统 SHALL** 允许用户自定义：
- 简报长度（精简版 5 条 / 标准版 10 条 / 详细版 20 条）
- 必选赛道（固定出现在简报中的分类）
- 屏蔽来源（不希望在简报中出现的源）
- 周末免打扰（周六日不推送）

---

## 用户场景

| 用户类型 | 场景 | 期望结果 |
|---------|------|---------|
| 投资人 | 每天早上 8 点查看昨日科技动态 | 5 分钟读完 10 条核心资讯 |
| 开发者 | 每周一查看上周技术趋势 | 了解新兴技术和开源项目 |
| 产品经理 | 每日简报 + 竞品公司追踪 | 快速掌握行业动态 |

---

## 验收标准

### AC-1: 生成准确性
- [ ] 每日简报必须包含至少 5 条有效资讯
- [ ] 头条要闻不能包含已读内容（除非用户配置允许）
- [ ] 各赛道分类必须准确（基于资讯元数据）

### AC-2: 推送可靠性
- [ ] 配置时间前后 5 分钟内必须完成推送
- [ ] 失败后自动重试（最多 3 次）
- [ ] 推送日志可查询

### AC-3: 性能要求
- [ ] 简报生成时间 < 30 秒
- [ ] PDF 导出时间 < 10 秒
- [ ] 分享图片生成时间 < 5 秒

---

## 数据模型

```typescript
interface Briefing {
  id: string;
  userId: string;
  type: 'daily' | 'weekly';
  generatedAt: string; // ISO datetime
  period: {
    start: string; // 涵盖的起始时间
    end: string;   // 涵盖的结束时间
  };
  items: BriefingItem[];
  stats: {
    totalSources: number;
    totalItems: number;
    topCategory: string;
    trendingKeywords: string[];
  };
  deliveryStatus: {
    email?: 'pending' | 'sent' | 'failed';
    push?: 'pending' | 'sent' | 'failed';
  };
}

interface BriefingItem {
  id: string;
  newsId: string;
  rank: number;
  section: 'top' | 'category' | 'trending' | 'hot';
  category?: string;
  reason: string; // 入选理由（算法解释）
}

interface BriefingConfig {
  userId: string;
  dailyTime?: number; // 0-23 表示小时
  weeklyDay?: number; // 0-6 表示周几
  weeklyTime?: number;
  length: 'compact' | 'standard' | 'detailed';
  requiredCategories: string[];
  blockedSources: string[];
  timezone: string;
  weekendOff: boolean;
  deliveryMethods: ('email' | 'push' | 'none')[];
  email?: string;
}
```

---

## 依赖关系
- 依赖新闻数据源 (`/api/news`)
- 依赖用户配置系统 (localStorage → 未来数据库)
- 依赖邮件服务（SMTP 或第三方 API）
- 依赖 PDF 生成库（如 jsPDF）
- 依赖图片生成库（如 html2canvas）

---

## 风险与约束
1. **邮件发送**需要服务器环境或第三方服务
2. **定时任务**需要后台进程，纯前端无法实现
3. **PDF 生成**会增加包体积约 200KB
4. **隐私合规**需确保用户数据不出境（如用国内 SMTP）

---

**日期**: 2026-04-29  
**版本**: v1.0  
**状态**: 待评审
