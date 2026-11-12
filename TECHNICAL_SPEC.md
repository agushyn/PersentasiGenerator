# Technical Specification
## Arya Duta Persentasion Studio

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Baseline technical architecture |
| Platform | Windows 10/11 x64 |
| Desktop | Tauri 2 |
| Backend | Rust |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite |
| PPTX generation | PptxGenJS |
| AI integration | BYOK provider adapters |
| Development agent | OpenCode |

---

## 1. Architecture overview

Arya Duta Persentasion Studio is a local-first desktop application.

The Tauri application owns:
- Window lifecycle.
- Filesystem permissions.
- Secure credential access.
- SQLite access.
- Workflow orchestration.
- Provider API requests.
- Sidecar process lifecycle.
- Application events and progress reporting.

The React frontend owns:
- User interface.
- Project workspace interactions.
- Storyboard and design editors.
- Slide canvas interaction.
- Chat input and response display.
- Rendering and QA result presentation.

The Node.js/PptxGenJS sidecar owns:
- PPTX generation.
- PPTX inspection utilities where appropriate.
- Rendering orchestration integration.
- Asset packaging into the deck.

Document extraction may use Rust libraries where practical and specialized bundled utilities for formats that are difficult to parse reliably. Avoid introducing Python as a mandatory runtime unless a validated requirement justifies it.

## 2. Runtime architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    Tauri 2 Desktop App                    │
│                                                           │
│  ┌──────────────────────┐   ┌───────────────────────────┐ │
│  │ React + TypeScript   │   │ Rust Application Backend  │ │
│  │ Tailwind CSS v4      │◄─►│                           │ │
│  │                      │   │ - Commands / IPC           │ │
│  │ - Dashboard          │   │ - Project service          │ │
│  │ - Project workspace  │   │ - SQLite repository        │ │
│  │ - Storyboard editor  │   │ - AI provider adapters     │ │
│  │ - Slide editor       │   │ - Credential store         │ │
│  │ - Chat panel         │   │ - Workflow orchestration   │ │
│  │ - QA / export UI     │   │ - Filesystem service       │ │
│  └──────────────────────┘   └─────────────┬─────────────┘ │
└───────────────────────────────────────────┼───────────────┘
                                            │
                  ┌─────────────────────────┼──────────────────┐
                  │                         │                  │
                  ▼                         ▼                  ▼
          ┌──────────────┐        ┌────────────────┐   ┌──────────────┐
          │ AI Providers │        │ Node Sidecar   │   │ Local Tools  │
          │              │        │                │   │              │
          │ OpenAI       │        │ PptxGenJS      │   │ LibreOffice  │
          │ Gemini       │        │ PPTX build     │   │ Optional     │
          │ Anthropic    │        │ PPTX inspect   │   │ Renderer     │
          │ OpenRouter   │        │                │   │              │
          └──────────────┘        └────────────────┘   └──────────────┘

          SQLite + Local Project Workspace + OS Credential Store
