const path = require('node:path');

const DEFAULT_PROJECT_ID = 'default-project';
const DEFAULT_PROJECT_FILE_NAME = 'project.json';
const DEFAULT_PROJECT_TEMPLATE_NAME = 'default-project-template.json';

function createProjectPaths(dataRoot) {
  const defaultProjectDir = path.join(dataRoot, 'projects', DEFAULT_PROJECT_ID);

  return {
    dataRoot,
    defaultProjectDir,
    defaultProjectFile: path.join(defaultProjectDir, DEFAULT_PROJECT_FILE_NAME),
    defaultProjectTemplateFile: path.join(dataRoot, 'templates', DEFAULT_PROJECT_TEMPLATE_NAME),
  };
}

module.exports = {
  DEFAULT_PROJECT_ID,
  createProjectPaths,
};
