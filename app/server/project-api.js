const { ensureDefaultProject, saveProject } = require('./project-store');
const { snapshotProject, rollbackProject } = require('./snapshot-service');

function sendJson(res, payload) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function handleGetProject(res, projectPaths) {
  const project = ensureDefaultProject(projectPaths);
  sendJson(res, project);
}

function handlePutProject(res, projectPaths, project) {
  const savedProject = saveProject(projectPaths, project);
  sendJson(res, savedProject);
}

function handlePostProjectSnapshot(res, projectPaths, payload) {
  const savedProject = snapshotProject(projectPaths, payload);
  sendJson(res, savedProject);
}

function handlePostProjectRollback(res, projectPaths, payload) {
  const savedProject = rollbackProject(projectPaths, payload);
  sendJson(res, savedProject);
}

module.exports = {
  handleGetProject,
  handlePutProject,
  handlePostProjectRollback,
  handlePostProjectSnapshot,
};
