"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Standard next-themes hydration guard: theme is unknown on the server,
    // so defer rendering the actual icon until mounted on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`hairline inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-foreground/70 transition-colors hover:text-foreground ${className}`}
    >
      {mounted && (isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />)}
    </button>
  );
}
