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
      return cloneState(state.project);
    },
    setScenes(scenes) {
      state.scenes = normalizeScenes(scenes);
      return cloneState(state.scenes);
    },
    setCurrentSceneId(sceneId) {
      state.currentSceneId = sceneId || null;
      return state.currentSceneId;
    },
    getCurrentScene() {
      return cloneState(state.scenes.find((scene) => scene?.id === state.currentSceneId) || null);
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
