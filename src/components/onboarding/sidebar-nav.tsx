"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { NAV_ITEMS, signOutParticipant } from "@/components/onboarding/nav-items";

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();

  const signOut = async () => {
    const ok = await confirm({
      title: "Sign out?",
      description: "You'll need to verify your email again to sign back in.",
      confirmLabel: "Sign out",
      destructive: true,
    });
    if (!ok) return;
    await signOutParticipant();
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <>
      <aside className="hairline fixed inset-y-0 left-0 z-10 hidden w-56 flex-col bg-background/60 px-4 py-8 lg:flex">
        <Link
          href="/onboarding/dashboard"
          className="mb-8 px-3.5 font-heading text-xs font-semibold tracking-[0.2em] text-foreground/50 transition-colors hover:text-foreground/80"
        >
          VANTAVERSE
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-card text-foreground"
                    : "text-foreground/50 hover:bg-card/60 hover:text-foreground/80"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground/40 transition-colors hover:bg-card/60 hover:text-foreground/70"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>
      {dialog}
    </>
  );
}
