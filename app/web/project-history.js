async function readJsonResponse(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Project history request failed');
  }

  return payload;
}

async function postProjectHistory(url, body, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return readJsonResponse(response);
}

async function createProjectSnapshot(options = {}) {
  return postProjectHistory('/api/project/snapshot', {
    scope: 'project',
    label: '项目快照',
  }, options);
}

async function rollbackProjectSnapshot(historyId, options = {}) {
  return postProjectHistory('/api/project/rollback', {
    scope: 'project',
    historyId,
  }, options);
}

async function createSceneSnapshot(sceneId, options = {}) {
  return postProjectHistory('/api/project/snapshot', {
    scope: 'scene',
    sceneId,
    label: '场景快照',
  }, options);
}

async function rollbackSceneSnapshot(sceneId, historyId, options = {}) {
  return postProjectHistory('/api/project/rollback', {
    scope: 'scene',
    sceneId,
    historyId,
  }, options);
}

const projectHistoryApi = {
  createProjectSnapshot,
  rollbackProjectSnapshot,
  createSceneSnapshot,
  rollbackSceneSnapshot,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = projectHistoryApi;
}

if (typeof window !== 'undefined') {
  window.ProjectHistory = projectHistoryApi;
}
