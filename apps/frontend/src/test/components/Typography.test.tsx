import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Typography } from "@/components/atoms";

describe("Typography", () => {
  it("renders children text", () => {
    render(<Typography>Hello ENS</Typography>);
    expect(screen.getByText("Hello ENS")).toBeInTheDocument();
  });

  it("renders as correct default HTML element per variant", () => {
    const { container } = render(
      <Typography variant="headingTwo">Title</Typography>,
    );
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("applies custom 'as' prop", () => {
    const { container } = render(
      <Typography variant="body" as="span">
        inline
      </Typography>,
    );
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("applies data-testid", () => {
    render(<Typography data-testid="my-text">test</Typography>);
    expect(screen.getByTestId("my-text")).toBeInTheDocument();
  });

  it("sets font-size based on variant", () => {
    render(<Typography variant="headingOne" data-testid="h1">Big</Typography>);
    const el = screen.getByTestId("h1");
    expect(el.style.fontSize).toBe("2.25rem");
  });
});
