import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppStatus } from "../types/poc";

interface AppStatusState {
  status: AppStatus | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Loads the application status over IPC with loading and error handling. */
export function useAppStatus(): AppStatusState {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    invoke<AppStatus>("app_status")
      .then((result) => {
        if (!cancelled) {
          setStatus(result);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(typeof reason === "string" ? reason : JSON.stringify(reason));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { status, loading, error, reload };
}
