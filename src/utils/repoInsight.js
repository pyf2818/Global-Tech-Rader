// GitHub 仓库情报派生 —— 纯本地规则，不依赖 LLM
// 基于 language / topics / description / stars 推断应用场景、适用人群、技术价值
// 用于 GithubRepoCard 的「AI 情报」标签，离线可用、零延迟

const SCENARIO_RULES = [
  { keys: ['api', 'rest', 'graphql', 'openapi', 'swagger'], scenario: 'API 服务' },
  { keys: ['cli', 'command', 'terminal', 'shell'], scenario: '命令行工具' },
  { keys: ['frontend', 'ui', 'component', 'react', 'vue', 'css'], scenario: '前端开发' },
  { keys: ['ml', 'ai', 'llm', 'gpt', 'transformer', 'deep-learning', 'machine-learning'], scenario: 'AI / 机器学习' },
  { keys: ['blockchain', 'web3', 'solidity', 'crypto'], scenario: '区块链' },
  { keys: ['database', 'sql', 'kv', 'orm', 'redis'], scenario: '数据存储' },
  { keys: ['devops', 'docker', 'k8s', 'kubernetes', 'ci'], scenario: 'DevOps' },
  { keys: ['security', 'crypto', 'pentest', 'vuln'], scenario: '安全工具' },
  { keys: ['game', 'engine', 'render'], scenario: '游戏 / 图形' },
  { keys: ['doc', 'blog', 'cms', 'wiki'], scenario: '文档 / 内容' },
  { keys: ['framework', 'library', 'sdk'], scenario: '开发框架' },
  { keys: ['tool', 'util', 'helper'], scenario: '通用工具' },
];

const AUDIENCE_BY_LANG = {
  Python: '数据工程师 / AI 研究者',
  JavaScript: '前端 / 全栈工程师',
  TypeScript: '前端 / 全栈工程师',
  Rust: '系统工程师',
  Go: '后端 / 云原生工程师',
  C: '系统 / 嵌入式工程师',
  'C++': '系统 / 性能工程师',
  Java: '后端工程师',
  Kotlin: 'Android / 后端工程师',
  Swift: 'iOS 工程师',
  Dart: '移动 / 跨端工程师',
  Ruby: '后端工程师',
  PHP: '后端工程师',
  Shell: '运维工程师',
  Lua: '嵌入式 / 游戏脚本',
};

// stars 量级 + 周期 → 技术价值一句话
function deriveTechValue(repo, since) {
  const stars = repo.totalStars || 0;
  const period = since === 'daily' ? '今日' : since === 'monthly' ? '本月' : '本周';
  if (stars >= 50000) return `${period}超高频关注，行业级基础设施项目`;
  if (stars >= 10000) return `${period}高关注度，主流技术栈选择`;
  if (stars >= 3000) return `${period}稳步增长，值得长期跟踪`;
  if (stars >= 500) return `${period}新兴上升项目，适合早期评估`;
  return `${period}小众但活跃，可作为技术储备关注`;
}

function matchScenarios(text) {
  const lower = text.toLowerCase();
  const hits = new Set();
  for (const rule of SCENARIO_RULES) {
    if (rule.keys.some(k => lower.includes(k))) hits.add(rule.scenario);
  }
  return [...hits];
}

/**
 * 派生仓库情报
 * @param {{language?: string, topics?: string[], description?: string, totalStars?: number}} repo
 * @param {string} [since] - daily / weekly / monthly
 * @returns {{scenarios: string[], audience: string[], techValue: string}}
 */
export function deriveRepoInsight(repo, since = 'weekly') {
  const topics = Array.isArray(repo.topics) ? repo.topics : [];
  const lang = repo.language || '';
  const desc = repo.description || '';
  const haystack = `${lang} ${topics.join(' ')} ${desc}`;

  const scenarios = matchScenarios(haystack);
  if (scenarios.length === 0) scenarios.push('通用开发');

  const audience = [];
  if (lang && AUDIENCE_BY_LANG[lang]) audience.push(AUDIENCE_BY_LANG[lang]);
  if (topics.some(t => /ai|ml|llm/i.test(t))) audience.push('AI 应用开发者');
  if (audience.length === 0) audience.push('全栈工程师');

  return {
    scenarios: scenarios.slice(0, 3),
    audience: audience.slice(0, 2),
    techValue: deriveTechValue(repo, since),
  };
}