```

## 3. Technology decisions

### 3.1 Tauri 2
Use Tauri 2 for Windows desktop packaging, secure IPC, filesystem integration, and sidecar management.

Requirements:
- Use the official Tauri capability/permission model.
- Grant only the filesystem and command permissions required.
- Do not expose arbitrary shell execution to the frontend.
- Validate all IPC inputs in Rust.
- Keep long-running tasks asynchronous.

### 3.2 Rust
Rust owns application services and trusted operations.

Suggested crates (verify current stable compatibility before pinning):
- `serde`, `serde_json` for serialization.
- `tokio` for async runtime where needed.
- `rusqlite` or SQLx for SQLite; choose one and standardize.
- `reqwest` for HTTP provider calls.
- `keyring` or a Windows Credential Manager integration for secrets.
- `thiserror` / `anyhow` for error handling.
- `tracing` for structured, redacted diagnostics.
- `uuid` for identifiers.
- `chrono` or `time` for timestamps.
- `sha2` for file checksums where useful.

Avoid maintaining two database abstraction layers.

### 3.3 React + TypeScript + Tailwind CSS v4
Use React for desktop UI, TypeScript for contracts and UI state, and Tailwind CSS v4 for styling.

Recommended supporting libraries:
- A lightweight router or state-driven view navigation.
- TanStack Query for async server/command state if justified.
- Zustand for local editor/workspace state if justified.
- Zod for frontend validation of AI and persisted payloads.
- A drag-and-drop library for storyboard ordering.
- A canvas/SVG interaction library only after the editor interaction model is validated.

Do not add dependencies without a concrete requirement.

### 3.4 SQLite
SQLite stores local metadata and structured workflow artifacts. Large binary files should remain in the project filesystem, not in database BLOB columns.

### 3.5 PptxGenJS sidecar
Use PptxGenJS from a bundled Node.js sidecar.

The sidecar:
- Receives a validated generation manifest.
- Reads only approved project assets.
- Generates a PPTX to a controlled output path.
- Returns structured success/failure information.
- Never receives API credentials.
- Never executes model-generated JavaScript.
- Must have explicit timeouts and process cleanup.

Node.js should be bundled with the sidecar runtime so the user does not need to install Node.js.

### 3.6 LibreOffice
LibreOffice is an optional external rendering dependency for MVP. Detect its presence and version. If unavailable, show that preview rendering/PDF export is unavailable and provide clear setup instructions. Do not silently claim visual QA passed without rendered slides.

## 4. Suggested repository structure

```text
ai-presentation-studio/
├── AGENTS.md
├── README.md
├── PRD.md
├── DESIGN.md
├── TECHNICAL_SPEC.md
├── IMPLEMENTATION_PLAN.md
├── opencode.json
├── package.json
├── pnpm-workspace.yaml
│
├── .opencode/
│   ├── agents/
│   └── skills/
│
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── features/
│       │   │   ├── dashboard/
│       │   │   ├── projects/
│       │   │   ├── sources/
│       │   │   ├── learning-plan/
│       │   │   ├── storyboard/
│       │   │   ├── design/
│       │   │   ├── editor/
│       │   │   ├── chat/
│       │   │   ├── qa/
│       │   │   └── settings/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── types/
│       │   └── styles/
│       ├── src-tauri/
│       │   ├── src/
│       │   │   ├── commands/
│       │   │   ├── services/
│       │   │   ├── repositories/
│       │   │   ├── providers/
│       │   │   ├── credentials/
│       │   │   ├── sidecar/
│       │   │   ├── workflow/
│       │   │   └── main.rs
│       │   ├── capabilities/
│       │   ├── binaries/
│       │   ├── migrations/
│       │   └── tauri.conf.json
│       └── package.json
│
├── packages/
│   ├── contracts/
│   ├── pptx-engine/
│   │   ├── src/
│   │   │   ├── generator/
│   │   │   ├── layouts/
│   │   │   ├── components/
│   │   │   ├── themes/
│   │   │   ├── charts/
│   │   │   ├── validation/
│   │   │   └── cli/
│   │   └── package.json
│   └── shared-config/
│
├── docs/
│   ├── ADR/
│   ├── provider-matrix.md
│   ├── security-model.md
│   └── packaging.md
│
├── scripts/
│   ├── build-sidecar/
│   ├── package-windows/
│   └── test-render/
│
└── tests/
    ├── fixtures/
    ├── integration/
    └── e2e/
```

This is a target structure. Phase 0 should create only the folders needed for the first vertical slice; do not scaffold every empty directory prematurely.

## 5. Data ownership and storage

### 5.1 Local application data
Suggested Windows locations:
- App configuration: Tauri app config directory.
- SQLite database: Tauri app data directory.
- Project workspace: user-selected directory, default under Documents or app data.
- Logs: app log directory with redaction.
- Temporary render files: app cache/temp directory.

Do not hard-code a user profile path. Resolve paths using Tauri/Rust platform APIs.

### 5.2 Project directory

```text
<ProjectRoot>/
└── <project-id>/
    ├── project.json
    ├── sources/
    │   ├── original/
    │   └── extracted/
    ├── research/
    ├── learning/
    ├── storyboard/
    ├── design/
    ├── assets/
    ├── slides/
    │   ├── slide-0001/
    │   │   ├── slide.json
    │   │   ├── preview.png
    │   │   └── versions/
    │   └── ...
    ├── render/
    ├── exports/
    └── reports/
