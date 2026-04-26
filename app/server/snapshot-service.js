const { ensureDefaultProject, saveProject } = require('./project-store');

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function nextProjectHistoryId(project) {
  const historyIds = Array.isArray(project.projectHistory)
    ? project.projectHistory
      .map((entry) => {
        const match = /^project_history_(\d+)$/.exec(entry.id || '');
        return match ? Number(match[1]) : 0;
      })
    : [];

  return `project_history_${Math.max(0, ...historyIds) + 1}`;
}

function createProjectSnapshot(project, label) {
  if (!Array.isArray(project.projectHistory)) {
    project.projectHistory = [];
  }

  project.projectHistory.push({
    id: nextProjectHistoryId(project),
    type: 'project',
    label: label || '项目快照',
    createdAt: new Date().toISOString(),
    data: cloneJson({
      settings: project.settings,
      global: project.global,
      scenes: project.scenes,
    }),
  });

  return project;
}

function createSceneSnapshot(project, sceneId, label) {
  const scene = Array.isArray(project.scenes)
    ? project.scenes.find((item) => item.id === sceneId)
    : null;

  if (!scene) {
    throw new Error('场景不存在');
  }

  if (!Array.isArray(project.projectHistory)) {
    project.projectHistory = [];
  }

  project.projectHistory.push({
    id: nextProjectHistoryId(project),
    type: 'scene',
    sceneId,
    label: label || '场景快照',
    createdAt: new Date().toISOString(),
    data: cloneJson({
      scene,
    }),
  });

  return project;
}

function rollbackProjectSnapshot(project, historyId) {
  const histories = Array.isArray(project.projectHistory) ? project.projectHistory : [];
  const history = histories.find((entry) => entry.id === historyId && entry.type === 'project');

  if (!history) {
    throw new Error('项目历史不存在');
  }

  project.settings = cloneJson(history.data.settings);
  project.global = cloneJson(history.data.global);
  project.scenes = cloneJson(history.data.scenes);

  return project;
}

function rollbackSceneSnapshot(project, historyId, sceneId) {
  const histories = Array.isArray(project.projectHistory) ? project.projectHistory : [];
  const history = histories.find((entry) => entry.id === historyId && entry.type === 'scene');

  if (!history) {
    throw new Error('项目历史不存在');
  }

  const targetSceneId = sceneId || history.sceneId;
  const sceneIndex = Array.isArray(project.scenes)
    ? project.scenes.findIndex((entry) => entry.id === targetSceneId)
    : -1;

  if (sceneIndex === -1) {
    throw new Error('场景不存在');
  }

  project.scenes[sceneIndex] = cloneJson(history.data.scene);

  if (!project.settings || project.settings.currentSceneId == null) {
    project.settings = {
      ...(project.settings || {}),
      currentSceneId: targetSceneId,
    };
  }

  return project;
}

function snapshotProject(projectPaths, payload) {
  const project = ensureDefaultProject(projectPaths);

  if (payload.scope === 'project') {
    createProjectSnapshot(project, payload.label);
    return saveProject(projectPaths, project);
  }

  if (payload.scope === 'scene') {
    createSceneSnapshot(project, payload.sceneId, payload.label);
    return saveProject(projectPaths, project);
  }

  throw new Error('无效的快照范围');
}

function rollbackProject(projectPaths, payload) {
  const project = ensureDefaultProject(projectPaths);

  if (payload.scope === 'project') {
    rollbackProjectSnapshot(project, payload.historyId);
    return saveProject(projectPaths, project);
  }

  if (payload.scope === 'scene') {
    rollbackSceneSnapshot(project, payload.historyId, payload.sceneId);
    return saveProject(projectPaths, project);
  }

  throw new Error('无效的回退范围');
}

module.exports = {
  createProjectSnapshot,
  createSceneSnapshot,
  rollbackProject,
  rollbackProjectSnapshot,
  rollbackSceneSnapshot,
  snapshotProject,
};
