const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

const requiredDirectories = [
  '.claude/plans',
  '.claude/memory',
  '.claude/skills',
  '.claude/context',
  'app/core',
  'app/server',
  'app/web',
  'app/shared',
  'data/projects',
  'data/templates',
  'data/presets',
  'data/exports',
  'docs/plans',
];

const requiredFiles = [
  '.claude/context/project-schema.md',
  '.claude/context/storyboard-rules.md',
  'data/templates/default-project-template.json',
  'data/presets/visual-styles.json',
  'data/presets/shot-presets.json',
  '.claude/memory/MEMORY.md',
  '.claude/skills/generate-story-outline.md',
  '.claude/skills/expand-scene-script.md',
  '.claude/skills/storyboard-from-scene.md',
  '.claude/skills/check-character-consistency.md',
  'app/core/project-model.js',
  'app/core/scene-model.js',
  'app/core/history-model.js',
  'app/core/storyboard-model.js',
  'app/server/project-store.js',
  'app/server/project-api.js',
  'app/server/snapshot-service.js',
  'app/web/app-state.js',
  'app/web/project-view.js',
  'app/web/scene-sidebar.js',
  'app/web/storyboard-view.js',
];

function readJson(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

test('repository skeleton directories exist', () => {
  for (const relativePath of requiredDirectories) {
    const fullPath = path.join(rootDir, relativePath);
    assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
    assert.ok(fs.statSync(fullPath).isDirectory(), `${relativePath} should be a directory`);
  }
});

test('canonical context and workflow files exist', () => {
  for (const relativePath of requiredFiles) {
    const fullPath = path.join(rootDir, relativePath);
    assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
    assert.ok(fs.statSync(fullPath).isFile(), `${relativePath} should be a file`);
  }
});

test('runtime template and preset files parse as JSON', () => {
  const template = readJson('data/templates/default-project-template.json');
  const visualStyles = readJson('data/presets/visual-styles.json');
  const shotPresets = readJson('data/presets/shot-presets.json');

  assert.equal(template.project.id, 'default-project');
  assert.ok(Array.isArray(template.scenes), 'template.scenes should be an array');
  assert.ok(Array.isArray(template.history), 'template.history should be an array');
  assert.ok(Array.isArray(visualStyles), 'visual styles should be an array');
  assert.ok(Array.isArray(shotPresets), 'shot presets should be an array');
});
