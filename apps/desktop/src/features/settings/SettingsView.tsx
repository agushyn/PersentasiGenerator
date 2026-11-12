import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { ErrorState, Skeleton, StatusBadge } from "../../components/ui/states";
import { useAppStatus } from "../../hooks/useAppStatus";
import type { ViewId } from "../../app/navigation";

/**
 * Settings shell (DESIGN.md 4.10). Sections that have no implementation
 * yet are labeled honestly instead of showing inactive controls.
 */
export function SettingsView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { status, loading, error, reload } = useAppStatus();

  const dataDir = status?.db_path ? status.db_path.replace(/\\poc\.db$/, "") : null;

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
    <div className="rounded-lg border border-border-subtle bg-surface p-4">
      <p className="text-sm font-medium">Application data location</p>
      {loading ? (
        <div className="mt-2">
          <Skeleton lines={1} />
        </div>
      ) : dataDir ? (
        <p className="mt-2 font-mono text-xs break-all text-text-secondary">{dataDir}</p>
      ) : (
        <p className="mt-2 text-sm text-text-secondary">Resolving…</p>
      )}
      <p className="mt-2 text-xs text-text-secondary">
        Configurable project storage location arrives with project management (Phase 2). The app resolves paths via platform APIs; no user-profile paths are hard-coded.
      </p>
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
    </div>
  );
}
