# Product Requirements Document (PRD)
## AI Presentation Studio

| Field | Value |
|---|---|
| Product | AI Presentation Studio |
| Document | Product Requirements Document |
| Version | 1.0 |
| Status | Baseline for implementation |
| Target release | MVP v1.0 |
| Primary platform | Windows 10/11 |
| Primary language | Indonesian UI-ready; multilingual presentation content |
| Product category | AI-assisted desktop presentation authoring |

---

## 1. Product overview

AI Presentation Studio is a Windows desktop application for turning source materials and user instructions into high-quality, editable educational PowerPoint presentations.

The application combines:
- **Tauri 2 + Rust** for the desktop shell, local orchestration, secure credential handling, filesystem access, and application services.
- **React + TypeScript + Tailwind CSS v4** for the user interface.
- **SQLite** for local project metadata and workflow state.
- **BYOK (Bring Your Own Key)** for AI provider access. Users supply and pay for their own provider API keys.
- **PptxGenJS** as the PowerPoint generation engine, executed through a bundled Node.js sidecar.
- **OpenCode** as a development agent used by the product team during software development, not as a runtime dependency for end users.

The product is not intended to be a general-purpose slide editor replacement. Its primary value is the guided workflow: source analysis → learning design → storyboard → editorial art direction → slide generation → visual review → export.

## 2. Product vision

Make it possible for a user to create an educational presentation by describing what they want to teach, supplying source materials, reviewing a storyboard, and iterating on individual slides through a combination of chat instructions and direct visual editing.

The product should feel like a professional editorial production studio rather than a generic chatbot or template picker.

## 3. Locked product decisions

These decisions are baseline requirements and must not be changed without an explicit product decision.

| Decision | Locked choice |
|---|---|
| AI access | BYOK; user supplies provider API key |
| Editing experience | Hybrid: AI chat + visual slide editor |
| Generation granularity | Per-slide generation and regeneration |
| Target platform | Windows 10/11 first |
| Desktop framework | Tauri 2 |
| Backend | Rust |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS v4 |
| Local database | SQLite |
| PowerPoint engine | PptxGenJS |
| PPTX runtime | Bundled Node.js sidecar |
| Development agent | OpenCode |
| Initial content focus | Education, training, workshops, seminars, learning materials |
| Default visual direction | Editorial Learning Design |
| Default slide format | 16:9 widescreen |

## 4. Problem statement

Users often have source materials but lack the time or design expertise to turn them into coherent, visually distinctive presentations. Existing AI slide tools can produce fast drafts, but commonly suffer from generic layouts, weak learning progression, repetitive cards, unsupported claims, and limited slide-level control.

AI Presentation Studio addresses these issues by separating content reasoning, instructional design, art direction, slide rendering, and quality assurance into reviewable stages.

## 5. Target users

### Primary users
- Trainers and facilitators.
- Teachers, lecturers, and educators.
- Learning and development teams.
- Subject-matter experts creating training materials.
- Professionals who regularly convert documents into presentations.

### Secondary users
- Consultants preparing educational workshops.
- Students and researchers preparing academic presentations.
- Internal communications teams producing explanatory decks.

### User skill assumptions
Users may understand their subject but may not be skilled in presentation design, instructional design, or PowerPoint layout engineering.

## 6. Jobs to be done

1. When I have source documents, I want the application to extract and organize relevant information so I do not need to copy content manually.
2. When I need to teach a topic, I want learning objectives and a coherent sequence so the presentation supports understanding rather than merely summarizing documents.
3. When I review the storyboard, I want to change, reorder, add, or remove slides before visual production.
4. When I generate slides, I want each slide to be independently editable and regenerable.
5. When I see a generated slide, I want to revise it through chat or direct editing without rebuilding the whole presentation.
6. Before export, I want a preview and quality report so I can catch layout and content problems.
7. I want to use my own AI provider credentials and control which provider/model is used.

## 7. Goals and non-goals

### Goals
- Produce editable `.pptx` files.
- Support a guided education-first workflow.
- Preserve source traceability for factual claims.
- Support BYOK AI provider configuration.
- Support slide-level generation and regeneration.
- Provide a hybrid editor with chat and direct manipulation.
- Keep project files and database local by default.
- Provide Windows installer packaging.
- Render and inspect every slide before final export.
- Keep AI, presentation content, design specifications, and PPTX rendering concerns separated.

