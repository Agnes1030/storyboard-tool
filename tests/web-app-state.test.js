const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const { createAppState } = require(path.join(rootDir, 'app', 'web', 'app-state.js'));

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

test('GET /scene-persistence.js serves the browser scene persistence helper asset', async () => {
  const port = 3113;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-scene-persistence-asset-'));
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

    const response = await fetch(`http://127.0.0.1:${port}/scene-persistence.js`);
    const script = await response.text();
    const pageResponse = await fetch(`http://127.0.0.1:${port}/`);
    const html = await pageResponse.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/javascript/);
    assert.match(script, /window\.ScenePersistence\s*=\s*scenePersistenceApi/);
    assert.match(script, /loadProject/);
    assert.match(script, /saveProject/);

    assert.equal(pageResponse.status, 200);
    assert.match(html, /<script src="\/scene-persistence\.js"><\/script>/);
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('createAppState returns the default frontend state shape', () => {
  const appState = createAppState();

  assert.deepEqual(appState.getState(), {
    project: null,
    scenes: [],
    currentSceneId: null,
    characters: [],
    nextId: 1,
    currentMode: 'generate',
    currentGenre: '现代都市',
    currentTone: '紧张悬疑',
    currentPolishDir: '提升对白张力，加强画面感',
    currentView: 'table',
    lastShots: [],
    lastStyle: '',
    lastSceneTitle: '',
  });
});

test('createAppState returns a defensive state snapshot', () => {
  const appState = createAppState();
  const snapshot = appState.getState();

  snapshot.currentMode = 'polish';
  snapshot.characters.push({ id: 99, name: '外部修改' });

  assert.equal(appState.getState().currentMode, 'generate');
  assert.deepEqual(appState.getState().characters, []);
});

test('createAppState clones write inputs before storing them', () => {
  const appState = createAppState();
  const characters = [{ id: 1, name: '林夏' }];
  const shots = [{ shot_num: 1, visual_desc: '雨夜街头' }];

  appState.setCharacters(characters);
  appState.setStoryboardResult({ shots, style: '赛博朋克', sceneTitle: '雨夜追逐' });

  characters.push({ id: 2, name: '周沉' });
  shots[0].visual_desc = '被外部改写';

  assert.deepEqual(appState.getState().characters, [{ id: 1, name: '林夏' }]);
  assert.deepEqual(appState.getState().lastShots, [{ shot_num: 1, visual_desc: '雨夜街头' }]);
});

test('createAppState updates characters and nextId', () => {
  const appState = createAppState();
  const characters = [{ id: 1, name: '林夏' }];

  appState.setCharacters(characters);
  appState.setNextId(2);

  assert.deepEqual(appState.getState().characters, characters);
  assert.equal(appState.getState().nextId, 2);
});

test('createAppState populates project, scenes, and currentSceneId together', () => {
  const appState = createAppState();
  const project = {
    id: 'project-1',
    settings: {
      currentSceneId: 'scene-2',
    },
    scenes: [
      { id: 'scene-1', title: '开场' },
      { id: 'scene-2', title: '转折' },
    ],
  };

  appState.setProject(project);

  assert.deepEqual(appState.getState().project, project);
  assert.deepEqual(appState.getState().scenes, project.scenes);
  assert.equal(appState.getState().currentSceneId, 'scene-2');
  assert.deepEqual(appState.getCurrentScene(), project.scenes[1]);
});

test('createAppState falls back to the first scene when project selection is missing or invalid', () => {
  const appState = createAppState();
  const project = {
    id: 'project-2',
    settings: {
      currentSceneId: 'scene-99',
    },
    scenes: [
      { id: 'scene-1', title: '开场' },
      { id: 'scene-2', title: '转折' },
    ],
  };

  appState.setProject(project);

  assert.equal(appState.getState().currentSceneId, 'scene-1');
  assert.deepEqual(appState.getCurrentScene(), project.scenes[0]);
});

test('createAppState setScenes and setCurrentSceneId update project scene state', () => {
  const appState = createAppState();
  const scenes = [
    { id: 'scene-1', title: '开场' },
    { id: 'scene-2', title: '转折' },
  ];

  appState.setScenes(scenes);
  appState.setCurrentSceneId('scene-2');

  assert.deepEqual(appState.getState().scenes, scenes);
  assert.equal(appState.getState().currentSceneId, 'scene-2');
});

test('createAppState getCurrentScene returns the selected scene', () => {
  const appState = createAppState();
  const scenes = [
    { id: 'scene-1', title: '开场' },
    { id: 'scene-2', title: '转折' },
  ];

  appState.setScenes(scenes);
  appState.setCurrentSceneId('scene-2');

  assert.deepEqual(appState.getCurrentScene(), scenes[1]);
});

test('createAppState patches current view and write-mode fields', () => {
  const appState = createAppState();

  appState.patch({
    currentView: 'card',
    currentMode: 'polish',
    currentGenre: '古风玄幻',
    currentTone: '温情治愈',
    currentPolishDir: '增强人物性格反差',
  });

  assert.equal(appState.getState().currentView, 'card');
  assert.equal(appState.getState().currentMode, 'polish');
  assert.equal(appState.getState().currentGenre, '古风玄幻');
  assert.equal(appState.getState().currentTone, '温情治愈');
  assert.equal(appState.getState().currentPolishDir, '增强人物性格反差');
});

test('createAppState stores the latest storyboard result fields', () => {
  const appState = createAppState();
  const shots = [{ shot_num: 1, visual_desc: '雨夜街头' }];

  appState.setStoryboardResult({
    shots,
    style: '赛博朋克',
    sceneTitle: '雨夜追逐',
  });

  assert.deepEqual(appState.getState().lastShots, shots);
  assert.equal(appState.getState().lastStyle, '赛博朋克');
  assert.equal(appState.getState().lastSceneTitle, '雨夜追逐');
});

test('GET /app-state.js serves the browser state helper asset', async () => {
  const port = 3107;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-app-state-asset-'));
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

    const response = await fetch(`http://127.0.0.1:${port}/app-state.js`);
    const script = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/javascript/);
    assert.match(script, /window\.AppState\s*=\s*appStateApi/);
    assert.match(script, /createAppState/);
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
