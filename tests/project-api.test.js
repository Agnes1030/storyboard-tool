const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const templateFile = path.join(rootDir, 'data', 'templates', 'default-project-template.json');

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

test('GET /api/project creates and serves the default project from an isolated data root', async () => {
  const port = 3101;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyboard-project-api-'));
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

    const response = await fetch(`http://127.0.0.1:${port}/api/project`);
    assert.equal(response.status, 200);

    const body = await response.json();
    const persisted = JSON.parse(fs.readFileSync(projectFile, 'utf8'));

    assert.deepEqual(body, persisted);
    assert.deepEqual(body, template);
    assert.equal(body.project.id, 'default-project');
    assert.ok(body.global && typeof body.global === 'object');
    assert.ok(Array.isArray(body.scenes));
    assert.ok(Array.isArray(body.history));
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
