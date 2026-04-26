const fs = require('node:fs');

function loadDefaultProjectTemplate(projectPaths) {
  return JSON.parse(fs.readFileSync(projectPaths.defaultProjectTemplateFile, 'utf8'));
}

function ensureDefaultProject(projectPaths) {
  if (!fs.existsSync(projectPaths.defaultProjectFile)) {
    fs.mkdirSync(projectPaths.defaultProjectDir, { recursive: true });
    const project = loadDefaultProjectTemplate(projectPaths);
    fs.writeFileSync(projectPaths.defaultProjectFile, JSON.stringify(project, null, 2));
    return project;
  }

  return JSON.parse(fs.readFileSync(projectPaths.defaultProjectFile, 'utf8'));
}

function saveProject(projectPaths, project) {
  fs.mkdirSync(projectPaths.defaultProjectDir, { recursive: true });
  fs.writeFileSync(projectPaths.defaultProjectFile, JSON.stringify(project, null, 2));
  return project;
}

module.exports = {
  loadDefaultProjectTemplate,
  ensureDefaultProject,
  saveProject,
};
