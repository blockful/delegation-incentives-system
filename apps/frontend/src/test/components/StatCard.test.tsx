import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/molecules";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total" value="42" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("renders suffix", () => {
    render(<StatCard label="Pool" value="5000" suffix="ENS" />);
    expect(screen.getByText("ENS")).toBeInTheDocument();
  });

  it("applies data-testid", () => {
    render(<StatCard label="Test" value="1" data-testid="stat" />);
    expect(screen.getByTestId("stat")).toBeInTheDocument();
  });
});
