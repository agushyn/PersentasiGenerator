import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppError,
  AppStatus,
  CredentialOutcome,
  PocItem,
  SidecarResult,
} from "../types/poc";

/**
 * Phase 0 validation screen. This is an engineering harness, not product UI:
 * each panel exercises one Phase 0 acceptance criterion through the
 * real Tauri IPC contract.
 */

const POC_CREDENTIAL_ACCOUNT = "phase0-poc-key";

type PanelState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; detail: string }
  | { kind: "error"; code: string; message: string };

function formatError(error: unknown): PanelState {
  const parsed = error as Partial<AppError> | null;
  if (parsed && typeof parsed === "object" && parsed.code && parsed.message) {
    return { kind: "error", code: parsed.code, message: parsed.message };
  }
  return {
    kind: "error",
    code: "UNKNOWN",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}

function StatusLine({ state }: { state: PanelState }) {
  if (state.kind === "idle") return null;
  if (state.kind === "loading") {
    return <p className="mt-3 text-sm text-text-secondary">Running…</p>;
  }
  if (state.kind === "ok") {
    return <p className="mt-3 text-sm text-success break-words">{state.detail}</p>;
  }
  return (
    <p className="mt-3 text-sm text-danger break-words">
      <span className="font-mono font-semibold">{state.code}</span>
      {" — "}
      {state.message}
    </p>
  );
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{caption}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "accent" | "danger";
}) {
  const styles =
    variant === "accent"
      ? "bg-accent text-white hover:bg-accent/90"
      : variant === "danger"
        ? "bg-surface text-danger border border-danger/40 hover:bg-danger/5"
        : "bg-surface-muted text-text-primary hover:bg-surface-muted/70";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [items, setItems] = useState<PocItem[]>([]);
  const [dbState, setDbState] = useState<PanelState>({ kind: "idle" });

  const [sidecarState, setSidecarState] = useState<PanelState>({ kind: "idle" });
  const [sidecarResult, setSidecarResult] = useState<SidecarResult | null>(null);

  const [credState, setCredState] = useState<PanelState>({ kind: "idle" });
  const [credStored, setCredStored] = useState<boolean | null>(null);

  const loadAppStatus = useCallback(async () => {
    try {
      const result = await invoke<AppStatus>("app_status");
      setStatus(result);
      setStatusError(null);
    } catch (error) {
      setStatusError(String(error));
    }
  }, []);

  const refreshItems = useCallback(async () => {
    const rows = await invoke<PocItem[]>("db_poc_list");
    setItems(rows);
  }, []);

  useEffect(() => {
    void loadAppStatus();
    void refreshItems();
  }, [loadAppStatus, refreshItems]);

  const runDb = async (action: "insert" | "update" | "delete") => {
    setDbState({ kind: "loading" });
    try {
      if (action === "insert") {
        const id = await invoke<number>("db_poc_insert", {
          name: "poc-row",
          value: `inserted at ${new Date().toISOString()}`,
        });
        await refreshItems();
        setDbState({ kind: "ok", detail: `Inserted row id ${id}` });
      } else if (action === "update") {
        if (items.length === 0) throw { code: "VALIDATION_ERROR", message: "No rows to update" };
        const updated = await invoke<boolean>("db_poc_update", {
          id: items[0].id,
          value: `updated at ${new Date().toISOString()}`,
        });
        await refreshItems();
        setDbState({ kind: "ok", detail: updated ? "Updated first row" : "Row not found" });
      } else {
        if (items.length === 0) throw { code: "VALIDATION_ERROR", message: "No rows to delete" };
        const deleted = await invoke<boolean>("db_poc_delete", { id: items[0].id });
        await refreshItems();
        setDbState({ kind: "ok", detail: deleted ? "Deleted first row" : "Row not found" });
      }
    } catch (error) {
      setDbState(formatError(error));
    }
  };

  const runSidecar = async () => {
    setSidecarState({ kind: "loading" });
    setSidecarResult(null);
    try {
      const result = await invoke<SidecarResult>("sidecar_generate_poc");
      setSidecarResult(result);
      setSidecarState(
        result.ok
          ? {
              kind: "ok",
              detail: `Generated ${result.slide_count} slides in ${result.duration_ms} ms`,
            }
          : { kind: "error", code: result.error_code ?? "PPTX_GENERATION_FAILED", message: result.message ?? "unknown" }
      );
    } catch (error) {
      setSidecarState(formatError(error));
    }
  };

  const runCredential = async (action: "set" | "status" | "delete") => {
    setCredState({ kind: "loading" });
    try {
      if (action === "set") {
        // The secret never leaves Rust; the frontend only learns a boolean.
        await invoke<CredentialOutcome>("credential_poc_set", {
          account: POC_CREDENTIAL_ACCOUNT,
          secret: `poc-${Date.now()}`,
        });
        setCredStored(await invoke<boolean>("credential_poc_status", { account: POC_CREDENTIAL_ACCOUNT }));
        setCredState({ kind: "ok", detail: "Stored in Windows Credential Manager (content never returned)" });
      } else if (action === "status") {
        const stored = await invoke<boolean>("credential_poc_status", { account: POC_CREDENTIAL_ACCOUNT });
        setCredStored(stored);
        setCredState({ kind: "ok", detail: stored ? "Credential present" : "No credential stored" });
      } else {
        await invoke<boolean>("credential_poc_delete", { account: POC_CREDENTIAL_ACCOUNT });
        setCredStored(false);
        setCredState({ kind: "ok", detail: "Credential removed" });
      }
    } catch (error) {
      setCredState(formatError(error));
    }
  };

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Phase 0 — Architecture Validation
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Arya Duta Persentasion Studio</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Engineering harness. Every panel exercises one Phase 0 acceptance criterion.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Application status" caption="Tauri runtime, resolved paths, environment detection.">
          {statusError ? (
            <p className="text-sm text-danger">IPC failed: {statusError}</p>
          ) : status ? (
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-text-secondary">App</dt>
              <dd className="font-medium">{status.app_name} v{status.version}</dd>
              <dt className="text-text-secondary">DB path</dt>
              <dd className="font-mono text-xs break-all">{status.db_path}</dd>
              <dt className="text-text-secondary">Sidecar exe</dt>
              <dd className={status.sidecar_found ? "text-success" : "text-warning"}>
                {status.sidecar_found ? "found" : "missing"}
              </dd>
              <dt className="text-text-secondary">Sidecar script</dt>
              <dd className={status.sidecar_script_found ? "text-success" : "text-warning"}>
                {status.sidecar_script_found ? "found" : "missing"}
              </dd>
              <dt className="text-text-secondary">Renderer</dt>
              <dd className="break-words">{status.renderer}</dd>
            </dl>
          ) : (
            <p className="text-sm text-text-secondary">Loading…</p>
          )}
        </Panel>

        <Panel title="SQLite proof of concept" caption="Migrations plus insert, read, update, delete through rusqlite.">
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Insert row" onClick={() => void runDb("insert")} variant="accent" />
            <ActionButton label="Update first" onClick={() => void runDb("update")} disabled={items.length === 0} />
            <ActionButton label="Delete first" onClick={() => void runDb("delete")} disabled={items.length === 0} variant="danger" />
          </div>
          <StatusLine state={dbState} />
          <div className="mt-4 max-h-40 overflow-auto rounded-md border border-border-subtle bg-surface-muted p-3 font-mono text-xs">
            {items.length === 0 ? (
              <span className="text-text-secondary">No rows.</span>
            ) : (
              items.map((item) => (
                <div key={item.id}>
                  #{item.id} {item.name} — {item.value}
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Node sidecar + PptxGenJS" caption="Spawns the bundled Node runtime, writes a 3-slide editable deck.">
          <ActionButton label="Generate PPTX" onClick={() => void runSidecar()} variant="accent" />
          <StatusLine state={sidecarState} />
          {sidecarResult?.output_path && (
            <p className="mt-2 font-mono text-xs break-all text-text-secondary">{sidecarResult.output_path}</p>
          )}
        </Panel>

        <Panel title="Credential store" caption="Windows Credential Manager round trip. Secrets never reach the frontend, SQLite, or logs.">
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Store test secret" onClick={() => void runCredential("set")} variant="accent" />
            <ActionButton label="Check presence" onClick={() => void runCredential("status")} />
            <ActionButton label="Remove" onClick={() => void runCredential("delete")} variant="danger" />
          </div>
          <StatusLine state={credState} />
          {credStored !== null && (
            <p className="mt-2 text-sm text-text-secondary">
              Presence: <span className={credStored ? "text-success" : "text-text-secondary"}>{String(credStored)}</span>
            </p>
          )}
        </Panel>
      </div>

      <footer className="mt-8 text-xs text-text-secondary">
        Phase 0 harness — outputs land in the Tauri app data directory. Not product UI.
      </footer>
    </div>
  );
}
