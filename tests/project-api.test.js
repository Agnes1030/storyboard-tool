const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const templateFile = path.join(rootDir, 'data', 'templates', 'default-project-template.json');
const { createProjectPaths } = require(path.join(rootDir, 'app', 'core', 'project-model.js'));
const { loadDefaultProjectTemplate, ensureDefaultProject } = require(path.join(rootDir, 'app', 'server', 'project-store.js'));
const {
  handleGetProject,
  handlePutProject,
  handlePostProjectSnapshot,
  handlePostProjectRollback,
} = require(path.join(rootDir, 'app', 'server', 'project-api.js'));
const {
  handlePostAnalyze,
} = require(path.join(rootDir, 'app', 'server', 'ai-api.js'));
const {
  createProjectSnapshot,
  rollbackProjectSnapshot,
} = require(path.join(rootDir, 'app', 'server', 'snapshot-service.js'));
const { createAppState } = require(path.join(rootDir, 'app', 'web', 'app-state.js'));

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // keep waiting for startup
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('server did not start in time');
}

test('project-model resolves default project paths under the configured data root', () => {
  const dataRoot = path.join('/tmp', 'storyboard-data-root');
  const paths = createProjectPaths(dataRoot);

  assert.equal(paths.dataRoot, dataRoot);
  assert.equal(paths.defaultProjectDir, path.join(dataRoot, 'projects', 'default-project'));
  assert.equal(paths.defaultProjectFile, path.join(dataRoot, 'projects', 'default-project', 'project.json'));
  assert.equal(paths.defaultProjectTemplateFile, path.join(dataRoot, 'templates', 'default-project-template.json'));
});

