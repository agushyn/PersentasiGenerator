# Phase 2 — Test Results

Project: Arya Duta Persentasion Studio
Phase: 2 — Local projects and persistence
Date: 2026-11-12
Environment: Windows 11, display scale 125%, Rust 1.99.1 stable-msvc, Node v26.10.0

## Summary

| Suite | Result | Count |
|---|---|---|
| Rust tests (unit + integration: migrations, repository, workspace, config) | ✅ pass | 19 / 19 |
| Frontend unit tests (Vitest + Testing Library) | ✅ pass | 28 / 28 |
| Production frontend build (strict `tsc` + Vite) | ✅ pass | — |
| Rust release-candidate build (warnings) | ✅ clean | 0 warnings |
| Manual live walkthrough at 1280×800 @ 125% (project create, restart survival, archive/restore) | ✅ pass | see below |
| Console error check | ✅ pass | 0 errors / 0 warnings |

## Rust tests

Command:

```powershell
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml
```

Result: **19 passed; 0 failed.**

New Phase 2 coverage (11 tests beyond the 6 Phase 0 tests, which still pass):

| Test | Verifies |
|---|---|
| `projects::create_builds_workspace_and_metadata` | Project row + full workspace layout (`sources/original`, `slides`, `reports`, …) + `project.json` mirroring the row; path inside workspace root; no verbatim `\\?\` prefix in stored path |
| `projects::list_orders_by_updated_at_desc` | List ordering; rename moves project to top |
| `projects::rename_updates_row_and_metadata` | Rename updates row + `project.json` (old title gone) |
| `projects::archive_and_restore_rewrite_metadata` | `active` ↔ `archived` transitions rewrite metadata; same-status call is a no-op |
| `projects::delete_removes_workspace_then_row` | Delete removes folder then row; second delete returns `false` |
| `projects::delete_succeeds_when_folder_already_gone` | Manual folder deletion never leaves an undeletable record (recovery) |
| `projects::failed_title_validation_creates_nothing` | Empty title / >200 chars / duration 0 rejected; no row, no folder |
| `projects::repair_recreates_missing_folders_and_metadata` | Missing folders + missing `project.json` are recreated from the row |
| `projects::projects_persist_across_connections` | Projects survive DB close/reopen (restart survival at storage level) |
| `projects::migration_version_2_applies_idempotently` | Migrations `[1, 2]` then no-op; `status` CHECK constraint rejects unknown values |
| `workspace_config::save_and_load_round_trip`, `missing_config_uses_default`, `validate_root_rejects_relative_paths` | Atomic config write; missing config falls back to default; relative roots rejected |

Updated Phase 0 test: `migrations_are_idempotent_and_crud_round_trips` now expects `vec![1, 2]` after migration 0002 (`projects`).

## Frontend tests

Command:

```powershell
npm test --workspace apps/desktop
```

Result: **7 files, 28 passed (was 17 in Phase 1; +11).**

New coverage:

| File | Tests | What is verified |
|---|---|---|
| `src/features/projects/ProjectsView.test.tsx` | 6 | empty state; list rendering with metadata; load failure + working Retry; rename via dialog calls `project_rename`; delete requires confirmation dialog and calls `project_delete`; archive requires confirmation and calls `project_set_status` |
| `src/features/new-presentation/NewPresentationView.test.tsx` | 4 | title required (no IPC call); full brief creates project with correct payload (`durationMinutes` camelCase over IPC) and navigates; out-of-range duration rejected locally; backend error does not navigate |
| `src/features/dashboard/DashboardView.test.tsx` | 7 (updated) | recent-projects list (max 3, archived badge, "View all"); empty state; error retry for both `project_list` and `app_status`; loading skeletons; nav behavior |

Transport mock is command-scoped (`responses`/`failures` keyed by IPC command name) so list mutations and reads cannot interfere; `beforeEach` resets state.

During development three defects were found by tests and fixed:
1. `type="number"` input: jsdom could not type digits (value stayed `""`) — duration field now `inputMode="numeric"` text input; local range validation (1–600) added.
2. Shared `invoke` mock leaked responses across tests — replaced with command-scoped mock.
3. `ProjectsView` was not receiving `onNavigate` in `App.tsx` (caught by strict `tsc`, `error TS2741`).

## Production build

```powershell
npm run build --workspace apps/desktop
# dist/assets/index-4b6aa75U.js  258.05 kB │ gzip: 78.55 kB
# ✓ built in 1.21s
```

Rust: `cargo build` completes with **0 warnings** (an intermediate
`canonical_root is never used` warning appeared while the function was nested
inside `create` during refactoring; fixed by moving it to module scope).

## Live verification (dev app, 125% scale, `npm run tauri -- dev`)

Evidence in `phase2-evidence/`:

| Capture | Verifies |
|---|---|
| `new-presentation-form.png` | Real brief form (Title, Topic, Audience, Language, Duration) with hints; nav focus ring visible |
| `projects-list.png` | Created project listed with metadata, workspace path, Rename/Archive/Delete actions |
| `dashboard-recent.png` | Dashboard "Recent projects" shows the real project (was empty state in Phase 1) |
| `archive-confirm.png` | Archive requires explicit confirmation dialog ("Archive "…"? / Cancel / Confirm") |
| `settings-storage.png` | Project workspace root shown (`C:\Users\ARYA DUTA\Documents\Arya Duta Persentasion Studio\Projects`), "Default location (Documents based)" note, Change-location dialog entry point, app data path |

### Restart survival (acceptance criterion)

1. Project created through the form at 03:11:20Z → workspace folder
   `Documents\Arya Duta Persentasion Studio\Projects\d6e68d10-a788-4831-b77d-78f3c42b404f`
   with all 11 subfolders + `project.json`.
2. App process restarted (Rust rebuild ⇒ new process, PID changed 31336 → 17912).
3. Projects list still shows the project (`projects-after-restart.png`);
   database row and workspace folder intact.

### Archive / restore round trip

Archive dialog confirmed; `project.json` `status` transitioned and
`updated_at` changed (`03:11:20Z` → `03:15:44Z`) proving the metadata rewrite.
Project is back to `active`.

### Migration on an existing database

The dev app reuses the Phase 0 `poc.db`; migration 0002 applied on first
`project_list` call without touching the Phase 0 `poc_items` table or
`schema_migrations` history (validated by the idempotency test against a
v1-shaped database and by the live app keeping Phase 0 data).

## Console check

Browser attached to the same dev server: 1 message total (React DevTools info),
0 errors / 0 warnings.

## Not run / deferred

- Workspace location change through the UI dialog: the IPC command
  (`workspace_set_root`) and config round trip are unit-tested in Rust
  (atomic save, relative-path rejection); live dialog interaction left for
  owner use to avoid changing the current workspace configuration.
- Delete flow against a real project (destructive, and the only existing
  project is owner-created); confirmation dialog verified live for archive
  and by unit tests for delete; Rust tests cover the delete ordering
  (folder first, then row).
- File-permission failure injection (disk full / ACL denied): the ordering
  guarantee (filesystem first, database second) is the protection and is
  covered by the create-failure rollback test; exhaustive OS-level failure
  simulation is out of scope.

## Verdict

All Phase 2 acceptance criteria verified. No failing tests. No known
regressions (Phase 0 suites still pass; harness untouched).
