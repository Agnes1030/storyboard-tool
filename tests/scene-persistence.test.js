const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const scenePersistence = require(path.join(rootDir, 'app', 'web', 'scene-persistence.js'));
const projectHistory = require(path.join(rootDir, 'app', 'web', 'project-history.js'));

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

test('loadProject fetches the current project from the project API', async () => {
  const requests = [];
  const expectedProject = {
    settings: { currentSceneId: 'scene-2' },
    scenes: [{ id: 'scene-2', title: '转折' }],
  };

  const project = await scenePersistence.loadProject({
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return expectedProject;
        },
      };
    },
  });

  assert.deepEqual(project, expectedProject);
  assert.deepEqual(requests, [{ url: '/api/project', options: {} }]);
});

test('saveProject PUTs the full project payload to the project API', async () => {
  const requests = [];
  const projectPayload = {
    settings: { currentSceneId: 'scene-3' },
    global: { nextSceneId: 4 },
    scenes: [{ id: 'scene-3', title: '追逐' }],
  };

  const savedProject = await scenePersistence.saveProject(projectPayload, {
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return projectPayload;
        },
      };
    },
  });

  assert.deepEqual(savedProject, projectPayload);
  assert.deepEqual(requests, [{
    url: '/api/project',
    options: {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectPayload),
    },
  }]);
});

test('createProjectSnapshot and rollbackProjectSnapshot POST to the project history API routes', async () => {
  const requests = [];
  const snapshotProject = {
    settings: { currentSceneId: 'scene-2' },
    scenes: [{ id: 'scene-2', title: '转折' }],
    projectHistory: [
      { id: 'history-project-1', type: 'project', label: '项目快照 1' },
      { id: 'history-scene-2', type: 'scene', sceneId: 'scene-2', label: '场景快照 1' },
    ],
  };
  const rolledBackProject = {
    settings: { currentSceneId: 'scene-2' },
    scenes: [{ id: 'scene-2', title: '回退后' }],
    projectHistory: snapshotProject.projectHistory,
  };

  const snapped = await projectHistory.createProjectSnapshot({
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return snapshotProject;
        },
      };
    },
  });

  const rolledBack = await projectHistory.rollbackProjectSnapshot('history-project-1', {
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return rolledBackProject;
        },
      };
    },
  });

  assert.deepEqual(snapped, snapshotProject);
  assert.deepEqual(rolledBack, rolledBackProject);
  assert.deepEqual(requests, [
    {
      url: '/api/project/snapshot',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'project', label: '项目快照' }),
      },
    },
    {
      url: '/api/project/rollback',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'project', historyId: 'history-project-1' }),
      },
    },
  ]);
});

test('createSceneSnapshot and rollbackSceneSnapshot POST scene-scoped project history requests', async () => {
  const requests = [];
  const snapshotProject = {
    settings: { currentSceneId: 'scene-2' },
    scenes: [{ id: 'scene-2', title: '转折' }],
    projectHistory: [
      { id: 'history-scene-2', type: 'scene', sceneId: 'scene-2', label: '场景快照 1' },
    ],
  };

  await projectHistory.createSceneSnapshot('scene-2', {
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return snapshotProject;
        },
      };
    },
  });

  await projectHistory.rollbackSceneSnapshot('scene-2', 'history-scene-2', {
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return snapshotProject;
        },
      };
    },
  });

  assert.deepEqual(requests, [
    {
      url: '/api/project/snapshot',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'scene', sceneId: 'scene-2', label: '场景快照' }),
      },
    },
    {
      url: '/api/project/rollback',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'scene', sceneId: 'scene-2', historyId: 'history-scene-2' }),
      },
    },
  ]);
});

test('page wiring includes scene persistence bootstrap and snapshot/rollback controls', async () => {
  const port = 3114;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-scene-persistence-page-'));
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

    const response = await fetch(`http://127.0.0.1:${port}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<script src="\/scene-persistence\.js"><\/script>/);
    assert.match(html, /<script src="\/project-history\.js"><\/script>/);
    assert.match(html, /id="scene-panel"/);
    assert.match(html, /id="scene-list"/);
    assert.match(html, /项目快照/);
    assert.match(html, /项目回退/);
    assert.match(html, /场景快照/);
    assert.match(html, /场景回退/);
    assert.match(html, /await loadProjectState\(\);/);
    assert.match(html, /renderScenePanel\(\);/);
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
