import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/atoms";

describe("Badge", () => {
  it("renders text content", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies green variant background", () => {
    render(<Badge variant="green" data-testid="badge">OK</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.style.background).toBe("rgb(231, 244, 239)");
  });

  it("applies blue variant background", () => {
    render(<Badge variant="blue" data-testid="badge">Info</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.style.background).toBe("rgb(232, 242, 255)");
  });

  it("applies red variant background", () => {
    render(<Badge variant="red" data-testid="badge">Error</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.style.background).toBe("rgb(248, 232, 230)");
  });

  it("has full border radius (pill shape)", () => {
    render(<Badge data-testid="badge">Pill</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.style.borderRadius).toBe("9999px");
  });
});
