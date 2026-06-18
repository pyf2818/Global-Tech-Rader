export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed' }, null, 405));
  }

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    body = JSON.parse(raw);
  } catch {
    body = {};
  }

  try {
    const { baseUrl = '', apiKey = '', model = '', action = '', content = '', messages = [], systemPrompt = '' } = body;
    if (!baseUrl || !model) {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'baseUrl and model are required' }, null, 400));
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const apiUrl = cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v2') || cleanBaseUrl.endsWith('/v3') || cleanBaseUrl.endsWith('/v4')
      ? cleanBaseUrl + '/chat/completions'
      : cleanBaseUrl + '/v1/chat/completions';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const prompts = {
      continue: `请继续以下文章的内容，保持相同的风格和语气：\n\n${content}`,
      rewrite: `请改写以下段落，使其更清晰、更专业，但保持原意不变：\n\n${content}`,
      expand: `请扩展以下内容，添加更多细节和论据，使其更丰富：\n\n${content}`,
      simplify: `请简化以下段落，使其更简洁易懂：\n\n${content}`,
      translate_zh: `请将以下内容翻译成中文。只输出翻译结果，不要添加任何解释、说明、前缀或后缀：\n\n${content}`,
      translate_en: `请将以下内容翻译成英文：\n\n${content}`,
      title: `请为以下文章生成 5 个吸引人的标题，每个标题不超过 30 字：\n\n${content}`,
      summary: `请为以下文章生成一段简洁的摘要（不超过 100 字）：\n\n${content}`
    };

    let apiMessages;
    if (action === 'chat' && Array.isArray(messages) && messages.length > 0) {
      apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: 'system', content: systemPrompt });
      }
      messages.slice(-20).forEach(msg => {
        if (msg?.role && msg?.content) {
          apiMessages.push({ role: msg.role, content: msg.content });
        }
      });
      apiMessages.push({ role: 'user', content });
    } else {
      const prompt = prompts[action] || `请根据以下要求处理内容：\n要求：${action}\n内容：${content}`;
      apiMessages = [];
      if (systemPrompt) {
        apiMessages.push({ role: 'system', content: systemPrompt });
      }
      apiMessages.push({ role: 'user', content: prompt });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_tokens: 1500,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `API responded ${response.status}: ${errText.slice(0, 200)}` }));
    }

    const data = await response.json();
    const generated = data.choices?.[0]?.message?.content || '';
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, content: generated }));
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e.message }));
  }
}
