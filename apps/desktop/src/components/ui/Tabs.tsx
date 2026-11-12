import { useId, useRef, useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Accessible tabs (DESIGN.md keyboard rules): role=tablist, roving tabindex,
 * Arrow Left/Right and Home/End move focus and activate.
 */
export function Tabs({ items, initial }: { items: TabItem[]; initial?: string }) {
  const baseId = useId();
  const [active, setActive] = useState(initial ?? items[0]?.id ?? "");
  const listRef = useRef<HTMLDivElement>(null);

  const move = (from: number, step: 1 | -1) => {
    const next = (from + step + items.length) % items.length;
    setActive(items[next].id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role='tab']")
      [next]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const index = items.findIndex((item) => item.id === active);
    if (index < 0) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(index, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(index, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(items[0].id);
      listRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      const last = items.length - 1;
      setActive(items[last].id);
      listRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[last]?.focus();
    }
  };

  const current = items.find((item) => item.id === active);

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Sections"
        className="flex gap-1 border-b border-border-subtle"
        onKeyDown={handleKeyDown}
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={`rounded-t-md px-3.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                selected
                  ? "border-b-2 border-accent text-text-primary"
                  : "border-b-2 border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {current && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${current.id}`}
          aria-labelledby={`${baseId}-tab-${current.id}`}
          className="pt-4"
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
