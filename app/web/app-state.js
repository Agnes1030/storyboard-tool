function createDefaultState() {
  return {
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
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function normalizeScenes(scenes) {
  return Array.isArray(scenes) ? cloneState(scenes) : [];
}

function getSceneIndex(scenes, sceneId) {
  return scenes.findIndex((scene) => scene?.id === sceneId);
}

function getSceneById(scenes, sceneId) {
  const sceneIndex = getSceneIndex(scenes, sceneId);
  return sceneIndex >= 0 ? scenes[sceneIndex] : null;
}

function syncStoryboardStateFromScene(state, scene = null) {
  const storyboard = scene?.storyboard || {};
  state.lastShots = cloneState(storyboard.shots || []);
  state.lastStyle = storyboard.style || '';
  state.lastSceneTitle = storyboard.scene_title || scene?.title || '';
}

function updateCurrentScene(state, updateScene) {
  const sceneIndex = getSceneIndex(state.scenes, state.currentSceneId);

  if (sceneIndex < 0) {
    return null;
  }

  const currentScene = cloneState(state.scenes[sceneIndex]);
  const nextScene = updateScene(currentScene);

  state.scenes[sceneIndex] = nextScene;

  if (state.project) {
    state.project.scenes = cloneState(state.scenes);
    state.project.settings = {
      ...(state.project.settings || {}),
      currentSceneId: state.currentSceneId,
    };
  }

  syncStoryboardStateFromScene(state, nextScene);
  return cloneState(nextScene);
}

function syncProjectSelection(state) {
  if (state.project) {
    state.project.settings = {
      ...(state.project.settings || {}),
      currentSceneId: state.currentSceneId,
    };
  }

  syncStoryboardStateFromScene(state, getSceneById(state.scenes, state.currentSceneId));
}

function getDefaultCurrentSceneId(scenes, preferredSceneId = null) {
  if (preferredSceneId && scenes.some((scene) => scene?.id === preferredSceneId)) {
    return preferredSceneId;
  }

  return scenes[0]?.id || null;
}

function createAppState(initialState = {}) {
  const state = {
    ...createDefaultState(),
    ...cloneState(initialState),
  };

  if (!Array.isArray(state.scenes)) {
    state.scenes = [];
  }

  if (state.currentSceneId == null) {
    state.currentSceneId = getDefaultCurrentSceneId(state.scenes);
  }

  return {
    getState() {
      return cloneState(state);
    },
    patch(partialState) {
      Object.assign(state, cloneState(partialState));
      return cloneState(state);
    },
    setProject(project) {
      const nextProject = cloneState(project);
      state.project = nextProject;
      state.scenes = normalizeScenes(nextProject?.scenes);
      state.currentSceneId = getDefaultCurrentSceneId(state.scenes, nextProject?.settings?.currentSceneId || null);
      syncProjectSelection(state);
      return cloneState(state.project);
    },
    setScenes(scenes) {
      state.scenes = normalizeScenes(scenes);
      syncProjectSelection(state);
      return cloneState(state.scenes);
    },
    setCurrentSceneId(sceneId) {
      state.currentSceneId = sceneId || null;
      syncProjectSelection(state);
      return state.currentSceneId;
    },
    getCurrentScene() {
      return cloneState(getSceneById(state.scenes, state.currentSceneId));
    },
    getCurrentSceneScript() {
      return getSceneById(state.scenes, state.currentSceneId)?.script || '';
    },
    setCurrentSceneScript(script = '') {
      const nextScene = updateCurrentScene(state, (scene) => ({
        ...scene,
        script,
      }));
      return nextScene?.script || '';
    },
    getCurrentSceneStoryboard() {
      return cloneState(getSceneById(state.scenes, state.currentSceneId)?.storyboard || null);
    },
    setCurrentSceneStoryboard(storyboard = {}) {
      const nextScene = updateCurrentScene(state, (scene) => ({
        ...scene,
        storyboard: cloneState(storyboard),
      }));
      return cloneState(nextScene?.storyboard || null);
    },
    setCharacters(characters) {
      state.characters = cloneState(characters);
      return cloneState(state.characters);
    },
    setNextId(nextId) {
      state.nextId = nextId;
      return state.nextId;
    },
    setStoryboardResult({ shots = [], style = '', sceneTitle = '' } = {}) {
      state.lastShots = cloneState(shots);
      state.lastStyle = style;
      state.lastSceneTitle = sceneTitle;
      return cloneState(state);
    },
  };
}

const appStateApi = { createAppState, createDefaultState };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = appStateApi;
}

if (typeof window !== 'undefined') {
  window.AppState = appStateApi;
}
