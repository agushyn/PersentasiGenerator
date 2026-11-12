-- Phase 2: local projects (TECHNICAL_SPEC.md section 6, `projects` table).
-- Later-phase tables (sources, slides, artifacts, workflow_runs) are added by
-- their own migrations; do not scaffold them prematurely.

CREATE TABLE projects (
    id               TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    topic            TEXT,
    audience         TEXT,
    language         TEXT,
    duration_minutes INTEGER,
    status           TEXT NOT NULL CHECK (status IN ('active', 'archived')),
    workspace_path   TEXT NOT NULL,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

CREATE INDEX idx_projects_updated_at ON projects (updated_at DESC);
