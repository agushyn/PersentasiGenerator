import { EmptyState, StatusBadge } from "../../components/ui/states";

export function DesignLibraryView() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Design Library</h1>
          <p className="mt-1 text-sm text-text-secondary">Editorial themes and layout patterns for decks.</p>
        </div>
        <StatusBadge tone="neutral">Phase 7 planned</StatusBadge>
      </header>
      <div className="mt-8">
        <EmptyState
          title="Design system arrives in Phase 7"
          description="The Learning Journal editorial theme and the layout pattern catalog will appear here once the editorial design system is implemented."
        />
      </div>
    </div>
  );
}
