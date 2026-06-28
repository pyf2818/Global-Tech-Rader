import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildWorkbenchContext,
  buildEvidencePack,
  buildMediaAudit,
  buildMaterialExtraction,
  buildProfileMemory,
  buildArticleOutline,
  buildGithubEvaluation,
  WorkflowEngine
} from '../workflowEngine.js';

// ---------------------------------------------------------------------------
// 测试样本数据
// ---------------------------------------------------------------------------
const SAMPLE_ITEMS = [
  {
    id: 'i1', title: 'AI 芯片突破', source: 'Github', category: 'ai', url: 'https://github.com/foo/bar',
    imageUrl: 'https://img.example.com/1.png', videoUrl: '', summary: '这是一段超过一百二十个字符的摘要，用于触发观点素材分类逻辑。这是一段超过一百二十个字符的摘要，用于触发观点素材分类逻辑。',
    tags: ['芯片', '算力'], mustReadScore: 80, sourceGradeLabel: 'S', recommendationReasons: ['创作机会']
  },
  {
    id: 'i2', title: '云原生趋势', source: 'TechCrunch', category: 'cloud', url: 'https://techcrunch.com/x',
    imageUrl: '', videoUrl: 'https://video.example.com/v.mp4', summary: 'short', tags: ['k8s'], mustReadScore: 40, sourceGradeLabel: 'B'
  },
  {
    id: 'i3', title: '量子计算进展', source: 'Nature', category: 'science', url: '',
    imageUrl: 'https://img.example.com/1.png', videoUrl: '', summary: 'short', tags: [], mustReadScore: 10, sourceGradeLabel: 'C'
  }
];

const SAMPLE_CATEGORIES = [
  { id: 'ai', label: '人工智能' },
  { id: 'cloud', label: '云计算' },
  { id: 'science', label: '科学' }
];

const SAMPLE_MATERIALS = [{ originalItemId: 'i1' }];
const SAMPLE_BOOKMARKS = [{ itemId: 'i2' }];

// ---------------------------------------------------------------------------
// buildWorkbenchContext
// ---------------------------------------------------------------------------
describe('buildWorkbenchContext', () => {
  it('正常输入：带 prompt 与完整上下文', () => {
    const out = buildWorkbenchContext('分析今日情报', {
      scopedAgentItems: SAMPLE_ITEMS,
      selectedNewsDate: '2026-06-28',
      agentWorkflowScope: 'today',
      intelligenceProfile: { focusLabels: ['AI', '芯片'], depth: '深度' },
      trackedTerms: ['算力', '推理'],
      selectedInterests: ['ai'],
      bookmarks: SAMPLE_BOOKMARKS,
      materials: SAMPLE_MATERIALS,
      categories: SAMPLE_CATEGORIES
    });
    expect(out).toContain('【任务】');
    expect(out).toContain('分析今日情报');
    expect(out).toContain('日期：2026-06-28');
    expect(out).toContain('范围：today');
    expect(out).toContain('推荐资讯：3 条');
    expect(out).toContain('关注领域：AI、芯片');
    expect(out).toContain('追踪记忆：算力、推理');
    expect(out).toContain('推荐深度：深度');
    // i1(被素材命中), i2(被收藏命中) => 2 条命中
    expect(out).toContain('收藏/素材命中：2 条');
    // 多媒体线索 i1 imageUrl, i2 videoUrl, i3 imageUrl => 3
    expect(out).toContain('多媒体线索：3 条');
    expect(out).toContain('人工智能 1');
    expect(out).toContain('云计算 1');
    expect(out).toContain('科学 1');
    expect(out).toContain('AI 芯片突破｜Github｜人工智能｜推荐分 80');
  });

  it('空 prompt：不输出【任务】段', () => {
    const out = buildWorkbenchContext('', { scopedAgentItems: [] });
    expect(out).not.toContain('【任务】');
    expect(out).toContain('推荐资讯：0 条');
    expect(out).toContain('关注领域：未设置');
    expect(out).toContain('追踪记忆：暂无');
    expect(out).toContain('推荐深度：探索校准');
    expect(out).toContain('领域分布：暂无');
    expect(out).toContain('暂无'); // 优先素材空
  });

  it('默认空参数（opts 全缺省）应不抛错', () => {
    const out = buildWorkbenchContext('task');
    expect(out).toContain('【任务】');
    expect(out).toContain('推荐资讯：0 条');
    expect(out).toContain('关注领域：未设置');
  });

  it('item.category 未命中 categories 时回落到 id 或 未分类', () => {
    const out = buildWorkbenchContext('', {
      scopedAgentItems: [{ id: 'x', title: 'X', source: '', category: 'unknown-cat', mustReadScore: 5 }],
      categories: SAMPLE_CATEGORIES
    });
    // getCategoryLabel 返回 id('unknown-cat')，因为 id truthy
    expect(out).toContain('unknown-cat 1');
  });
});

