const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const {
  buildGeneratePrompt,
  buildContinuePrompt,
  buildPolishPrompt,
  buildOutlinePrompt,
  buildWritePrompt,
} = require(path.join(rootDir, 'app', 'core', 'script-model.js'));
const { handlePostWrite } = require(path.join(rootDir, 'app', 'server', 'script-api.js'));

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

test('buildGeneratePrompt includes defaults and character formatting', () => {
  const prompt = buildGeneratePrompt({
    genre: '',
    theme: '身份错位',
    tone: '',
    scenes: 3,
    characters: [
      { name: '林夏', role: '主角', appearance: '黑色短发' },
      { name: '周沉', role: '对手' },
    ],
  });

  assert.match(prompt, /【类型】现代都市/);
  assert.match(prompt, /【主题\/核心冲突】身份错位/);
  assert.match(prompt, /【基调】紧张悬疑/);
  assert.match(prompt, /【场数】3 场/);
  assert.match(prompt, /主要角色：林夏（主角，黑色短发）、周沉（对手，外貌未设定）/);
});

test('buildWritePrompt delegates continue, polish, and outline prompt construction', () => {
  const continuePrompt = buildWritePrompt({ mode: 'continue', existingScript: '【第1场】旧内容' });
  const polishPrompt = buildWritePrompt({ mode: 'polish', existingScript: '原稿', instruction: '增强反转' });
  const outlinePrompt = buildWritePrompt({
    mode: 'outline',
    genre: '古风悬疑',
    theme: '灭门真相',
    tone: '压抑',
    scenes: 6,
    characters: [{ name: '沈砚', role: '查案人' }],
  });

  assert.match(continuePrompt, /请根据已有剧本，续写下一场内容/);
  assert.match(continuePrompt, /【已有剧本】\n【第1场】旧内容/);

  assert.match(polishPrompt, /请对以下剧本进行润色优化/);
  assert.match(polishPrompt, /【优化要求】增强反转/);

  assert.match(outlinePrompt, /请根据以下信息，创作一个剧本大纲/);
  assert.match(outlinePrompt, /【类型】古风悬疑/);
  assert.match(outlinePrompt, /【角色】沈砚（查案人）/);
  assert.match(outlinePrompt, /共6场/);
});

test('handlePostWrite builds the prompt, calls injected AI client, and returns legacy response shape', async () => {
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

  await handlePostWrite(
    res,
    {
      mode: 'polish',
      existingScript: '初稿内容',
      instruction: '加快节奏',
    },
    {
      buildPrompt: (payload) => {
        calls.push({ type: 'buildPrompt', payload });
        return 'PROMPT:加快节奏';
      },
      callAi: async (messages, maxTokens, temperature) => {
        calls.push({ type: 'callAi', messages, maxTokens, temperature });
        return '润色后剧本';
      },
    },
  );

  assert.deepEqual(calls, [
    {
      type: 'buildPrompt',
      payload: {
        mode: 'polish',
        existingScript: '初稿内容',
        instruction: '加快节奏',
      },
    },
    {
      type: 'callAi',
      messages: [{ role: 'user', content: 'PROMPT:加快节奏' }],
      maxTokens: 2000,
      temperature: 0.8,
    },
  ]);
  assert.equal(resState.statusCode, 200);
  assert.deepEqual(resState.headers, { 'Content-Type': 'application/json' });
  assert.deepEqual(JSON.parse(resState.body), { text: '润色后剧本' });
});

test('POST /api/write preserves legacy response shape through server delegation', async () => {
  const port = 3106;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-write-api-'));
  const dataRoot = path.join(tempRoot, 'data');
  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
      CLAUDE_TEST_WRITE_RESPONSE: '续写后的剧本正文',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const response = await fetch(`http://127.0.0.1:${port}/api/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'continue',
        existingScript: '【第1场】雨夜追逐。',
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: '续写后的剧本正文' });
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
