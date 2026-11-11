# Design Specification
## AI Presentation Studio

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Baseline visual direction |
| Product | AI Presentation Studio |
| UI framework | React + TypeScript |
| Styling | Tailwind CSS v4 |
| Design direction | Premium editorial workspace |
| Primary platform | Windows desktop |

---

## 1. Design vision

AI Presentation Studio should feel like a professional editorial production environment: calm, precise, typographic, and focused on the work.

The interface should not resemble a generic chatbot, analytics dashboard, or template marketplace.

The product has two related but distinct design systems:

1. **Application UI:** a restrained desktop workspace that supports complex production workflows.
2. **Presentation output:** an editorial learning visual language used in the PowerPoint decks themselves.

The application UI and presentation output may share visual principles, but they must not be forced to use identical colors or typography.

## 2. Design principles

- Content first, controls second.
- Strong typography and clear hierarchy.
- Generous but disciplined whitespace.
- Neutral application chrome; expressive presentation canvas.
- Use color to communicate state, not decoration.
- Keep navigation predictable.
- Make the current project and selected slide unmistakable.
- Prefer direct manipulation for simple edits and chat for complex revisions.
- Avoid dense panels, excessive borders, and nested cards.
- Do not use decorative icons without meaning.
- Make every long-running operation understandable.

## 3. Application information architecture

### Primary navigation
- Dashboard
- New Presentation
- Projects
- Design Library
- Settings

### Project workspace navigation
- Overview
- Sources
- Learning Plan
- Storyboard
- Design Direction
- Slides
- Quality Review
- Exports

Project navigation should show stage status and indicate which stages need user approval.

## 4. Key screens

### 4.1 Dashboard
Purpose: resume work and create a new presentation.

Content:
- Primary “New Presentation” action.
- Recent projects with title, last modified time, and current stage.
- Project status indicators.
- Quick access to settings when no AI provider is configured.
- Empty state with a clear first action.

Avoid:
- Large vanity metrics.
- Unnecessary charts.
- Decorative dashboard cards.

### 4.2 New Presentation
Purpose: capture the brief and source materials.

Fields:
- Presentation title.
- Topic or teaching question.
- Target audience.
- Prior knowledge (optional).
- Learning duration.
- Language.
- Desired depth/difficulty.
- Learning context (training, class, workshop, seminar, etc.).
- Source file picker and drag/drop area.
- Additional instructions.

Primary action: “Analyze materials”.

### 4.3 Source analysis
Purpose: let the user understand what the AI extracted before it shapes the learning plan.

Show:
- File list and extraction status.
- Extracted section headings.
- Page/sheet/slide references.
- Warnings for unreadable or unsupported content.
- Excluded sources or sections.
- Claims and source references.

### 4.4 Learning plan
Purpose: approve the educational approach.

Show:
- Audience assumptions.
- Learning objectives.
- Key concepts.
- Suggested teaching sequence.
- Proposed duration allocation.
- Suggested activities or knowledge checks.

Actions:
- Edit.
- Regenerate selected section.
- Approve learning plan.

### 4.5 Storyboard editor
Purpose: make the structure editable before visual production.

Recommended layout:
- Left: ordered slide list with number and slide type.
- Center: selected slide content and learning purpose.
- Right: source references and AI chat/revision panel.

Interactions:
- Add slide.
- Duplicate slide.
- Delete slide.
- Reorder by drag/drop.
- Edit title, key message, content, and visual intent.
- Regenerate selected slide's storyboard entry.
- Approve storyboard.

### 4.6 Design direction
Purpose: approve the visual language.

Show:
- Color palette.
- Typography samples.
- Grid and spacing examples.
- Image treatment.
- Chart style.
- Several representative slide composition previews.

Do not require the user to choose a layout for every slide manually. AI proposes the layout based on content, and the user can override it.

### 4.7 Slide editor — hybrid workspace
This is the primary production screen.

Recommended desktop layout:

- **Top toolbar:** project title, save state, undo/redo, preview, export.
- **Left rail:** slide thumbnails and slide status.
- **Center canvas:** selected slide preview with selection handles for supported editable elements.
- **Right panel:** contextual properties and AI chat.
- **Bottom/status area:** generation progress, warnings, and current slide dimensions.

The center canvas should receive the most visual space.

#### Chat behavior
Chat must be scoped explicitly:
- Entire presentation.
- Selected slide.
- Selected element.

Examples:
- “Make this explanation simpler for beginners.”
- “Replace the diagram with a three-step process.”
- “Keep the title but reduce the body text.”
- “Use a more visual composition without changing the facts.”

Before applying a significant change, show a concise change summary and allow the user to apply or discard it.

#### Direct editing
MVP:
- Edit text in place or via properties panel.
- Change font size, weight, alignment, and color within supported theme constraints.
- Change basic fills and borders.
- Move and resize supported objects.
- Undo/redo for local editing operations.

P1:
- Layer ordering.
- Lock elements.
- Group/ungroup.
- More advanced shape editing.

### 4.8 Quality review
Purpose: make defects visible and actionable.

Show:
- Slide montage.
- Per-slide preview.
- Structural warnings.
- Overflow and clipping warnings.
- Missing assets.
- Font substitution warnings.
- Contrast warnings.
- Content/source warnings.
- Severity and recommended action.

