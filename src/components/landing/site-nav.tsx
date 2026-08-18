import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-foreground" />
        <span className="font-heading text-sm font-semibold tracking-[0.2em] text-foreground/90">
          VANTAVERSE
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-medium tracking-wide text-foreground/40 sm:inline">
          Founding Builders · Cohort 01
        </span>
        <Link
          href="/onboarding/signin"
          className="hairline rounded-full bg-card px-4 py-1.5 text-xs font-medium tracking-wide text-foreground/70 transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
