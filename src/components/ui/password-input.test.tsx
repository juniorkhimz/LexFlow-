import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("starts masked (type=password)", () => {
    render(<PasswordInput aria-label="password" />);
    expect(screen.getByLabelText("password")).toHaveAttribute("type", "password");
  });

  it("reveals the value as plain text when the show button is clicked", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="password" />);
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("password")).toHaveAttribute("type", "text");
  });

  it("re-masks when clicked a second time", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="password" />);
    const toggle = screen.getByRole("button", { name: "Show password" });
    await user.click(toggle);
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("password")).toHaveAttribute("type", "password");
  });

  it("forwards typed input to the underlying field (react-hook-form relies on this)", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="password" />);
    const input = screen.getByLabelText("password");
    await user.type(input, "hunter2");
    expect(input).toHaveValue("hunter2");
  });

  it("does not steal tab focus order (toggle button is tabIndex=-1)", () => {
    render(<PasswordInput aria-label="password" />);
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("tabindex", "-1");
  });
});
