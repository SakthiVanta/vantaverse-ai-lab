"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

type ChatMessage = {
  id: string;
  body: string;
  senderName: string;
  senderRole: "participant" | "admin";
  isMe: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 4000;

export function ProjectChat({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/projects/${projectId}/messages`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      setMessages(data.messages);
      latestIdRef.current = data.messages.at(-1)?.id ?? null;
    }
    load();

    const interval = setInterval(async () => {
      const res = await fetch(`/api/projects/${projectId}/messages`, { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      const newLatest = data.messages.at(-1)?.id ?? null;
      if (newLatest !== latestIdRef.current) {
        setMessages(data.messages);
        latestIdRef.current = newLatest;
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId]);

  useEffect(() => {
    if (atBottomRef.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't send that");
        return;
      }
      setMessages((prev) => [...(prev ?? []), data.message]);
      latestIdRef.current = data.message.id;
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[28rem] flex-col">
      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages === null && (
          <div className="space-y-2">
            <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-card" />
            <div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-card" />
          </div>
        )}
        {messages?.length === 0 && (
          <p className="py-10 text-center text-sm text-foreground/40">
            No messages yet — say hello to your project team.
          </p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className={`max-w-[80%] ${m.isMe ? "ml-auto" : ""}`}>
            {!m.isMe && (
              <p className="mb-1 text-xs font-medium text-foreground/40">
                {m.senderName}
                {m.senderRole === "admin" && (
                  <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    Admin
                  </span>
                )}
              </p>
            )}
            <div
              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.isMe ? "bg-foreground text-background" : "hairline bg-card text-foreground/85"
              }`}
            >
              {m.body}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-4 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          placeholder="Message your project team…"
          className="h-11 flex-1 rounded-xl border-[1.5px] border-border bg-card px-3.5 text-sm outline-none focus-visible:border-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-40"
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
