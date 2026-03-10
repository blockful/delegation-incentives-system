import { describe, it, expect } from "vitest";
import { colors, fontFamily, fontSize, fontWeight, radii, space, shadows } from "@/theme";

describe("design tokens", () => {
  it("exposes ENS blue as primary accent", () => {
    expect(colors.blue).toBe("rgb(56, 137, 255)");
  });

  it("uses Satoshi as primary font family", () => {
    expect(fontFamily.sans).toContain("Satoshi");
  });

  it("provides correct heading sizes based on Thorin scale", () => {
    expect(fontSize.headingOne).toBe("2.25rem");
    expect(fontSize.headingTwo).toBe("1.875rem");
    expect(fontSize.body).toBe("1rem");
    expect(fontSize.small).toBe("0.875rem");
  });

  it("defines Thorin font weights", () => {
    expect(fontWeight.light).toBe(300);
    expect(fontWeight.normal).toBe(500);
    expect(fontWeight.bold).toBe(700);
    expect(fontWeight.extraBold).toBe(830);
  });

  it("defines card border radius as 1rem", () => {
    expect(radii.card).toBe("1rem");
  });

  it("defines space scale in rem", () => {
    expect(space["4"]).toBe("1rem");
    expect(space["8"]).toBe("2rem");
  });

  it("defines shadow tokens", () => {
    expect(shadows.none).toBe("none");
    expect(shadows.focus).toContain("rgba(56, 137, 255");
  });

  it("has complete color palette for light theme", () => {
    expect(colors.textPrimary).toBeDefined();
    expect(colors.textSecondary).toBeDefined();
    expect(colors.backgroundPrimary).toBeDefined();
    expect(colors.backgroundSecondary).toBeDefined();
    expect(colors.border).toBeDefined();
  });
});
