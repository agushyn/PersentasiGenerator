import { Button } from "../../components/ui/Button";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "../../components/ui/states";
import { useAppStatus } from "../../hooks/useAppStatus";
import { useProjects } from "../../hooks/useProjects";
import type { ViewId } from "../../app/navigation";

/**
 * Dashboard (DESIGN.md 4.1): primary action first, recent projects,
 * a clear first-run empty state, and quick access to settings.
 */
export function DashboardView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { status, loading: statusLoading, error: statusError, reload } = useAppStatus();
  const { projects, loading: projectsLoading, error: projectsError, reload: reloadProjects } =
    useProjects();
  const recent = projects.slice(0, 3);

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
          {projects.length > 3 && (
            <Button size="sm" variant="ghost" onClick={() => onNavigate("projects")}>
              View all
            </Button>
          )}
        </div>
        {projectsLoading ? (
          <Skeleton lines={3} />
        ) : projectsError ? (
          <ErrorState
            title="Could not load projects"
            detail={projectsError}
            onRetry={reloadProjects}
          />
        ) : recent.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first presentation. Projects are stored locally and survive restarts."
            action={
              <Button variant="primary" onClick={() => onNavigate("new")}>
                Start your first presentation
              </Button>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
            {recent.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{project.title}</p>
                  <p className="text-xs text-text-secondary">
                    Updated {project.updated_at.slice(0, 10)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {project.status === "archived" && (
                    <StatusBadge tone="neutral">Archived</StatusBadge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onNavigate("projects")}>
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {statusError ? (
        <section aria-label="Setup hints" className="mt-8">
          <ErrorState title="Could not load application status" detail={statusError} onRetry={reload} />
        </section>
      ) : status && !statusLoading ? (
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
      ) : null}
    </div>
  );
}