Allow opening a warning directly on the affected slide.

### 4.9 Export
Options:
- Editable PPTX (required).
- PDF (when renderer is available).
- Slide previews.
- Project source package.

Show output folder and completion status.

### 4.10 Settings
Sections:
- AI Providers.
- Model defaults.
- API credential status.
- Project storage.
- Rendering tools.
- Fonts.
- Application diagnostics.
- Privacy and data handling.

Never show the full saved API key after initial entry. Show provider and masked status only.

## 5. Application visual tokens

The application UI should use a neutral light theme by default, with optional dark theme later.

Suggested tokens:

| Token | Value | Usage |
|---|---|---|
| App background | `#F4F5F6` | Main workspace |
| Surface | `#FFFFFF` | Main panels |
| Surface muted | `#ECEEF0` | Secondary areas |
| Text primary | `#202428` | Main text |
| Text secondary | `#69727B` | Supporting text |
| Border | `#DDE1E5` | Subtle separators |
| Accent | `#A94F36` | Primary actions and selected states |
| Accent soft | `#F3E5DF` | Soft emphasis |
| Success | `#26734D` | Completed state |
| Warning | `#A66A18` | Warning state |
| Danger | `#B33A36` | Error/destructive state |
| Info | `#3E668C` | Informational state |

Use semantic Tailwind theme tokens rather than scattering raw hex values through components.

## 6. Typography

Application UI:
- Primary: Inter or system UI fallback.
- Headings: same family with weight and size contrast.
- UI text should remain compact but readable.
- Avoid tiny helper text.

Presentation output:
- Display pairing: a reliable editorial serif such as Georgia or a verified installed serif.
- Body: Inter or a verified sans-serif.
- Limit to two principal font families per deck.
- Provide fallback handling and font availability warnings.

Do not assume fonts are embedded in PPTX. Font availability must be checked or documented.

## 7. Editorial Learning Design — presentation output

### 7.1 Visual identity

Default preset: **The Learning Journal**.

Suggested palette:
- Paper: `#F5F1E8`
- Ink: `#20201E`
- Terracotta: `#C65D3B`
- Sage: `#788477`
- Muted grey: `#8A8982`
- White: `#FFFFFF`

The palette is a starting preset, not a rule for every presentation. User-selected brand colors may override it.

### 7.2 Layout principles
- 16:9 widescreen by default.
- Establish a consistent outer margin and grid.
- Use asymmetry when it strengthens hierarchy.
- Use large headlines for key ideas.
- Vary composition according to the pedagogical purpose.
- Use images only when they clarify, contextualize, or emotionally anchor learning.
- Use diagrams for relationships, processes, and systems.
- Use charts only for meaningful data.
- Preserve whitespace around important content.

### 7.3 Layout pattern catalog

Required initial patterns:
1. Editorial cover.
2. Chapter opener.
3. Big idea / key statement.
4. Concept explanation.
5. Annotated image.
6. Full-bleed visual.
7. Step-by-step instruction.
8. Process map.
9. Timeline.
10. Comparison.
11. Data editorial.
12. Case study.
13. Worked example.
14. Knowledge check.
15. Reflection prompt.
16. Summary.
17. References.

Patterns are composition recipes, not fixed templates. The engine may introduce controlled variations.

### 7.4 Anti-slop constraints
Avoid:
- Repeated three-card/four-card layouts.
- Unnecessary rounded rectangles.
- Random icons.
- Decorative gradients.
- Fake charts.
- Long paragraphs.
- Generic “AI technology” imagery.
- Repeated title + bullet list composition.
- Decorative shapes with no communicative purpose.

Every visual element must have a clear informational, navigational, or compositional purpose.

## 8. Interaction and state design

Use consistent states:
- Not started.
- In progress.
- Needs review.
- Approved.
- Completed.
- Warning.
- Failed.

Never communicate state using color alone. Include text or icons with accessible labels.

Generation operations:
- Show the task and target slide.
- Show progress when available.
- Allow cancellation when safe.
- Preserve last successful output.
- Show a useful recovery action on failure.

## 9. Accessibility

- Maintain readable font sizes.
- Check text/background contrast.
- Do not use color as the only indicator.
- Provide keyboard access for core navigation and actions.
- Provide visible focus states.
- Label icon-only buttons.
- Keep tab order predictable.
- Provide descriptions for meaningful images where supported.
- Use readable charts and labels.
- Avoid dense text layouts.

## 10. Responsive behavior

The MVP is desktop-first and targets typical Windows laptop/desktop displays.

- Optimize for 1280×800 and above.
- At narrower sizes, collapse side panels into drawers.
- Do not attempt a mobile-first slide editor.
- Respect Windows display scaling.
- Ensure the editor remains usable at 125% and 150% scaling.

## 11. Design acceptance checklist

- The current project and workflow stage are clear.
- The selected slide is unmistakable.
- The slide canvas is the dominant region in the editor.
- Chat is contextual, not a detached generic chatbot.
- Controls are visually quiet and predictable.
- The interface avoids unnecessary card grids.
- Empty, loading, error, and success states are designed.
- Keyboard focus is visible.
- Core workflows work at 1280×800 and Windows scaling settings.
- Presentation output follows the approved editorial design system without forcing identical slide layouts.
