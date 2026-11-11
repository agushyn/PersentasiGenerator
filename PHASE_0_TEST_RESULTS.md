# Phase 0 — Test Results

Product: **Arya Duta Persentasion Studio**
Environment: Windows (build 26300, x64), Node v26.10.0, npm 11.19.1,
Rust 1.99.1 (stable-x86_64-pc-windows-msvc), MSVC Build Tools 2022,
WebView2 Runtime 157.0.4341.42, Microsoft PowerPoint available via COM.

All results below were actually executed. Anything not run is explicitly
marked as such.

---

## 1. Environment verification

| Check | Command / method | Result |
|---|---|---|
| Node.js | `node --version` | v26.10.0 (dev machine only; end users get bundled runtime) |
| npm | `npm --version` | 11.19.1 |
| Rust toolchain | `rustup-init.exe -y --default-toolchain stable-msvc --profile minimal` | rustc/cargo 1.99.1 installed |
| MSVC linker | `vswhere -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64` | VS 2022 Build Tools present |
| WebView2 | registry `EdgeUpdate\Clients\{F3017226-…}` | 157.0.4341.42 present |
| Git | `git --version` | 2.56.0.windows.1; repository initialized |
| LibreOffice | PATH + `C:\Program Files\LibreOffice\program\soffice.exe` checks | **not installed** (optional renderer) |
| pnpm | `pnpm --version`, `corepack --version` | not available; npm workspaces used instead |

## 2. Rust unit and integration tests

Command: `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml`
Result: **6 passed; 0 failed**

| Test | What it proves |
|---|---|
| `db::migrations_are_idempotent_and_crud_round_trips` | Migration applied once, re-run is no-op; insert/list/update/delete correct |
| `db::database_persists_across_connections` | Data survives close/reopen (persistence) |
| `sidecar::resolution_helpers_do_not_panic_and_report_presence` | Sidecar exe + engine script resolve in dev layout |
| `sidecar::end_to_end_sidecar_generates_valid_pptx` | Rust spawns bundled Node, sends JSON manifest on stdin, receives contract JSON, artifact verified (exists, non-empty, ZIP magic `PK\x03\x04`) |
| `credentials::windows_credential_manager_round_trip` | Real Windows Credential Manager set/presence/delete |
| `credentials::rejects_bad_accounts_and_empty_secrets` | Input validation (empty/badline accounts, empty secret) |

## 3. Frontend build (TypeScript strict + Vite)

Command: `npm run build --workspace apps/desktop`
Result: **pass** — `tsc` strict clean, Vite production build
(`index.html` 0.41 kB, CSS 13.30 kB, JS 229.76 kB).

## 4. Sidecar contract checks (direct CLI runs)

Manifest piped to `packages\pptx-engine\dist\cli.cjs`:

- Valid manifest → `{"ok":true,"output_path":…,"slide_count":3}` and file
  written (phase0-evidence/phase0-poc.pptx, 60,624 bytes).
- Bug found and fixed during validation: PptxGenJS appends `.pptx` to any
  fileName lacking that suffix, which broke the `.tmp` temp-file naming.
  Temp name is now `.<name>.tmp.pptx`. Re-tested: pass.

## 5. PPTX structural validation

Method: expanded the generated `.pptx` (as ZIP) and inspected XML parts.

| Check | Result |
|---|---|
| ZIP/OOXML container (magic bytes, `[Content_Types].xml`, `_rels/.rels`) | pass |
| Slide count | 3 (`ppt/slides/slide1..3.xml`) |
| Slide 1 (editorial cover) | 3 editable text runs (`<a:t>`): kicker, title, subtitle |
| Slide 2 (editable text) | text bodies present (`<p:txBody>`), 2 editable runs |
| Slide 3 (editable shapes) | 3 native shapes (`<a:prstGeom>`: rect, ellipse, rect) each carrying editable text (`<a:t>`) |
| 16:9 slide size | `<p:sldSz cx="12192000" cy="6858000">` exact standard 16:9 |
| Flattened images | none — no slide is rendered as an image |

