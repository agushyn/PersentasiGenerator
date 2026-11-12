import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../../components/ui/Notifications", async () => {
  const actual = await import("../../components/ui/Notifications");
  return {
    ...actual,
    useNotifications: () => ({ notify: vi.fn() }),
  };
});

import { NewPresentationView } from "./NewPresentationView";

function renderView(onNavigate = vi.fn()) {
  const view = render(<NewPresentationView onNavigate={onNavigate} />);
  return { ...view, onNavigate };
}

describe("NewPresentationView", () => {
  beforeEach(() => {
    state.reset();
    state.respond("project_create", {
      id: "00000000-0000-4000-8000-000000000000",
      title: "Fotosintesis",
      status: "active",
    });
  });

  it("requires a title before submitting", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Title is required.");
    expect(state.calls).toHaveLength(0);
  });

  it("creates a project with the captured brief and navigates to projects", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderView(onNavigate);

    await user.type(screen.getByLabelText("Title"), "Fotosintesis");
    await user.type(screen.getByLabelText("Topic"), "Biologi");
    await user.type(screen.getByLabelText("Audience"), "Grade 7");
    await user.type(screen.getByLabelText("Language"), "id");
    await user.type(screen.getByLabelText("Duration (minutes)"), "30");

    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(state.calls).toContainEqual({
      command: "project_create",
      payload: {
        title: "Fotosintesis",
        topic: "Biologi",
        audience: "Grade 7",
        language: "id",
        durationMinutes: 30,
      },
    });
    await vi.waitFor(() => expect(onNavigate).toHaveBeenCalledWith("projects"));
  });

  it("rejects an out-of-range duration locally", async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByLabelText("Title"), "Fotosintesis");
    await user.type(screen.getByLabelText("Duration (minutes)"), "0");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(
      await screen.findByText(/Duration must be a whole number of minutes/)
    ).toBeInTheDocument();
    expect(state.calls).toHaveLength(0);
  });

  it("surfaces backend errors without navigating", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    state.fail("project_create", {
      code: "VALIDATION_ERROR",
      message: "title must not be empty",
    });
    renderView(onNavigate);

    await user.type(screen.getByLabelText("Title"), "Fotosintesis");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await vi.waitFor(() => expect(onNavigate).not.toHaveBeenCalled());
  });
});
