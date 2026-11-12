import type { ReactNode } from "react";

/** Inline loading indicator for panels and views. */
export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-text-secondary">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}…
    </span>
  );
}

/** Skeleton block used while lists and panels load. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden="true" className="w-full space-y-2.5">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-4 rounded bg-surface-muted" style={{ width: `${100 - index * 12}%` }} />
      ))}
    </div>
  );
}

/** Explicit empty state with a single clear next action (DESIGN.md 4.1). */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-subtle bg-surface-muted/50 px-8 py-12 text-center">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-md text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Error state with a recovery action (DESIGN.md 8: show a useful recovery action on failure). */
export function ErrorState({
  title,
  detail,
  onRetry,
  retryLabel = "Retry",
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/30 bg-surface px-5 py-4"
    >
      <p className="text-sm font-semibold text-danger">{title}</p>
      {detail && <p className="mt-1 text-sm text-text-secondary break-words">{detail}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-sm font-medium outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/** Workflow stage / status chip. Never color-only: carries text. */
export function StatusBadge({ tone, children }: { tone: "neutral" | "accent" | "success" | "warning" | "danger"; children: ReactNode }) {
  const map: Record<string, string> = {
    neutral: "bg-surface-muted text-text-secondary",
    accent: "bg-accent-soft text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}
