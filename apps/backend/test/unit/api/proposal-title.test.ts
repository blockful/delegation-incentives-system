import { describe, it, expect } from "vitest";
import { parseProposalTitle } from "../../../src/api/proposal-title.js";

describe("parseProposalTitle", () => {
  it("returns the H1 when the first non-empty line is an H1", () => {
    const desc = "# EP 6.6 — [Executable] Working Group budgets\n\nLong body...";
    expect(parseProposalTitle(desc)).toBe("EP 6.6 — [Executable] Working Group budgets");
  });

  it("normalizes escaped \\n sequences in the raw description", () => {
    const desc = "# EP 5.31 — Audit budget\\n\\nBody paragraph";
    expect(parseProposalTitle(desc)).toBe("EP 5.31 — Audit budget");
  });

  it("falls back to the first non-empty, non-header line when there is no H1", () => {
    const desc = "## Section\n\nA Service Provider proposal\n\nMore body";
    expect(parseProposalTitle(desc)).toBe("A Service Provider proposal");
  });

  it("ignores leading blank lines before the H1", () => {
    const desc = "\n\n   \n# Real Title\nbody";
    expect(parseProposalTitle(desc)).toBe("Real Title");
  });

  it("truncates titles longer than 200 characters with an ellipsis", () => {
    const longLine = "a".repeat(250);
    const result = parseProposalTitle(longLine);
    expect(result).toHaveLength(203);
    expect(result.endsWith("...")).toBe(true);
  });

  it("returns an empty string when no usable line is found", () => {
    expect(parseProposalTitle("")).toBe("");
    expect(parseProposalTitle("\n\n\n")).toBe("");
    expect(parseProposalTitle("## only headers\n### deeper\n")).toBe("");
  });

  it("strips multiple spaces after the H1 marker", () => {
    expect(parseProposalTitle("#   Spaced Title")).toBe("Spaced Title");
  });
});
