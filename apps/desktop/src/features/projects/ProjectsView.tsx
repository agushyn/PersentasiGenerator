import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Dialog } from "../../components/ui/Dialog";
import { useNotifications } from "../../components/ui/Notifications";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "../../components/ui/states";
import {
  useProjects,
  formatIpcError,
  renameProject,
  setProjectStatus,
  deleteProject,
} from "../../hooks/useProjects";
import type { Project } from "../../types/projects";
import type { ViewId } from "../../app/navigation";

interface PendingAction {
  kind: "archive" | "restore" | "delete";
  project: Project;
}

function describeDuration(minutes: number | null): string | null {
  if (minutes === null) return null;
  return `${minutes} min`;
}

function ProjectRow({
  project,
  onRename,
  onArchive,
  onRestore,
  onDelete,
}: {
  project: Project;
  onRename: (project: Project) => void;
  onArchive: (project: Project) => void;
  onRestore: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const meta = [
    project.topic,
    project.audience,
    describeDuration(project.duration_minutes),
    project.language,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">{project.title}</p>
          {project.status === "archived" && <StatusBadge tone="neutral">Archived</StatusBadge>}
        </div>
        {meta && <p className="mt-0.5 text-sm text-text-secondary">{meta}</p>}
        <p className="mt-1 truncate font-mono text-xs text-text-secondary">{project.workspace_path}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={() => onRename(project)}>
          Rename
        </Button>
        {project.status === "active" ? (
          <Button size="sm" onClick={() => onArchive(project)}>
            Archive
          </Button>
        ) : (
          <Button size="sm" onClick={() => onRestore(project)}>
            Restore
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={() => onDelete(project)}>
          Delete
        </Button>
      </div>
    </li>
  );
}

/**
 * Project management (Phase 2): list, rename, archive/restore, delete.
 * Destructive actions require explicit confirmation (DESIGN.md section 8).
 */
export function ProjectsView({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { projects, loading, error, reload } = useProjects();
  const { notify } = useNotifications();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAction = (kind: PendingAction["kind"], project: Project) => {
    setPending({ kind, project });
  };

  const openRename = (project: Project) => {
    setRenameTarget(project);
    setRenameTitle(project.title);
  };

  const runAction = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "archive") {
        await setProjectStatus(pending.project.id, "archived");
        notify("info", "Project archived", pending.project.title);
      } else if (pending.kind === "restore") {
        await setProjectStatus(pending.project.id, "active");
        notify("info", "Project restored", pending.project.title);
      } else {
        await deleteProject(pending.project.id);
        notify("success", "Project deleted", pending.project.title);
      }
      reload();
    } catch (reason) {
      notify("error", "Action failed", formatIpcError(reason));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const runRename = async () => {
    if (!renameTarget) return;
    setBusy(true);
    try {
      await renameProject(renameTarget.id, renameTitle);
      notify("success", "Project renamed", renameTitle);
      reload();
      setRenameTarget(null);
    } catch (reason) {
      notify("error", "Rename failed", formatIpcError(reason));
    } finally {
      setBusy(false);
    }
  };

  const pendingTitle =
    pending?.kind === "delete"
      ? `Delete "${pending.project.title}"?`
      : pending?.kind === "archive"
        ? `Archive "${pending.project.title}"?`
        : `Restore "${pending?.project.title}"?`;

  const pendingDescription =
    pending?.kind === "delete"
      ? "This permanently removes the project workspace folder and its database record. This cannot be undone."
      : pending?.kind === "archive"
        ? "Archived projects stay on disk and can be restored at any time."
        : "The project becomes active again and appears in recent lists.";

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">
            All presentations and their workspace locations.
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate("new")}>
          New Presentation
        </Button>
      </header>

      {loading ? (
        <div className="mt-8">
          <Skeleton lines={4} />
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorState title="Could not load projects" detail={error} onRetry={reload} />
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No projects stored locally"
            description="Create your first presentation: it gets a workspace folder on disk and is stored in the local database, so it survives restarts."
            action={
              <Button variant="primary" onClick={() => onNavigate("new")}>
                Start your first presentation
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="mt-4">{projects.map((project) => (
          <ProjectRow
            key={project.id}
            project={project}
            onRename={openRename}
            onArchive={(target) => handleAction("archive", target)}
            onRestore={(target) => handleAction("restore", target)}
            onDelete={(target) => handleAction("delete", target)}
          />
        ))}</ul>
      )}

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pendingTitle}
        description={pendingDescription}
        footer={
          <>
            <Button onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant={pending?.kind === "delete" ? "danger" : "primary"}
              onClick={() => void runAction()}
              disabled={busy}
            >
              {pending?.kind === "delete" ? "Delete" : "Confirm"}
            </Button>
          </>
        }
      />

      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename project"
        footer={
          <>
            <Button onClick={() => setRenameTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void runRename()}
              disabled={busy || renameTitle.trim().length === 0}
            >
              Rename
            </Button>
          </>
        }
      >
        <Input
          label="Title"
          value={renameTitle}
          onChange={(event) => setRenameTitle(event.target.value)}
          maxLength={200}
        />
      </Dialog>
    </div>
  );
}
