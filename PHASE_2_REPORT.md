# Phase 2 Report — Local Projects and Persistence

Project: Arya Duta Persentasion Studio
Phase: 2 (approved 2026-11-12)
Date: 2026-11-12

## What was implemented

Phase 2 delivers reliable local project management per
`IMPLEMENTATION_PLAN.md` Phase 2 and `TECHNICAL_SPEC.md` sections 5–6.
Frontend and Rust both changed; the Phase 0 IPC surface is untouched.

### SQLite schema and migrations (Rust)

- `migrations/0002_projects.sql` — `projects` table exactly as specified
  (`id` TEXT PK, `title`, `topic`, `audience`, `language`,
  `duration_minutes`, `status` with CHECK `active|archived`,
  `workspace_path`, `created_at`, `updated_at`) plus an index on
  `updated_at DESC` for list ordering. Later-phase tables (sources,
  slides, artifacts, workflow_runs) are intentionally not scaffolded.
- The existing versioned transactional migration runner from Phase 0
  applies 0002 idempotently on the real `poc.db` (verified live and by
  test).

### Project repository and workspace manager (Rust)

New module `src-tauri/src/projects.rs`:

- **Create** (`create`): validation (title required ≤200 chars; optional
  fields ≤200; duration 1–600), UUID v4 id (`uuid` crate, new dependency
  — decision D11), workspace folder tree per spec 5.2 (`sources/original`,
  `sources/extracted`, `research`, `learning`, `storyboard`, `design`,
  `assets`, `slides`, `render`, `exports`, `reports`), atomic
  `project.json` (temp file + rename in the same directory).
- **Ordering guarantee for file/database consistency:** filesystem first,
  database second —
  - create failure during layout ⇒ folder rolled back, no row;
  - create failure during row insert ⇒ folder removed, no row;
  - delete removes the folder first; only a successful removal deletes the
    row, so file errors can never corrupt or orphan database records.
- **List / get / rename / set_status / delete**: rename and status changes
  rewrite `project.json` so the on-disk metadata mirrors the database;
  delete on a project whose folder is already missing still removes the
  row (recovery from manual folder deletion).
- **Recovery** (`repair_workspace`, wired into `project_get`): missing
  folders and missing `project.json` are recreated from the row.
