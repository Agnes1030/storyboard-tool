function cloneProject(project) {
  return JSON.parse(JSON.stringify(project || {}));
}

function listScenes(project = {}) {
  return [...(project.scenes || [])].sort((left, right) => (left.order || 0) - (right.order || 0));
}

function getCurrentScene(project = {}) {
  const currentSceneId = project.settings?.currentSceneId;
  return listScenes(project).find((scene) => scene.id === currentSceneId) || null;
}

function createScene(project, input = {}) {
  const nextProject = cloneProject(project);
  const nextSceneId = Number(nextProject.global?.nextSceneId || nextProject.scenes?.length + 1 || 1);
  const sceneId = `scene-${nextSceneId}`;
  const orderedScenes = listScenes(nextProject);
  const sceneTitle = input.title || `第 ${nextSceneId} 场`;
  const scene = {
    id: sceneId,
    order: orderedScenes.length + 1,
    title: sceneTitle,
    script: input.script || '',
    storyboard: {
      scene_title: sceneTitle,
      total_shots: 0,
      shots: [],
    },
    notes: input.notes || '',
  };

  nextProject.global = {
    ...nextProject.global,
    nextSceneId: nextSceneId + 1,
  };
  nextProject.settings = {
    ...nextProject.settings,
    currentSceneId: sceneId,
  };
  nextProject.scenes = [...(nextProject.scenes || []), scene];

  return nextProject;
}

function renameScene(project, sceneId, title) {
  const nextProject = cloneProject(project);
  const scene = (nextProject.scenes || []).find((item) => item.id === sceneId);

  if (!scene) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  scene.title = title;
  scene.storyboard = {
    ...(scene.storyboard || {}),
    scene_title: title,
  };

  return nextProject;
}

function selectScene(project, sceneId) {
  const nextProject = cloneProject(project);
  const sceneExists = (nextProject.scenes || []).some((scene) => scene.id === sceneId);

  if (!sceneExists) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  nextProject.settings = {
    ...nextProject.settings,
    currentSceneId: sceneId,
  };

  return nextProject;
}

const sceneSidebarApi = {
  listScenes,
  getCurrentScene,
  createScene,
  renameScene,
  selectScene,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = sceneSidebarApi;
}

if (typeof window !== 'undefined') {
  window.SceneSidebar = sceneSidebarApi;
}
