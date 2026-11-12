# Implementation Plan
## Arya Duta Persentasion Studio

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Proposed execution baseline |
| Platform | Windows 10/11 x64 |
| Architecture | Tauri 2 + Rust + React + TypeScript |
| Styling | Tailwind CSS v4 |
| Storage | SQLite + local project folders |
| AI | BYOK provider adapters |
| PPTX | PptxGenJS Node.js sidecar |
| Development agent | OpenCode |

---

## 1. Delivery strategy

Build a vertical slice early, then expand it.

Do not build every screen, agent, provider, parser, and slide layout before validating the core pipeline.

The first end-to-end milestone should prove:

1. Desktop application starts.
2. User can create a project.
3. User can configure a BYOK credential securely.
4. User can submit a small source document to a provider.
5. AI returns validated learning objectives and storyboard JSON.
6. User approves the storyboard.
7. PptxGenJS generates one editable slide.
8. The slide can be rendered and previewed.
9. User can revise and regenerate that slide.
10. The deck can be exported.

Use mocked AI responses for automated tests and development when paid API access is not needed.

## 2. Development phases

### Phase 0 — Architecture validation and repository foundation

**Objective:** Prove the technical stack and remove major packaging risks early.

Tasks:
- Create Git repository.
- Initialize Tauri 2 + React + TypeScript.
- Configure Tailwind CSS v4.
- Initialize Rust application services.
- Initialize SQLite and migration strategy.
- Create minimal PptxGenJS package.
- Build Node sidecar proof of concept.
- Verify sidecar invocation from Rust/Tauri.
- Detect LibreOffice availability.
- Generate a one-slide editable PPTX.
- Render the sample slide where LibreOffice is available.
- Create OpenCode project instructions and development agents.

Deliverables:
- Working desktop shell.
- Minimal SQLite database.
- Node sidecar proof of concept.
- One-slide PPTX generator.
- Environment setup documentation.
- `PHASE_0_REPORT.md`.

Acceptance criteria:
- App starts on a clean Windows development machine.
- Rust can invoke the bundled/development sidecar.
- Sidecar generates a valid editable PPTX.
- No user-installed Node.js is required for the packaged proof of concept.
- Renderer detection reports accurate status.
- Build and test commands are documented.

Approval gate: approve architecture and packaging direction before Phase 1.

### Phase 1 — Desktop UI foundation

**Objective:** Establish the application shell and navigation.

Tasks:
- Build app layout and sidebar.
- Build dashboard empty and recent-project states.
- Build settings navigation.
- Build reusable buttons, dialogs, inputs, tabs, and notifications.
- Implement loading, empty, error, and success states.
- Establish UI tokens and Tailwind theme.
- Add keyboard focus and accessibility basics.

Deliverables:
- Dashboard.
- Navigation.
- Settings shell.
- UI component foundation.
- `PHASE_1_REPORT.md`.

Acceptance criteria:
- Navigation works without a network connection.
- UI is usable at 1280×800 and Windows scaling settings.
- No major console errors.
- Loading and error states are present.

### Phase 2 — Local projects and persistence

**Objective:** Create reliable local project management.

Tasks:
- Implement SQLite migrations.
- Implement project repository and service.
- Create project workspace folders.
- Implement create, list, open, rename, archive, and delete.
- Persist project metadata and workflow stage.
- Implement atomic metadata writes and safe file operations.
- Add project recovery/error handling.

Deliverables:
- Project management UI.
- SQLite schema and migrations.
- Project workspace manager.
- Integration tests.

Acceptance criteria:
- Projects survive application restart.
- Deleting/archiving a project follows explicit confirmation.
- Paths remain inside the configured workspace.
- File errors do not corrupt database records.

### Phase 3 — BYOK and AI provider foundation

**Objective:** Securely connect the application to an AI provider.

