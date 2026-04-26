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
  'app/core/script-model.js',
  'app/server/ai-api.js',
  'app/server/script-api.js',
  'app/server/project-store.js',
  'app/server/project-api.js',
  'app/server/snapshot-service.js',
  'app/web/app-state.js',
  'app/web/project-view.js',
  'app/web/scene-sidebar.js',
  'app/web/storyboard-view.js',
];

const placeholderModules = [
  'app/core/project-model.js',
  'app/core/scene-model.js',
  'app/core/history-model.js',
  'app/core/storyboard-model.js',
  'app/core/script-model.js',
  'app/server/ai-api.js',
  'app/server/script-api.js',
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

test('runtime template and preset files parse as JSON and match planned scaffold', () => {
  const template = readJson('data/templates/default-project-template.json');
  const visualStyles = readJson('data/presets/visual-styles.json');
  const shotPresets = readJson('data/presets/shot-presets.json');

  assert.equal(template.version, 1);
  assert.equal(template.project.id, 'default-project');
  assert.ok(template.settings, 'template.settings should exist');
  assert.equal(template.settings.visualStyle, '日系少年漫');
  assert.equal(template.settings.shotPreference, '均衡分配');
  assert.ok(Array.isArray(template.global.characters), 'template.global.characters should be an array');
  assert.ok(Array.isArray(template.scenes), 'template.scenes should be an array');
  assert.equal(template.scenes.length, 1, 'template should include one starter scene');
  assert.ok(Array.isArray(template.projectHistory), 'template.projectHistory should be an array');

  assert.deepEqual(
    visualStyles.map((style) => style.label),
    ['日系少年漫', '国风古风漫画', '美式漫画', '写实风格', '赛博朋克']
  );
  assert.deepEqual(
    shotPresets.map((preset) => preset.label),
    ['均衡分配', '偏重近景特写', '偏重全景远景']
  );
});

test('app-layer placeholder modules load successfully', () => {
  for (const relativePath of placeholderModules) {
    const fullPath = path.join(rootDir, relativePath);
    assert.doesNotThrow(() => require(fullPath), `${relativePath} should load via require()`);
  }
});
