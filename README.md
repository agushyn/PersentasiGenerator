# Arya Duta Persentasion Studio

AI-assisted Windows desktop application for creating professional, editable
PowerPoint presentations. Tauri 2 + Rust + React + TypeScript + Tailwind CSS
v4 + SQLite + PptxGenJS (Node.js sidecar) + BYOK AI providers.

## Documentation

1. `PRD.md` — product requirements
2. `DESIGN.md` — visual system and UX
3. `TECHNICAL_SPEC.md` — architecture and implementation
4. `IMPLEMENTATION_PLAN.md` — phases and acceptance criteria
5. `PHASE_0_REPORT.md`, `PHASE_0_TEST_RESULTS.md`,
   `PHASE_0_ARCHITECTURE_DECISIONS.md` — Phase 0 evidence

## Development environment (Windows)

| Tool | Version | Notes |
|---|---|---|
| Node.js + npm | ≥ 20 tested with 26.10.0 | dev machine only; end users get the bundled runtime |
| Rust (MSVC) | ≥ 1.77 tested with 1.99.1 | `rustup-init.exe -y --default-toolchain stable-msvc --profile minimal` |
| MSVC Build Tools | VS 2022 with `VC.Tools.x86.x64` | required by the Rust MSVC toolchain |
| WebView2 Runtime | recent | preinstalled on Windows 10/11 |
| Git | any recent | |
| LibreOffice (optional) | any | enables slide rendering/PDF export; app detects absence |

## Repository layout

```
apps/desktop/            Tauri 2 + React + TS + Tailwind v4 (npm workspace)
packages/pptx-engine/    PptxGenJS sidecar engine (npm workspace)
scripts/                 build-sidecar.ps1, make-icon.ps1, ...
phase0-evidence/         Phase 0 artifacts and screenshots
```

## Standard commands

```powershell
# First-time setup (repository root)
npm install --no-fund --no-audit
powershell -ExecutionPolicy Bypass -File scripts/make-icon.ps1      # app icon (once)
powershell -ExecutionPolicy Bypass -File scripts/build-sidecar.ps1  # bundle engine + fetch Node runtime

# Frontend build (strict TypeScript + Vite)
npm run build --workspace apps/desktop

# Rust tests
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml

# Run in development
cd apps\desktop
npm run tauri -- dev

# Package (NSIS installer, bundles Node sidecar)
cd apps\desktop
npm run tauri -- build
# Output: src-tauri\target\release\bundle\nsis\Arya Duta Persentasion Studio_<version>_x64-setup.exe
```

## Sidecar notes

- `scripts/build-sidecar.ps1` pins the Node runtime (currently `v26.10.0`)
  and installs it as `apps/desktop/src-tauri/binaries/node-x86_64-pc-windows-msvc.exe`
  (git-ignored, re-fetchable). To upgrade Node, change `$nodeVersion` there.
- The engine bundle is copied into `apps/desktop/src-tauri/resources/pptx-engine/`
  by the same script because Tauri resource paths must live inside `src-tauri`.

## Security rules (enforced)

- API keys never in SQLite, logs, project files, or frontend storage —
  Windows Credential Manager via the `keyring` crate; the frontend receives
  presence booleans only.
- The PptxGenJS sidecar never receives credentials and never executes
  model-generated code; it reads a validated manifest from stdin only.
- No AI output is ever executed as code.
