import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type NotificationTone = "success" | "error" | "info";

export interface Notification {
  id: number;
  tone: NotificationTone;
  title: string;
  detail?: string;
}

interface NotificationsApi {
  notify: (tone: NotificationTone, title: string, detail?: string) => void;
}

const NotificationsContext = createContext<NotificationsApi | null>(null);

const AUTO_DISMISS_MS = 5000;

const tones: Record<NotificationTone, { accentClass: string; label: string }> = {
  success: { accentClass: "bg-success", label: "Success" },
  error: { accentClass: "bg-danger", label: "Error" },
  info: { accentClass: "bg-info", label: "Notice" },
};

function Toast({ notification, onDismiss }: { notification: Notification; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notification.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const tone = tones[notification.tone];

  return (
    <div
      role="status"
      aria-live={notification.tone === "error" ? "assertive" : "polite"}
      className="pointer-events-auto w-80 rounded-lg border border-border-subtle bg-surface p-3.5 shadow-lg"
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${tone.accentClass}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">{notification.title}</p>
          {notification.detail && <p className="mt-0.5 text-xs text-text-secondary break-words">{notification.detail}</p>}
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          aria-label={`Dismiss: ${notification.title}`}
          className="shrink-0 rounded p-0.5 text-text-secondary outline-none hover:bg-surface-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Provides toast notifications; never used for secrets or raw errors with sensitive payloads. */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (tone: NotificationTone, title: string, detail?: string) => {
      const id = nextId.current++;
      setNotifications((current) => [...current.slice(-4), { id, tone, title, detail }]);
    },
    []
  );

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationsContext.Provider value={api}>
      {children}
      {createPortal(
        <div aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {notifications.map((notification) => (
            <Toast key={notification.id} notification={notification} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsApi {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used inside a NotificationProvider");
  }
  return context;
}
