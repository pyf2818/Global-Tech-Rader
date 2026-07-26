import { useMemo, useState, useEffect } from 'react';
import CreativeWorkspace from './CreativeWorkspace.jsx';
import { BlockGrid, BlockPanel } from '../blocks/index.js';
import { ICONS } from '../constants/index.jsx';
import { renderMarkdown } from '../utils/markdown.jsx';

export default function StudioPage({
  goNav,
  creativeWorkspace,
  materials,
  articles,
  agents,
  createArticle,
  setCurrentArticleId,
  setEditorTab,
  setEditingAgent,
  setNewAgent,
  setShowAgentForm,
}) {
  const studioModules = useMemo(() => [
    {
      id: 'materials',
      title: '素材库',
      desc: '收集资讯卡片、每日汇报、本地上传与创作片段，按空间和标签形成可复用资产。',
      metric: `${materials.length} 条素材`,
      action: '进入素材库',
      nav: 'materials',
      icon: 'layers'
    },
    {
      id: 'agents',
      title: '智能体工作流',
      desc: '用输入、大模型 Prompt、工具 Skills、条件分支、分类判断和输出节点编排协作流程。',
      metric: `${agents.length} 个智能体`,
      action: '搭建工作流',
      nav: 'agents',
      icon: 'bot'
    },
    {
      id: 'editor',
      title: '内容创作',
      desc: '联动素材库和智能体，把情报、观点和资料沉淀成文章、报告与私有知识库资产。',
      metric: `${articles.length} 篇文章`,
      action: '开始写作',
      nav: 'editor',
      icon: 'edit'
    }
  ], [materials.length, agents.length, articles.length]);

  const workflowNodeTypes = useMemo(() => [
    { type: '输入', desc: '接收资讯、素材、文件或人工指令' },
    { type: '大模型 Prompt', desc: '调用已配置模型执行分析与生成' },
    { type: '工具 Skills', desc: '接入搜索、整理、导出、格式化等能力' },
    { type: '条件语句', desc: '按质量、领域、置信度分流任务' },
    { type: '分类语句', desc: '识别主题、应用场景、风险等级' },
    { type: '指定回复', desc: '沉淀可复用的固定输出结构' },
    { type: '输出', desc: '导出到素材库、文章或本地知识库' }
  ], []);

  // 工作空间文件预览侧边 panel（双击触发）
  const [previewAsset, setPreviewAsset] = useState(null);
  useEffect(() => {
    if (!previewAsset) return;
    const onKey = e => { if (e.key === 'Escape') setPreviewAsset(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewAsset]);
  const previewContent = previewAsset ? (previewAsset.fullContent || previewAsset.content || previewAsset.summary || '') : '';

  return (
    <div className="product-page studio-page">
      <section className="product-hero studio-hero">
        <div>
          <div className="workbench-kicker">Creation Intelligence</div>
          <h1>智创中心</h1>
          <p>把每日汇报、资讯卡片、本地资料和智能体工作流汇入同一个创作空间，形成可持续积累的个人知识资产。</p>
        </div>
        <div className="product-hero-actions">
          <button className="ai-primary-action" onClick={() => goNav('agents')}>搭建智能体工作流</button>
          <button className="secondary-action" onClick={() => goNav('editor')}>进入内容创作</button>
        </div>
      </section>

      <section className="studio-quick-create">
        <button className="quick-create-btn" onClick={() => { const a = createArticle('blank'); setCurrentArticleId(a.id); setEditorTab('edit'); goNav('editor'); }}>
          <span className="quick-create-icon">{ICONS.edit}</span>
          <span className="quick-create-text"><strong>新建文章</strong><em>空白模板起步</em></span>
        </button>
        <button className="quick-create-btn" onClick={() => { setEditingAgent(null); setNewAgent({ name: '', description: '', systemPrompt: '', category: '分析', avatar: '' }); setShowAgentForm(true); goNav('agents'); }}>
          <span className="quick-create-icon">{ICONS.bot}</span>
          <span className="quick-create-text"><strong>新建智能体</strong><em>自定义 Prompt 与技能</em></span>
        </button>
        <button className="quick-create-btn" onClick={() => goNav('materials')}>
          <span className="quick-create-icon">{ICONS.layers}</span>
          <span className="quick-create-text"><strong>添加素材</strong><em>从资讯或本地上传</em></span>
        </button>
      </section>

      <CreativeWorkspace
        workspace={creativeWorkspace}
        onOpenEditor={() => goNav('editor')}
        onOpenMaterials={() => goNav('materials')}
      />

      <BlockGrid columns={3}>
        {studioModules.map(module => (
          <BlockGrid.Card
            key={module.id}
            icon={module.icon}
            title={module.title}
            desc={module.desc}
            meta={{ metric: module.metric, action: module.action }}
            variant={module.id === 'agents' ? 'primary' : 'default'}
            onClick={() => goNav(module.nav)}
          />
        ))}
      </BlockGrid>

      <section className="workflow-builder-preview">
        <div className="section-header">
          <h2 className="section-title">{ICONS.bot} 可视化智能体工作流</h2>
          <p className="section-desc">点击节点类型，前往智能体页面用对应节点搭建工作流。</p>
        </div>
        <div className="workflow-node-strip">
          {workflowNodeTypes.map((node, index) => (
            <button key={node.type} className="workflow-node-card" onClick={() => goNav('agents')}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{node.type}</strong>
              <p>{node.desc}</p>
              <em className="workflow-node-cta">前往编排 →</em>
            </button>
          ))}
        </div>
      </section>

      <section className="studio-asset-row">
        <BlockPanel title="最近素材" action={<button onClick={() => goNav('materials')}>管理素材库（{materials.length}）</button>}>
          {materials.length > 0 ? (
            <ul className="studio-asset-list studio-asset-list-clickable">
              {materials.slice(0, 3).map(m => (
                <li key={m.id} className="has-dblclick" onDoubleClick={() => setPreviewAsset(m)} title="双击在侧边预览">
                  <strong>{m.title}</strong>
                  <p>{m.summary || (m.content ? String(m.content).slice(0, 120) : '') || '—'}</p>
                  <span className="studio-asset-open">{ICONS.arrowRight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="studio-asset-empty"><strong>还没有沉淀素材</strong><p>从资讯卡片、每日汇报或本地上传开始收集。</p></div>
          )}
        </BlockPanel>
        <BlockPanel title="创作资产" action={<button onClick={() => goNav('editor')}>打开编辑器（{articles.length}）</button>}>
          {articles.length > 0 ? (
            <ul className="studio-asset-list">
              {articles.slice(0, 3).map(a => (
                <li key={a.id}><strong>{a.title}</strong><p>{a.template === 'briefing' ? '简报模板' : a.template === 'weekly' ? '周报模板' : '空白文章'} · {new Date(a.updatedAt).toLocaleDateString('zh-CN')}</p></li>
              ))}
            </ul>
          ) : (
            <div className="studio-asset-empty"><strong>准备你的第一篇内容</strong><p>内容创作区联动素材库与智能体输出。</p></div>
          )}
        </BlockPanel>
      </section>

      {previewAsset && (
        <>
          <div className="workspace-side-panel-backdrop" onClick={() => setPreviewAsset(null)} />
          <aside className="workspace-side-panel" role="dialog" aria-modal="false" aria-label="素材预览">
            <div className="workspace-side-panel-head">
              <div className="workspace-side-panel-meta">
                <span className="workspace-side-panel-type">{previewAsset.type || 'material'}</span>
                <h3>{previewAsset.title || '未命名素材'}</h3>
                {previewAsset.source && <span className="workspace-side-panel-path">来源：{previewAsset.source}</span>}
              </div>
              <button className="workspace-side-panel-close" onClick={() => setPreviewAsset(null)} title="关闭 (Esc)">{ICONS.x}</button>
            </div>
            <div className="workspace-side-panel-body">
              {previewContent ? renderMarkdown(previewContent) : <p className="workspace-side-panel-empty">该素材暂无可显示内容</p>}
            </div>
            <div className="workspace-side-panel-foot">
              {previewAsset.url && (
                <a href={previewAsset.url} target="_blank" rel="noreferrer" className="workspace-side-panel-link">查看原文</a>
              )}
              <button className="workspace-side-panel-action" onClick={() => { setPreviewAsset(null); goNav('materials'); }}>在素材库中管理</button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
