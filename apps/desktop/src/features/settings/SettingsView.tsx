import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { Tabs } from "../../components/ui/Tabs";
import { useNotifications } from "../../components/ui/Notifications";
import { ErrorState, Skeleton, StatusBadge } from "../../components/ui/states";
import { useAppStatus } from "../../hooks/useAppStatus";
import { useWorkspace } from "../../hooks/useWorkspace";
import { formatIpcError } from "../../hooks/useProjects";
import type { ViewId } from "../../app/navigation";

/**
 * Settings shell (DESIGN.md 4.10). Sections that have no implementation
 * yet are labeled honestly instead of showing inactive controls.
 */
export function SettingsView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { status, loading, error, reload } = useAppStatus();
  const workspace = useWorkspace();
  const { notify } = useNotifications();
  const [rootDialogOpen, setRootDialogOpen] = useState(false);
  const [rootDraft, setRootDraft] = useState("");
  const [savingRoot, setSavingRoot] = useState(false);

  const providers = (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Provider credentials (BYOK)</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Users bring their own API keys. Keys will be stored in Windows Credential Manager; the frontend never sees them.
          </p>
        </div>
        <StatusBadge tone="neutral">Phase 3 planned</StatusBadge>
      </div>
    </div>
  );

  const models = (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Model defaults</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Default provider and model selection per task type.
          </p>
        </div>
        <StatusBadge tone="neutral">Phase 3 planned</StatusBadge>
      </div>
    </div>
  );

  const storage = (
    <div className="space-y-3">
      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Project workspace</p>
            {workspace.loading ? (
              <div className="mt-2">
                <Skeleton lines={1} />
              </div>
            ) : workspace.error ? (
              <div className="mt-2">
                <ErrorState title="Could not load workspace settings" detail={workspace.error} onRetry={workspace.reload} />
              </div>
            ) : workspace.info ? (
              <div className="mt-2 space-y-1">
                <p className="font-mono text-xs break-all text-text-secondary">{workspace.info.root}</p>
                {workspace.info.customized ? (
                  <p className="text-xs text-text-secondary">
                    Custom location. Default: <span className="font-mono">{workspace.info.default_root}</span>
                  </p>
                ) : (
                  <p className="text-xs text-text-secondary">Default location (Documents based).</p>
                )}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-text-secondary">
              New project folders are created here. Changing the location does not move existing projects.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {workspace.info?.customized && <StatusBadge tone="accent">Custom</StatusBadge>}
            <Button
              size="sm"
              onClick={() => {
                setRootDraft(workspace.info?.root ?? "");
                setRootDialogOpen(true);
              }}
            >
              Change location
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <p className="text-sm font-medium">Application data</p>
        {loading ? (
          <div className="mt-2">
            <Skeleton lines={1} />
          </div>
        ) : status ? (
          <p className="mt-2 font-mono text-xs break-all text-text-secondary">
            {status.db_path}
          </p>
        ) : (
          <p className="mt-2 text-sm text-text-secondary">Resolving…</p>
        )}
        <p className="mt-2 text-xs text-text-secondary">
          The SQLite database lives here. The app resolves paths via platform APIs; no user-profile paths are hard-coded.
        </p>
      </div>
    </div>
  );

  const rendering = (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <p className="text-sm font-medium">Rendering tools</p>
      {loading ? (
        <div className="mt-2">
          <Skeleton lines={1} />
        </div>
      ) : status ? (
        <p className="mt-2 text-sm text-text-secondary">{status.renderer}</p>
      ) : (
        <p className="mt-2 text-sm text-text-secondary">Not detected yet.</p>
      )}
      <p className="mt-2 text-xs text-text-secondary">
        LibreOffice is optional: it enables slide preview rendering and PDF export. PPTX export itself does not require it.
      </p>
    </div>
  );

  const fonts = (
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Fonts</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Font availability checks and fallback warnings for presentation output.
          </p>
        </div>
        <StatusBadge tone="neutral">Phase 7 planned</StatusBadge>
      </div>
    </div>
  );

  const diagnostics = (
    <div className="space-y-3">
      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <p className="text-sm font-medium">Application</p>
        <p className="mt-1 text-sm text-text-secondary">
          {status ? `${status.app_name} v${status.version}` : "Version unavailable"}
        </p>
      </div>
      <div className="rounded-lg border border-border-subtle bg-surface p-4">
        <p className="text-sm font-medium">Phase 0 validation harness</p>
        <p className="mt-0.5 text-sm text-text-secondary">
          Engineering harness exercising database, sidecar, and credential-store round trips. Kept from Phase 0 for regression checking.
        </p>
        <div className="mt-3">
          <Button size="sm" variant="primary" onClick={() => onNavigate("harness")}>
            Open validation harness
          </Button>
        </div>
      </div>
      {error && <ErrorState title="Status command failed" detail={error} onRetry={reload} />}
    </div>
  );

  const saveRoot = async () => {
    setSavingRoot(true);
    try {
      await workspace.setRoot(rootDraft);
      notify("success", "Workspace location updated", "Applies to newly created projects.");
      setRootDialogOpen(false);
    } catch (reason) {
      notify("error", "Could not change workspace", formatIpcError(reason));
    } finally {
      setSavingRoot(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Providers, storage, rendering tools, and diagnostics.
        </p>
      </header>
      <div className="mt-6">
        <Tabs
          initial="providers"
          items={[
            { id: "providers", label: "AI Providers", content: providers },
            { id: "models", label: "Model Defaults", content: models },
            { id: "storage", label: "Project Storage", content: storage },
            { id: "rendering", label: "Rendering Tools", content: rendering },
            { id: "fonts", label: "Fonts", content: fonts },
            { id: "diagnostics", label: "Diagnostics", content: diagnostics },
          ]}
        />
      </div>

      <Dialog
        open={rootDialogOpen}
        onClose={() => setRootDialogOpen(false)}
        title="Change workspace location"
        description="New project folders will be created under this path. Existing projects stay where they are."
        footer={
          <>
            <Button onClick={() => setRootDialogOpen(false)} disabled={savingRoot}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveRoot()} disabled={savingRoot}>
              Save location
            </Button>
          </>
        }
      >
        <Input
          label="Workspace folder"
          hint="Must be an absolute path, for example D:\\Presentations."
          value={rootDraft}
          onChange={(event) => setRootDraft(event.target.value)}
          spellCheck={false}
        />
      </Dialog>
    </div>
  );
}
