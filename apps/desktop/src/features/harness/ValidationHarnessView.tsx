import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { useNotifications } from "../../components/ui/Notifications";
import { ErrorState } from "../../components/ui/states";
import type {
  AppError,
  AppStatus,
  CredentialOutcome,
  PocItem,
  SidecarResult,
} from "../../types/poc";

/**
 * Phase 0 validation harness, preserved for regression checking and
 * reachable from Settings → Diagnostics. Each panel exercises one Phase 0
 * acceptance criterion through the real Tauri IPC contract.
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

export function ValidationHarnessView() {
  const { notify } = useNotifications();

  const [status, setStatus] = useState<AppStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [items, setItems] = useState<PocItem[]>([]);
  const [dbState, setDbState] = useState<PanelState>({ kind: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        notify("success", "Row inserted", `poc_items id ${id}`);
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
        notify("info", "Row deleted", `poc_items id ${items[0].id}`);
      }
    } catch (error) {
      setDbState(formatError(error));
      const formatted = formatError(error);
      if (formatted.kind === "error") {
        notify("error", `${formatted.code}`, formatted.message);
      }
    }
  };

  const runSidecar = async () => {
    setSidecarState({ kind: "loading" });
    setSidecarResult(null);
    try {
      const result = await invoke<SidecarResult>("sidecar_generate_poc");
      setSidecarResult(result);
      if (result.ok) {
        setSidecarState({
          kind: "ok",
          detail: `Generated ${result.slide_count} slides in ${result.duration_ms} ms`,
        });
        notify("success", "PPTX generated", `${result.slide_count} slides in ${result.duration_ms} ms`);
      } else {
        const code = result.error_code ?? "PPTX_GENERATION_FAILED";
        const message = result.message ?? "unknown";
        setSidecarState({ kind: "error", code, message });
        notify("error", code, message);
      }
    } catch (error) {
      setSidecarState(formatError(error));
      const formatted = formatError(error);
      if (formatted.kind === "error") {
        notify("error", formatted.code, formatted.message);
      }
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
        notify("success", "Credential stored", "Windows Credential Manager");
      } else if (action === "status") {
        const stored = await invoke<boolean>("credential_poc_status", { account: POC_CREDENTIAL_ACCOUNT });
        setCredStored(stored);
        setCredState({ kind: "ok", detail: stored ? "Credential present" : "No credential stored" });
      } else {
        await invoke<boolean>("credential_poc_delete", { account: POC_CREDENTIAL_ACCOUNT });
        setCredStored(false);
        setCredState({ kind: "ok", detail: "Credential removed" });
        notify("info", "Credential removed", POC_CREDENTIAL_ACCOUNT);
      }
    } catch (error) {
      setCredState(formatError(error));
      const formatted = formatError(error);
      if (formatted.kind === "error") {
        notify("error", formatted.code, formatted.message);
      }
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Phase 0 harness
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">Validation harness</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Regression checks for the Phase 0 foundations: SQLite, sidecar, credentials. Not product UI.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Application status" caption="Tauri runtime, resolved paths, environment detection.">
          {statusError ? (
            <ErrorState title="IPC failed" detail={statusError} onRetry={() => void loadAppStatus()} />
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
            <Button variant="primary" onClick={() => void runDb("insert")}>
              Insert row
            </Button>
            <Button onClick={() => void runDb("update")} disabled={items.length === 0}>
              Update first
            </Button>
            {/* Destructive action requires confirmation (DESIGN.md section 8). */}
            <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={items.length === 0}>
              Delete first
            </Button>
          </div>
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title="Delete this row?"
            footer={
              <>
                <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setConfirmDelete(false);
                    void runDb("delete");
                  }}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="text-sm text-text-secondary">
              Deleting removes <span className="font-mono">poc_items</span> row #{items[0]?.id ?? "?"} from the
              proof-of-concept database. This cannot be undone.
            </p>
          </Dialog>
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
          <Button variant="primary" onClick={() => void runSidecar()}>
            Generate PPTX
          </Button>
          <StatusLine state={sidecarState} />
          {sidecarResult?.output_path && (
            <p className="mt-2 font-mono text-xs break-all text-text-secondary">{sidecarResult.output_path}</p>
          )}
        </Panel>

        <Panel title="Credential store" caption="Windows Credential Manager round trip. Secrets never reach the frontend, SQLite, or logs.">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void runCredential("set")}>
              Store test secret
            </Button>
            <Button onClick={() => void runCredential("status")}>Check presence</Button>
            <Button variant="danger" onClick={() => void runCredential("delete")}>
              Remove
            </Button>
          </div>
          <StatusLine state={credState} />
          {credStored !== null && (
            <p className="mt-2 text-sm text-text-secondary">
              Presence: <span className={credStored ? "text-success" : "text-text-secondary"}>{String(credStored)}</span>
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