Tasks:
- Define provider adapter interface.
- Select the first provider after a short API capability comparison.
- Implement credential entry and secure storage.
- Implement credential validation.
- Implement model selection.
- Implement timeout, cancellation, rate-limit, and error mapping.
- Implement structured JSON generation.
- Add usage reporting when provider responses expose usage.
- Add mock provider for tests.
- Add privacy confirmation before sending source content.

Deliverables:
- Provider settings UI.
- Rust provider service.
- Credential-store abstraction.
- Mock provider.
- Provider adapter tests.
- `PHASE_3_REPORT.md`.

Acceptance criteria:
- API key is not stored in SQLite, logs, project files, or frontend persistent storage.
- User can validate and remove credentials.
- Invalid credentials produce actionable errors.
- Mocked AI calls pass without a paid API.
- Provider request/response data is validated.

Approval gate: approve first provider and credential-storage implementation.

### Phase 4 — Source ingestion and extraction

**Objective:** Import and extract useful source content.

Tasks:
- Implement file picker and drag/drop.
- Build source inventory.
- Implement PDF and DOCX extraction first.
- Add TXT and Markdown.
- Add XLSX and PPTX according to validated parser capability.
- Preserve page, section, sheet, and slide references.
- Calculate checksums.
- Detect unsupported, corrupt, encrypted, and oversized files.
- Add extraction status and retry.
- Save extracted text in project files.
- Add source exclusion controls.

Deliverables:
- Source manager UI.
- Extraction services.
- Source inventory schema.
- Extraction tests and fixtures.

Acceptance criteria:
- Supported files show extraction status.
- Source references survive persistence.
- Failed extraction is visible and recoverable.
- Original files remain unchanged.
- No macros or embedded scripts are executed.

### Phase 5 — Learning intelligence

**Objective:** Turn source material into a grounded learning plan.

Tasks:
- Define audience and brief schema.
- Build source-grounded analysis prompt templates.
- Generate audience assumptions.
- Generate measurable learning objectives.
- Identify key concepts and prerequisites.
- Propose lesson progression and duration.
- Suggest assessment and reflection activities.
- Validate output schema and source references.
- Build learning plan review UI.

Deliverables:
- Learning plan engine.
- Prompt templates.
- Schema validators.
- Learning plan editor.
- `PHASE_5_REPORT.md`.

Acceptance criteria:
- Learning objectives are specific and reviewable.
- Source claims include traceable references when applicable.
- Unsupported assumptions are explicitly flagged.
- User can edit and approve the plan.

### Phase 6 — Storyboard engine and editor

**Objective:** Produce an editable slide-by-slide narrative.

Tasks:
- Define versioned storyboard schema.
- Generate slide sequence from approved learning plan.
- Assign each slide a pedagogical purpose.
- Define title, key message, supporting content, visual intent, and sources.
- Implement slide add, delete, duplicate, reorder, and edit.
- Implement storyboard approval gate.
- Persist approved storyboard version.

Deliverables:
- Storyboard generation.
- Storyboard editor.
- Slide identity and ordering model.
- Storyboard tests.

Acceptance criteria:
- Slide IDs remain stable when slides are reordered.
- User can modify all key storyboard fields.
- Storyboard approval is explicit.
- PPTX generation is blocked until approval.

Approval gate: approve storyboard workflow before visual production.

### Phase 7 — Editorial design system

**Objective:** Create a coherent editorial learning visual language.

Tasks:
- Define design token schema.
- Implement default Learning Journal theme.
- Define typography and font fallback handling.
- Define slide grid and safe margins.
- Build initial layout pattern catalog.
- Generate per-slide design specifications.
- Build design direction preview UI.
- Allow user to approve or revise the design direction.

Initial layout patterns:
- Editorial cover.
- Chapter opener.
- Big idea.
- Concept explanation.
- Annotated image.
- Step-by-step.
- Process map.
- Timeline.
- Comparison.
- Data editorial.
- Case study.
- Knowledge check.
- Reflection.
- Summary.
- References.

Deliverables:
- Design system.
- Theme tokens.
- Layout pattern specifications.
- Design direction preview.
- `PHASE_7_REPORT.md`.