```

Use stable IDs rather than slide number as the primary identity. Slide numbers can change when reordered.

## 6. SQLite data model

Initial tables:

### `projects`
- `id` TEXT PRIMARY KEY
- `title` TEXT NOT NULL
- `topic` TEXT
- `audience` TEXT
- `language` TEXT
- `duration_minutes` INTEGER
- `status` TEXT NOT NULL
- `workspace_path` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `sources`
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL
- `file_name` TEXT NOT NULL
- `relative_path` TEXT NOT NULL
- `mime_type` TEXT
- `file_size` INTEGER
- `checksum` TEXT
- `extraction_status` TEXT NOT NULL
- `created_at` TEXT NOT NULL

### `workflow_runs`
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL
- `stage` TEXT NOT NULL
- `status` TEXT NOT NULL
- `started_at` TEXT
- `completed_at` TEXT
- `error_code` TEXT
- `error_message_redacted` TEXT

### `artifacts`
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL
- `artifact_type` TEXT NOT NULL
- `version` INTEGER NOT NULL
- `relative_path` TEXT NOT NULL
- `checksum` TEXT
- `created_at` TEXT NOT NULL

### `slides`
- `id` TEXT PRIMARY KEY
- `project_id` TEXT NOT NULL
- `position` INTEGER NOT NULL
- `title` TEXT
- `slide_type` TEXT
- `status` TEXT NOT NULL
- `current_version` INTEGER NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

### `slide_versions`
- `id` TEXT PRIMARY KEY
- `slide_id` TEXT NOT NULL
- `version` INTEGER NOT NULL
- `spec_relative_path` TEXT NOT NULL
- `preview_relative_path` TEXT
- `change_summary` TEXT
- `created_at` TEXT NOT NULL

### `provider_profiles`
- `id` TEXT PRIMARY KEY
- `provider_id` TEXT NOT NULL
- `display_name` TEXT NOT NULL
- `credential_reference` TEXT NOT NULL
- `default_model` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

`credential_reference` is an opaque key name/identifier in the OS credential store, never the secret itself.

### `settings`
- `key` TEXT PRIMARY KEY
- `value_json` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

Use foreign keys, indexes, schema migrations, and transactions. Do not store API keys or full source-document contents in SQLite unless a specific, reviewed requirement justifies it.

## 7. AI provider architecture

### 7.1 Provider adapter interface

Define a provider-neutral interface in Rust. Conceptual contract:

```rust
trait AiProvider {
    async fn validate_credentials(&self) -> Result<ProviderStatus, ProviderError>;

    async fn list_models(&self) -> Result<Vec<ModelInfo>, ProviderError>;

    async fn generate_structured(
        &self,
        request: StructuredGenerationRequest
    ) -> Result<StructuredGenerationResponse, ProviderError>;

