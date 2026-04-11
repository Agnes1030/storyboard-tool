# Project Schema

This repository stores storyboard work as a project document with four top-level sections:

- `project`: project metadata such as id, title, genre, tone, and timestamps.
- `global`: reusable defaults shared across scenes, including characters, visual style, and shot preferences.
- `scenes`: ordered scene records containing script text, generated storyboard shots, and per-scene notes.
- `history`: append-only activity entries for important edits, generations, and exports.

## Scene shape

Each scene should keep the current script source and the latest storyboard result together so the runtime can render or persist the scene without joining across files.

## Persistence rule

A project is stored as one JSON document under `data/projects/<project-id>/project.json` during the transition period.
