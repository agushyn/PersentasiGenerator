# Phase 0 — Architecture Decisions

Product: **Arya Duta Persentasion Studio**
Date: 2026-11-11
Status: Phase 0 evidence (spikes and proof-of-concept only)

This document records technical decisions made during Phase 0 architecture
validation. Locked technology decisions from `AGENTS.md` remain unchanged:
Tauri 2, Rust, React + TypeScript, Tailwind CSS v4, SQLite, PptxGenJS, BYOK,
Windows, OpenCode as a development-only agent.

---

## D0. Product naming / branding

- **Decision:** The official product name is **Arya Duta Persentasion Studio**
  (owner instruction, 2026-11-11).
- **Applied in:** `tauri.conf.json` (`productName`, window title),
  `Cargo.toml` package name (`arya-duta-persentasion-studio`), root
  `package.json`, `apps/desktop/index.html`, `main.rs` fallback title,
  credential service name, PPTX document metadata (author/company),
  and the Phase 0 validation UI.
- **Conflict with documentation:** resolved on 2026-11-12 — the owner
  approved the official name; all five project documents
  (`AGENTS.md`, `PRD.md`, `DESIGN.md`, `TECHNICAL_SPEC.md`,
  `IMPLEMENTATION_PLAN.md`) now use **Arya Duta Persentasion Studio** in
  product-name positions. Phase 0 evidence documents keep their historical
  wording. The application identifier remains
  `com.aryaduta.persentasionstudio`.
- **App identifier:** `com.aryaduta.persentasionstudio` (drives Windows
  app-data paths and the NSIS uninstall registry entry).

## D1. Package manager: npm workspaces (not pnpm)

- **Context:** `TECHNICAL_SPEC.md` section 4 suggests a pnpm workspace.
  The machine has Node v26.10.0 with npm 11.19.1; corepack/pnpm is not
  available and Node 26 no longer ships corepack by default.
- **Decision:** npm workspaces (`package.json` `workspaces` field covering
  `apps/desktop` and `packages/pptx-engine`).
- **Impact:** none on locked decisions; pnpm can still be adopted later —
  workspace layout is compatible.

## D2. Repository layout (Phase 0 slice)

Only folders needed for the first vertical slice were created, per
`TECHNICAL_SPEC.md` section 4 note:

```
apps/desktop/            Tauri 2 + React + TS + Tailwind v4
apps/desktop/src-tauri/  Rust backend, capabilities, migrations, binaries, resources
packages/pptx-engine/    PptxGenJS sidecar engine (src + bundled dist)
scripts/                 build-sidecar.ps1, make-icon.ps1, capture-window.ps1
phase0-evidence/         screenshots and generated proof-of-concept artifacts
```

## D3. Node.js sidecar strategy: externalBin + bundled runtime + single-file engine

- **Context:** Users must never install Node.js (locked). PptxGenJS is a
  pure-JS library that needs a Node runtime.
- **Decision:**
  1. The official Node.js runtime (v26.10.0, win-x64) is downloaded once by
     `scripts/build-sidecar.ps1` and installed as a Tauri `externalBin`
     (`src-tauri/binaries/node-x86_64-pc-windows-msvc.exe`).
  2. The pptx-engine TypeScript/ESM source is bundled by esbuild into a
     single CJS file (`packages/pptx-engine/dist/cli.cjs`, ~700 KB) and
     shipped as a Tauri bundle **resource** at `pptx-engine/cli.cjs`.
  3. The Rust backend spawns the sidecar with `std::process::Command`
     (not the shell plugin), writes the JSON manifest to stdin, closes
     stdin (EOF signal), reads one JSON result line from stdout, and enforces
     a 60 s timeout with process kill.
- **Runtime resolution:** the installed bundle strips the target triple from
  external binaries (`node.exe`); dev builds keep the triple-suffixed name.
  `sidecar.rs::resolve_node_exe` therefore tries, in order:
  `exe_dir/node.exe` (installed), `exe_dir/node-x86_64-pc-windows-msvc.exe`
  (dev), `CARGO_MANIFEST_DIR/binaries/node-…exe` (source checkout).
  The engine script resolves as `exe_dir/pptx-engine/cli.cjs` (installed)
  or the repo checkout path.
- **Resource path constraint:** Tauri build-time resource validation rejects
  `../`-relative paths outside `src-tauri`; the build script therefore copies
  `packages/pptx-engine/dist/cli.cjs` into
  `src-tauri/resources/pptx-engine/cli.cjs`, which the config references.