## 6. Microsoft PowerPoint open test (real application)

Method: PowerPoint COM automation
(`PowerPoint.Application` → `Presentations.Open(…, ReadOnly, WithWindow:=false)`).

Result: **pass**
- File opened without repair prompt or error.
- Slides: 3.
- Slide 2 shapes: 3. Slide 3 shapes: 3.

This confirms the generated deck is valid, opens in Microsoft PowerPoint,
and its elements are real PowerPoint objects.

## 7. Dev application run (`tauri dev`)

Result: **pass** — window launched, title **"Arya Duta Persentasion Studio"**.
Evidence: `phase0-evidence/dev-app.png` (screenshot).

Observed on screen (proves live Tauri IPC):
- `app_status` command round-trip rendered: app name/version, DB path,
  sidecar exe found, engine script found, renderer status accurate.
- `db_poc_list` executed on mount → `poc.db` created at
  `C:\Users\ARYA DUTA\AppData\Roaming\com.aryaduta.persentasionstudio\poc.db`.

Issue found and fixed: Vite dev-server watcher crashed on locked
`target\debug\*.pdb` files (EBUSY) → `server.watch.ignored: ["**/src-tauri/**"]`
added to `vite.config.ts`.

## 8. Windows packaging test

Command: `npm run tauri -- build` (target: NSIS)
Result: **pass**

| Check | Result |
|---|---|
| Release Rust build | pass (LTO, strip) |
| NSIS installer produced | `Arya Duta Persentasion Studio_0.1.0_x64-setup.exe` (27.75 MiB) |
| Silent install `/S` | exit code 0 |
| Installed location | `C:\Users\ARYA DUTA\AppData\Local\Arya Duta Persentasion Studio` |
| Uninstall registry entry (HKCU) | `DisplayName: Arya Duta Persentasion Studio`, `DisplayVersion: 0.1.0` |
| Sidecar bundled | `node.exe` (104,714,056 bytes) installed next to app exe |
| Engine resource bundled | `pptx-engine\cli.cjs` (715,442 bytes) |
| Installed app launches | pass — window titled "Arya Duta Persentasion Studio" (see evidence) |

**User-machine implication:** a machine without Node.js or OpenCode runs the
installed app and its PPTX generation, because Node.exe and the engine are
inside the installer.

Sidecar resolution fix validated during packaging: installed bundles strip
the target triple (`node.exe` not `node-x86_64-pc-windows-msvc.exe`);
`resolve_node_exe` now covers both layouts (rebuild + reinstall pass).

## 9. Credential storage checks

- Windows Credential Manager round trip through the `keyring` crate: pass
  (unit test above).
- SQLite contains no credential data: the Phase 0 schema (`poc_items`,
  `schema_migrations`) has no credential columns; only an opaque account
  string ever leaves the frontend.
- Frontend receives only booleans (`credential_poc_status`); no command
  returns a secret; no secret is logged (grep of Rust sources: no
  secret logging; secrets are only passed to the keyring entry).
- localStorage/sessionStorage usage: none (no usage in frontend source).

## 10. Not run / blocked

| Item | Status | Reason |
|---|---|---|
| LibreOffice rendering of the sample deck | **not run** | LibreOffice not installed; optional in MVP |
| PDF export | **not run** | depends on renderer |
| Signed installer | **not run** | no code-signing certificate |
| Clean-room machine test (fresh Windows without dev tooling) | **not run** | single machine available; dev machine also has Node installed (bundled runtime still verified present and used inside the installer) |
| UI click-through of harness buttons | **not run (automated)** | no UI automation in Phase 0; equivalent paths covered by Rust tests (db CRUD, sidecar generate, credentials) and live IPC evidence from `app_status`/`db_poc_list` |
| Upgrade/uninstall data-retention behavior | **not run** | Phase 11 scope; uninstall exists and is registered. Verified once: silent uninstall removed program files and **kept** `%APPDATA%\com.aryaduta.persentasionstudio` (poc.db, exports) |
