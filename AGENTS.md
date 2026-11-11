# AGENTS.md

# AI Presentation Studio — Agent Instructions

## 1. Project Overview

AI Presentation Studio is a Windows desktop application for creating professional, editable PowerPoint presentations using AI.

The application allows users to:
- Generate presentations from natural-language prompts.
- Develop presentations slide by slide.
- Review and approve AI-generated learning plans, storyboards, and design directions.
- Edit presentations through AI chat and direct visual editing.
- Regenerate individual slides without unintentionally changing other slides.
- Export editable `.pptx` files.

The initial target use case is educational presentations.

The product must prioritize:
- Content accuracy.
- Strong visual hierarchy.
- Professional editorial design.
- Editable PowerPoint output.
- Predictable AI-assisted workflows.
- Lightweight Windows installation.

## 2. Documentation and Source of Truth

Before implementing any feature, read the relevant project documentation.

The root documentation consists of:

1. `PRD.md` — product requirements and functional behavior.
2. `DESIGN.md` — visual system, UX principles, and screen specifications.
3. `TECHNICAL_SPEC.md` — architecture, technology, data models, and implementation details.
4. `IMPLEMENTATION_PLAN.md` — development phases, tasks, and acceptance criteria.

Priority rules:

- PRD defines what the product must do.
- DESIGN defines how the product should look and behave.
- TECHNICAL_SPEC defines how the product should be implemented.
- IMPLEMENTATION_PLAN defines the implementation sequence.

Do not silently contradict or replace documented decisions.

If a conflict exists:
1. Identify the conflicting requirements.
2. Explain the impact.
3. Propose a resolution.
4. Wait for user approval when the conflict affects a locked architectural or product decision.

## 3. Locked Technology Decisions

The following decisions are fixed unless explicitly approved by the project owner.

| Area | Technology |
|---|---|
| Desktop framework | Tauri 2 |
| Backend | Rust |
| Frontend | React |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Local database | SQLite |
| PowerPoint generation | PptxGenJS |
| AI integration | BYOK |
| Development agent | OpenCode |
| Target platform | Windows |
| Initial audience | Education |

Important:

- OpenCode is a development tool only.
- OpenCode must NOT become a runtime dependency.
- Users must not need to install Node.js manually.
- Users must not need to install OpenCode.
- The released application must package all required runtime dependencies.

## 4. Architecture Rules

Respect the architecture described in `TECHNICAL_SPEC.md`.

Maintain clear boundaries between:

- React frontend: presentation UI and user interactions.
- Rust/Tauri backend: desktop capabilities, IPC, filesystem, security, and process management.
- SQLite: local project and presentation data.
- Node.js sidecar: PowerPoint generation using PptxGenJS.
- AI provider adapters: communication with supported AI providers.

Architecture rules:

1. Do not move backend responsibilities into frontend code.
2. Do not expose unrestricted filesystem access to the frontend.
3. Do not execute AI-generated content as JavaScript, Rust, shell commands, or arbitrary code.
4. Validate all data crossing frontend/backend boundaries.
5. Use explicit and typed IPC contracts.
6. Keep PowerPoint generation independent from presentation UI components.
7. Keep AI provider implementations behind a common adapter interface.
8. Avoid unnecessary dependencies and oversized runtime packages.

Do not introduce another backend framework or database without approval.

## 5. Coding Standards

### TypeScript and React

- Enable strict TypeScript wherever practical.
- Avoid `any`; use explicit types and interfaces.
- Prefer small, reusable components.
- Separate UI components, business logic, hooks, and services.
- Avoid putting complex business logic inside React components.
- Use predictable state management.
- Handle loading, error, empty, and success states.
- Clean up event listeners and asynchronous operations.
- Avoid unnecessary global state.

### Rust

- Use explicit error handling.
- Avoid panics in normal application flows.
- Validate external inputs.
- Keep Tauri commands focused and typed.
- Do not expose unnecessary permissions.
- Use structured error responses.

### Tailwind CSS

- Use Tailwind CSS v4 conventions.
- Follow the tokens and visual rules in `DESIGN.md`.
- Avoid arbitrary values when an existing design token is appropriate.
- Avoid inconsistent spacing, typography, and component styling.
- Do not introduce another CSS framework.

## 6. UI/UX and Visual Quality

The default visual direction is **editorial**.

The application should feel like a premium desktop creative tool, not a generic AI chatbot.

Follow `DESIGN.md` as the visual source of truth.

Mandatory principles:

- Clear information hierarchy.
- Consistent spacing and alignment.
- Intentional typography.
- Strong visual composition.
- Minimal unnecessary decoration.
- Useful empty states.
- Clear progress and generation status.
- Visible approval and revision controls.
- Responsive desktop workspace layouts.

### Anti-slop rules

Do not create:

- Generic AI dashboard layouts.
- Excessive gradients and glowing effects.
- Random decorative icons.
- Unnecessary glassmorphism.
- Excessive rounded cards.
- Repeated identical card layouts without purpose.
- Arbitrary color combinations.
- Fake charts or meaningless metrics.
- Placeholder content presented as real functionality.
- UI elements that look interactive but do nothing.

Every visible control must have a defined behavior.

Do not sacrifice usability for visual decoration.

## 7. AI Integration Rules

The application uses BYOK (Bring Your Own Key).

Rules:

1. Never hardcode API keys.
2. Never store API credentials in SQLite.
3. Never store API keys in localStorage or sessionStorage.
4. Never include API keys in logs, error messages, or exported projects.
5. Use the operating system's secure credential storage.
6. Keep provider-specific logic inside provider adapters.
7. Validate AI responses before using them.
8. Prefer structured JSON output with explicit schemas.
9. Handle malformed responses, rate limits, timeouts, and provider errors.
10. Never assume AI output is correct.

