async function readJsonResponse(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Project request failed');
  }

  return payload;
}

async function loadProject(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl('/api/project');
  return readJsonResponse(response);
}

async function saveProject(project, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl('/api/project', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  return readJsonResponse(response);
}

const scenePersistenceApi = {
  loadProject,
  saveProject,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = scenePersistenceApi;
}

if (typeof window !== 'undefined') {
  window.ScenePersistence = scenePersistenceApi;
}
