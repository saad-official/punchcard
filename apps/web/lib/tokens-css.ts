import { toCssVars, type ColorScheme } from "@punchcard/shared/tokens";

/**
 * Renders the shared design tokens as `app/tokens.css`: every token on
 * `:root` (light), then the scheme-specific ones (colours, shadows) for the
 * `.dark` class (next-themes) and for a system dark preference when the
 * visitor has not picked light explicitly. Regenerate with `pnpm tokens:css`.
 */
export function buildTokensCss(): string {
  const light = toCssVars("light");
  const dark = toCssVars("dark");
  const darkOnly = Object.fromEntries(Object.entries(dark).filter(([name, value]) => light[name as keyof typeof light] !== value));

  const block = (selector: string, vars: Record<string, string>, scheme: ColorScheme, indent = "") =>
    [
      `${indent}${selector} {`,
      `${indent}  color-scheme: ${scheme};`,
      ...Object.entries(vars).map(([name, value]) => `${indent}  ${name}: ${value};`),
      `${indent}}`,
    ].join("\n");

  return [
    "/* Generated from packages/shared/src/tokens.ts by `pnpm tokens:css`. Do not edit by hand. */",
    "",
    block(":root", light, "light"),
    "",
    "@media (prefers-color-scheme: dark) {",
    block(":root:not(.light)", darkOnly, "dark", "  "),
    "}",
    "",
    block(".dark", darkOnly, "dark"),
    "",
  ].join("\n");
}
