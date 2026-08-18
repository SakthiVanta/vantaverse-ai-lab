"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminHeader() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/admin" className="font-heading text-sm font-semibold tracking-[0.2em]">
          VANTAVERSE · CONTROL ROOM
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
