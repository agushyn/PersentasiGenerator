import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useNotifications } from "../../components/ui/Notifications";
import { formatIpcError, createProject } from "../../hooks/useProjects";
import type { ProjectDraft } from "../../types/projects";
import type { ViewId } from "../../app/navigation";

const EMPTY_DRAFT: ProjectDraft = {
  title: "",
  topic: null,
  audience: null,
  language: null,
  duration_minutes: null,
};

function parseDuration(raw: string): number | null | "invalid" {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) return "invalid";
  return value;
}

/**
 * New Presentation (DESIGN.md 4.2): capture the brief and create the local
 * project. The project gets a workspace folder on disk and a SQLite row.
 */
export function NewPresentationView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { notify } = useNotifications();
  const [draft, setDraft] = useState<ProjectDraft>(EMPTY_DRAFT);
  const [durationRaw, setDurationRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const set = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === "title") setFieldError(null);
  };

  const submit = async () => {
    if (draft.title.trim().length === 0) {
      setFieldError("Title is required.");
      return;
    }
    const duration = parseDuration(durationRaw);
    if (duration === "invalid" || (duration !== null && (duration < 1 || duration > 600))) {
      setFieldError("Duration must be a whole number of minutes between 1 and 600.");
      return;
    }
    setSubmitting(true);
    setFieldError(null);
    try {
      const project = await createProject({ ...draft, duration_minutes: duration });
      notify("success", "Project created", project.title);
      onNavigate("projects");
    } catch (reason) {
      notify("error", "Could not create project", formatIpcError(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-xl font-bold tracking-tight">New Presentation</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Capture the brief. The project is stored locally and survives restarts.
        </p>
      </header>

      <form
        className="mt-6 max-w-xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Input
          label="Title"
          hint="Required. Shown in the project list and on the cover slide later."
          value={draft.title}
          onChange={(event) => set("title", event.target.value)}
          maxLength={200}
          aria-invalid={fieldError !== null}
        />
        <Input
          label="Topic"
          hint="What the presentation is about."
          value={draft.topic ?? ""}
          onChange={(event) => set("topic", event.target.value)}
          maxLength={200}
        />
        <Input
          label="Audience"
          hint="For example: Grade 7, university freshmen, new employees."
          value={draft.audience ?? ""}
          onChange={(event) => set("audience", event.target.value)}
          maxLength={200}
        />
        <Input
          label="Language"
          hint="BCP-47 tag if known, for example id or en-US."
          value={draft.language ?? ""}
          onChange={(event) => set("language", event.target.value)}
          maxLength={200}
        />
        <Input
          label="Duration (minutes)"
          hint="Target presentation length, 1–600."
          inputMode="numeric"
          value={durationRaw}
          onChange={(event) => setDurationRaw(event.target.value)}
        />

        {fieldError && (
          <p role="alert" className="text-sm text-danger">
            {fieldError}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create project"}
          </Button>
          <Button type="button" onClick={() => onNavigate("dashboard")} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