### Non-goals for MVP
- Replacing Microsoft PowerPoint as a full-featured editor.
- Real-time multi-user collaboration.
- Cloud project synchronization.
- A hosted AI subscription or centralized billing system.
- Mobile application.
- macOS/Linux support in the first release.
- Full animation and transition authoring.
- Importing and perfectly preserving arbitrary existing PowerPoint decks.
- Automatic generation of original music or voice narration.
- A local large language model runtime.
- Guaranteeing identical rendering across all PowerPoint versions and machines.

## 8. Core user journey

1. User launches the Windows application.
2. User configures an AI provider and enters an API key.
3. User creates a project and supplies a title, audience, language, duration, and learning intent.
4. User imports source materials.
5. Application extracts text, tables, metadata, and relevant page/slide references.
6. AI analyzes the material and proposes learning objectives.
7. User reviews and approves the learning plan.
8. AI creates a slide-by-slide storyboard.
9. User edits and approves the storyboard.
10. AI proposes an editorial design direction and slide composition plan.
11. User approves the visual direction.
12. User generates slides individually or in a controlled sequence.
13. User reviews slides in the visual editor and revises through chat or direct manipulation.
14. Application renders the complete deck and runs structural and visual QA.
15. User resolves or explicitly accepts remaining warnings.
16. User exports editable PPTX and optionally PDF, previews, and project source.

## 9. Functional requirements

Priority definitions: **P0** = required for MVP; **P1** = important follow-up; **P2** = later enhancement.

### 9.1 Workspace and project management

| ID | Priority | Requirement |
|---|---|---|
| PRJ-001 | P0 | Create, rename, duplicate, archive, and delete projects. |
| PRJ-002 | P0 | Store project metadata and workflow state in SQLite. |
| PRJ-003 | P0 | Store source files, generated assets, storyboard, slide specifications, and exports in a project folder. |
| PRJ-004 | P0 | Reopen a project and restore its last saved state. |
| PRJ-005 | P1 | Search and filter projects by title, status, and modified date. |
| PRJ-006 | P1 | Provide project-level backup/export as a ZIP package. |

### 9.2 AI provider and BYOK

| ID | Priority | Requirement |
|---|---|---|
| AI-001 | P0 | Support a provider adapter architecture rather than hard-coding one provider. |
| AI-002 | P0 | Allow users to add, validate, edit, and delete their own API credentials. |
| AI-003 | P0 | Store credentials using Windows Credential Manager or a supported secure OS credential store. |
| AI-004 | P0 | Keep API keys out of the React frontend, SQLite, project files, logs, crash reports, and exported decks. |
| AI-005 | P0 | Allow selection of provider and model per project or task. |
| AI-006 | P0 | Display provider errors, rate limits, and usage/cost information when the provider exposes it. |
| AI-007 | P0 | Require user confirmation before sending source content to an AI provider. |
| AI-008 | P1 | Support configurable model routing by task type. |
| AI-009 | P1 | Allow custom OpenAI-compatible API endpoints, with clear compatibility warnings. |
| AI-010 | P1 | Provide configurable context and output limits. |

Initial provider support should be implemented through adapters. The first provider(s) selected for MVP must be confirmed during Phase 3 based on structured-output support, file handling, pricing transparency, and API documentation. OpenAI-compatible endpoints may be supported as a separate adapter, not assumed to be perfectly interchangeable.

### 9.3 Source ingestion and analysis

| ID | Priority | Requirement |
|---|---|---|
| SRC-001 | P0 | Import PDF, DOCX, XLSX, PPTX, Markdown, TXT, and common image formats. |
| SRC-002 | P0 | Show source inventory, file size, type, and extraction status. |
| SRC-003 | P0 | Extract text and preserve page, sheet, slide, or section references where possible. |
| SRC-004 | P0 | Identify unsupported, encrypted, corrupt, or partially readable files. |
| SRC-005 | P0 | Allow users to exclude a source or selected sections from analysis. |
| SRC-006 | P0 | Generate source-grounded research notes and claim-to-source mapping. |
| SRC-007 | P1 | Extract selected tables and images with user review. |
| SRC-008 | P1 | OCR scanned PDFs and images using an optional local or provider-based capability. |

