import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppError } from "../types/poc";
import type { Project, ProjectDraft } from "../types/projects";

export function formatIpcError(error: unknown): string {
  const parsed = error as Partial<AppError> | null;
  if (parsed && typeof parsed === "object" && parsed.code && parsed.message) {
    return `${parsed.code}: ${parsed.message}`;
  }
  return typeof error === "string" ? error : JSON.stringify(error);
}

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Loads the project list over IPC with loading and error handling. */
export function useProjects(): ProjectsState {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    invoke<Project[]>("project_list")
      .then((result) => {
        if (!cancelled) {
          setProjects(result);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(formatIpcError(reason));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { projects, loading, error, reload };
}

/** Creates a project from a brief. The backend validates every field. */
export async function createProject(draft: ProjectDraft): Promise<Project> {
  return invoke<Project>("project_create", {
    title: draft.title,
    topic: draft.topic,
    audience: draft.audience,
    language: draft.language,
    durationMinutes: draft.duration_minutes,
  });
}

export async function renameProject(id: string, title: string): Promise<Project> {
  return invoke<Project>("project_rename", { id, title });
}

export async function setProjectStatus(
  id: string,
  status: "active" | "archived"
): Promise<Project> {
  return invoke<Project>("project_set_status", { id, status });
}

export async function deleteProject(id: string): Promise<boolean> {
  return invoke<boolean>("project_delete", { id });
}
