"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AdminHeader() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const logout = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("Couldn't sign out — check your connection and try again.");
      setSigningOut(false);
    }
  };

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-heading text-sm font-semibold tracking-[0.2em]">
            VANTAVERSE · CONTROL ROOM
          </Link>
          <Link href="/admin/projects" className="text-sm text-foreground/60 hover:text-foreground">
            Projects
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="gap-1.5" disabled={signingOut} onClick={logout}>
            {signingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>
    </header>
  );
}
