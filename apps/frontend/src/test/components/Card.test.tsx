import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/atoms";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies data-testid", () => {
    render(<Card data-testid="test-card">content</Card>);
    expect(screen.getByTestId("test-card")).toBeInTheDocument();
  });

  it("has white background by default", () => {
    render(<Card data-testid="card">content</Card>);
    const card = screen.getByTestId("card");
    expect(card.style.background).toBe("rgb(255, 255, 255)");
  });

  it("has border radius of 1rem (card token)", () => {
    render(<Card data-testid="card">content</Card>);
    const card = screen.getByTestId("card");
    expect(card.style.borderRadius).toBe("1rem");
  });
});