AI output is untrusted data.

Never execute AI-generated source code or shell commands.

The user must retain control over important generation stages, including approval of the learning plan, storyboard, and design direction.

## 8. PowerPoint Generation Rules

PptxGenJS is the PowerPoint generation engine.

Rules:

- Generate editable PowerPoint elements wherever practical.
- Prefer native text, shapes, images, and other editable elements.
- Avoid flattening entire slides into screenshots.
- Maintain stable slide IDs.
- Preserve unrelated slides when regenerating one slide.
- Keep slide content separate from rendering logic.
- Validate dimensions, positions, and content before export.
- Handle missing fonts and unsupported elements gracefully.
- Prevent accidental text overflow and object collisions where detectable.
- Keep generated files valid and openable in Microsoft PowerPoint.

A slide regeneration must not silently modify unrelated slides.

Node.js must run as a bundled sidecar in the released Windows application. The user must not need to install Node.js.

LibreOffice is optional. Detect its availability and clearly communicate when visual rendering or PDF export capabilities are unavailable.

Never claim visual QA has passed if the slides were not actually rendered and inspected.

## 9. Database and Data Integrity

SQLite is the local application database.

Rules:

- Use migrations for schema changes.
- Avoid destructive migrations without explicit approval.
- Preserve existing user projects.
- Use transactions for multi-step data changes.
- Maintain stable identifiers.
- Handle database errors gracefully.
- Do not store plaintext API credentials.
- Keep project data and slide version history consistent.

Never delete or overwrite user presentation data as part of an unrelated feature.

## 10. Security Rules

Treat all external data as untrusted, including AI responses.

Mandatory:

- Validate IPC inputs.
- Restrict filesystem operations.
- Apply least-privilege Tauri permissions.
- Protect credentials.
- Avoid shell command construction from user or AI input.
- Avoid arbitrary code execution.
- Validate file paths and export destinations.
- Avoid exposing secrets in frontend logs.
- Keep sidecar communication controlled and validated.

Security-sensitive architectural changes require review.

## 11. Testing and Quality Assurance

Do not consider a feature complete simply because it compiles.

Use the testing strategy described in `TECHNICAL_SPEC.md`.

Where applicable, perform:

- TypeScript type checking.
- Frontend unit tests.
- Rust tests.
- IPC integration tests.
- SQLite migration tests.
- AI adapter tests with mocked responses.
- PowerPoint generation tests.
- PPTX structural validation.
- Windows packaging tests.
- End-to-end workflow tests.

For UI changes, verify:
- Visual consistency.
- Interaction behavior.
- Loading and error states.
- Empty states.
- Keyboard accessibility where applicable.

For PowerPoint changes, verify:
- PPTX file is generated.
- File structure is valid.
- Slide count is correct.
- Text and shapes are editable where expected.
- Existing slides remain unchanged when only one slide is regenerated.

Never report tests as passing unless they were actually executed.

Clearly distinguish:
- Tests passed.
- Tests failed.
- Tests not run.
- Tests blocked by environment limitations.

## 12. OpenCode Development Workflow

For every implementation task:

### Step 1 — Understand

- Read the relevant documentation.
- Inspect the existing project structure.
- Identify affected modules.
- Understand existing patterns before changing code.

### Step 2 — Plan

- Break the task into small implementation steps.
- Identify dependencies and risks.
- Identify required database, IPC, and UI changes.
- Define acceptance criteria.

### Step 3 — Implement

- Follow the existing architecture.
- Make focused changes.
- Avoid unrelated refactoring.
- Reuse existing components and services.
- Do not introduce unnecessary dependencies.

### Step 4 — Verify

- Run relevant tests.
- Run type checking and builds where applicable.
- Inspect generated artifacts when applicable.
- Fix regressions before declaring completion.

### Step 5 — Report

Provide a concise implementation report containing:

1. What was implemented.
2. Files created or modified.
3. Architecture or database changes.
4. Tests executed and their results.
5. Known limitations.
6. Remaining work.

Do not claim completion when acceptance criteria are not satisfied.

## 13. Implementation Phase Discipline

Follow `IMPLEMENTATION_PLAN.md` sequentially.

Rules:

- Work only on the currently approved phase.
- Do not skip prerequisite phases.
- Do not implement future-phase features prematurely.
- Complete the phase acceptance criteria before moving forward.
- Document blockers and technical discoveries.
- Ask for approval before changing scope or locked decisions.

Technical spikes and proof-of-concept work must be clearly separated from production implementation.

## 14. Restrictions

Unless explicitly approved by the project owner, do not:

- Change the technology stack.
- Replace Tauri with Electron.
- Replace PptxGenJS with another PowerPoint engine.
- Add a mandatory cloud backend.
- Make OpenCode a runtime dependency.
- Require users to install Node.js.
- Store API keys in plaintext.
- Execute AI-generated code.
- Flatten all slides into images.
- Change unrelated slides during regeneration.
- Remove existing user data.
- Skip required tests.
- Claim unverified functionality works.
- Implement features outside the approved phase.

## 15. Definition of Done

A task is complete only when:

- Requirements are satisfied.
- Architecture rules are respected.
- UI follows the design system.
- Relevant tests have been executed.
- No known critical regression remains.
- Error and edge cases are handled.
- Documentation is updated when necessary.
- Implementation results are reported accurately.

**Quality, reliability, and editable PowerPoint output take priority over implementation speed.**