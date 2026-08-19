import Link from "next/link";
import { User } from "lucide-react";
import { SandBackground } from "@/components/landing/sand-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { FloatingChat } from "@/components/onboarding/floating-chat";
import { SidebarNav } from "@/components/onboarding/sidebar-nav";
import { MobileTabBar } from "@/components/onboarding/mobile-tab-bar";
import { NotificationBell } from "@/components/onboarding/notification-bell";

export function OnboardingShell({
  children,
  step,
  wide,
}: {
  children: React.ReactNode;
  step?: { label: string; index: number; total: number };
  /** Wizard steps (identity, spirit, challenges…) stay narrow and centered
   * on purpose. Content-heavy screens (dashboard, a project's chat/research
   * workspace) opt into this instead so desktop users aren't stuck with a
   * phone-width column. */
  wide?: boolean;
}) {
  const contentWidth = wide ? "max-w-5xl" : "max-w-xl";

  return (
    <div className={`relative flex min-h-screen flex-col ${wide ? "lg:pl-56" : ""}`}>
      <SandBackground />
      {wide && <SidebarNav />}
      <header className="sticky top-0 z-20 bg-background/90 supports-backdrop-filter:bg-background/65 supports-backdrop-filter:backdrop-blur-lg">
        <div className={`mx-auto flex w-full ${contentWidth} items-center justify-between px-6 py-6`}>
          <Link
            href="/onboarding/dashboard"
            className={`font-heading text-xs font-semibold tracking-[0.2em] text-foreground/50 transition-colors hover:text-foreground/80 ${
              wide ? "lg:hidden" : ""
            }`}
          >
            VANTAVERSE
          </Link>
          <div className="flex items-center gap-3">
            {step && (
              <span className="text-xs font-medium tracking-wide text-foreground/40">
                {step.index.toString().padStart(2, "0")} / {step.total.toString().padStart(2, "0")}
              </span>
            )}
            {!wide && (
              <Link
                href="/onboarding/profile"
                aria-label="Your profile"
                className="hairline inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground/70 transition-colors hover:text-foreground"
              >
                <User className="h-3.5 w-3.5" />
              </Link>
            )}
            {wide && <NotificationBell />}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {step && (
        <div className={`relative z-10 mx-auto w-full ${contentWidth} px-6`}>
          {/* The px-6 inset lives on this wrapper, not the colored track
             below — putting it directly on the bg-border element let the
             padding area read as filled track while the fill's percentage
             width was computed against the (smaller) content box, so the
             bar always visually under-represented actual progress. */}
          <div className="h-[3px] w-full rounded-full bg-border">
            <div
              className="h-[3px] rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${(step.index / step.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      {/*
        `my-auto` (not `justify-center` on the flex parent) so short screens
        still look centered, but content taller than the viewport never gets
        centered-and-clipped above the fold — it collapses to top-aligned and
        scrolls normally instead.
      */}
      <main
        className={`relative z-10 mx-auto flex w-full ${contentWidth} flex-1 flex-col px-6 pt-12 ${
          wide ? "pb-28 lg:pb-12" : "pb-12"
        }`}
      >
        <div className="my-auto w-full">{children}</div>
      </main>
      {wide && <MobileTabBar />}
      <FloatingChat wide={wide} />
    </div>
  );
}
