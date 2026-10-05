import { describe, expect, it } from "vitest";
import { colors, motion, radius, spacing, toCssVars, type, type ColorScheme } from "@punchcard/shared/tokens";

/** WCAG 2.x relative luminance contrast ratio between two #RRGGBB colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const SCHEMES: ColorScheme[] = ["light", "dark"];

describe("design tokens", () => {
  it("uses the brand surfaces and safety-orange accents", () => {
    expect(colors.dark.surface).toBe("#15171A");
    expect(colors.light.surface).toBe("#F4F1EA");
    expect(colors.light.accent).toBe("#FF6A1A");
    expect(colors.dark.accent).toBe("#FF7E3A");
  });

  it("gives both schemes the same colour roles", () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
  });

  it.each(SCHEMES)("meets WCAG AA text contrast in %s", (scheme) => {
    const c = colors[scheme];
    expect(contrast(c.text, c.surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.text, c.surfaceElevated)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.textSecondary, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textSecondary, c.surfaceElevated)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.accentText, c.surface)).toBeGreaterThanOrEqual(4.5);
    for (const role of ["success", "warning", "danger"] as const) {
      expect(contrast(c[role], c.surface), role).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses a 4-pt spacing scale and the agreed radii", () => {
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 });
    for (const value of Object.values(spacing)) expect(value % 4).toBe(0);
    expect(radius).toEqual({ sm: 8, md: 12, lg: 20, pill: 999 });
  });

  it("has one tabular display size for the clock", () => {
    expect(type.display.fontSize).toBe(56);
    expect(type.display.tabular).toBe(true);
    expect([type.title, type.headline, type.body, type.callout, type.caption].map((t) => t.fontSize)).toEqual([
      28, 20, 17, 15, 13,
    ]);
    for (const style of Object.values(type)) expect(style.lineHeight).toBeGreaterThan(style.fontSize);
  });

  it("defines motion durations and springs", () => {
    expect(motion.duration).toEqual({ fast: 150, base: 250, slow: 400 });
    expect(motion.spring.snappy.stiffness).toBeGreaterThan(motion.spring.gentle.stiffness);
  });
});

describe("toCssVars", () => {
  it("flattens a scheme into --pc-* custom properties with CSS units", () => {
    const vars = toCssVars("light");
    expect(vars["--pc-color-surface"]).toBe("#F4F1EA");
    expect(vars["--pc-color-on-accent"]).toBe(colors.light.onAccent);
    expect(vars["--pc-space-md"]).toBe("16px");
    expect(vars["--pc-radius-pill"]).toBe("999px");
    expect(vars["--pc-font-size-display"]).toBe("56px");
    expect(vars["--pc-line-height-body"]).toBe("22px");
    expect(vars["--pc-duration-base"]).toBe("250ms");
    expect(vars["--pc-shadow-md"]).toMatch(/^0 \d+px \d+px/);
    for (const key of Object.keys(vars)) expect(key).toMatch(/^--pc-[a-z0-9-]+$/);
  });

  it("differs between schemes only where the tokens do", () => {
    const light = toCssVars("light");
    const dark = toCssVars("dark");
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    expect(dark["--pc-color-surface"]).toBe("#15171A");
    expect(dark["--pc-space-md"]).toBe(light["--pc-space-md"]);
  });
});