The application must distinguish extracted source facts, AI interpretation, and proposed teaching examples. It must not silently invent facts or citations.

### 9.4 Learning design and storyboard

| ID | Priority | Requirement |
|---|---|---|
| LRN-001 | P0 | Capture audience, prior knowledge, language, duration, learning intent, and difficulty level. |
| LRN-002 | P0 | Generate measurable learning objectives. |
| LRN-003 | P0 | Generate a coherent learning sequence appropriate to the audience and duration. |
| LRN-004 | P0 | Create a slide-level storyboard with purpose, key message, content, visual direction, and source references. |
| LRN-005 | P0 | Allow add, delete, duplicate, reorder, and edit operations on storyboard slides. |
| LRN-006 | P0 | Require explicit user approval before visual production. |
| LRN-007 | P1 | Suggest knowledge checks, discussion prompts, exercises, and reflection activities. |
| LRN-008 | P1 | Map learning objectives to slides and assessment activities. |

### 9.5 Editorial design system

| ID | Priority | Requirement |
|---|---|---|
| DSG-001 | P0 | Provide an editorial default design system. |
| DSG-002 | P0 | Define theme tokens for colors, typography, spacing, margins, and slide dimensions. |
| DSG-003 | P0 | Provide multiple layout patterns selected according to content purpose. |
| DSG-004 | P0 | Avoid repetitive card grids and generic AI slide aesthetics. |
| DSG-005 | P0 | Generate a per-slide design specification before rendering. |
| DSG-006 | P0 | Allow user approval of art direction before full generation. |
| DSG-007 | P1 | Support user-created and imported theme presets. |
| DSG-008 | P1 | Support custom font selection with availability checks. |

### 9.6 Slide generation and hybrid editing

| ID | Priority | Requirement |
|---|---|---|
| SLD-001 | P0 | Generate one slide at a time from an approved storyboard and design specification. |
| SLD-002 | P0 | Regenerate a selected slide without regenerating unrelated slides. |
| SLD-003 | P0 | Provide a slide thumbnail navigator. |
| SLD-004 | P0 | Provide a rendered slide preview. |
| SLD-005 | P0 | Provide chat-based revision scoped to the selected slide or selected elements. |
| SLD-006 | P0 | Provide direct editing for text and basic visual properties. |
| SLD-007 | P0 | Preserve slide identity and version history when regenerating. |
| SLD-008 | P0 | Keep text, shapes, tables, and charts editable in PowerPoint wherever practical. |
| SLD-009 | P1 | Support direct move, resize, alignment, layer ordering, and element deletion. |
| SLD-010 | P1 | Support slide-level undo/redo. |
| SLD-011 | P1 | Allow users to lock elements against AI modification. |
| SLD-012 | P1 | Support speaker notes. |

The MVP editor is not expected to reproduce all PowerPoint editing features. It must provide useful preview, text editing, basic element manipulation, and AI-assisted revisions.

### 9.7 Rendering, quality assurance, and export

| ID | Priority | Requirement |
|---|---|---|
| QA-001 | P0 | Generate PPTX from structured slide specifications using PptxGenJS. |
| QA-002 | P0 | Render every slide to an image for inspection. |
| QA-003 | P0 | Create a deck montage/contact sheet. |
| QA-004 | P0 | Inspect PPTX structure and detect obvious text overflow, invalid geometry, missing assets, and unsupported elements. |
| QA-005 | P0 | Produce a severity-ranked QA report. |
| QA-006 | P0 | Allow user to review warnings and rerender affected slides. |
| QA-007 | P0 | Export editable PPTX. |
| QA-008 | P0 | Preserve source project and generation metadata. |
| QA-009 | P1 | Export PDF when a compatible renderer is installed. |
| QA-010 | P1 | Offer accessible contrast and font-size checks. |

Automated checks cannot guarantee aesthetic quality. The MVP must include a user visual-review step.

### 9.8 Settings and application operations