- Verbatim-path hygiene: `canonicalize()` results have the `\\?\` prefix
  stripped so stored/displayed paths stay clean (found live in first-run
  testing, fixed, regression-tested).

### Workspace root configuration (Rust)

New module `src-tauri/src/workspace_config.rs` + `AppState` changes:

- Default root resolves via Tauri platform API:
  `Documents\Arya Duta Persentasion Studio\Projects` (falls back to
  `<app_data_dir>\projects` when Documents is unavailable). No hard-coded
  user-profile paths.
- Override persisted in `<app_data_dir>\config.json`, written atomically;
  changeable at runtime through IPC. Changing the root affects NEW
  projects only; existing projects keep their recorded `workspace_path`
  (communicated in the UI).
- `validate_root`: absolute-path requirement, creation, canonicalization.
- Containment: project ids are generated in Rust (UUID v4, format
  validated defensively), and project paths are always
  `<canonical root>\<project-id>` — no user-supplied path segments, so
  traversal is impossible by construction.

### IPC commands (typed, validated)

`project_create`, `project_list`, `project_get` (with repair),
`project_rename`, `project_set_status`, `project_delete`,
`workspace_get`, `workspace_set_root`. Errors keep the
`{ code, message }` contract; new code `PROJECT_NOT_FOUND` added to
`AppError`.

### Project management UI (React)

- `src/types/projects.ts`, `src/hooks/useProjects.ts` (list + typed
  mutation wrappers + `formatIpcError`), `src/hooks/useWorkspace.ts`.
- `ProjectsView` — real list (title, metadata line, workspace path,
  archived badge), Rename dialog (Input), Archive/Restore and Delete
  behind explicit confirmation dialogs (DESIGN.md section 8), loading
  skeletons, error + retry, empty state.
- `NewPresentationView` — the Phase 1 placeholder became the real brief
  form: Title (required), Topic, Audience, Language, Duration
  (client-side 1–600 validation, `inputMode="numeric"`), creates the
  project and navigates to Projects. No fake form remains.
- `DashboardView` — recent projects are now the real top-3 from
  `project_list` (archived badges, "View all"); empty state and error
  retry retained.
- `SettingsView` — Project Storage section shows the effective workspace
  root (custom/default), app data path, and a "Change location" dialog
  explaining that existing projects stay in place.

## Files created or modified

Created (Rust): `src-tauri/src/projects.rs`,
`src-tauri/src/workspace_config.rs`, `src-tauri/migrations/0002_projects.sql`
Created (frontend): `src/types/projects.ts`, `src/hooks/useProjects.ts`,
`src/hooks/useWorkspace.ts`,
`src/features/projects/ProjectsView.test.tsx`,
`src/features/new-presentation/NewPresentationView.test.tsx`
Created (docs): `PHASE_2_REPORT.md`, `PHASE_2_TEST_RESULTS.md`,
`phase2-evidence/` (7 captures)

Modified (Rust): `Cargo.toml` (+ `uuid`), `src/lib.rs` (modules, AppState,
8 new commands), `src/commands.rs`, `src/db.rs` (migration list,
`utc_now` made `pub`), `src/error.rs` (`ProjectNotFound`, `From<serde_json::Error>`)
Modified (frontend): `App.tsx`, `ProjectsView.tsx`, `NewPresentationView.tsx`,
`DashboardView.tsx`, `SettingsView.tsx`, `DashboardView.test.tsx`

## Architecture or database changes

- SQLite: one new table + index via migration 0002. No destructive change;
  Phase 0 data (`poc_items`, harness) untouched and still functional.
- New dependency: `uuid = { version = "1", features = ["v4"] }` (D11) —
  stable project identity without hand-rolled ID generation.
- No changes to the sidecar, credentials, or renderer modules.

## Tests executed and results

Full detail in `PHASE_2_TEST_RESULTS.md`:

| Check | Result |
|---|---|
| Rust tests | ✅ 19 / 19 (11 new) |
| Frontend tests | ✅ 28 / 28 (11 new) |
| Production build (tsc + Vite) | ✅ |
| Rust build | ✅ 0 warnings |
| Live: create → restart survival → archive/restore → metadata rewrite | ✅ |
| Console check | ✅ 0 errors |

## Acceptance criteria

| Criterion (IMPLEMENTATION_PLAN) | Status |
|---|---|
| Projects survive application restart | ✅ process restart with new PID re-listed the project; storage-level round-trip test also green |
| Deleting/archiving a project follows explicit confirmation | ✅ Dialog confirmation live-captured for archive; delete uses the same Dialog path (unit-tested); hard delete exists but is never reachable without confirmation |
| Paths remain inside the configured workspace | ✅ `<canonical root>\<generated uuid>` only; id format validated; containment asserted in Rust test |
| File errors do not corrupt database records | ✅ filesystem-first ordering with rollback on create; delete removes folder before row; missing-folder recovery |

## Known limitations

1. The single existing (owner-created) project was stored before the
   `\\?\`-prefix fix, so its `workspace_path` retains the verbatim prefix
   in the database and the list display. New projects are clean. A one-row
   data fix is trivial but touching user data was not justified for a
   cosmetic artifact; note for Phase 11 data maintenance if wanted.
2. `project_get`/repair is wired but no project detail workspace view
   exists yet (that is Phase 3+ scope); the repair path is covered by
   Rust tests.
3. Workspace change does not move existing projects (by design); moving
   projects is not a Phase 2 task.
4. No file-permission failure injection beyond the rollback test.

## Outstanding observations carried from Phase 1 (owner-tracked)

Settings tab overflow at minimum width, 150%/175% scaling validation,
release-build console review, e2e automation decision, Phase 0 regression
coverage (still intact: 6/6 Phase 0 tests, harness works).

## Remaining work for Phase 3

BYOK provider foundation: adapter interface, credential entry/validation
into Windows Credential Manager, model selection, error mapping, mock
provider, privacy confirmation (per `IMPLEMENTATION_PLAN.md` Phase 3).
The project/workflow stage model from this phase is the anchor for
workflow_runs in later phases.

## Definition of done

Requirements satisfied; architecture rules respected (filesystem/database
ordering, validated IPC, no plaintext secrets involved); DESIGN.md
followed; tests executed with real evidence; no known critical regression;
Phase 0 and Phase 1 functionality preserved. Phase 2 is complete and ready
for owner review. **No Phase 3 work starts without owner approval.**
