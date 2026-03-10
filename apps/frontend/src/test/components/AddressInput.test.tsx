import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddressInput } from "@/components/molecules";

const VALID_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

describe("AddressInput", () => {
  it("renders input and button", () => {
    render(<AddressInput onSubmit={() => {}} />);
    expect(screen.getByLabelText("Ethereum Address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check" })).toBeInTheDocument();
  });

  it("calls onSubmit with valid address", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<AddressInput onSubmit={handler} />);

    await user.type(screen.getByLabelText("Ethereum Address"), VALID_ADDRESS);
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(handler).toHaveBeenCalledWith(VALID_ADDRESS);
  });

  it("shows error for invalid address", async () => {
    const user = userEvent.setup();
    render(<AddressInput onSubmit={() => {}} />);

    await user.type(screen.getByLabelText("Ethereum Address"), "invalid");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText("Enter a valid Ethereum address")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<AddressInput onSubmit={() => {}} loading />);
    expect(screen.getByRole("button", { name: "Checking..." })).toBeDisabled();
  });
});
