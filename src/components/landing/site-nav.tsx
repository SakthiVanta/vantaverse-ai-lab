import Link from "next/link";

export function SiteNav() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-vv-violet shadow-[0_0_12px_var(--vv-violet)]" />
        <span className="font-heading text-sm font-semibold tracking-[0.2em] text-foreground/90">
          VANTAVERSE
        </span>
      </div>
      <Link
        href="/onboarding"
        className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium tracking-wide text-foreground/70 backdrop-blur-sm transition hover:border-white/20 hover:text-foreground"
      >
        Founding Builders · Cohort 01
      </Link>
    </header>
  );
}
