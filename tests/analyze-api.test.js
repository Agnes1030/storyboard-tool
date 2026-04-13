const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const { buildStoryboardPrompt } = require(path.join(rootDir, 'app', 'core', 'storyboard-model.js'));
const { handlePostAnalyze } = require(path.join(rootDir, 'app', 'server', 'ai-api.js'));

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      // server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Server did not become ready for ${url}`);
}

test('buildStoryboardPrompt includes script, style, shot preference, and character details', () => {
  const prompt = buildStoryboardPrompt(
    '主角推门而入。',
    '日系少年漫',
    '偏重近景特写',
    [
      {
        name: '林夏',
        age: 18,
        gender: '女',
        appearance: '黑色短发，校服外套',
        personality: '冷静倔强',
        signature: '左眼下有泪痣',
      },
    ],
  );

  assert.match(prompt, /【画风要求】日系少年漫/);
  assert.match(prompt, /【景别偏好】偏重近景特写/);
  assert.match(prompt, /▸ 林夏（18岁，女）/);
  assert.match(prompt, /外貌：黑色短发，校服外套/);
  assert.match(prompt, /标志性特征：左眼下有泪痣/);
  assert.match(prompt, /【剧本内容】\n主角推门而入。/);
});

test('handlePostAnalyze builds the storyboard prompt, calls injected AI client, strips markdown fences, and returns legacy response shape', async () => {
  const calls = [];
  const resState = { statusCode: null, headers: null, body: null };
  const res = {
    writeHead(statusCode, headers) {
      resState.statusCode = statusCode;
      resState.headers = headers;
    },
    end(body) {
      resState.body = body;
    },
  };

  await handlePostAnalyze(
    res,
    {
      script: '阿木盯着门口。',
      style: '赛博朋克',
      shotPref: '均衡分配',
      characters: [{ name: '阿木', appearance: '银发风衣' }],
    },
    {
      buildPrompt: (...args) => {
        calls.push({ type: 'buildPrompt', args });
        return 'PROMPT:阿木盯着门口。';
      },
      callAi: async (messages, maxTokens, temperature) => {
        calls.push({ type: 'callAi', messages, maxTokens, temperature });
        return '```json\n{"scene_title":"夜巷","total_shots":1,"shots":[]}\n```';
      },
    },
  );

  assert.deepEqual(calls, [
    {
      type: 'buildPrompt',
      args: ['阿木盯着门口。', '赛博朋克', '均衡分配', [{ name: '阿木', appearance: '银发风衣' }]],
    },
    {
      type: 'callAi',
      messages: [{ role: 'user', content: 'PROMPT:阿木盯着门口。' }],
      maxTokens: 2000,
      temperature: 0.3,
    },
  ]);
  assert.equal(resState.statusCode, 200);
  assert.deepEqual(resState.headers, { 'Content-Type': 'application/json' });
  assert.deepEqual(JSON.parse(resState.body), {
    content: [
      {
        type: 'text',
        text: '{"scene_title":"夜巷","total_shots":1,"shots":[]}',
      },
    ],
  });
});

test('POST /api/analyze preserves legacy response shape through server delegation', async () => {
  const port = 3105;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-analyze-api-'));
  const dataRoot = path.join(tempRoot, 'data');
  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
      CLAUDE_TEST_ANALYZE_RESPONSE: '```json\n{"scene_title":"代理测试","total_shots":3,"shots":[]}\n```',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const response = await fetch(`http://127.0.0.1:${port}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: '夜色里，角色回头。',
        style: '写实风格',
        shotPref: '偏重全景远景',
        characters: [{ name: '周沉', appearance: '长风衣' }],
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      content: [
        {
          type: 'text',
          text: '{"scene_title":"代理测试","total_shots":3,"shots":[]}',
        },
      ],
    });
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
