import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  it("renders panels and switches on click", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        items={[
          { id: "a", label: "AI Providers", content: <p>Providers panel</p> },
          { id: "b", label: "Storage", content: <p>Storage panel</p> },
        ]}
      />
    );

    expect(screen.getByText("Providers panel")).toBeInTheDocument();
    expect(screen.queryByText("Storage panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Storage" }));
    expect(screen.getByText("Storage panel")).toBeInTheDocument();
  });

  it("exposes tablist semantics and selection state", () => {
    render(
      <Tabs
        items={[
          { id: "a", label: "One", content: <p>Panel one</p> },
          { id: "b", label: "Two", content: <p>Panel two</p> },
        ]}
      />
    );
    const one = screen.getByRole("tab", { name: "One" });
    expect(one).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        items={[
          { id: "a", label: "One", content: <p>Panel one</p> },
          { id: "b", label: "Two", content: <p>Panel two</p> },
        ]}
      />
    );

    await user.tab(); // focus the active tab
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
  });
});
