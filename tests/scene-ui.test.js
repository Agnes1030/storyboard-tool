const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const sceneUi = require(path.join(rootDir, 'app', 'web', 'scene-ui.js'));

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

function createProject(overrides = {}) {
  return {
    version: 1,
    project: {
      id: 'default-project',
      title: '默认漫剧项目',
    },
    settings: {
      currentSceneId: 'scene-2',
      ...overrides.settings,
    },
    global: {
      nextSceneId: 3,
      ...overrides.global,
    },
    scenes: overrides.scenes || [
      {
        id: 'scene-1',
        order: 1,
        title: '第一场',
      },
      {
        id: 'scene-2',
        order: 2,
        title: '第二场',
      },
    ],
    ...overrides,
  };
}

test('createSceneListMarkup renders ordered scene buttons and active state', () => {
  const markup = sceneUi.createSceneListMarkup({
    scenes: createProject().scenes,
    currentSceneId: 'scene-2',
  });

  assert.match(markup, /data-scene-id="scene-1"/);
  assert.match(markup, /data-scene-id="scene-2"/);
  assert.match(markup, /第一场/);
  assert.match(markup, /第二场/);
  assert.match(markup, /scene-item is-active/);
});

test('createScenePanelViewModel shapes scene panel data from app-state and scene-sidebar helpers', () => {
  const project = createProject();
  const viewModel = sceneUi.createScenePanelViewModel(project, 'scene-2');

  assert.deepEqual(viewModel, {
    currentSceneId: 'scene-2',
    currentSceneTitle: '第二场',
    scenes: [
      { id: 'scene-1', title: '第一场', order: 1, isActive: false, label: '场景 1' },
      { id: 'scene-2', title: '第二场', order: 2, isActive: true, label: '场景 2' },
    ],
  });
});

test('GET /scene-ui.js serves the browser scene UI helper asset and index includes scene list wiring', async () => {
  const port = 3111;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-scene-ui-asset-'));
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

    const assetResponse = await fetch(`http://127.0.0.1:${port}/scene-ui.js`);
    const assetScript = await assetResponse.text();
    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    const html = await pageResponse.text();

    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get('content-type') || '', /application\/javascript/);
    assert.match(assetScript, /window\.SceneUi\s*=\s*sceneUiApi/);
    assert.match(assetScript, /createScenePanelViewModel/);
    assert.match(assetScript, /createSceneListMarkup/);

    assert.equal(pageResponse.status, 200);
    assert.match(html, /<script src="\/scene-ui\.js"><\/script>/);
    assert.match(html, /id="scene-panel"/);
    assert.match(html, /id="scene-list"/);
    assert.match(html, /创建场景/);
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
