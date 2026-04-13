const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const sceneSidebar = require(path.join(rootDir, 'app', 'web', 'scene-sidebar.js'));

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
        id: 'scene-2',
        order: 2,
        title: '第二场',
        script: '第二场内容',
        storyboard: { scene_title: '第二场', total_shots: 0, shots: [] },
        notes: '',
      },
      {
        id: 'scene-1',
        order: 1,
        title: '第一场',
        script: '第一场内容',
        storyboard: { scene_title: '第一场', total_shots: 0, shots: [] },
        notes: '',
      },
    ],
    ...overrides,
  };
}

test('listScenes returns scenes sorted by order', () => {
  const project = createProject();

  assert.deepEqual(sceneSidebar.listScenes(project).map((scene) => scene.id), ['scene-1', 'scene-2']);
});

test('getCurrentScene returns the selected scene from settings.currentSceneId', () => {
  const project = createProject();

  assert.equal(sceneSidebar.getCurrentScene(project)?.id, 'scene-2');
});

test('createScene appends a new scene, advances nextSceneId, and selects it', () => {
  const project = createProject();

  const updatedProject = sceneSidebar.createScene(project, {
    title: '新场景',
    script: '新场景内容',
    notes: '待补充',
  });

  assert.equal(updatedProject.scenes.length, 3);
  assert.deepEqual(updatedProject.scenes.at(-1), {
    id: 'scene-3',
    order: 3,
    title: '新场景',
    script: '新场景内容',
    storyboard: {
      scene_title: '新场景',
      total_shots: 0,
      shots: [],
    },
    notes: '待补充',
  });
  assert.equal(updatedProject.global.nextSceneId, 4);
  assert.equal(updatedProject.settings.currentSceneId, 'scene-3');
  assert.equal(project.scenes.length, 2);
  assert.equal(project.global.nextSceneId, 3);
  assert.equal(project.settings.currentSceneId, 'scene-2');
});

test('renameScene updates the matching scene title and storyboard title', () => {
  const project = createProject();

  const updatedProject = sceneSidebar.renameScene(project, 'scene-1', '雨夜重逢');

  assert.equal(updatedProject.scenes.find((scene) => scene.id === 'scene-1')?.title, '雨夜重逢');
  assert.equal(updatedProject.scenes.find((scene) => scene.id === 'scene-1')?.storyboard.scene_title, '雨夜重逢');
  assert.equal(project.scenes.find((scene) => scene.id === 'scene-1')?.title, '第一场');
});

test('selectScene switches to an existing scene and rejects a missing scene id', () => {
  const project = createProject();

  const updatedProject = sceneSidebar.selectScene(project, 'scene-1');

  assert.equal(updatedProject.settings.currentSceneId, 'scene-1');
  assert.throws(() => sceneSidebar.selectScene(project, 'scene-99'), /Scene not found: scene-99/);
});

test('scene operations compose into a project payload suitable for PUT persistence', () => {
  const project = createProject({
    settings: { currentSceneId: 'scene-1' },
    global: { nextSceneId: 3 },
    scenes: [
      {
        id: 'scene-1',
        order: 1,
        title: '第一场',
        script: '第一场内容',
        storyboard: { scene_title: '第一场', total_shots: 0, shots: [] },
        notes: '',
      },
      {
        id: 'scene-2',
        order: 2,
        title: '第二场',
        script: '第二场内容',
        storyboard: { scene_title: '第二场', total_shots: 0, shots: [] },
        notes: '',
      },
    ],
  });

  const createdProject = sceneSidebar.createScene(project, { title: '追逐' });
  const renamedProject = sceneSidebar.renameScene(createdProject, 'scene-2', '雨夜重逢');
  const selectedProject = sceneSidebar.selectScene(renamedProject, 'scene-2');

  assert.deepEqual(selectedProject, {
    version: 1,
    project: {
      id: 'default-project',
      title: '默认漫剧项目',
    },
    settings: {
      currentSceneId: 'scene-2',
    },
    global: {
      nextSceneId: 4,
    },
    scenes: [
      {
        id: 'scene-1',
        order: 1,
        title: '第一场',
        script: '第一场内容',
        storyboard: { scene_title: '第一场', total_shots: 0, shots: [] },
        notes: '',
      },
      {
        id: 'scene-2',
        order: 2,
        title: '雨夜重逢',
        script: '第二场内容',
        storyboard: { scene_title: '雨夜重逢', total_shots: 0, shots: [] },
        notes: '',
      },
      {
        id: 'scene-3',
        order: 3,
        title: '追逐',
        script: '',
        storyboard: { scene_title: '追逐', total_shots: 0, shots: [] },
        notes: '',
      },
    ],
  });
});

test('GET /scene-sidebar.js serves the browser scene helper asset and index includes it', async () => {
  const port = 3110;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-scene-sidebar-asset-'));
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

    const assetResponse = await fetch(`http://127.0.0.1:${port}/scene-sidebar.js`);
    const assetScript = await assetResponse.text();
    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    const html = await pageResponse.text();

    assert.equal(assetResponse.status, 200);
    assert.match(assetResponse.headers.get('content-type') || '', /application\/javascript/);
    assert.match(assetScript, /window\.SceneSidebar\s*=\s*sceneSidebarApi/);
    assert.match(assetScript, /listScenes/);
    assert.match(assetScript, /getCurrentScene/);
    assert.match(assetScript, /createScene/);
    assert.match(assetScript, /renameScene/);
    assert.match(assetScript, /selectScene/);

    assert.equal(pageResponse.status, 200);
    assert.match(html, /<script src="\/scene-sidebar\.js"><\/script>/);
    assert.match(html, /window\.SceneSidebar/);
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