Acceptance criteria:
- Layout patterns are selected according to content purpose.
- Repetitive card layouts are not the default.
- Theme tokens are applied consistently.
- User can approve the visual direction before deck generation.

Approval gate: approve design direction and first pattern catalog.

### Phase 8 — PPTX generation engine

**Objective:** Generate editable slides individually.

Tasks:
- Implement sidecar request/response contract.
- Implement theme loading.
- Implement text, shape, image, line, table, and chart components as scoped for MVP.
- Implement selected editorial layouts.
- Implement asset resolution and validation.
- Implement slide-level generation.
- Implement deck assembly from current approved slide versions.
- Implement versioned regeneration.
- Implement temporary output and atomic promotion.
- Add PPTX structural inspection.

Deliverables:
- PptxGenJS engine.
- Reusable components.
- Layout patterns.
- Slide generation service.
- Sample editable deck.
- Generation tests.

Acceptance criteria:
- One slide can be generated without changing unrelated slide specifications.
- Text and common shapes remain editable.
- Regeneration preserves prior versions.
- Failed generation does not overwrite the last good deck.
- Generated PPTX opens in a supported PowerPoint application.

### Phase 9 — Hybrid slide editor

**Objective:** Enable useful direct editing and AI-assisted revision.

Tasks:
- Build thumbnail navigator.
- Build central slide preview canvas.
- Build contextual properties panel.
- Build contextual chat panel.
- Implement direct text editing.
- Implement supported style edits.
- Implement supported move/resize operations.
- Implement AI slide patch request and validation.
- Show change summary and before/after preview.
- Implement apply/discard.
- Add stale-version conflict handling.
- Add local undo/redo where feasible.

Deliverables:
- Hybrid editor.
- Chat revision workflow.
- Direct editing.
- Slide version history.
- Editor tests.

Acceptance criteria:
- Chat is scoped to the selected slide or element.
- AI returns a patch, not arbitrary executable code.
- User can reject a proposed change.
- Direct edits persist and survive reopening.
- Stale AI responses do not overwrite newer user edits.

### Phase 10 — Rendering, QA, and export

**Objective:** Make output inspectable and safe to deliver.

Tasks:
- Detect LibreOffice and conversion dependencies.
- Render PPTX to PDF and PNG.
- Generate slide montage.
- Implement boundary and overflow checks.
- Implement missing-asset checks.
- Implement contrast and font-size checks.
- Build severity-ranked QA report.
- Link findings to affected slides.
- Implement PPTX export.
- Implement optional PDF export.
- Implement preview and project package export.

Deliverables:
- Rendering service.
- QA engine.
- QA review UI.
- Export manager.
- `PHASE_10_REPORT.md`.

Acceptance criteria:
- Every slide is rendered when a compatible renderer is available.
- QA report identifies structural problems.
- User can inspect every slide.
- PDF export is clearly marked unavailable when renderer is absent.
- Export does not overwrite a valid prior output until successful.

### Phase 11 — Packaging, security hardening, and release

**Objective:** Deliver a reliable Windows installer.

Tasks:
- Bundle Node sidecar and production dependencies.
- Configure Tauri Windows bundler.
- Select MSI, NSIS, or both after testing.
- Test clean installation.
- Test upgrade and uninstall.
- Verify project data retention.
- Verify credential-store behavior.
- Review Tauri capabilities.
- Review path traversal and archive extraction protections.
- Review log redaction.
- Run dependency and vulnerability checks.
- Run full automated test suite.
- Create release notes and user documentation.
- Create signed installer if certificate is available.

Deliverables:
- Windows installer.
- Release package.
- User guide.
- Security checklist.
- Regression test report.
- `RELEASE_NOTES.md`.

Acceptance criteria:
- Installer works on a clean supported Windows environment.
- User does not need Node.js installed.
- App can detect missing optional renderer.
- API secrets remain in OS credential storage.
- Uninstall does not silently delete user projects.
- Critical regression tests pass.

