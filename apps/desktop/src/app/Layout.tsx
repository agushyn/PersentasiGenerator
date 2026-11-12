import type { ReactNode } from "react";
import { PRIMARY_NAV, type ViewId } from "./navigation";

/**
 * Application shell: neutral sidebar, content region. DESigned for
 * 1280x800 and Windows display scaling (DESIGN.md section 10).
 */
export function Layout({
  active,
  onNavigate,
  children,
}: {
  active: ViewId;
  onNavigate: (view: ViewId) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <nav aria-label="Primary" className="flex w-60 shrink-0 flex-col border-r border-border-subtle bg-surface">
        <div className="px-5 pb-4 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">Arya Duta</p>
          <p className="mt-0.5 text-sm font-bold leading-snug text-text-primary">Persentasion Studio</p>
        </div>
        <ul className="flex-1 space-y-0.5 px-2.5">
          {PRIMARY_NAV.map((item) => {
            const selected = item.id === active;
            return (
              <li key={item.id}>
                <button
                  aria-current={selected ? "page" : undefined}
                  onClick={() => onNavigate(item.id)}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                    selected
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="px-5 pb-5 pt-3 text-[11px] leading-relaxed text-text-secondary">
          Local-first. Educational presentations.
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
