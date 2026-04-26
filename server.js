const http = require('http');
const fs = require('fs');
const path = require('path');
const { createProjectPaths } = require('./app/core/project-model');
const { handleGetProject, handlePutProject, handlePostProjectSnapshot, handlePostProjectRollback } = require('./app/server/project-api');
const { handlePostAnalyze } = require('./app/server/ai-api');
const { handlePostWrite } = require('./app/server/script-api');

const browserAssetPaths = {
  '/app-state.js': path.join(__dirname, 'app', 'web', 'app-state.js'),
  '/scene-sidebar.js': path.join(__dirname, 'app', 'web', 'scene-sidebar.js'),
  '/scene-ui.js': path.join(__dirname, 'app', 'web', 'scene-ui.js'),
  '/scene-persistence.js': path.join(__dirname, 'app', 'web', 'scene-persistence.js'),
  '/project-history.js': path.join(__dirname, 'app', 'web', 'project-history.js'),
  '/storyboard-view.js': path.join(__dirname, 'app', 'web', 'storyboard-view.js'),
  '/project-view.js': path.join(__dirname, 'app', 'web', 'project-view.js'),
};

const PORT = Number(process.env.PORT || 3000);
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY;
const projectPaths = createProjectPaths(process.env.STORYBOARD_DATA_ROOT || path.join(__dirname, 'data'));

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

function callAnalyzeAi(messages, maxTokens, temperature) {
  if (process.env.CLAUDE_TEST_ANALYZE_RESPONSE) {
    return Promise.resolve(process.env.CLAUDE_TEST_ANALYZE_RESPONSE);
  }

  return callGroq(messages, maxTokens, temperature);
}

function callWriteAi(messages, maxTokens, temperature) {
  if (process.env.CLAUDE_TEST_WRITE_RESPONSE) {
    return Promise.resolve(process.env.CLAUDE_TEST_WRITE_RESPONSE);
  }

  return callGroq(messages, maxTokens, temperature);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
    handlePost(async (payload) => {
      await handlePostWrite(res, payload, { callAi: callWriteAi });
    });
    return;
  }

  // ── 分镜分析接口 ──
  if (req.method === 'POST' && req.url === '/api/analyze') {
    handlePost(async (payload) => {
      await handlePostAnalyze(res, payload, { callAi: callAnalyzeAi });
    });
    return;
  }

  // ── 项目持久化接口 ──
  if (req.method === 'GET' && req.url === '/api/project') {
    try {
      handleGetProject(res, projectPaths);
    } catch (err) {
      console.error('[project error]', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'PUT' && req.url === '/api/project') {
    handlePost(async (project) => {
      handlePutProject(res, projectPaths, project);
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/project/snapshot') {
    handlePost(async (payload) => {
      handlePostProjectSnapshot(res, projectPaths, payload);
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/project/rollback') {
    handlePost(async (payload) => {
      handlePostProjectRollback(res, projectPaths, payload);
    });
    return;
  }

  if (req.method === 'GET' && browserAssetPaths[req.url]) {
    fs.readFile(browserAssetPaths[req.url], (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
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

server.listen(PORT, () => {
  console.log(`\n✅ 分镜AI工具已启动（Groq · llama-3.3-70b）`);
  console.log(`👉 打开浏览器访问：http://localhost:${PORT}\n`);
});
