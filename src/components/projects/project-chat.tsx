"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Send, Loader2, Smile } from "lucide-react";
import EmojiPicker, { Theme as EmojiTheme, type EmojiClickData } from "emoji-picker-react";
import { parseMentionSegments } from "@/lib/mentions";

type ChatMessage = {
  id: string;
  body: string;
  senderName: string;
  senderRole: "participant" | "admin";
  senderEmoji: string | null;
  isMe: boolean;
  createdAt: string;
};

type Member = { id: string; name: string; emoji: string; isAdminAlias: boolean };

const POLL_INTERVAL_MS = 4000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function MessageBody({ text, memberNames }: { text: string; memberNames: string[] }) {
  const segments = parseMentionSegments(text, memberNames);
  return (
    <>
      {segments.map((s, i) =>
        s.type === "mention" ? (
          <span key={i} className="rounded bg-foreground/15 px-1 font-medium">
            {s.value}
          </span>
        ) : (
          <span key={i}>{s.value}</span>
        )
      )}
    </>
  );
}

export function ProjectChat({ projectId }: { projectId: string }) {
  const { resolvedTheme } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);

  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mentionQuery, members]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/members`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]));
  }, [projectId]);

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

  useEffect(() => {
    if (!showEmoji) return;
    const onClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showEmoji]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const onInputChange = (value: string) => {
    setInput(value);
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const atMatch = upToCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (name: string) => {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const upToCursor = input.slice(0, cursor);
    const replaced = upToCursor.replace(/@([^\s@]*)$/, `@${name} `);
    const next = replaced + input.slice(cursor);
    setInput(next);
    setMentionQuery(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const insertEmoji = (emoji: string) => {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const next = input.slice(0, cursor) + emoji + input.slice(cursor);
    setInput(next);
    setShowEmoji(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const send = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    setMentionQuery(null);
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionMatches[mentionIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
  };

  return (
    <div className="flex h-[30rem] flex-col">
      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-4 overflow-y-auto pr-1">
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
        <AnimatePresence initial={false}>
          {messages?.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${m.isMe ? "flex-row-reverse" : ""}`}
            >
              <div
                className="hairline flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-sm"
                aria-hidden
              >
                {m.senderEmoji ?? "👤"}
              </div>
              <div className={`flex max-w-[75%] flex-col ${m.isMe ? "items-end" : "items-start"}`}>
                {!m.isMe && (
                  <p className="mb-1 flex items-center gap-1.5 px-1 text-xs font-medium text-foreground/40">
                    {m.senderName}
                    {m.senderRole === "admin" && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        Admin
                      </span>
                    )}
                  </p>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${
                    m.isMe ? "bg-foreground text-background" : "hairline bg-card text-foreground/85"
                  }`}
                >
                  <MessageBody text={m.body} memberNames={memberNames} />
                </div>
                <span className="mt-1 px-1 text-[10px] text-foreground/30">{formatTime(m.createdAt)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="relative mt-4">
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div className="hairline absolute bottom-full mb-2 w-56 overflow-hidden rounded-xl bg-popover shadow-lg">
            {mentionMatches.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m.name);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  i === mentionIndex ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <span>{m.emoji}</span>
                <span className="text-foreground/85">{m.name}</span>
              </button>
            ))}
          </div>
        )}

        {showEmoji && (
          <div ref={emojiRef} className="absolute bottom-full right-0 mb-2 z-10">
            <EmojiPicker
              onEmojiClick={(data: EmojiClickData) => insertEmoji(data.emoji)}
              theme={resolvedTheme === "dark" ? EmojiTheme.DARK : EmojiTheme.LIGHT}
              width={320}
              height={360}
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
        >
          <div className="hairline flex flex-1 items-center gap-1 rounded-xl bg-card pr-1.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
              placeholder="Message your project team… try @ to mention someone"
              className="h-11 flex-1 bg-transparent px-3.5 text-sm outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowEmoji((s) => !s)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
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
    </div>
  );
}
