// GitHub 仓库 → 素材的推断工具（从 App.jsx 抽取）
// 依赖 GITHUB_PERIODS 常量，由调用方传入或在此处重新定义

const GITHUB_PERIODS_FALLBACK = [
  { id: 'daily', label: '日榜' },
  { id: 'weekly', label: '周榜' },
  { id: 'monthly', label: '月榜' },
];

export function inferGithubScenario(repo = {}) {
  const text = `${repo.fullName || ''} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.readmeIntro || ''}`.toLowerCase();
  const language = (repo.language || '').toLowerCase();
  const rules = [
    { test: /(agent|llm|rag|prompt|openai|anthropic|model|inference|embedding|ai)/, scenario: '适合构建 AI 应用、智能体工作流、知识库问答或模型推理组件。' },
    { test: /(data|etl|warehouse|analytics|visualization|dashboard|bi|sql|pipeline)/, scenario: '适合数据采集、分析看板、指标体系和企业内部数据流程。' },
    { test: /(ui|component|react|vue|svelte|design|css|tailwind|frontend)/, scenario: '适合前端产品界面、设计系统、组件库或交互原型开发。' },
    { test: /(api|server|backend|database|postgres|redis|queue|auth|microservice)/, scenario: '适合后端服务、API 平台、权限系统和工程基础设施建设。' },
    { test: /(security|scan|vulnerability|auth|encrypt|malware|policy|privacy)/, scenario: '适合安全检测、权限治理、合规审计和风险监控场景。' },
    { test: /(robot|vision|camera|3d|slam|drone|autonomous|opencv)/, scenario: '适合视觉识别、机器人控制、空间感知和多模态硬件应用。' },
    { test: /(cli|terminal|devtool|debug|testing|benchmark|deploy|ci|cd)/, scenario: '适合开发者工具、自动化测试、部署流水线和工程效率提升。' }
  ];
  const matched = rules.find(rule => rule.test.test(text));
  if (matched) return matched.scenario;
  if (['python', 'jupyter notebook'].includes(language)) return '适合算法验证、数据处理、自动化脚本或研究原型。';
  if (['typescript', 'javascript'].includes(language)) return '适合 Web 产品、开发工具、轻量服务或前端工程化场景。';
  if (['go', 'rust'].includes(language)) return '适合高性能服务、基础设施、命令行工具或云原生组件。';
  return '适合进一步评估项目 README、示例和社区活跃度后，沉淀为工具库或创作素材。';
}

export function inferGithubAudience(repo = {}) {
  const text = `${repo.fullName || ''} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${repo.readmeIntro || ''}`.toLowerCase();
  if (/(agent|llm|rag|prompt|model|embedding|inference|ai)/.test(text)) return 'AI 产品、知识库、智能体开发者';
  if (/(data|etl|analytics|dashboard|sql|warehouse|pipeline)/.test(text)) return '数据团队、增长分析、运营效率团队';
  if (/(ui|react|vue|component|design|frontend|css|tailwind)/.test(text)) return '前端工程、设计系统、原型团队';
  if (/(api|backend|database|postgres|redis|auth|server)/.test(text)) return '后端工程、平台工程、SaaS 基础设施团队';
  if (/(security|scan|vulnerability|encrypt|privacy|malware)/.test(text)) return '安全、合规、企业 IT 风险团队';
  return '技术负责人、产品经理、效率工具探索者';
}

export function inferGithubDifficulty(repo = {}) {
  const text = `${repo.description || ''} ${repo.readmeIntro || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const hasTutorial = Boolean(repo.tutorial);
  const stars = repo.totalStars || 0;
  if (hasTutorial && stars > 1000 && /(cli|app|template|starter|ui|component|tool)/.test(text)) return '低：可先用示例或模板验证';
  if (/(framework|platform|database|infrastructure|kubernetes|distributed|compiler|runtime)/.test(text)) return '高：需要评估架构、部署和维护成本';
  if (hasTutorial || stars > 500) return '中：适合做小范围 PoC';
  return '中高：建议先阅读 README 和 issue 活跃度';
}

export function inferGithubValue(repo = {}) {
  const text = `${repo.description || ''} ${repo.readmeIntro || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  if (/(agent|workflow|automation|rag|assistant|copilot)/.test(text)) return '可增强智能化工作流，适合作为万般硅川的智能体能力参考。';
  if (/(visualization|dashboard|chart|analytics|data)/.test(text)) return '可提升信息解释和数据可视化表达，适合作为情报讲解组件参考。';
  if (/(template|starter|boilerplate|component|ui)/.test(text)) return '可加速产品界面与工程原型搭建，适合沉淀到素材库复用。';
  if (/(security|privacy|auth|scan)/.test(text)) return '可补强平台可信、安全和权限治理能力。';
  return '值得关注其解决的问题、社区反馈和可迁移能力，优先沉淀为项目观察素材。';
}

export function buildGithubMaterial(repo = {}, since = 'weekly', periods = GITHUB_PERIODS_FALLBACK) {
  const scenario = inferGithubScenario(repo);
  const audience = inferGithubAudience(repo);
  const difficulty = inferGithubDifficulty(repo);
  const value = inferGithubValue(repo);
  const periodLabel = periods.find(p => p.id === since)?.label || '周榜';
  const tags = Array.from(new Set([repo.language, ...(repo.topics || []), 'GitHub', '开源项目'].filter(Boolean)));
  const readmeIntro = repo.readmeIntro || repo.description || '';
  const tutorial = repo.tutorial ? `\n\n上手线索：\n${repo.tutorial}` : '';
  const fullContent = [
    `项目：${repo.fullName}`,
    `榜单：GitHub ${periodLabel}`,
    `简介：${repo.description || '暂无描述'}`,
    readmeIntro ? `README 摘要：${readmeIntro}` : '',
    `应用场景：${scenario}`,
    `适合对象：${audience}`,
    `价值判断：${value}`,
    `落地难度：${difficulty}`,
    tutorial
  ].filter(Boolean).join('\n');

  return {
    id: repo.id,
    title: repo.fullName,
    url: repo.url,
    source: 'GitHub',
    summary: `${repo.description || repo.fullName}。${value}`,
    fullContent,
    imageUrl: repo.imageUrl || '',
    tags,
    topics: repo.topics || [],
    language: repo.language || '',
    category: 'open-source',
    materialType: 'project',
    insight: { scenario, audience, difficulty, value, readmeIntro, tutorial: repo.tutorial || '' },
    metadata: {
      period: since,
      totalStars: repo.totalStars || 0,
      forks: repo.forks || 0,
      homepage: repo.homepage || '',
      openIssues: repo.openIssues || 0
    }
  };
}
