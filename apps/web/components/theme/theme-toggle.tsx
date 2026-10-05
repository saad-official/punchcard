"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Switches between light and dark. Both icons render on the server and CSS
 * shows the one for the current class, so there is no hydration flash.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-11 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
    >
      <Sun aria-hidden className="hidden size-5 dark:block" strokeWidth={1.75} />
      <Moon aria-hidden className="size-5 dark:hidden" strokeWidth={1.75} />
      <span className="sr-only">Switch between light and dark appearance</span>
    </button>
  );
}
