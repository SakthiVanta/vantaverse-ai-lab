"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, AtSign, FolderKanban } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNotifications, type Notification } from "@/hooks/use-notifications";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_ICON: Record<Notification["type"], typeof Bell> = {
  project_assigned: FolderKanban,
  project_mentioned: AtSign,
};

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, refresh, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      refresh();
      setOpen(true);
    };
    document.addEventListener("open-notifications", onOpen);
    return () => document.removeEventListener("open-notifications", onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refresh();
  };

  const onCtaClick = (n: Notification) => {
    markRead(n.id);
    setOpen(false);
    if (n.linkUrl) router.push(n.linkUrl);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="hairline relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground/70 transition-colors hover:text-foreground"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Assignments and mentions land here.</SheetDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {notifications === null && (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-2xl bg-card" />
              <div className="h-16 animate-pulse rounded-2xl bg-card" />
            </div>
          )}
          {notifications?.length === 0 && (
            <div className="hairline mt-4 flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-10 text-center">
              <Bell className="h-6 w-6 text-foreground/30" />
              <p className="text-sm text-foreground/50">Nothing yet — you&apos;re all caught up.</p>
            </div>
          )}
          <div className="space-y-2">
            {notifications?.map((n) => {
              const Icon = TYPE_ICON[n.type];
              const unread = !n.readAt;
              return (
                <button
                  key={n.id}
                  onClick={() => onCtaClick(n)}
                  className={`hairline flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-accent/60 ${
                    unread ? "bg-card" : "bg-transparent"
                  }`}
                >
                  <div className="hairline mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
                    <Icon className="h-3.5 w-3.5 text-foreground/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                      {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-foreground/50">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-foreground/35">{relativeTime(n.createdAt)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
