const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const storyboardView = require(path.join(rootDir, 'app', 'web', 'storyboard-view.js'));

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

test('buildDrawingPrompt composes drawing prompt from shot fields and style', () => {
  const prompt = storyboardView.buildDrawingPrompt(
    {
      visual_desc: '雨夜街头追逐',
      bg_atmosphere: '霓虹反光，潮湿路面',
      shot_type: '中景',
    },
    '赛博朋克'
  );

  assert.equal(
    prompt,
    '雨夜街头追逐，霓虹反光，潮湿路面，中景构图，赛博朋克，高质量，细节丰富，漫画分镜'
  );
});

test('buildDrawingPrompt falls back to default style label when style is missing', () => {
  const prompt = storyboardView.buildDrawingPrompt(
    {
      visual_desc: '废弃车站',
    }
  );

  assert.equal(prompt, '废弃车站，漫画风格，高质量，细节丰富，漫画分镜');
});

test('getEmoColor maps known emotions and falls back to neutral gray', () => {
  assert.equal(storyboardView.getEmoColor('紧张不安'), '#dc2626');
  assert.equal(storyboardView.getEmoColor('轻松愉快'), '#1D9E75');
  assert.equal(storyboardView.getEmoColor('未知情绪'), '#9ca3af');
});

test('getEmoIntensity maps known emotions and falls back to baseline intensity', () => {
  assert.equal(storyboardView.getEmoIntensity('高潮时刻'), 5);
  assert.equal(storyboardView.getEmoIntensity('温馨片刻'), 2);
  assert.equal(storyboardView.getEmoIntensity('未知情绪'), 1);
});

test('GET /storyboard-view.js serves the browser storyboard helper asset', async () => {
  const port = 3108;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-view-asset-'));
  const dataRoot = path.join(tempRoot, 'data');
  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const assetResponse = await fetch(`http://127.0.0.1:${port}/storyboard-view.js`);
    const assetScript = await assetResponse.text();
    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    const html = await pageResponse.text();

    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get('content-type') || '', /application\/javascript/);
    assert.match(assetScript, /window\.StoryboardView\s*=\s*storyboardViewApi/);
    assert.match(assetScript, /buildDrawingPrompt/);
    assert.match(assetScript, /getEmoColor/);
    assert.match(assetScript, /getEmoIntensity/);

    assert.equal(pageResponse.status, 200);
    assert.match(html, /<script src="\/storyboard-view\.js"><\/script>/);
    assert.match(html, /window\.StoryboardView/);
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
