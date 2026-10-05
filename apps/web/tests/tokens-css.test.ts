import { toCssVars } from "@punchcard/shared/tokens";
import { describe, expect, it } from "vitest";
import { buildTokensCss } from "@/lib/tokens-css";

describe("buildTokensCss", () => {
  const css = buildTokensCss();

  it("declares every light token on :root", () => {
    for (const [name, value] of Object.entries(toCssVars("light"))) {
      expect(css).toContain(`${name}: ${value};`);
    }
  });

  it("overrides only scheme-specific tokens for .dark and the system dark preference", () => {
    const dark = toCssVars("dark");
    expect(css).toMatch(/\.dark \{[^}]*--pc-color-surface: #15171A;/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\.light\) \{[^}]*--pc-color-surface: #15171A;/);
    expect(css).toContain(`--pc-shadow-md: ${dark["--pc-shadow-md"]};`);
    const darkBlock = /\.dark \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(darkBlock).not.toContain("--pc-space-md");
  });

  // The committed stylesheet is generated: `pnpm tokens:css` rewrites it.
  it("matches app/tokens.css", async () => {
    await expect(css).toMatchFileSnapshot("../app/tokens.css");
  });
});
