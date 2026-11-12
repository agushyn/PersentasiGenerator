/** Typed IPC contracts for project management (Phase 2). */

export type ProjectStatus = "active" | "archived";

export interface Project {
  id: string;
  title: string;
  topic: string | null;
  audience: string | null;
  language: string | null;
  duration_minutes: number | null;
  status: ProjectStatus;
  workspace_path: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDraft {
  title: string;
  topic: string | null;
  audience: string | null;
  language: string | null;
  duration_minutes: number | null;
}

export interface WorkspaceInfo {
  /** Effective root where new project folders are created. */
  root: string;
  /** Built-in fallback root (Documents based) shown for reference. */
  default_root: string;
  /** True when the effective root was persisted by the user. */
  customized: boolean;
}
