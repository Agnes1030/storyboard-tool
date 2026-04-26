# Project Schema

This repository stores storyboard work as one project document with these top-level sections:

- `version`: schema version for future migrations.
- `project`: project metadata such as id, title, genre, tone, and timestamps.
- `settings`: current default UI selections such as visual style and shot preference.
- `global`: reusable shared data such as characters and story context.
- `scenes`: ordered scene records containing script text, generated storyboard shots, and per-scene notes.
- `projectHistory`: append-only activity entries for important edits, generations, and exports.

## Starter template rule

`data/templates/default-project-template.json` should include one starter scene so a new project can render immediately in the transitional runtime.

## Persistence rule

During the transition period, a project is stored as one JSON document under `data/projects/<project-id>/project.json`.