test('project-store loads template and creates default project when missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-store-'));
  const dataRoot = path.join(tempRoot, 'data');
  const paths = createProjectPaths(dataRoot);
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));

  fs.mkdirSync(path.dirname(paths.defaultProjectTemplateFile), { recursive: true });
  fs.writeFileSync(paths.defaultProjectTemplateFile, JSON.stringify(template, null, 2));

  try {
    const loadedTemplate = loadDefaultProjectTemplate(paths);
    const createdProject = ensureDefaultProject(paths);
    const persistedProject = JSON.parse(fs.readFileSync(paths.defaultProjectFile, 'utf8'));

    assert.deepEqual(loadedTemplate, template);
    assert.deepEqual(createdProject, template);
    assert.deepEqual(persistedProject, template);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('handleGetProject writes the default project response using project paths', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-handler-'));
  const dataRoot = path.join(tempRoot, 'data');
  const paths = createProjectPaths(dataRoot);
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const responseState = { statusCode: null, headers: null, body: null };
  const res = {
    writeHead(statusCode, headers) {
      responseState.statusCode = statusCode;
      responseState.headers = headers;
    },
    end(body) {
      responseState.body = body;
    },
  };

  fs.mkdirSync(path.dirname(paths.defaultProjectTemplateFile), { recursive: true });
  fs.writeFileSync(paths.defaultProjectTemplateFile, JSON.stringify(template, null, 2));

  try {
    handleGetProject(res, paths);

    assert.equal(responseState.statusCode, 200);
    assert.deepEqual(responseState.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(responseState.body), template);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(paths.defaultProjectFile, 'utf8')),
      template,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('handlePutProject persists JSON through the store and responds with the saved project', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-save-handler-'));
  const dataRoot = path.join(tempRoot, 'data');
  const paths = createProjectPaths(dataRoot);
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const savedProject = {
    ...template,
    project: {
      ...template.project,
      title: 'Updated project title',
    },
  };
  const responseState = { statusCode: null, headers: null, body: null };
  const res = {
    writeHead(statusCode, headers) {
      responseState.statusCode = statusCode;
      responseState.headers = headers;
    },
    end(body) {
      responseState.body = body;
    },
  };

  fs.mkdirSync(path.dirname(paths.defaultProjectTemplateFile), { recursive: true });
  fs.writeFileSync(paths.defaultProjectTemplateFile, JSON.stringify(template, null, 2));

  try {
    handlePutProject(res, paths, savedProject);

    assert.equal(responseState.statusCode, 200);
    assert.deepEqual(responseState.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(responseState.body), savedProject);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(paths.defaultProjectFile, 'utf8')),
      savedProject,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('createProjectSnapshot appends a labeled snapshot entry with cloned project data', () => {
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const project = JSON.parse(JSON.stringify(template));
  const originalLength = project.projectHistory.length;

  project.global.storyContext = 'Before snapshot';

  createProjectSnapshot(project, 'Manual save point');

  assert.equal(project.projectHistory.length, originalLength + 1);
  const snapshot = project.projectHistory.at(-1);
  assert.equal(snapshot.type, 'project');
  assert.equal(snapshot.label, 'Manual save point');
  assert.equal(typeof snapshot.createdAt, 'string');
  assert.deepEqual(snapshot.data.settings, project.settings);
  assert.deepEqual(snapshot.data.global, project.global);
  assert.deepEqual(snapshot.data.scenes, project.scenes);

  project.global.storyContext = 'Changed after snapshot';
  assert.equal(snapshot.data.global.storyContext, 'Before snapshot');
});

test('rollbackProjectSnapshot restores settings, global state, and scenes from snapshot data', () => {
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const project = JSON.parse(JSON.stringify(template));

  createProjectSnapshot(project, 'Restore point');
  const snapshotId = project.projectHistory.at(-1).id;

  project.settings = { currentSceneId: 'scene-2', currentTab: 'analyze', currentView: 'timeline' };
  project.global = { characters: [{ name: '新角色' }], storyContext: 'Mutated' };
  project.scenes = [{ id: 'scene-2', order: 2, title: 'Mutated scene', script: 'Changed', storyboard: { scene_title: 'Changed', total_shots: 1, shots: [] }, notes: 'Changed' }];

  rollbackProjectSnapshot(project, snapshotId);

  assert.deepEqual(project.settings, template.settings);
  assert.deepEqual(project.global, template.global);
  assert.deepEqual(project.scenes, template.scenes);
});

test('handlePostProjectSnapshot persists the updated project returned by snapshot-service', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-snapshot-handler-'));
  const dataRoot = path.join(tempRoot, 'data');
  const paths = createProjectPaths(dataRoot);
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const responseState = { statusCode: null, headers: null, body: null };
  const res = {
    writeHead(statusCode, headers) {
      responseState.statusCode = statusCode;
      responseState.headers = headers;
    },
    end(body) {
      responseState.body = body;
    },
  };

  fs.mkdirSync(path.dirname(paths.defaultProjectTemplateFile), { recursive: true });
  fs.writeFileSync(paths.defaultProjectTemplateFile, JSON.stringify(template, null, 2));

  try {
    handlePostProjectSnapshot(res, paths, { scope: 'project', label: 'Checkpoint' });
    const savedProject = JSON.parse(responseState.body);

    assert.equal(responseState.statusCode, 200);
    assert.deepEqual(responseState.headers, { 'Content-Type': 'application/json' });
    assert.equal(savedProject.projectHistory.at(-1).label, 'Checkpoint');
    assert.equal(savedProject.projectHistory.at(-1).type, 'project');
    assert.deepEqual(JSON.parse(fs.readFileSync(paths.defaultProjectFile, 'utf8')), savedProject);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('handlePostProjectRollback restores the saved project snapshot and persists it', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-rollback-handler-'));
  const dataRoot = path.join(tempRoot, 'data');
  const paths = createProjectPaths(dataRoot);
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const responseState = { statusCode: null, headers: null, body: null };
  const res = {
    writeHead(statusCode, headers) {
      responseState.statusCode = statusCode;
      responseState.headers = headers;
    },
    end(body) {
      responseState.body = body;
    },
  };

  fs.mkdirSync(path.dirname(paths.defaultProjectTemplateFile), { recursive: true });
  fs.writeFileSync(paths.defaultProjectTemplateFile, JSON.stringify(template, null, 2));

  try {
    handlePostProjectSnapshot(res, paths, { scope: 'project', label: 'Before rollback' });
    const snapshottedProject = JSON.parse(responseState.body);
    const snapshotId = snapshottedProject.projectHistory.at(-1).id;
    const mutatedProject = {
      ...snapshottedProject,
      global: {
        ...snapshottedProject.global,
        storyContext: 'Mutated after snapshot',
      },
      scenes: [
        {
          ...snapshottedProject.scenes[0],
          title: 'Mutated scene title',
        },
      ],
    };

    fs.writeFileSync(paths.defaultProjectFile, JSON.stringify(mutatedProject, null, 2));

    handlePostProjectRollback(res, paths, { scope: 'project', historyId: snapshotId });
    const rolledBackProject = JSON.parse(responseState.body);

    assert.equal(responseState.statusCode, 200);
    assert.deepEqual(responseState.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(responseState.body), rolledBackProject);
    assert.deepEqual(rolledBackProject.global, snapshottedProject.global);
    assert.deepEqual(rolledBackProject.scenes, snapshottedProject.scenes);
    assert.deepEqual(JSON.parse(fs.readFileSync(paths.defaultProjectFile, 'utf8')), rolledBackProject);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('GET /api/project returns scene data that can seed frontend scene state', async () => {
  const port = 3112;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-get-seed-'));
  const dataRoot = path.join(tempRoot, 'data');
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const seededProject = {
    ...template,
    settings: {
      ...template.settings,
      currentSceneId: 'scene-2',
    },
    global: {
      ...template.global,
      nextSceneId: 4,
    },
    scenes: [
      {
        id: 'scene-1',
        order: 1,
        title: '开场',
        script: '第一场内容',
        storyboard: { scene_title: '开场', total_shots: 0, shots: [] },
        notes: '',
      },
      {
        id: 'scene-2',
        order: 2,
        title: '转折',
        script: '第二场内容',
        storyboard: { scene_title: '转折', total_shots: 0, shots: [] },
        notes: '',
      },
    ],
  };

  fs.mkdirSync(path.join(dataRoot, 'templates'), { recursive: true });
  fs.mkdirSync(path.join(dataRoot, 'projects', 'default-project'), { recursive: true });
  fs.writeFileSync(path.join(dataRoot, 'templates', 'default-project-template.json'), JSON.stringify(template, null, 2));
  fs.writeFileSync(path.join(dataRoot, 'projects', 'default-project', 'project.json'), JSON.stringify(seededProject, null, 2));

  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: process.env.GROQ_API_KEY || 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const response = await fetch(`http://127.0.0.1:${port}/api/project`);

    assert.equal(response.status, 200);
    const project = await response.json();
    const appState = createAppState();
    appState.setProject(project);

    assert.deepEqual(appState.getState().scenes, seededProject.scenes);
    assert.equal(appState.getState().currentSceneId, 'scene-2');
    assert.deepEqual(appState.getCurrentScene(), seededProject.scenes[1]);
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('PUT /api/project persists the request body to the isolated default project file', async () => {
  const port = 3102;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-put-api-'));
  const dataRoot = path.join(tempRoot, 'data');
  const projectFile = path.join(dataRoot, 'projects', 'default-project', 'project.json');
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));
  const savedProject = {
    ...template,
    project: {
      ...template.project,
      title: 'Saved via PUT',
    },
  };

  fs.mkdirSync(path.join(dataRoot, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(dataRoot, 'templates', 'default-project-template.json'), JSON.stringify(template, null, 2));

  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: process.env.GROQ_API_KEY || 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const response = await fetch(`http://127.0.0.1:${port}/api/project`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedProject),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), savedProject);
    assert.deepEqual(JSON.parse(fs.readFileSync(projectFile, 'utf8')), savedProject);
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('POST /api/project/snapshot persists a project snapshot through delegated handlers', async () => {
  const port = 3103;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-snapshot-api-'));
  const dataRoot = path.join(tempRoot, 'data');
  const projectFile = path.join(dataRoot, 'projects', 'default-project', 'project.json');
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));

  fs.mkdirSync(path.join(dataRoot, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(dataRoot, 'templates', 'default-project-template.json'), JSON.stringify(template, null, 2));

  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: process.env.GROQ_API_KEY || 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const response = await fetch(`http://127.0.0.1:${port}/api/project/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'project', label: 'Route snapshot' }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.projectHistory.at(-1).type, 'project');
    assert.equal(body.projectHistory.at(-1).label, 'Route snapshot');
    assert.deepEqual(JSON.parse(fs.readFileSync(projectFile, 'utf8')), body);
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('POST /api/project/rollback restores a previously snapshotted project through delegated handlers', async () => {
  const port = 3104;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-rollback-api-'));
  const dataRoot = path.join(tempRoot, 'data');
  const projectFile = path.join(dataRoot, 'projects', 'default-project', 'project.json');
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));

  fs.mkdirSync(path.join(dataRoot, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(dataRoot, 'templates', 'default-project-template.json'), JSON.stringify(template, null, 2));

  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: process.env.GROQ_API_KEY || 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const snapshotResponse = await fetch(`http://127.0.0.1:${port}/api/project/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'project', label: 'Before route rollback' }),
    });
    const snapshottedProject = await snapshotResponse.json();
    const snapshotId = snapshottedProject.projectHistory.at(-1).id;

    const mutatedProject = {
      ...snapshottedProject,
      global: {
        ...snapshottedProject.global,
        storyContext: 'Mutated route state',
      },
      scenes: [
        {
          ...snapshottedProject.scenes[0],
          title: 'Mutated route scene',
        },
      ],
    };

    fs.writeFileSync(projectFile, JSON.stringify(mutatedProject, null, 2));

    const rollbackResponse = await fetch(`http://127.0.0.1:${port}/api/project/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'project', historyId: snapshotId }),
    });

    assert.equal(rollbackResponse.status, 200);
    const rolledBackProject = await rollbackResponse.json();

    assert.deepEqual(rolledBackProject.global, snapshottedProject.global);
    assert.deepEqual(rolledBackProject.scenes, snapshottedProject.scenes);
    assert.deepEqual(JSON.parse(fs.readFileSync(projectFile, 'utf8')), rolledBackProject);
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('GET /api/project creates and serves the default project from an isolated data root', async () => {
  const port = 3101;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-api-'));
  const dataRoot = path.join(tempRoot, 'data');
  const projectDir = path.join(dataRoot, 'projects', 'default-project');
  const projectFile = path.join(projectDir, 'project.json');
  const legacyProjectFile = path.join(dataRoot, 'project.json');
  const template = JSON.parse(fs.readFileSync(templateFile, 'utf8'));

  fs.mkdirSync(path.join(dataRoot, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(dataRoot, 'templates', 'default-project-template.json'), JSON.stringify(template, null, 2));

  const server = spawn(process.execPath, ['server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      GROQ_API_KEY: process.env.GROQ_API_KEY || 'test-key',
      STORYBOARD_DATA_ROOT: dataRoot,
      PORT: String(port),
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(`http://127.0.0.1:${port}/`);

    const response = await fetch(`http://127.0.0.1:${port}/api/project`);
    assert.equal(response.status, 200);

    const body = await response.json();
    const persisted = JSON.parse(fs.readFileSync(projectFile, 'utf8'));

    assert.ok(fs.existsSync(projectDir));
    assert.ok(fs.existsSync(projectFile));
    assert.equal(fs.existsSync(legacyProjectFile), false);
    assert.deepEqual(body, persisted);
    assert.deepEqual(body, template);
    assert.equal(body.project.id, 'default-project');
    assert.ok(body.global && typeof body.global === 'object');
    assert.ok(Array.isArray(body.scenes));
    assert.ok(Array.isArray(body.projectHistory));
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
