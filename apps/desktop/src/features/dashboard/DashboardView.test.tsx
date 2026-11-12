import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppStatus } from "../../types/poc";

// The dashboard consumes the app_status IPC through this hook; jsdom has no
// Tauri runtime, so the hook is replaced with controllable state.
const hookState = vi.hoisted(() => ({
  status: null as AppStatus | null,
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
}));

vi.mock("../../hooks/useAppStatus", () => ({
  useAppStatus: () => hookState,
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

function renderDashboard() {
  const onNavigate = vi.fn();
  const utils = render(<DashboardView onNavigate={onNavigate} />);
  return { ...utils, onNavigate };
}

describe("DashboardView", () => {
  beforeEach(() => {
    hookState.status = sampleStatus;
    hookState.loading = false;
    hookState.error = null;
  });

  it("shows the primary action and the recent-projects empty state", async () => {
    const view = renderDashboard();

    expect(screen.getByRole("button", { name: "New Presentation" })).toBeInTheDocument();
    expect(await screen.findByText("No projects yet")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "New Presentation" }));
    expect(view.onNavigate).toHaveBeenCalledWith("new");
  });

  it("shows loading skeletons while the status loads", () => {
    hookState.loading = true;
    const { container } = renderDashboard();
    expect(screen.queryByText("No projects yet")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(0);
  });

  it("shows a retry action when the status command fails", async () => {
    hookState.status = null;
    hookState.error = "IPC failed";
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load application status");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(hookState.reload).toHaveBeenCalled();
  });

  it("surfaces the renderer status line", () => {
    renderDashboard();
    expect(screen.getByText(/Renderer:/)).toHaveTextContent(sampleStatus.renderer);
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