    async fn generate_text(
        &self,
        request: TextGenerationRequest
    ) -> Result<TextGenerationResponse, ProviderError>;
}
```

The final implementation must use object-safe/async-compatible patterns appropriate to the chosen Rust version.

Provider adapters should handle:
- Authentication.
- Model identifiers.
- Request and response mapping.
- Structured output support.
- Token usage where returned.
- Rate limits and retry-after.
- Timeout and cancellation.
- Provider-specific errors.

### 7.2 BYOK secret flow

1. User enters API key in a secure settings form.
2. Frontend sends the key once to a dedicated Rust command over Tauri IPC.
3. Rust validates input and stores it in Windows Credential Manager or a supported secure credential store.
4. SQLite stores only the opaque credential reference and provider metadata.
5. Rust retrieves the key only when making a provider request.
6. The key is attached to the HTTPS request in memory.
7. Logs and error payloads are redacted.
8. The frontend receives only masked status and safe error information.

Never:
- Put keys in localStorage/sessionStorage.
- Put keys in SQLite.
- Put keys in `.env` files shipped with the app.
- Pass keys to the Node sidecar.
- Include keys in prompts or model context.
- Include keys in telemetry or crash reports.

### 7.3 Structured AI output

All AI outputs that drive application state must be schema-validated.

Pipeline:
1. Construct task-specific prompt and context.
2. Request structured JSON from provider.
3. Parse JSON.
4. Validate against versioned schema.
5. Run semantic/business validation.
6. Present result to user.
7. Persist only after validation and/or approval.

Do not execute model-produced code. Model output is data only.

## 8. Core domain contracts

Use versioned JSON schemas for:
- `SourceInventory`
- `ResearchNotes`
- `LearningPlan`
- `Storyboard`
- `DesignDirection`
- `SlideSpecification`
- `QaReport`
- `ExportManifest`

### 8.1 Slide specification example

```json
{
  "schema_version": "1.0",
  "slide_id": "stable-uuid",
  "position": 1,
  "slide_type": "editorial-cover",
  "title": "Understanding Data",
  "main_message": "Data helps us make better decisions",
  "learning_purpose": "Introduce the topic and establish relevance",
  "content": [],
  "visual_direction": {
    "layout_pattern": "editorial-cover",
    "focal_point": "large typographic title",
    "image_asset_ids": [],
    "notes": "Keep composition quiet and high contrast"
  },
  "source_references": [],
  "theme_id": "learning-journal",
  "version": 1
}
```

The production schema must define typed content elements, geometry, typography, image references, chart data, source references, and supported editable element types.

### 8.2 Slide element model

Supported MVP element types:
- Text.
- Image.
- Shape.
- Line.
- Table.
- Chart.
- Group/container where supported.

Each element must have:
- Stable element ID.
- Type.
- Position and dimensions.
- Layer/order.
- Style properties.
- Content or asset reference.
- Accessibility description where applicable.
- Lock state where implemented.

## 9. Per-slide generation pipeline

1. Load approved storyboard entry.
2. Load approved design direction and theme.
3. Load source excerpts referenced by the slide.
4. Build a constrained generation request.
5. Request slide content and visual specification.
6. Validate the response schema.
7. Validate source references and allowed asset IDs.
8. Save a new immutable slide version.
9. Generate or update the deck through PptxGenJS.
10. Render the affected slide and update preview.
11. Run structural QA.
12. Present the new version for review.
13. Promote it to current version only after successful validation or user acceptance.

Regenerating a slide must not silently change unrelated slides. The exported deck is assembled from the current approved version of each slide.

## 10. Hybrid editor architecture

The editor uses a canonical structured slide specification as its source of truth.

### Direct editing
- React canvas displays rendered preview and supported selection overlays.
- Editing actions update the canonical slide specification.
- Rust persists validated changes and creates version records.
- PptxGenJS regenerates the affected slide/deck output.

### Chat editing
- Chat request includes project ID, slide ID, current version, selected element IDs, and user instruction.
- AI receives only relevant slide content, approved design constraints, and necessary source excerpts.
- AI returns a proposed patch, not an arbitrary full-project rewrite.
- Patch is schema-validated and shown as a preview/change summary.
- User accepts or rejects the patch.
- Accepted patch becomes a new slide version.

### Conflict handling
If the selected slide changed after a chat request began, reject stale patches or ask the user to review a merge. Never overwrite newer edits silently.

## 11. PPTX generation engine

PptxGenJS sidecar responsibilities:
- Load validated `PresentationManifest`.
- Load approved theme and slide specifications.
- Resolve assets from project-relative paths.
- Create presentation with configured slide dimensions.
- Render each supported element to native PowerPoint constructs.
- Generate notes where supported.
- Write output to a temporary path.
- Reopen/inspect generated archive structure.
- Move to final path only after success.

### Engineering rules
- Use one module per component/layout family.
- Use theme tokens rather than arbitrary per-slide styling.
- Use stable element IDs in source specifications.
- Avoid fixed text boxes that cannot accommodate content; implement fit and overflow checks.
- Preserve editable elements wherever practical.
- Use raster images only for visual assets, not as a shortcut for entire slides.
- Charts should be native when feasible.
- Avoid generating SVG with unsafe embedded scripts or external references.

## 12. Rendering and visual QA

MVP renderer: LibreOffice in headless mode, detected on the user's machine.

Pipeline:
1. Export a temporary PPTX.
2. Convert to PDF using LibreOffice.
3. Convert PDF pages to PNG using a validated local tool or supported conversion path.
4. Create montage/contact sheet.
5. Run structural checks against slide specs and PPTX.
6. Present rendered images to user for visual inspection.
7. Record warnings and user disposition.

Checks:
- Missing image assets.
- Text outside slide boundaries.
- Elements outside slide boundaries.
- Suspected text overflow.
- Tiny text.
- Low contrast.
- Missing source references for factual claims.
- Empty or malformed charts.
- Repeated layout patterns beyond configured thresholds.
- Missing fonts where detectable.

Automated visual heuristics are advisory. A vision model may optionally review screenshots through the user's configured provider, but must not be described as deterministic QA.

## 13. Tauri command and event contracts

Use explicit, typed commands. Suggested command groups:

### Project commands
- `project_create`
- `project_list`
- `project_get`
- `project_update`
- `project_archive`
- `project_delete`

### Source commands
- `source_import`
- `source_list`
- `source_remove`
- `source_extract`
- `source_get_extraction_status`

### AI commands
- `provider_add_credential`
- `provider_validate`
- `provider_list`
- `provider_set_default`
- `ai_generate_learning_plan`
- `ai_generate_storyboard`
- `ai_generate_design_direction`
- `ai_propose_slide_patch`

### Slide commands
- `slide_create`
- `slide_update`
- `slide_reorder`
- `slide_duplicate`
- `slide_delete`
- `slide_generate`
- `slide_regenerate`
- `slide_get_versions`
- `slide_restore_version`

### Render and export commands
- `render_check_environment`
- `render_project`
- `render_slide`
- `qa_run`
- `export_pptx`
- `export_pdf`

Progress events:
- `workflow://stage`
- `workflow://progress`
- `workflow://completed`
- `workflow://failed`
- `render://slide-completed`
- `generation://slide-completed`

