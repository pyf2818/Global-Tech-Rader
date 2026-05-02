# 团队共享空间 - 需求与技术设计

## 需求概述 (EARS)

### REQ-1: 共享收藏夹
**系统 SHALL** 支持团队共享：
- 创建共享收藏夹
- 邀请成员（邮件/链接）
- 权限管理（只读/编辑）

### REQ-2: 内部批注
**系统 SHALL** 允许团队成员评论：
- 资讯下方评论
- @提及团队成员
- 评论通知

### REQ-3: 资讯分配
**系统 SHALL** 支持任务分配：
- 指派资讯给成员跟进
- 标记跟进状态
- 截止提醒

## 技术要点

### 数据模型
```typescript
interface TeamWorkspace {
  id: string;
  name: string;
  members: Array<{ userId: string; role: 'admin' | 'member' }>;
  sharedCollections: SharedCollection[];
}

interface SharedCollection {
  id: string;
  name: string;
  items: SharedItem[];
  permissions: 'read' | 'edit';
}

interface Comment {
  id: string;
  newsId: string;
  userId: string;
  content: string;
  mentions: string[];
  createdAt: string;
}
```

**注**: 完整实现需要后端数据库支持，MVP 可用 localStorage 模拟单人多角色

---

**优先级**: P2 | **开发成本**: 高 | **预计工时**: 10 天