// ---------------------------------------------------------------------------
// buildEvidencePack
// ---------------------------------------------------------------------------
describe('buildEvidencePack', () => {
  it('正常输入：截取前 6 条形成证据包', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `e${i}`, title: `标题${i}`, source: `源${i}`, url: `https://u/${i}`
    }));
    const r = buildEvidencePack(items);
    expect(r.evidenceLinks).toHaveLength(6);
    expect(r.output).toContain('证据包整理完成');
    expect(r.output).toContain('1. 标题0（源0）');
    expect(r.output).toContain('https://u/0');
    expect(r.output).toContain('已保留来源');
  });

  it('空输入：输出暂无可引用链接', () => {
    const r = buildEvidencePack([]);
    expect(r.evidenceLinks).toHaveLength(0);
    expect(r.output).toContain('暂无可引用链接');
  });

  it('边界：item 缺 url/source ��回落到 暂无链接/未知来源', () => {
    const r = buildEvidencePack([{ id: 'a', title: 'A' }]);
    expect(r.output).toContain('A（未知来源）');
    expect(r.output).toContain('暂无链接');
  });
});

// ---------------------------------------------------------------------------
// buildMediaAudit
// ---------------------------------------------------------------------------
describe('buildMediaAudit', () => {
  it('正常输入：统计图片/视频/缺失/重复', () => {
    // i1 imageUrl, i2 videoUrl, i3 imageUrl（与 i1 相同）=> 全部有媒体
    const r = buildMediaAudit(SAMPLE_ITEMS);
    expect(r.imageUrls).toEqual(['https://img.example.com/1.png', 'https://img.example.com/1.png']);
    expect(r.duplicateImages).toEqual(['https://img.example.com/1.png']);
    expect(r.mediaAudit.imageCount).toBe(2);
    expect(r.mediaAudit.videoCount).toBe(1);
    expect(r.mediaAudit.missingMediaCount).toBe(0); // 3 items 都有媒体 => missing = 3-3 = 0
    expect(r.mediaAudit.duplicateImageCount).toBe(1);
    expect(r.output).toContain('图片 2 条');
    expect(r.output).toContain('视频 1 条');
    expect(r.output).toContain('缺少多媒体 0 条');
    expect(r.output).toContain('重复图片 1 条');
  });

  it('空输入：全部 0', () => {
    const r = buildMediaAudit([]);
    expect(r.imageUrls).toEqual([]);
    expect(r.duplicateImages).toEqual([]);
    expect(r.mediaAudit.imageCount).toBe(0);
    expect(r.mediaAudit.videoCount).toBe(0);
    expect(r.mediaAudit.missingMediaCount).toBe(0);
    expect(r.mediaAudit.duplicateImageCount).toBe(0);
  });

  it('边界：所有 item 都无媒体（missingMedia = 全长）', () => {
    const r = buildMediaAudit([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
    expect(r.mediaAudit.missingMediaCount).toBe(2);
    expect(r.mediaAudit.imageCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildMaterialExtraction
// ---------------------------------------------------------------------------
describe('buildMaterialExtraction', () => {
  it('正常输入：过滤已存在素材并最多 5 条', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i}`, title: `素材${i}`, source: `源${i}`, summary: 'short', imageUrl: i % 2 === 0 ? 'img' : ''
    }));
    const existing = [{ originalItemId: 'm0' }]; // m0 已存在
    const r = buildMaterialExtraction(items, [], existing);
    expect(r.candidates).toHaveLength(5);
    expect(r.candidates.map(c => c.id)).not.toContain('m0');
    expect(r.output).toContain('素材候选提取完成：5 条');
    // 含图片的应是图文素材
    expect(r.output).toContain('图文素材');
    expect(r.output).toContain('素材1'); // id m1, 无图 => 线索素材
  });

  it('空输入：输出暂无新的素材候选', () => {
    const r = buildMaterialExtraction([], [], []);
    expect(r.candidates).toHaveLength(0);
    expect(r.output).toContain('暂无新的素材候选');
  });

  it('边界：existingMaterials 为 undefined/null 不抛错', () => {
    const r1 = buildMaterialExtraction([{ id: 'a', title: 'A' }], [], undefined);
    const r2 = buildMaterialExtraction([{ id: 'a', title: 'A' }], [], null);
    expect(r1.candidates).toHaveLength(1);
    expect(r2.candidates).toHaveLength(1);
  });

  it('观点素材分类：summary 长 > 120 且无图', () => {
    const longSummary = 'x'.repeat(130);
    const r = buildMaterialExtraction([{ id: 'a', title: 'A', source: 'S', summary: longSummary }], [], []);
    expect(r.output).toContain('观点素材');
  });
});

// ---------------------------------------------------------------------------
// buildProfileMemory
// ---------------------------------------------------------------------------
describe('buildProfileMemory', () => {
  it('正常输入：合并 tracked + tags + category，去重截前 8', () => {
    const r = buildProfileMemory(
      SAMPLE_ITEMS,
      { focusLabels: ['AI'] },
      ['算力', '推理'],
      SAMPLE_BOOKMARKS,
      SAMPLE_MATERIALS
    );
    expect(Array.isArray(r.terms)).toBe(true);
    expect(r.terms).toContain('算力');
    expect(r.terms).toContain('推理');
    // tags: 芯片,算力,k8s ; category: ai,cloud
    expect(r.terms).toContain('芯片');
    expect(r.terms).toContain('ai');
    expect(r.terms.length).toBeLessThanOrEqual(8);
    expect(r.output).toContain('画像记忆建议');
    expect(r.output).toContain('建议追踪');
    expect(r.output).toContain('强化领域：AI');
    // i1(素材命中) i2(收藏命中) => 2
    expect(r.output).toContain('2 条收藏/素材命中');
    // 多媒体线索 i1 img + i2 video + i3 img = 3
    expect(r.output).toContain('3 条多媒体线索');
  });

  it('空输入：建议追踪为 暂无', () => {
    const r = buildProfileMemory([], {}, [], [], []);
    expect(r.terms).toEqual([]);
    expect(r.output).toContain('建议追踪：暂无');
    expect(r.output).toContain('强化领域：未设置');
    expect(r.output).toContain('0 条资讯');
    expect(r.output).toContain('0 条收藏/素材命中');
  });

  it('边界：tracked 为 null/null 回落空数组，bookmarks/materials 传空数组', () => {
    const r = buildProfileMemory([{ id: 'a', title: 'A', category: 'ai' }], null, null, [], []);
    expect(r.terms).toContain('ai');
    expect(r.output).toContain('0 条收藏/素材命中');
  });

  it('边界：profile 为 null 不抛错，focusLabels 回落未设置', () => {
    const r = buildProfileMemory([], null, [], [], []);
    expect(r.output).toContain('强化领域：未设置');
  });
});

// ---------------------------------------------------------------------------
// buildArticleOutline
// ---------------------------------------------------------------------------
describe('buildArticleOutline', () => {
  it('正常输入：截取前 3 条作为素材', () => {
    const r = buildArticleOutline(SAMPLE_ITEMS, 'AI 选题');
    expect(r.topReads).toHaveLength(3);
    expect(r.output).toContain('# AI 选题');
    expect(r.output).toContain('## 核心论点');
    expect(r.output).toContain('## 可用素材');
    expect(r.output).toContain('1. AI 芯片突破｜Github');
    expect(r.output).toContain('## 建议结构');
  });

  it('空输入：可用素材为 暂无，missionLabel 缺省时回落 智能体选题', () => {
    const r = buildArticleOutline([], '');
    expect(r.topReads).toHaveLength(0);
    expect(r.output).toContain('# 智能体选题');
    expect(r.output).toContain('可用素材');
    expect(r.output).toContain('暂无');
  });

  it('边界：item 缺 source 时回落 未知来源', () => {
    const r = buildArticleOutline([{ id: 'a', title: 'A' }], 'M');
    expect(r.output).toContain('A｜未知来源');
  });
});

// ---------------------------------------------------------------------------
// buildGithubEvaluation
// ---------------------------------------------------------------------------
describe('buildGithubEvaluation', () => {
  it('正常输入：优先匹配 github 来源的项目', () => {
    const items = [
      { id: 'g1', title: 'Repo1', source: 'Github', url: 'https://github.com/a', summary: '用途1' },
      { id: 'g2', title: 'Repo2', source: 'Github', url: 'https://github.com/b', recommendation: '用途2' },
      { id: 'x1', title: 'X1', source: 'Other', url: 'https://x.com' }
    ];
    const r = buildGithubEvaluation(items);
    expect(r.repos).toHaveLength(2);
    expect(r.output).toContain('GitHub 项目评估');
    expect(r.output).toContain('Repo1');
    expect(r.output).toContain('用途1');
    expect(r.output).toContain('用途2');
  });

  it('空输入：输出 暂无项目', () => {
    const r = buildGithubEvaluation([]);
    expect(r.repos).toHaveLength(0);
    expect(r.output).toContain('暂无项目');
  });

  it('边界：无 github 来源时回落到前 5 条', () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, title: `N${i}`, source: 'Other', url: 'https://x.com' }));
    const r = buildGithubEvaluation(items);
    expect(r.repos).toHaveLength(5);
    expect(r.output).toContain('N0');
    expect(r.output).toContain('需要结合 README 继续分析'); // 无 summary/recommendation
  });

  it('边界：item 缺 url 时回落 暂无链接', () => {
    const r = buildGithubEvaluation([{ id: 'a', title: 'A', source: 'Github' }]);
    expect(r.output).toContain('暂无链接');
  });
});

// ---------------------------------------------------------------------------
// WorkflowEngine
// ---------------------------------------------------------------------------
describe('WorkflowEngine', () => {
  let engine;
  beforeEach(() => {
    engine = new WorkflowEngine();
    vi.unstubAllGlobals();
  });

  it('空节点列表：返回 completed 空结果', async () => {
    const r = await engine.run({ id: 'w', name: 'empty', nodes: [] }, {});
    expect(r.status).toBe('completed');
    expect(r.trace).toEqual([]);
    expect(r.finalOutput).toBe('');
    expect(r.startedAt).toBeTruthy();
    expect(r.finishedAt).toBeTruthy();
  });

  it('enabled=false 的节点被过滤，等同空', async () => {
    const wf = { id: 'w', name: 'all-disabled', nodes: [
      { id: 'n1', type: 'input', title: 'I', enabled: false }
    ] };
    const r = await engine.run(wf, {});
    expect(r.status).toBe('completed');
    expect(r.trace).toEqual([]);
  });

  it('纯本地节点链 input→output 能跑通', async () => {
    const wf = {
      id: 'w', name: 'local-chain', nodes: [
        { id: 'in', type: 'input', title: '输入', prompt: 'p', inputKey: 'context', outputKey: 'ctx_out' },
        { id: 'out', type: 'output', title: '输出', prompt: 'p', inputKey: 'ctx_out', outputKey: 'final' }
      ]
    };
    const ctx = {
      scopedAgentItems: SAMPLE_ITEMS,
      categories: SAMPLE_CATEGORIES,
      selectedNewsDate: '2026-06-28',
      agentWorkflowScope: 'today',
      intelligenceProfile: { focusLabels: ['AI'] },
      trackedTerms: ['算力'],
      selectedInterests: ['ai'],
      bookmarks: SAMPLE_BOOKMARKS,
      materials: SAMPLE_MATERIALS,
      selectedMission: { label: '测试任务', workflowName: '测试流' }
    };
    const steps = [];
    const r = await engine.run(wf, ctx, (nodeId, status, output, structured, error, trace) => {
      steps.push({ nodeId, status });
    });
    expect(r.status).toBe('completed');
    expect(r.trace).toHaveLength(2);
    expect(r.trace[0].status).toBe('completed');
    expect(r.trace[1].status).toBe('completed');
    expect(r.finalOutput).toContain('输入');
    expect(r.finalOutput).toContain('输出');
    expect(r.finalOutput).toContain('测试任务');
    // onStep 至少触发 running + completed
    expect(steps.some(s => s.status === 'running')).toBe(true);
    expect(steps.some(s => s.status === 'completed')).toBe(true);
  });

  it('LLM 节点 mock fetch 返回 content，断言输出', async () => {
    const fetchMock = vi.fn(async (url, opts) => ({
      ok: true,
      json: async () => ({ content: '大模型分析结论：这是优先级 1' })
    }));
    vi.stubGlobal('fetch', fetchMock);

    const wf = {
      id: 'w', name: 'llm-flow', nodes: [
        { id: 'llm1', type: 'llm', title: '大模型分析', role: '分析师', prompt: '请分析', agentId: 'agent-a', inputKey: 'context', outputKey: 'analysis' }
      ]
    };
    const ctx = {
      scopedAgentItems: SAMPLE_ITEMS,
      llmConfig: { baseUrl: 'http://x', apiKey: 'k', selectedModel: 'gpt' },
      agents: [{ id: 'agent-a', systemPrompt: '你是分析师' }]
    };
    const r = await engine.run(wf, ctx);
    expect(r.status).toBe('completed');
    expect(r.trace[0].status).toBe('completed');
    expect(r.trace[0].output).toContain('大模型分析结论：这是优先级 1');
    expect(r.finalOutput).toContain('大模型分析结论');
    // fetch 被调用且传 chat action
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe('/api/ai-generate');
    const body = JSON.parse(callArgs[1].body);
    expect(body.action).toBe('chat');
    expect(body.model).toBe('gpt');
    expect(body.baseUrl).toBe('http://x');
  });

  it('LLM 节点：role === title 时走单消息 user 分支', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ content: '单消息输出' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const wf = {
      id: 'w', name: 'llm-single', nodes: [
        { id: 'llm1', type: 'llm', title: '分析', role: '分析', prompt: '请分析', inputKey: 'context', outputKey: 'out' }
      ]
    };
    const r = await engine.run(wf, { scopedAgentItems: [], agents: [] });
    expect(r.status).toBe('completed');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // role === title => 走单 user 消息分支
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
  });

  it('LLM 节点无 content 时回落到 暂无输出', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    const wf = { id: 'w', name: 'l', nodes: [
      { id: 'l1', type: 'llm', title: 'L', prompt: 'p', inputKey: 'context', outputKey: 'o' }
    ] };
    const r = await engine.run(wf, { scopedAgentItems: [], agents: [] });
    expect(r.status).toBe('completed');
    expect(r.trace[0].output).toContain('暂无输出');
  });

  it('LLM 节点 fetch 返回 error 时 run 状态变 failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, json: async () => ({ error: 'API key 无效' })
    })));
    const wf = {
      id: 'w', name: 'llm-fail', nodes: [
        { id: 'llm1', type: 'llm', title: '大模型', prompt: 'p', inputKey: 'context', outputKey: 'out' },
        { id: 'out1', type: 'output', title: '输出', prompt: 'p', inputKey: 'out', outputKey: 'final' }
      ]
    };
    let failedEvent = null;
    const r = await engine.run(wf, { scopedAgentItems: [], agents: [] }, (nodeId, status, _o, _s, error) => {
      if (status === 'failed') failedEvent = { nodeId, error };
    });
    expect(r.status).toBe('failed');
    expect(r.error).toBe('API key 无效');
    expect(r.finalOutput).toBe('');
    // 失败节点标记 failed，后续 queued 节点标记 skipped
    const llmStep = r.trace.find(s => s.nodeId === 'llm1');
    const outStep = r.trace.find(s => s.nodeId === 'out1');
    expect(llmStep.status).toBe('failed');
    expect(outStep.status).toBe('skipped');
    expect(failedEvent).toBeTruthy();
    expect(failedEvent.error).toBe('API key 无效');
  });

  it('condition 失败时后续节点 status=skipped（核心断言）', async () => {
    // condition: itemCount >= 5，但只有 3 条 => 失败
    const wf = {
      id: 'w', name: 'cond-fail', nodes: [
        { id: 'in', type: 'input', title: '输入', prompt: 'p', inputKey: 'context', outputKey: 'c1' },
        { id: 'cond', type: 'condition', title: '门槛', prompt: '至少5条', conditionMetric: 'itemCount', conditionOperator: '>=', conditionValue: 5, inputKey: 'c1', outputKey: 'c2' },
        { id: 'out', type: 'output', title: '输出', prompt: 'p', inputKey: 'c2', outputKey: 'final' }
      ]
    };
    const skipEvents = [];
    const r = await engine.run(wf, {
      scopedAgentItems: SAMPLE_ITEMS,
      categories: SAMPLE_CATEGORIES
    }, (nodeId, status) => {
      if (status === 'skipped') skipEvents.push(nodeId);
    });
    expect(r.status).toBe('completed');
    expect(r.haltedByCondition).toBe('门槛');
    const condStep = r.trace.find(s => s.nodeId === 'cond');
    const outStep = r.trace.find(s => s.nodeId === 'out');
    expect(condStep.status).toBe('completed'); // condition 节点自身执行成功
    expect(outStep.status).toBe('skipped');
    expect(outStep.detail).toContain('条件未通过');
    // 触发 skipped-rest 事件
    expect(skipEvents).toContain('skipped-rest');
    // finalOutput 包含条件分支说明
    expect(r.finalOutput).toContain('条件分支');
    expect(r.finalOutput).toContain('门槛');
  });

  it('condition 通过时后续节点正常执行', async () => {
    const wf = {
      id: 'w', name: 'cond-pass', nodes: [
        { id: 'cond', type: 'condition', title: '门槛', prompt: '至少1条', conditionMetric: 'itemCount', conditionOperator: '>=', conditionValue: 1, inputKey: 'context', outputKey: 'c1' },
        { id: 'out', type: 'output', title: '输出', prompt: 'p', inputKey: 'c1', outputKey: 'final' }
      ]
    };
    const r = await engine.run(wf, { scopedAgentItems: SAMPLE_ITEMS, categories: SAMPLE_CATEGORIES });
    expect(r.status).toBe('completed');
    expect(r.haltedByCondition).toBeUndefined();
    const outStep = r.trace.find(s => s.nodeId === 'out');
    expect(outStep.status).toBe('completed');
  });

  it('condition 各比较运算符分支覆盖（>, <, <=, ==, >=）', async () => {
    const makeWf = (op, val) => ({
      id: 'w', name: 'op', nodes: [
        { id: 'c', type: 'condition', title: 'C', prompt: 'p', conditionMetric: 'itemCount', conditionOperator: op, conditionValue: val, inputKey: 'context', outputKey: 'o' }
      ]
    });
    // itemCount = 3
    const rGt = await engine.run(makeWf('>', 2), { scopedAgentItems: SAMPLE_ITEMS });
    const rGtFail = await engine.run(makeWf('>', 3), { scopedAgentItems: SAMPLE_ITEMS });
    const rLt = await engine.run(makeWf('<', 4), { scopedAgentItems: SAMPLE_ITEMS });
    const rLtFail = await engine.run(makeWf('<', 3), { scopedAgentItems: SAMPLE_ITEMS });
    const rLe = await engine.run(makeWf('<=', 3), { scopedAgentItems: SAMPLE_ITEMS });
    const rEq = await engine.run(makeWf('==', 3), { scopedAgentItems: SAMPLE_ITEMS });
    const rEqFail = await engine.run(makeWf('==', 4), { scopedAgentItems: SAMPLE_ITEMS });
    // 通过 => 没有 haltedByCondition；未通过 => haltedByCondition
    expect(rGt.haltedByCondition).toBeUndefined();
    expect(rGtFail.haltedByCondition).toBe('C');
    expect(rLt.haltedByCondition).toBeUndefined();
    expect(rLtFail.haltedByCondition).toBe('C');
    expect(rLe.haltedByCondition).toBeUndefined();
    expect(rEq.haltedByCondition).toBeUndefined();
    expect(rEqFail.haltedByCondition).toBe('C');
  });

  it('classifier 节点：执行分流逻辑', async () => {
    const wf = { id: 'w', name: 'clf', nodes: [
      { id: 'c', type: 'classifier', title: '分类', prompt: 'p', classifierLabels: '必读,追踪,素材,创作,降噪', inputKey: 'context', outputKey: 'cls' }
    ] };
    const r = await engine.run(wf, {
      scopedAgentItems: SAMPLE_ITEMS,
      categories: SAMPLE_CATEGORIES,
      trackedTerms: ['算力'],
      selectedInterests: ['ai'],
      bookmarks: SAMPLE_BOOKMARKS,
      materials: SAMPLE_MATERIALS
    });
    expect(r.status).toBe('completed');
    const step = r.trace[0];
    expect(step.structured).toBeTruthy();
    expect(step.structured.labels).toEqual(['必读', '追踪', '素材', '创作', '降噪']);
    // i1 mustReadScore 80 >= 65 => 必读
    expect(step.structured.mustRead).toContain('i1');
    expect(step.output).toContain('分类结果');
  });

  it('skill 节点：evidence-pack 合并多 skill 输出', async () => {
    const wf = { id: 'w', name: 'sk', nodes: [
      { id: 's', type: 'skill', title: '工具', prompt: '工具说明', skillId: 'evidence-pack', inputKey: 'context', outputKey: 'sk_out' }
    ] };
    const r = await engine.run(wf, {
      scopedAgentItems: SAMPLE_ITEMS,
      categories: SAMPLE_CATEGORIES,
      bookmarks: SAMPLE_BOOKMARKS,
      materials: SAMPLE_MATERIALS,
      trackedTerms: ['算力'],
      intelligenceProfile: { focusLabels: ['AI'] },
      selectedMission: { label: '任务' }
    });
    expect(r.status).toBe('completed');
    const step = r.trace[0];
    // evidence-pack 分支合并了 evidencePack + mediaAudit + materialExtraction
    expect(step.output).toContain('证据包整理完成');
    expect(step.output).toContain('多媒体审计完成');
    expect(step.output).toContain('素材候选提取完成');
    expect(step.structured.skillId).toBe('evidence-pack');
  });

  it('skill 节点：非 evidence-pack 的 skillId 单输出', async () => {
    const wf = { id: 'w', name: 'sk2', nodes: [
      { id: 's', type: 'skill', title: '工具', prompt: 'p', skillId: 'media-audit', inputKey: 'context', outputKey: 'o' }
    ] };
    const r = await engine.run(wf, { scopedAgentItems: SAMPLE_ITEMS });
    const step = r.trace[0];
    expect(step.output).toContain('多媒体审计完成');
    expect(step.output).not.toContain('素材候选提取完成'); // 非合并分支
    expect(step.structured.skillId).toBe('media-audit');
  });

  it('skill 节点：未知 skillId 回落到 evidence-pack', async () => {
    const wf = { id: 'w', name: 'sk3', nodes: [
      { id: 's', type: 'skill', title: '工具', prompt: 'p', skillId: 'nonexistent-skill', inputKey: 'context', outputKey: 'o' }
    ] };
    const r = await engine.run(wf, { scopedAgentItems: SAMPLE_ITEMS });
    const step = r.trace[0];
    // selected = skillOutputs['nonexistent-skill'] || evidencePack => evidencePack
    // 但 skillId==='evidence-pack' 判断为 false => combined = selected.output = evidencePack.output
    expect(step.output).toContain('证据包整理完成');
  });

  it('reply 节点：固定回复基于上一节点输出', async () => {
    const wf = { id: 'w', name: 'reply', nodes: [
      { id: 'r', type: 'reply', title: '回复', prompt: '请按风格回复', inputKey: 'context', outputKey: 'r_out' }
    ] };
    const r = await engine.run(wf, { scopedAgentItems: [], customPrompt: '上一节点内容ABC' });
    expect(r.status).toBe('completed');
    const step = r.trace[0];
    expect(step.output).toContain('请按风格回复');
    expect(step.structured.mode).toBe('fixed-reply');
    // previousOutput 是 buildWorkbenchContext(customPrompt) 的输出
    expect(step.output).toContain('上一节点内容ABC');
  });

  it('未知节点类型走 fallback 分支', async () => {
    const wf = { id: 'w', name: 'unknown', nodes: [
      { id: 'u', type: 'mystery-type', title: '神秘节点', prompt: 'p', inputKey: 'context', outputKey: 'o' }
    ] };
    const r = await engine.run(wf, { scopedAgentItems: [] });
    expect(r.status).toBe('completed');
    const step = r.trace[0];
    expect(step.structured.type).toBe('mystery-type');
    expect(step.output).toContain('神秘节点 已处理');
  });

  it('abort()：设置 abort 信号，LLM 节点等待中触发取消变 failed', async () => {
    // 使用 LLM 节点 + 延迟 fetch 使 abort 能在 await 期间生效
    let fetchResolve;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { fetchResolve = resolve; })));
    const wf = { id: 'w', name: 'abort', nodes: [
      { id: 'llm1', type: 'llm', title: '大模型', prompt: 'p', inputKey: 'context', outputKey: 'o' }
    ] };
    const p = engine.run(wf, { scopedAgentItems: [], agents: [] });
    // 等待 fetch 被调用后，再 abort
    await new Promise(r => setTimeout(r, 20));
    engine.abort();
    // 释放 fetch 时传入一个导致 signal.aborted 为 true 的错误
    fetchResolve({ ok: true, json: async () => { throw new DOMException('aborted', 'AbortError'); } });
    const r = await p;
    expect(r.status).toBe('failed');
    expect(r.error).toBeTruthy();
  });

  it('onStep 回调收到 trace 数组（第六参数）', async () => {
    const wf = { id: 'w', name: 'cb', nodes: [
      { id: 'in', type: 'input', title: '输入', prompt: 'p', inputKey: 'context', outputKey: 'c1' }
    ] };
    let receivedTrace = null;
    await engine.run(wf, { scopedAgentItems: [] }, (_id, _st, _o, _s, _e, trace) => {
      receivedTrace = trace;
    });
    expect(Array.isArray(receivedTrace)).toBe(true);
    expect(receivedTrace.length).toBeGreaterThan(0);
  });

  it('节点缺省 inputKey/outputKey 时自动生成 context/step_N', async () => {
    const wf = { id: 'w', name: 'default-keys', nodes: [
      { id: 'in', type: 'input', title: '输入', prompt: 'p' },  // 无 inputKey/outputKey
      { id: 'out', type: 'output', title: '输出', prompt: 'p' }  // 无 inputKey/outputKey
    ] };
    const r = await engine.run(wf, { scopedAgentItems: SAMPLE_ITEMS });
    expect(r.status).toBe('completed');
    // trace 中应记录生成的 variablePreview
    expect(r.trace[0].variablePreview).toContain('context → step_1');
  });
});
