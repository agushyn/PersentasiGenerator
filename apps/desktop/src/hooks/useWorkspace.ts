import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { WorkspaceInfo } from "../types/projects";
import { formatIpcError } from "./useProjects";

interface WorkspaceState {
  info: WorkspaceInfo | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setRoot: (path: string) => Promise<void>;
}

/** Loads and updates the project workspace root. */
export function useWorkspace(): WorkspaceState {
  const [info, setInfo] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    invoke<WorkspaceInfo>("workspace_get")
      .then((result) => {
        if (!cancelled) {
          setInfo(result);
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

  const setRoot = useCallback(async (path: string) => {
    const updated = await invoke<WorkspaceInfo>("workspace_set_root", { path });
    setInfo(updated);
  }, []);

  return { info, loading, error, reload, setRoot };
}
