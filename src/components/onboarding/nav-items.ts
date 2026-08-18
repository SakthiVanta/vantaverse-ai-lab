import { LayoutGrid, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/onboarding/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/onboarding/profile", label: "Profile", icon: User },
] as const;

export async function signOutParticipant() {
  await fetch("/api/onboarding/logout", { method: "POST" });
}
