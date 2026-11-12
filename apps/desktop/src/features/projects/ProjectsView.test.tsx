import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider } from "../../components/ui/Notifications";

// The view talks to the backend through typed invoke wrappers; jsdom has no
// Tauri runtime. The transport mock is command-scoped so different IPC
// commands can return different results without interfering.
const state = vi.hoisted(() => {
  const responses = new Map<string, unknown>();
  const failures = new Map<string, unknown>();
  const calls: Array<{ command: string; payload: unknown }> = [];
  return {
    responses,
    failures,
    calls,
    reset() {
      responses.clear();
      failures.clear();
      calls.length = 0;
    },
    respond(command: string, value: unknown) {
      responses.set(command, value);
    },
    fail(command: string, error: unknown) {
      failures.set(command, error);
    },
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, payload?: unknown) => {
    state.calls.push({ command, payload });
    if (state.failures.has(command)) {
      const error = state.failures.get(command);
      state.failures.delete(command);
      return Promise.reject(error);
    }
    return Promise.resolve(state.responses.get(command));
  },
}));

import { ProjectsView } from "./ProjectsView";

const sampleProject = {
  id: "00000000-0000-4000-8000-000000000000",
  title: "Fotosintesis",
  topic: "Biologi",
  audience: "Grade 7",
  language: "id",
  duration_minutes: 30,
  status: "active",
  workspace_path: "C:\\workspace\\00000000-0000-4000-8000-000000000000",
  created_at: "2026-11-12T08:00:00Z",
  updated_at: "2026-11-12T08:00:00Z",
};

function renderProjects(onNavigate = vi.fn()) {
  const view = render(
    <NotificationProvider>
      <ProjectsView onNavigate={onNavigate} />
    </NotificationProvider>
  );
  return { ...view, onNavigate };
}

describe("ProjectsView", () => {
  beforeEach(() => {
    state.reset();
    state.respond("project_list", []);
  });

  it("shows an empty state when no projects exist", async () => {
    renderProjects();

    expect(await screen.findByText("No projects stored locally")).toBeInTheDocument();
  });

  it("lists projects with metadata after loading", async () => {
    state.respond("project_list", [sampleProject]);
    renderProjects();

    expect(await screen.findByText("Fotosintesis")).toBeInTheDocument();
    expect(screen.getByText("Biologi · Grade 7 · 30 min · id")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("shows a retry action when loading fails", async () => {
    state.fail("project_list", { code: "DB_ERROR", message: "boom" });
    renderProjects();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load projects");
    expect(screen.getByText(/DB_ERROR: boom/)).toBeInTheDocument();

    state.respond("project_list", [sampleProject]);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Fotosintesis")).toBeInTheDocument();
  });

  it("renames a project through the dialog", async () => {
    const user = userEvent.setup();
    state.respond("project_list", [sampleProject]);
    renderProjects();
    await screen.findByText("Fotosintesis");

    await user.click(screen.getByRole("button", { name: "Rename" }));
    const dialog = screen.getByRole("dialog", { name: "Rename project" });
    expect(dialog).toBeInTheDocument();

    const input = screen.getByLabelText("Title");
    await user.clear(input);
    await user.type(input, "Sel Tumbuhan");
    state.respond("project_rename", { ...sampleProject, title: "Sel Tumbuhan" });
    await user.click(within(dialog).getByRole("button", { name: "Rename" }));

    expect(state.calls).toContainEqual({
      command: "project_rename",
      payload: { id: sampleProject.id, title: "Sel Tumbuhan" },
    });
  });

  it("requires confirmation before deleting and calls the backend", async () => {
    const user = userEvent.setup();
    state.respond("project_list", [sampleProject]);
    renderProjects();
    await screen.findByText("Fotosintesis");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/Delete "Fotosintesis"\?/);
    expect(dialog).toHaveTextContent("cannot be undone");

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(state.calls).toContainEqual({
      command: "project_delete",
      payload: { id: sampleProject.id },
    });
  });

  it("requires confirmation before archiving", async () => {
    const user = userEvent.setup();
    state.respond("project_list", [sampleProject]);
    renderProjects();
    await screen.findByText("Fotosintesis");

    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/Archive "Fotosintesis"\?/);

    await user.click(within(dialog).getByRole("button", { name: "Confirm" }));
    expect(state.calls).toContainEqual({
      command: "project_set_status",
      payload: { id: sampleProject.id, status: "archived" },
    });
  });
});
