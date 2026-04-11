const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY;

async function callGroq(messages, maxTokens = 2000, temperature = 0.7) {
  if (!GROQ_API_KEY) throw new Error('缺少 GROQ_API_KEY 或 ANTHROPIC_API_KEY 环境变量');
  const apiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: maxTokens, temperature, messages })
  });
  const data = await apiRes.json();
  if (!apiRes.ok) throw new Error(data.error?.message || `API返回${apiRes.status}`);
  return data.choices?.[0]?.message?.content || '';
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const handlePost = (handler) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        await handler(JSON.parse(body));
      } catch (err) {
        console.error('[server error]', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  };

  // ── 剧本创作接口 ──
  if (req.method === 'POST' && req.url === '/api/write') {
    handlePost(async ({ mode, genre, theme, characters, tone, scenes, existingScript, instruction }) => {
      let prompt;

      if (mode === 'generate') {
        const charDesc = characters?.length
          ? `主要角色：${characters.map(c => `${c.name}（${c.role}，${c.appearance || '外貌未设定'}）`).join('、')}`
          : '';
        prompt = `你是一位专业漫画/短剧剧本作家，擅长写节奏感强、画面感丰富的漫剧剧本。

请根据以下设定，创作一段完整的剧本：

【类型】${genre || '现代都市'}
【主题/核心冲突】${theme || '未指定'}
【基调】${tone || '紧张悬疑'}
【场数】${scenes || 2} 场
${charDesc}

要求：
- 每场开头注明【第X场】、地点、时间、氛围
- 人物对白用"角色名：台词"格式
- 动作描述用括号（）标注
- 画面感强，适合漫画分镜
- 对白简练有力，不超过20字一句
- 直接输出剧本正文，不要任何说明`;

      } else if (mode === 'continue') {
        prompt = `你是专业漫画剧本作家。请根据已有剧本，续写下一场内容。

【已有剧本】
${existingScript}

要求：
- 延续前文的人物关系、情绪和节奏
- 续写 1-2 场，格式保持一致
- 画面感强，对白简练
- 直接输出续写内容，不要说明`;

      } else if (mode === 'polish') {
        prompt = `你是专业漫画剧本编辑。请对以下剧本进行润色优化。

【原始剧本】
${existingScript}

【优化要求】${instruction || '提升对白张力，加强画面感，优化节奏'}

要求：
- 保持原有故事结构和人物关系
- 对白更加简练有力
- 场景描述更具画面感
- 直接输出优化后的完整剧本，不要说明`;

      } else if (mode === 'outline') {
        prompt = `你是专业漫画剧本策划。请根据以下信息，创作一个剧本大纲。

【类型】${genre || '现代都市'}
【主题】${theme || '未指定'}
【基调】${tone || '紧张悬疑'}
${characters?.length ? `【角色】${characters.map(c=>`${c.name}（${c.role}）`).join('、')}` : ''}

请输出：
1. 故事核心矛盾（1-2句）
2. 人物关系图（文字版）
3. 分场大纲（每场一句话概括，共${scenes||4}场）
4. 高潮设计
5. 结局方向（开放/封闭各一个方案）

直接输出内容，不要多余说明。`;
      }

      console.log('[write] mode:', mode);
      const text = await callGroq([{ role: 'user', content: prompt }], 2000, 0.8);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text }));
    });
    return;
  }

  // ── 分镜分析接口 ──
  if (req.method === 'POST' && req.url === '/api/analyze') {
    handlePost(async ({ script, style, shotPref, characters }) => {
      const prompt = buildStoryboardPrompt(script, style, shotPref, characters || []);
      console.log('[analyze] calling Groq...');
      let text = await callGroq([{ role: 'user', content: prompt }], 2000, 0.3);
      console.log('[Groq] raw (first 300):', text.slice(0, 300));
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
    });
    return;
  }

  // ── 静态文件 ──
  let filePath = req.url === '/' ? '/public/index.html' : '/public' + req.url;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(data);
  });
});

function buildStoryboardPrompt(script, style, shotPref, characters) {
  const charSection = characters.length > 0
    ? `【角色设定库】（生成分镜时严格遵守以下角色外貌描述，确保跨镜头一致性）
${characters.map(c =>
  `▸ ${c.name}（${c.age||''}岁，${c.gender||''}）
  外貌：${c.appearance||'未设定'}
  性格：${c.personality||'未设定'}
  标志性特征：${c.signature||'无'}`
).join('\n')}
` : '';

  return `你是一位专业漫画分镜导演，擅长将剧本转化为精准的分镜脚本。

【任务】将下方剧本分解为逐格分镜脚本，输出严格的 JSON 格式。

【画风要求】${style}
【景别偏好】${shotPref}
${charSection}
【输出格式】
只返回如下 JSON 对象，不要任何说明文字、不要 markdown 代码块：
{
  "scene_title": "场景标题",
  "total_shots": 数字,
  "shots": [
    {
      "shot_num": 1,
      "shot_type": "景别（全景/中景/近景/特写/航拍/俯拍/仰拍）",
      "camera_move": "运镜（固定/推/拉/摇/跟/变焦）",
      "emotion": "情绪标签（一个词：紧张/平静/对峙/压抑等）",
      "characters": "出场角色及动作描述（含外貌关键词，保持一致性）",
      "dialogue": "台词原文，无台词填空字符串",
      "visual_desc": "画面构图与视觉描述（60字内，供AI绘图使用，需含角色外貌关键词）",
      "bg_atmosphere": "背景与氛围（30字内）"
    }
  ]
}

严格要求：
1. 只输出 JSON，第一个字符必须是 {，最后一个字符必须是 }
2. 不要加任何前缀、说明或 markdown 标记
3. 情绪标签只用一个词
4. 台词保持原文
5. visual_desc 中必须包含角色外貌关键词

【剧本内容】
${script}`;
}

server.listen(PORT, () => {
  console.log(`\n✅ 分镜AI工具已启动（Groq · llama-3.3-70b）`);
  console.log(`👉 打开浏览器访问：http://localhost:${PORT}\n`);
});
