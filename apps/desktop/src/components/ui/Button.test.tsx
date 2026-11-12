import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label and handles clicks", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Insert row</Button>);

    const button = screen.getByRole("button", { name: "Insert row" });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and inert when the disabled prop is set", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick} disabled>
      Update first
    </Button>);

    expect(screen.getByRole("button", { name: "Update first" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Update first" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