All event payloads must be typed, minimal, and free of secrets.

## 14. Error handling

Use stable error codes, for example:
- `AI_CREDENTIAL_MISSING`
- `AI_CREDENTIAL_INVALID`
- `AI_RATE_LIMITED`
- `AI_PROVIDER_UNAVAILABLE`
- `AI_OUTPUT_INVALID`
- `SOURCE_UNSUPPORTED`
- `SOURCE_EXTRACTION_FAILED`
- `STORYBOARD_NOT_APPROVED`
- `DESIGN_NOT_APPROVED`
- `SLIDE_SPEC_INVALID`
- `PPTX_GENERATION_FAILED`
- `RENDERER_NOT_FOUND`
- `RENDER_FAILED`
- `EXPORT_FAILED`

Display safe, actionable messages. Keep technical diagnostics in redacted logs.

## 15. Security model

- Use Tauri's least-privilege capabilities.
- Do not expose arbitrary shell commands.
- Use HTTPS for provider APIs.
- Validate provider endpoints and prevent unintended local-network requests for custom endpoints unless explicitly configured.
- Sanitize filenames and enforce project-root path boundaries.
- Prevent path traversal in imported archives and assets.
- Limit file sizes and extraction resource usage.
- Do not execute macros or embedded scripts in source documents.
- Do not execute model-generated code.
- Protect credentials through OS credential storage.
- Redact logs.
- Ask before uploading source content to providers.
- Make provider transmission visible in the UI.
- Keep a clear privacy statement and data-flow explanation.

## 16. Packaging and installer

Windows MVP:
- Tauri Windows installer (MSI and/or NSIS; choose after testing user installation/update behavior).
- Bundle the Node sidecar and required production dependencies.
- Do not bundle LibreOffice initially; detect it as optional external dependency.
- Sign the installer when a code-signing certificate is available.
- Provide versioned releases and checksums.
- Test clean install, upgrade, uninstall, and project data retention behavior.

The application must not delete user projects during uninstall unless the user explicitly chooses to remove them.

## 17. Testing strategy

### Rust
- Unit tests for project services, provider adapters, validation, and path security.
- Integration tests for SQLite migrations and credential-store abstraction.
- Command contract tests.

### Frontend
- Component tests for project, storyboard, and editor interactions.
- Schema validation tests.
- State conflict tests.
- Accessibility checks for core flows.

### PPTX engine
- Unit tests for layout geometry and component output.
- Golden fixture decks.
- Tests for overflow and out-of-bounds conditions.
- Integration tests opening generated files as ZIP packages and validating expected parts.
- Render-based regression fixtures.

### End-to-end
- Create project.
- Import source.
- Generate learning plan and storyboard using a mocked provider.
- Approve storyboard and design.
- Generate one slide.
- Edit and regenerate slide.
- Export PPTX.
- Render and inspect.
- Verify credentials are absent from database, logs, and project files.

Use mocked AI responses in CI. Do not require paid API calls for routine tests.

## 18. Open technical decisions

These must be resolved through small proof-of-concept spikes, not assumptions:
1. First production AI provider adapter.
2. PDF/DOCX extraction libraries and quality.
3. Windows credential-store crate and recovery behavior.
4. Node sidecar packaging strategy with Tauri 2.
5. LibreOffice detection and PDF-to-PNG conversion path.
6. Editor canvas interaction library.
7. Installer choice: MSI, NSIS, or both.
8. Font availability and fallback policy.

Record decisions in `docs/ADR/` with rationale and trade-offs.
