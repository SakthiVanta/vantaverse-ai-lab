import Link from "next/link";
import { User } from "lucide-react";
import { SandBackground } from "@/components/landing/sand-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { FloatingChat } from "@/components/onboarding/floating-chat";

export function OnboardingShell({
  children,
  step,
}: {
  children: React.ReactNode;
  step?: { label: string; index: number; total: number };
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SandBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-xl items-center justify-between px-6 py-6">
        <span className="font-heading text-xs font-semibold tracking-[0.2em] text-foreground/50">
          VANTAVERSE
        </span>
        <div className="flex items-center gap-3">
          {step && (
            <span className="text-xs font-medium tracking-wide text-foreground/40">
              {step.index.toString().padStart(2, "0")} / {step.total.toString().padStart(2, "0")}
            </span>
          )}
          <Link
            href="/onboarding/profile"
            aria-label="Your profile"
            className="hairline inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground/70 transition-colors hover:text-foreground"
          >
            <User className="h-3.5 w-3.5" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {step && (
        <div className="relative z-10 mx-auto h-[3px] w-full max-w-xl rounded-full bg-border px-6">
          <div
            className="h-[3px] rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${(step.index / step.total) * 100}%` }}
          />
        </div>
      )}
      {/*
        `my-auto` (not `justify-center` on the flex parent) so short screens
        still look centered, but content taller than the viewport never gets
        centered-and-clipped above the fold — it collapses to top-aligned and
        scrolls normally instead.
      */}
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-12">
        <div className="my-auto w-full">{children}</div>
      </main>
      <FloatingChat />
    </div>
  );
}
