let sceneSidebarApi = null;

if (typeof module !== 'undefined' && module.exports) {
  sceneSidebarApi = require('./scene-sidebar.js');
} else if (typeof window !== 'undefined') {
  sceneSidebarApi = window.SceneSidebar;
}

const { listScenes, getCurrentScene } = sceneSidebarApi;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createScenePanelViewModel(project = {}, currentSceneId = null) {
  const normalizedProject = {
    ...project,
    settings: {
      ...(project.settings || {}),
      currentSceneId: currentSceneId || project.settings?.currentSceneId || null,
    },
  };
  const orderedScenes = listScenes(normalizedProject);
  const activeScene = getCurrentScene(normalizedProject);

  return {
    currentSceneId: activeScene?.id || null,
    currentSceneTitle: activeScene?.title || '',
    scenes: orderedScenes.map((scene, index) => ({
      id: scene.id,
      title: scene.title,
      order: scene.order,
      isActive: scene.id === activeScene?.id,
      label: `场景 ${index + 1}`,
    })),
  };
}

function createSceneListMarkup({ scenes = [], currentSceneId = null } = {}) {
  if (!scenes.length) {
    return '<div class="scene-empty">还没有场景，先创建一个场景开始吧。</div>';
  }

  return scenes.map((scene) => `
    <button type="button" class="scene-item${scene.isActive || scene.id === currentSceneId ? ' is-active' : ''}" data-scene-id="${escapeHtml(scene.id)}">
      <span class="scene-item-label">${escapeHtml(scene.label || `场景 ${scene.order || ''}`.trim())}</span>
      <span class="scene-item-title">${escapeHtml(scene.title || '未命名场景')}</span>
    </button>
  `).join('');
}

const sceneUiApi = {
  createScenePanelViewModel,
  createSceneListMarkup,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = sceneUiApi;
}

if (typeof window !== 'undefined') {
  window.SceneUi = sceneUiApi;
}