| ID | Priority | Requirement |
|---|---|---|
| SET-001 | P0 | Configure project storage location. |
| SET-002 | P0 | Configure AI provider credentials and default models. |
| SET-003 | P0 | Detect required local runtimes and rendering tools. |
| SET-004 | P0 | Display generation progress, errors, and cancellation where safe. |
| SET-005 | P1 | Configure default language, slide ratio, and export preferences. |
| SET-006 | P1 | Provide diagnostic logs with secrets and sensitive content redacted. |

## 10. UX requirements

- The application must not feel like a generic chat wrapper.
- The primary workspace should make project progress visible.
- The storyboard and slide navigator must remain easy to access.
- The selected slide preview should be the main visual focus in the editor.
- Chat instructions must clearly indicate which project, slide, or element they affect.
- Destructive actions require confirmation.
- Long-running operations must show progress and provide safe cancellation.
- Autosave or explicit save status must be visible.
- Error messages must explain what happened and what the user can do next.

## 11. Non-functional requirements

### Performance
- Application shell should start without launching an AI request.
- Local project navigation must not require network access.
- UI must remain responsive during document extraction, rendering, and generation.
- Long-running work must execute outside the UI thread.
- Progress events must be reported to the UI.

### Reliability
- Persist workflow state after each completed stage.
- Use atomic file writes where practical.
- Keep generated files recoverable after a failed generation.
- Do not overwrite the last known-good PPTX until a new export succeeds.

### Security and privacy
- API keys must be stored in OS credential storage.
- Source documents remain local unless the user explicitly submits them to a provider.
- Explain provider data handling is governed by that provider's terms.
- Redact credentials and sensitive data from logs.
- Do not execute arbitrary code returned by an AI model.

### Portability
- MVP targets Windows 10/11 x64.
- Project data should use portable relative paths where possible.
- Exported PPTX must be usable in Microsoft PowerPoint and compatible office suites, subject to format/rendering differences.

## 12. MVP scope and release criteria

MVP must support:
1. Windows desktop installation.
2. Local project creation and persistence.
3. BYOK configuration for at least one production-ready provider adapter.
4. PDF and DOCX source ingestion at minimum; other listed formats can be enabled according to validated parser support.
5. Learning objectives and storyboard generation.
6. User approval gates.
7. Editorial design specification.
8. Per-slide PPTX generation.
9. Hybrid editor with preview, text editing, and AI revision.
10. PPTX export.
11. Slide rendering and QA report.

### MVP acceptance criteria
- A user can create and reopen a project.
- A user can configure and validate their API key.
- A source PDF can be analyzed with traceable references.
- The system produces editable learning objectives and a storyboard.
- The user can approve and modify the storyboard.
- The system can generate and regenerate an individual slide.
- A user can edit slide text directly and through chat.
- The exported PPTX opens successfully in a supported PowerPoint application.
- All slides can be rendered and reviewed.
- No API key appears in SQLite, logs, project files, or exports.
- Failed generation does not destroy the last successful version.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Provider API changes | Isolate provider-specific code behind adapters. |
| API cost surprises | Show estimated usage where possible and require confirmation for large jobs. |
| Poor AI content quality | Source mapping, structured outputs, approval gates, and reviewer checks. |
| Inconsistent slide layouts | Design tokens, layout constraints, and render QA. |
| Node sidecar packaging complexity | Build and test sidecar packaging early in Phase 0. |
| LibreOffice not installed | Detect it; make rendering/export capability explicit and provide installation guidance. |
| Fonts differ across computers | Check fonts and provide fallback warnings. |
| AI-generated code or content unsafe | Never execute AI output as code; validate structured data. |
| Large documents | Process asynchronously, chunk content, and expose progress. |
| PPTX rendering differences | Validate in LibreOffice and test representative files in Microsoft PowerPoint. |

## 14. Product success metrics

MVP success should be measured by:
- Percentage of projects that reach a successful PPTX export.
- Average number of manual corrections required per deck.
- Percentage of slides passing structural QA on first render.
- User-reported usefulness of storyboard and slide-level regeneration.
- Frequency of failed or interrupted generation.
- Time from source import to first reviewable storyboard.
- Percentage of generated content with traceable source references where applicable.

Do not optimize solely for slide-generation speed or slide count.
