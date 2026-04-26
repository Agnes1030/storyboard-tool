# Agent-Style Repository Structure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the repository into a dual-purpose layout that supports both the AI short-drama product runtime and long-term Claude/agent collaboration through explicit `.claude`, `app`, and `data` layers.

**Architecture:** Keep the current app runnable during the transition, but introduce a new repository skeleton that separates product code (`app/`), runtime content (`data/`), and agent collaboration assets (`.claude/`). Start by adding the new directories and canonical schema/context files, then progressively move domain logic and UI code behind that structure without breaking the existing entrypoints.

**Tech Stack:** Plain Node.js, filesystem JSON storage, Markdown-based Claude context/skills, existing HTML frontend and Node server.

---

### Task 1: Establish repository skeleton and ignore rules

**Files:**
- Modify: `.gitignore`
- Create: `.claude/`
- Create: `app/`
- Create: `data/`
- Create: `docs/plans/`

**Step 1: Write the failing test**
There is no automated test for directory scaffolding. Use a filesystem verification script instead.

**Step 2: Run verification to show skeleton is missing**
Run:
```bash
ls -d .claude app data docs/plans
```
Expected: FAIL with missing-directory errors in the new worktree baseline.

**Step 3: Create the minimal directory skeleton**
Create exactly these directories:
```text
.claude/plans
.claude/memory
.claude/skills
.claude/context
app/core
app/server
app/web
app/shared
data/projects
data/templates
data/presets
data/exports
docs/plans
```

**Step 4: Run verification to ensure directories exist**
Run:
```bash
ls -d .claude/plans .claude/memory .claude/skills .claude/context app/core app/server app/web app/shared data/projects data/templates data/presets data/exports docs/plans
```
Expected: PASS with all directories listed.

**Step 5: Commit**
```bash
git add .gitignore .claude app data docs
git commit -m "chore: add agent-oriented repository skeleton"
```

### Task 2: Add canonical product schema and agent context files

**Files:**
- Create: `.claude/context/project-schema.md`
- Create: `.claude/context/storyboard-rules.md`
- Create: `data/templates/default-project-template.json`
- Create: `data/presets/visual-styles.json`
- Create: `data/presets/shot-presets.json`

**Step 1: Write the failing test**
Create a Node test file:
- `tests/repository-structure.test.js`

Add assertions that these files exist and that the JSON preset/template files parse.

**Step 2: Run test to verify it fails**
Run:
```bash
node --test tests/repository-structure.test.js
```
Expected: FAIL because the files do not exist yet.

**Step 3: Write minimal files**
Add concise but real content:
- `project-schema.md` describing `project/global/scenes/history`
- `storyboard-rules.md` describing shot JSON expectations and consistency rules
- `default-project-template.json` containing one valid starter project document
- `visual-styles.json` containing the current style presets from the UI
- `shot-presets.json` containing the current shot preference presets from the UI

**Step 4: Run test to verify it passes**
Run:
```bash
node --test tests/repository-structure.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add .claude/context data/templates data/presets tests/repository-structure.test.js
git commit -m "feat: define project schema and runtime presets"
```

### Task 3: Add agent memory and skill placeholders for the product workflow

**Files:**
- Create: `.claude/memory/MEMORY.md`
- Create: `.claude/skills/generate-story-outline.md`
- Create: `.claude/skills/expand-scene-script.md`
- Create: `.claude/skills/storyboard-from-scene.md`
- Create: `.claude/skills/check-character-consistency.md`

**Step 1: Write the failing test**
Extend `tests/repository-structure.test.js` to assert these markdown files exist.

**Step 2: Run test to verify it fails**
Run:
```bash
node --test tests/repository-structure.test.js
```
Expected: FAIL on missing memory/skill files.

**Step 3: Write minimal implementation**
Create concise files with:
- `MEMORY.md` as an index placeholder
- each skill file describing goal, inputs, outputs, and constraints for that workflow

Do not add speculative skills beyond the four discussed.

