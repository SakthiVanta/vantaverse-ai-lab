"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { NAV_ITEMS, signOutParticipant } from "@/components/onboarding/nav-items";

export function MobileTabBar() {
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
      <nav
        className="hairline fixed inset-x-0 bottom-0 z-[45] flex items-stretch justify-around bg-card/70 px-2 pt-1.5 supports-backdrop-filter:bg-card/55 supports-backdrop-filter:backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.375rem)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2"
            >
              {active && (
                <motion.span
                  layoutId="mobile-tab-active"
                  className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <motion.span whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-1">
                <item.icon className={`h-5 w-5 ${active ? "text-foreground" : "text-foreground/45"}`} />
                <span
                  className={`text-[10px] font-medium ${active ? "text-foreground" : "text-foreground/45"}`}
                >
                  {item.label}
                </span>
              </motion.span>
            </Link>
          );
        })}
        <button type="button" onClick={signOut} className="flex flex-1 flex-col items-center gap-1 py-2">
          <motion.span whileTap={{ scale: 0.88 }} className="flex flex-col items-center gap-1 text-foreground/45">
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Sign out</span>
          </motion.span>
        </button>
      </nav>
      {dialog}
    </>
  );
}
