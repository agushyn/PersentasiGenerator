import { Button } from "../../components/ui/Button";
import { EmptyState, StatusBadge } from "../../components/ui/states";
import type { ViewId } from "../../app/navigation";

/**
 * New Presentation (DESIGN.md 4.2). The brief form becomes functional once
 * local project storage exists (Phase 2). This phase intentionally shows an
 * honest planned-state notice instead of a form that cannot save.
 */
export function NewPresentationView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Presentation</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Capture the brief and source materials.
          </p>
        </div>
        <StatusBadge tone="neutral">Phase 2 planned</StatusBadge>
      </header>

      <div className="mt-8">
        <EmptyState
          title="Presentation creation arrives in Phase 2"
          description="The brief (title, audience, duration, language, sources) will be stored locally with the project system. This screen is reserved; nothing here can be submitted yet, so no fake form is shown."
          action={
            <Button variant="primary" onClick={() => onNavigate("dashboard")}>
              Back to Dashboard
            </Button>
          }
        />
      </div>
    </div>
  );
}
