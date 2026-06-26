import { ICONS } from '../constants/index.jsx';

export default function StudioPage({
  studioModules,
  workflowNodeTypes,
  materials,
  articles,
  goNav,
}) {
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

      <section className="studio-module-grid">
        {studioModules.map(module => (
          <button key={module.id} className="studio-module-card" onClick={() => goNav(module.nav)}>
            <span className="studio-module-icon">{ICONS[module.icon]}</span>
            <span className="studio-module-title">{module.title}</span>
            <span className="studio-module-desc">{module.desc}</span>
            <span className="studio-module-meta">
              <strong>{module.metric}</strong>
              <em>{module.action}</em>
            </span>
          </button>
        ))}
      </section>

      <section className="workflow-builder-preview">
        <div className="section-header">
          <h2 className="section-title">{ICONS.bot} 可视化智能体工作流</h2>
          <p className="section-desc">第一阶段先建立清晰的工作流语言；下一阶段会把这些节点做成可拖拽编排画布。</p>
        </div>
        <div className="workflow-node-strip">
          {workflowNodeTypes.map((node, index) => (
            <div key={node.type} className="workflow-node-card">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{node.type}</strong>
              <p>{node.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="studio-asset-row">
        <div className="studio-asset-panel">
          <span>最近素材</span>
          <strong>{materials[0]?.title || '还没有沉淀素材'}</strong>
          <p>{materials[0]?.summary || '从资讯卡片、每日汇报或本地上传开始收集，素材会成为智能体和文章创作的上下文。'}</p>
          <button onClick={() => goNav('materials')}>管理素材库</button>
        </div>
        <div className="studio-asset-panel">
          <span>创作资产</span>
          <strong>{articles[0]?.title || '准备你的第一篇内容'}</strong>
          <p>{articles.length ? `当前已有 ${articles.length} 篇文章，可继续导出为本地知识库资产。` : '内容创作区会保留大空间编辑体验，并联动素材库与智能体输出。'}</p>
          <button onClick={() => goNav('editor')}>打开编辑器</button>
        </div>
      </section>
    </div>
  );
}
