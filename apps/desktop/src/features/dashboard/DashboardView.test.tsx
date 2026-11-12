import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppStatus } from "../../types/poc";
import type { Project } from "../../types/projects";

// Both dashboard data sources are IPC hooks; jsdom has no Tauri runtime, so
// they are replaced with controllable state.
const statusState = vi.hoisted(() => ({
  status: null as AppStatus | null,
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
}));

const projectsState = vi.hoisted(() => ({
  projects: [] as Project[],
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
}));

vi.mock("../../hooks/useAppStatus", () => ({
  useAppStatus: () => statusState,
}));

vi.mock("../../hooks/useProjects", () => ({
  useProjects: () => projectsState,
}));

import { DashboardView } from "./DashboardView";
import { Layout } from "../../app/Layout";
import { PRIMARY_NAV } from "../../app/navigation";

const sampleStatus: AppStatus = {
  app_name: "Arya Duta Persentasion Studio",
  version: "0.1.0",
  db_path: "C:\\Users\\test\\AppData\\Roaming\\com.aryaduta.persentasionstudio\\poc.db",
  sidecar_found: true,
  sidecar_script_found: true,
  renderer: "LibreOffice not found (preview rendering and PDF export unavailable)",
};

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    title: "Fotosintesis",
    topic: "Biologi",
    audience: null,
    language: null,
    duration_minutes: null,
    status: "active",
    workspace_path: "C:\\workspace\\00000000-0000-4000-8000-000000000000",
    created_at: "2026-11-12T08:00:00Z",
    updated_at: "2026-11-12T08:00:00Z",
    ...overrides,
  };
}

function renderDashboard() {
  const onNavigate = vi.fn();
  const utils = render(<DashboardView onNavigate={onNavigate} />);
  return { ...utils, onNavigate };
}

describe("DashboardView", () => {
  beforeEach(() => {
    statusState.status = sampleStatus;
    statusState.loading = false;
    statusState.error = null;
    projectsState.projects = [];
    projectsState.loading = false;
    projectsState.error = null;
  });

  it("shows the primary action and the recent-projects empty state", async () => {
    const view = renderDashboard();

    expect(screen.getByRole("button", { name: "New Presentation" })).toBeInTheDocument();
    expect(await screen.findByText("No projects yet")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "New Presentation" }));
    expect(view.onNavigate).toHaveBeenCalledWith("new");
  });

  it("lists the three most recent projects with archived markers", () => {
    projectsState.projects = [
      makeProject({ title: "One", id: "a" }),
      makeProject({ title: "Two", id: "b", status: "archived" }),
      makeProject({ title: "Three", id: "c" }),
      makeProject({ title: "Four", id: "d" }),
    ];
    renderDashboard();

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
    expect(screen.queryByText("Four")).not.toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View all" })).toBeInTheDocument();
  });

  it("shows a retry action when the project list fails", async () => {
    projectsState.error = "IPC failed";
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load projects");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(projectsState.reload).toHaveBeenCalled();
  });

  it("shows loading skeletons while projects load", () => {
    projectsState.loading = true;
    const { container } = renderDashboard();
    expect(screen.queryByText("No projects yet")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
  });

  it("shows a retry action when the status command fails", async () => {
    statusState.status = null;
    statusState.error = "IPC failed";
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load application status");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(statusState.reload).toHaveBeenCalled();
  });
});

describe("Layout navigation", () => {
  it("renders all primary destinations with active marking", async () => {
    const onNavigate = vi.fn();
    render(<Layout active="dashboard" onNavigate={onNavigate}><p>Content</p></Layout>);

    for (const item of PRIMARY_NAV) {
      expect(screen.getByRole("button", { name: item.label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });

  it("keyboard focus lands on the first nav item first", async () => {
    render(<Layout active="dashboard" onNavigate={() => undefined}><button>Content action</button></Layout>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveFocus();
  });
});
