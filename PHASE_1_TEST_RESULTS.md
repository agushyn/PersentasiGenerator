# Phase 1 — Test Results

Project: Arya Duta Persentasion Studio
Phase: 1 — Desktop UI foundation
Date: 2026-11-12
Environment: Windows 11, display scale 125% (devicePixelRatio 1.25), Rust 1.99.1 stable-msvc, Node v26.10.0

## Summary

| Suite | Result | Count |
|---|---|---|
| Frontend unit tests (Vitest + Testing Library, jsdom) | ✅ pass | 17 / 17 |
| Rust tests (regression, no Rust changes in Phase 1) | ✅ pass | 6 / 6 |
| Production frontend build (strict `tsc` + Vite) | ✅ pass | — |
| Manual UI walkthrough at 1280×800 logical (125% scale) | ✅ pass | 7 views |
| Console error check | ✅ pass | 0 errors / 0 warnings |

## Frontend unit tests

Command:

```powershell
npm test --workspace apps/desktop
```

Result (final run after all Phase 1 code changes):

```
Test Files  5 passed (5)
     Tests  17 passed (17)
```

Coverage by file:

| File | Tests | What is verified |
|---|---|---|
| `src/components/ui/Button.test.tsx` | 2 | renders label, click handler fires; disabled state is inert |
| `src/components/ui/Dialog.test.tsx` | 3 | closed renders nothing; opens with focus on first control and closes on Escape; Tab focus cycles inside dialog |
| `src/components/ui/Tabs.test.tsx` | 3 | panel switching on click; tablist/tabpanel ARIA semantics; Arrow Left/Right moves selection (roving tabindex) |
| `src/components/ui/Notifications.test.tsx` | 3 | toast appears and auto-dismisses after 5 s; dismiss via close button; hook throws outside provider |
| `src/features/dashboard/DashboardView.test.tsx` | 6 | primary action navigates; recent-projects empty state; loading skeleton state; error state with working Retry; renderer status line; layout nav (5 destinations, `aria-current` marking, first-Tab focus lands on nav) |

Test setup notes:

- `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` and registers `afterEach(cleanup)` (auto-cleanup is off because Vitest `globals: false`).
- Tauri IPC (`app_status`) is mocked via `vi.mock` at the hook level; jsdom has no Tauri runtime. Both success and failure hook states are exercised.
- The notification auto-dismiss test uses real timers with `vi.waitFor` (timeout 10 s) instead of fake timers, which hang `userEvent`.

## Rust regression tests

Command:

```powershell
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml
```

Result:

```
test result: ok. 6 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

No Rust code was changed in Phase 1. The suite confirms the Phase 0 backend contract still holds (`app_status`, DB PoC, sidecar, credentials).

## Production build

Command:

```powershell
npm run build --workspace apps/desktop
```

Result: passes strict `tsc` and Vite build.

```
dist/index.html                   0.41 kB
dist/assets/index-35hkBlc9.css   20.43 kB │ gzip:  4.69 kB
dist/assets/index-DDUKnkX4.js   248.01 kB │ gzip: 76.25 kB
✓ built in 902ms
```

One build failure occurred during development and was fixed: unused import `vi` in `Tabs.test.tsx` (`error TS6133`). No type errors remain.

## Manual UI walkthrough (dev app, 125% display scale)

Method: `npm run tauri -- dev`; navigation driven with UI Automation
(`scripts/invoke-button.ps1`); captures via `scripts/capture-window.ps1`
(both scripts run per-monitor-DPI-aware; see "Environment findings" below).
All captures at the production window size: 1280×800 logical = 1618×1047 physical at 125%.

Evidence in `phase1-evidence/`:

| Capture | Verifies |
|---|---|
| `dashboard.png` | Sidebar with 5 nav items + active state; primary and secondary actions; recent-projects empty state with next action; setup hint with "Not configured" badge; renderer status line (LibreOffice absent, honest wording) |
| `new-presentation.png` | Honest planned-state notice ("Phase 2 planned") — no fake form; Back action |
| `projects.png` | Empty state, "Phase 2 planned" badge |
| `design-library.png` | Empty state, "Phase 7 planned" badge |
| `settings.png` | Settings shell with 6 sections as accessible tabs (AI Providers default panel, BYOK copy) |
| `settings-diagnostics.png` | Diagnostics tab: app version, Phase 0 harness entry point |
| `harness.png` | Phase 0 validation harness fully functional in the new shell: app status (sidecar found, DB path), SQLite PoC with an existing row from the previous session (persistence across runs), sidecar and credential panels |

### Acceptance criteria verification

| Criterion (IMPLEMENTATION_PLAN) | Result | Evidence |
|---|---|---|
| Navigation works without a network connection | ✅ | View switching is pure React state; the only IPC call is local `app_status`. No fetch/XHR/WebSocket in app code. UIA-driven navigation exercised every destination. |
| UI usable at 1280×800 and Windows scaling | ✅ | Captured at 1280×800 logical with 125% scale (1618×1047 physical). Live DOM metrics during development confirmed `scrollWidth == innerWidth == 1280` (no horizontal overflow) and the content container centered at 768 px inside the 1040 px content region. 150% scale was not separately captured (see "Not run"). |
| No major console errors | ✅ | Browser console attached to the same Vite dev server shows exactly one `info` message (React DevTools advertisement) and zero errors/warnings. IPC failure in the plain-browser context is handled by the error state, not thrown. |
| Loading and error states are present | ✅ | `useAppStatus` has loading (Skeleton), error (ErrorState + Retry), and success branches; unit tests cover each branch. |

### Additional manual checks

- Tab keyboard navigation in the running app: focus moves through sidebar items with a visible focus ring (`focus-visible` styles); first Tab lands on the first nav item (unit-tested).
- Dialog (delete-row confirmation) exercised through the harness panel: Escape closes, focus is trapped and restored (unit-tested).
- Toasts appear for sidecar/credential/DB actions in the harness and auto-dismiss.

## Environment findings (documented for future phases)

1. **DPI virtualization trap.** A non-DPI-aware helper process gets virtualized
   coordinates for a 125%-scaled window (1294×838 instead of 1618×1047) and
   PrintWindow captures crop the window. Both `scripts/capture-window.ps1` and
   `scripts/invoke-button.ps1` now call `SetProcessDpiAwarenessContext(-4)`
   (per-monitor aware v2) first. Future automation scripts must do the same.
2. **UIA coordinate/pattern behavior in WebView2.** HTML buttons exposed
   `InvokePattern` correctly from a DPI-aware process; `role="tab"` elements map
   to `ControlType.TabItem` and respond to `SelectionItemPattern.Select()`.
   Coordinate-click fallbacks are unreliable for WebView2 (element rects are
   reported in a logical space); prefer UIA patterns.
3. **Vite HMR in the Tauri window** works; stale-view confusion during this
   phase was caused by the cropped captures, not by stale code.

## Not run / deferred

- **150% / 175% display scaling capture** — the same per-monitor-aware rendering
  path applies; capture tooling is now DPI-safe. To be spot-checked in the
  Phase 10/11 QA pass.
- **Console check inside the packaged WebView2 release build** — verified on the
  dev server (same bundle source); a release-build console review belongs to
  Phase 11 packaging QA.
- **Automated end-to-end UI tests against the running Tauri window** — out of
  scope for Phase 1; manual UIA walkthrough used instead.

## Verdict

All Phase 1 acceptance criteria verified. No failing tests. No known regressions
against Phase 0 functionality (Rust suite 6/6, harness functional in the new
shell, PPTX/DB/credential flows untouched).
