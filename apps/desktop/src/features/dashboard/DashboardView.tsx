import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "../../components/ui/states";
import { useAppStatus } from "../../hooks/useAppStatus";
import type { ViewId } from "../../app/navigation";

/**
 * Dashboard (DESIGN.md 4.1): primary action first, recent projects,
 * a clear first-run empty state, and quick access to settings.
 */
export function DashboardView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { status, loading, error, reload } = useAppStatus();

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Resume work or start a new presentation.
        </p>
      </header>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" onClick={() => onNavigate("new")}>
          New Presentation
        </Button>
        <Button onClick={() => onNavigate("projects")}>Browse projects</Button>
      </div>

      <section aria-label="Recent projects" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent projects</h2>
          {loading && <Skeleton lines={1} />}
        </div>
        {loading ? (
          <Skeleton lines={3} />
        ) : error ? (
          <ErrorState
            title="Could not load application status"
            detail={error}
            onRetry={reload}
          />
        ) : (
          <EmptyState
            title="No projects yet"
            description="Project storage arrives with local persistence in Phase 2. After that, this area lists your presentations with their current stage."
            action={
              <Button variant="primary" onClick={() => onNavigate("new")}>
                Start your first presentation
              </Button>
            }
          />
        )}
      </section>

      {status && (
        <section aria-label="Setup hints" className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Setup</h2>
          <div className="rounded-lg border border-border-subtle bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">AI provider</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Provider credentials (BYOK) are configured in Settings from Phase 3.
                </p>
              </div>
              <StatusBadge tone="warning">Not configured</StatusBadge>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={() => onNavigate("settings")}>
                Open settings
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Renderer: {status.renderer}
          </p>
        </section>
      )}
    </div>
  );
}