- **Rejected alternatives:** Node SEA single-executable (more build
  complexity for one extra layer), pkg/nexe (deprecated), spawning a
  user-installed `node` (violates the locked rule).

## D4. Sidecar contract (Phase 0)

- stdin: one JSON manifest (`schema_version`, `output_path`, `slides[]`),
  terminated by EOF.
- stdout: exactly one JSON result line
  (`{ok, output_path, slide_count}` or `{ok:false, error_code, message}`).
- stderr: diagnostics only; exit code 0 success / 2 failure.
- Stable error codes: `SLIDE_SPEC_INVALID`, `PPTX_GENERATION_FAILED`,
  `SIDECAR_NOT_FOUND`, `SIDECAR_TIMEOUT`, `SIDECAR_UNREACHABLE`
  (aligned with `TECHNICAL_SPEC.md` section 14).
- The sidecar validates the manifest independently (defense in depth),
  writes to a temp file, verifies non-empty output, then promotes
  atomically by rename. A failed generation never overwrites a good deck.
- The sidecar never receives credentials and never executes
  model-generated code (locked rules; manifest comes from Rust only).

## D5. SQLite: rusqlite with bundled feature, versioned migration runner

- **Decision:** `rusqlite` 0.37 with `bundled` (SQLite compiled into the
  binary; no external SQLite dependency), single connection per command for
  the Phase 0 scope, migrations tracked in a `schema_migrations` table and
  applied in a transaction per migration.
- `schema_migrations` versioning satisfies the "use migrations" locked rule
  before the production schema lands in Phase 2.
- Database location: Tauri `app_data_dir` resolved at runtime
  (`%APPDATA%\com.aryaduta.persentasionstudio\poc.db` in this environment).
- Production schema from `TECHNICAL_SPEC.md` section 6 is **not** created in
  Phase 0 (per instruction: do not create the full schema yet).
- SQLx alternative not chosen: one database layer only (spec rule), and
  rusqlite's synchronous model matches desktop command handlers.

## D6. Windows Credential Manager via keyring crate

- **Decision:** `keyring` 3 (`windows-native` feature only) wrapping
  Windows Credential Manager. Service name:
  `Arya Duta Persentasion Studio`; account: provider/profile reference.
- **BYOK flow validated:** store (set), presence check (no secret returned),
  delete. The frontend can only store/check/delete through typed IPC
  commands; no command ever returns a secret.
- Production AI-provider integration stays in Phase 3.

## D7. Renderer (LibreOffice) is optional and detected at runtime

- Detection searches `PATH` and the two standard Windows install locations
  for `soffice.exe` and reports an accurate status over IPC.
- In this environment LibreOffice is **absent**; the app reports
  "LibreOffice not found (preview rendering and PDF export unavailable)".
  Render-based visual QA is therefore **not executed** in Phase 0 —
  this is a documented environment limitation, not a validation pass.

## D8. IPC surface and capabilities

- Nine typed commands registered for Phase 0
  (`app_status`, `db_poc_insert/list/update/delete`,
  `sidecar_generate_poc`, `credential_poc_set/status/delete`).
- Errors serialize as `{code, message}` with stable codes.
- Capabilities: only `core:default` for the `main` window. No filesystem,
  shell, dialog, or http plugin permissions are granted to the frontend.
- Sidecar spawning is Rust-internal; the frontend has no shell access.

## D9. Testing added in Phase 0

- `db`: migration idempotency, CRUD round trip, persistence across
  connections (temp-dir SQLite files).
- `sidecar`: path resolution presence, end-to-end sidecar run producing a
  structurally verified PPTX.
- `credentials`: real Windows Credential Manager round trip and input
  validation rejects.
- Packaging: silent NSIS install verified; installed layout checked; the
  installed application launches with correct branding (see
  `PHASE_0_TEST_RESULTS.md`).

## D10. Known gaps deferred to later phases (by design)

- No production database schema (Phase 2).
- No AI provider adapters, BYOK settings UI, or request pipeline (Phase 3).
- No product UI — the window is an engineering harness (Phase 1).
- No per-slide regeneration/versioning (Phase 8).
- No rendering/QA pipeline (Phase 10); LibreOffice absent in this
  environment.
- No code signing (no certificate available).