**Step 4: Run test to verify it passes**
Run:
```bash
node --test tests/repository-structure.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add .claude/memory/MEMORY.md .claude/skills tests/repository-structure.test.js
git commit -m "feat: add agent workflow memory and skill definitions"
```

### Task 4: Introduce app-layer module placeholders without breaking current entrypoints

**Files:**
- Create: `app/core/project-model.js`
- Create: `app/core/scene-model.js`
- Create: `app/core/history-model.js`
- Create: `app/core/storyboard-model.js`
- Create: `app/server/project-store.js`
- Create: `app/server/project-api.js`
- Create: `app/server/snapshot-service.js`
- Create: `app/web/app-state.js`
- Create: `app/web/project-view.js`
- Create: `app/web/scene-sidebar.js`
- Create: `app/web/storyboard-view.js`

**Step 1: Write the failing test**
Extend `tests/repository-structure.test.js` to assert these files exist.

**Step 2: Run test to verify it fails**
Run:
```bash
node --test tests/repository-structure.test.js
```
Expected: FAIL because the module placeholders are missing.

**Step 3: Write minimal implementation**
Create each file with minimal exports or TODO-safe stubs that document responsibility only, for example:
```js
module.exports = {};
```
Use simple header comments only where the intent is not obvious.

**Step 4: Run test to verify it passes**
Run:
```bash
node --test tests/repository-structure.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add app tests/repository-structure.test.js
git commit -m "chore: add transition modules for app layers"
```

### Task 5: Point runtime persistence toward the new data layout

**Files:**
- Modify: `server.js`
- Modify: `README.md`
- Test: `tests/project-api.test.js`

**Step 1: Write the failing test**
Update `tests/project-api.test.js` so it expects the default persisted project file under:
```text
data/projects/default-project/project.json
```
Instead of the legacy flat `data/project.json` path.

**Step 2: Run test to verify it fails**
Run:
```bash
node --test tests/project-api.test.js
```
Expected: FAIL because persistence still points to the old path.

**Step 3: Write minimal implementation**
Update backend persistence helpers so:
- default project directory is `data/projects/default-project/`
- project file is `data/projects/default-project/project.json`
- default project creation still works with the current API routes

Update `README.md` to describe the new runtime data layout briefly.

**Step 4: Run tests to verify they pass**
Run:
```bash
node --test tests/project-api.test.js tests/repository-structure.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add server.js README.md tests/project-api.test.js tests/repository-structure.test.js data
git commit -m "refactor: align runtime persistence with project directories"
```

### Task 6: Verification and migration guardrail pass

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-04-11-agent-structure.md`

**Step 1: Write the verification checklist**
Document what is complete vs still transitional:
- current runnable entrypoints remain `server.js` and `public/index.html`
- new `app/` tree is scaffolding for gradual migration
- `.claude/` stores agent workflow context and product collaboration rules
- `data/` stores runtime project content and presets

**Step 2: Run full verification**
Run:
```bash
node --test
```
Expected: PASS

Run:
```bash
node server.js
```
Expected: server starts successfully and can still serve `/`.

**Step 3: Commit**
```bash
git add README.md docs/plans/2026-04-11-agent-structure.md
git commit -m "docs: describe agent-style repository transition"
```

## Verification

- `node --test` passes.
- `node server.js` starts successfully.
- `GET /api/project` creates or reads from `data/projects/default-project/project.json`.
- `.claude/context`, `.claude/skills`, and `.claude/memory` all exist with initial files.
- `data/templates` and `data/presets` contain parseable JSON files.
- Existing root entrypoints still work during the transition.

## Transition status checklist

- Current runnable entrypoints remain `server.js` and `public/index.html`.
- New `app/` tree is scaffolding for gradual migration.
- `.claude/` stores agent workflow context and product collaboration rules.
- `data/` stores runtime project content and presets.

## Notes

- Keep this refactor structural. Do not migrate the entire frontend into `app/web` in the same batch.
- Keep `server.js` and `public/index.html` as the active runtime during the transition.
- Use the new directories to establish the long-term contract first; move behavior later.
