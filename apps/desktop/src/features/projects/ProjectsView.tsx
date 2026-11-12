import { EmptyState, StatusBadge } from "../../components/ui/states";

export function ProjectsView() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">All presentations and their workflow stages.</p>
        </div>
        <StatusBadge tone="neutral">Phase 2 planned</StatusBadge>
      </header>
      <div className="mt-8">
        <EmptyState
          title="No projects stored locally"
          description="Projects are created, listed, and managed here once SQLite-backed storage lands in Phase 2."
        />
      </div>
    </div>
  );
}
