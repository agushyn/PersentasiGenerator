import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotificationProvider, useNotifications } from "./Notifications";

function Trigger() {
  const { notify } = useNotifications();
  return (
    <button onClick={() => notify("success", "PPTX generated", "3 slides in 535 ms")}>
      Notify
    </button>
  );
}

describe("Notifications", () => {
  it("auto-dismisses a toast after its timeout", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>
    );

    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(await screen.findByRole("status")).toHaveTextContent("PPTX generated");
    expect(screen.getByText("3 slides in 535 ms")).toBeInTheDocument();

    // The toast removes itself after AUTO_DISMISS_MS (5000 ms).
    await vi.waitFor(
      () => {
        expect(screen.queryByText("PPTX generated")).not.toBeInTheDocument();
      },
      { timeout: 8000, interval: 500 }
    );
  }, 10000);

  it("dismisses a toast via its close button", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Trigger />
      </NotificationProvider>
    );

    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(await screen.findByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Dismiss: PPTX generated/ }));
    expect(screen.queryByText("PPTX generated")).not.toBeInTheDocument();
  });

  it("throws when used outside the provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow(/NotificationProvider/);
    consoleError.mockRestore();
  });
});
