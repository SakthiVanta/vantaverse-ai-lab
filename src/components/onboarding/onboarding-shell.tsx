import { AuroraBackground } from "@/components/landing/aurora-background";

export function OnboardingShell({
  children,
  step,
}: {
  children: React.ReactNode;
  step?: { label: string; index: number; total: number };
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-xl items-center justify-between px-6 py-6">
        <span className="font-heading text-xs font-semibold tracking-[0.2em] text-foreground/50">
          VANTAVERSE
        </span>
        {step && (
          <span className="text-xs font-medium tracking-wide text-foreground/40">
            {step.index.toString().padStart(2, "0")} / {step.total.toString().padStart(2, "0")}
          </span>
        )}
      </header>
      {step && (
        <div className="relative z-10 mx-auto h-px w-full max-w-xl bg-white/10 px-6">
          <div
            className="h-px bg-gradient-to-r from-vv-violet via-vv-magenta to-vv-cyan transition-all duration-500"
            style={{ width: `${(step.index / step.total) * 100}%` }}
          />
        </div>
      )}
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
