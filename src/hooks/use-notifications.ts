"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type Notification = {
  id: string;
  type: "project_assigned" | "project_mentioned";
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_INTERVAL_MS = 15000;
const SHEET_LIMIT = 30;

export function useNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const latestIdRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  const load = async (limit = SHEET_LIMIT) => {
    const res = await fetch(`/api/onboarding/notifications?limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { notifications: Notification[]; unreadCount: number };
  };

  const refresh = async () => {
    const data = await load();
    if (!data) return;
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    latestIdRef.current = data.notifications[0]?.id ?? null;
  };

  const markRead = async (id: string) => {
    setNotifications(
      (prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? prev
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/onboarding/notifications/${id}`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    setNotifications(
      (prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? prev
    );
    setUnreadCount(0);
    await fetch("/api/onboarding/notifications/read-all", { method: "POST" });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await load();
      if (!data || cancelled) return;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      latestIdRef.current = data.notifications[0]?.id ?? null;
      firstLoadRef.current = false;
    })();

    const interval = setInterval(async () => {
      const data = await load();
      if (!data || cancelled) return;

      // Everything strictly newer than what we last saw — if the old
      // latest id isn't in this page at all (a big batch arrived, or the
      // list was empty before), treat the whole page as new.
      const oldIndex = data.notifications.findIndex((n) => n.id === latestIdRef.current);
      const newOnes = oldIndex === -1 ? data.notifications : data.notifications.slice(0, oldIndex);

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      const newLatest = data.notifications[0]?.id ?? null;
      const hasNew = newLatest !== latestIdRef.current;
      latestIdRef.current = newLatest;

      if (!hasNew || firstLoadRef.current) return;

      if (newOnes.length === 1) {
        const n = newOnes[0];
        toast(n.title, {
          description: n.body ?? undefined,
          action: n.linkUrl
            ? {
                label: "View",
                onClick: () => {
                  markRead(n.id);
                  router.push(n.linkUrl!);
                },
              }
            : undefined,
        });
      } else if (newOnes.length > 1) {
        toast(`${newOnes.length} new notifications`, {
          action: { label: "View all", onClick: () => document.dispatchEvent(new Event("open-notifications")) },
        });
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { notifications, unreadCount, refresh, markRead, markAllRead };
}
