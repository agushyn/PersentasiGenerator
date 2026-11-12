import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onClose={() => undefined} title="Delete this row?">
        body
      </Dialog>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens, focuses the first control, and closes on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <button>Outside</button>
        <Dialog
          open={true}
          onClose={onClose}
          title="Delete this row?"
          footer={<button onClick={onClose}>Cancel</button>}
        >
          body
        </Dialog>
      </>
    );

    const dialog = screen.getByRole("dialog", { name: "Delete this row?" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab focus cycling inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Outside</button>
        <Dialog
          open={true}
          onClose={() => undefined}
          title="Confirm"
          footer={
            <>
              <button>Cancel</button>
              <button>Delete</button>
            </>
          }
        >
          body
        </Dialog>
      </>
    );

    // On open the dialog focuses its first control and traps Tab cycling
    // between the two footer buttons.
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    // The dialog traps focus: the next Tab wraps back to the first control.
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});
