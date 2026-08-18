"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Lock, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAiKeyStatus } from "@/hooks/use-ai-key-status";
import { QUICK_ANALYSES } from "@/lib/quick-analyses";

type Message = { role: "user" | "model"; text: string };

export function FloatingChat() {
  const router = useRouter();
  const { state } = useOnboardingState();
  const { status, loading: keyLoading } = useAiKeyStatus();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Only shows once someone actually exists to chat about, and never on
  // the identity/verify screens where there's nothing to ground it in yet.
  if (!state?.participant || !state.participant.emailVerified) return null;

  const locked = !keyLoading && !status?.hasKey;

  const send = async (text: string) => {
    if (sending || !text.trim()) return;
    const userMessage: Message = { role: "user", text: text.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/onboarding/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: messages.slice(-10),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "The assistant is unavailable right now");
        setMessages(messages);
        return;
      }
      setMessages([...nextMessages, { role: "model", text: data.reply }]);
    } catch {
      toast.error("You're offline — check your connection and try again.");
      setMessages(messages);
    } finally {
      setSending(false);
    }
  };

  const runQuick = async (kind: string, label: string) => {
    if (sending) return;
    const userMessage: Message = { role: "user", text: label };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setSending(true);
    try {
      const res = await fetch("/api/onboarding/ai/quick-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "The assistant is unavailable right now");
        setMessages(messages);
        return;
      }
      setMessages([...nextMessages, { role: "model", text: data.reply }]);
    } catch {
      toast.error("You're offline — check your connection and try again.");
      setMessages(messages);
    } finally {
      setSending(false);
    }
  };

  const toggle = () => {
    if (locked) {
      toast("Add your AI key in your Profile to unlock the assistant.");
      router.push("/onboarding/profile");
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <AnimatePresence>
        {open && !locked && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hairline fixed bottom-24 right-4 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-card sm:right-6"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-foreground/60" />
                <span className="text-sm font-semibold">Vantaverse Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-foreground/40 hover:text-foreground/70"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-foreground/45">
                    Ask me anything about your building journey, or try:
                  </p>
                  {QUICK_ANALYSES.map((q) => (
                    <button
                      key={q.kind}
                      type="button"
                      onClick={() => runQuick(q.kind, q.label)}
                      className="hairline block w-full rounded-xl bg-background px-3 py-2.5 text-left text-xs font-medium text-foreground/70 transition-colors hover:text-foreground"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "ml-auto bg-foreground text-background"
                      : "hairline bg-background text-foreground/85"
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {sending && (
                <div className="hairline flex w-fit items-center gap-1 rounded-2xl bg-background px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                placeholder="Ask something…"
                className="h-10 flex-1 rounded-xl border-[1.5px] border-border bg-background px-3 text-sm outline-none focus-visible:border-foreground disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggle}
        aria-label={locked ? "AI assistant locked" : "Open AI assistant"}
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-6"
      >
        {locked ? (
          <Lock className="h-5 w-5" />
        ) : open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