## 3. Milestone plan

| Milestone | Included phases | Outcome |
|---|---|---|
| M0 — Technical proof | 0 | Tauri + Rust + sidecar + sample PPTX |
| M1 — Desktop foundation | 1–2 | Usable app and local projects |
| M2 — AI foundation | 3–4 | Secure BYOK and source ingestion |
| M3 — Learning workflow | 5–6 | Approved learning plan and storyboard |
| M4 — Design and generation | 7–8 | Editorial design and editable PPTX |
| M5 — Editing experience | 9 | Hybrid slide editor |
| M6 — Quality and release | 10–11 | QA, export, Windows installer |

## 4. OpenCode development workflow

OpenCode is a development-time tool. It is not embedded in the released application.

Suggested project agents:
- `project-orchestrator`: coordinates implementation and reads project docs.
- `rust-tauri-engineer`: Tauri commands, Rust services, SQLite, secure storage.
- `frontend-engineer`: React, TypeScript, Tailwind, workspace and editor UI.
- `ai-integration-engineer`: provider adapters, schemas, prompt orchestration.
- `pptx-engineer`: PptxGenJS components, layouts, sidecar, export.
- `qa-reviewer`: tests, rendering, security review, regression review.

Suggested skills:
- `tauri-rust-development`
- `react-tailwind-desktop-ui`
- `sqlite-local-first`
- `byok-provider-integration`
- `document-ingestion`
- `instructional-design`
- `editorial-presentation-design`
- `pptxgenjs-engineering`
- `visual-slide-qa`
- `windows-packaging`

Agent/skill definitions should be implemented in Phase 0/1 and must follow the installed OpenCode version's current configuration conventions.

### Standard OpenCode phase prompt

```text
Read AGENTS.md, PRD.md, DESIGN.md, TECHNICAL_SPEC.md,
and IMPLEMENTATION_PLAN.md before making changes.

Implement only the requested phase.

First:
1. Inspect the existing repository.
2. Identify completed work and gaps.
3. Propose a concise task plan.
4. Identify risks and dependencies.

Then implement:
- Follow the locked architecture decisions.
- Do not silently change product scope.
- Keep code modular and typed.
- Add or update tests.
- Do not fabricate successful test results.
- Do not skip security requirements.

Before completion:
1. Run relevant tests and builds.
2. Inspect changed files.
3. Document known limitations.
4. Update the phase report.
5. List exact commands and results.
6. Stop and wait for approval before the next phase.
```

## 5. Definition of done for every phase

A phase is complete only when:
- Scope is implemented.
- Relevant tests pass.
- Build succeeds.
- Errors and limitations are documented.
- Security implications are reviewed where applicable.
- User-visible behavior is demonstrated.
- Acceptance criteria are checked individually.
- No unapproved architecture changes are introduced.
- A phase report exists.
- User approves progression to the next phase.

## 6. MVP scope control

If schedule or complexity becomes a concern, protect this core path:

**Create project → Configure BYOK → Import PDF → Generate learning plan → Approve storyboard → Approve design → Generate one slide → Edit/revise slide → Export PPTX → Render and inspect.**

Defer advanced animations, collaboration, extensive template marketplace features, and complex shape editing until the core path is reliable.

## 7. Release checklist

- [ ] Tauri desktop app builds.
- [ ] Rust services and SQLite migrations pass.
- [ ] BYOK secret storage passes security tests.
- [ ] Provider adapter handles errors and rate limits.
- [ ] Source extraction preserves references.
- [ ] Learning plan and storyboard are schema-validated.
- [ ] Approval gates are enforced.
- [ ] Slide generation is per-slide and versioned.
- [ ] Hybrid editing persists changes.
- [ ] PPTX output is editable.
- [ ] Rendering and QA work when renderer is installed.
- [ ] Missing renderer is handled transparently.
- [ ] Installer works on clean Windows.
- [ ] User data survives upgrade/uninstall as specified.
- [ ] Documentation and release notes are complete.
