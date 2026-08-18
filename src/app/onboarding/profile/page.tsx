"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAiKeyStatus } from "@/hooks/use-ai-key-status";
import { getSpiritById } from "@/lib/spirits";

export default function ProfilePage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const { status, loading: keyLoading, refresh } = useAiKeyStatus();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (!state.participant.emailVerified) router.replace("/onboarding/verify");
  }, [loading, state, router]);

  const spirit = state?.participant?.spiritId ? getSpiritById(state.participant.spiritId) : undefined;

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't save that key");
        return;
      }
      toast.success("AI features unlocked");
      setApiKey("");
      refresh();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/onboarding/ai-key", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't remove your key");
        return;
      }
      toast.success("Key removed");
      refresh();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <OnboardingShell wide>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Your Profile
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          {state?.participant?.name ?? "Builder"}
        </h1>

        <div className="hairline mt-6 rounded-2xl bg-card p-5">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xl">{spirit?.emoji ?? "👤"}</span>
            <span className="text-foreground/70">{state?.participant?.email}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/50">
            <span className="hairline rounded-full bg-background px-3 py-1">
              {state?.participant?.githubConnected
                ? `GitHub @${state.participant.githubUsername}`
                : "GitHub not connected"}
            </span>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-foreground/50" />
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
              Your AI Key
            </p>
          </div>
          <p className="mt-3 text-sm text-foreground/60">
            Every AI feature here — your Builder Analysis, the assistant, quick
            analyses — runs on <em>your own</em> Gemini key, not ours. Nothing
            AI-powered unlocks until you add one.
          </p>

          {keyLoading ? (
            <div className="mt-6 h-12 animate-pulse rounded-2xl bg-card" />
          ) : status?.hasKey ? (
            <div className="hairline mt-6 flex items-center justify-between rounded-2xl bg-card px-4 py-3.5">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <ShieldCheck className="h-4 w-4 text-foreground/50" />
                Key saved · ending in {status.last4?.replace("••••", "")}
              </div>
              <Button size="sm" variant="ghost" className="gap-1.5" disabled={removing} onClick={removeKey}>
                {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <Label htmlFor="apiKey">Gemini API key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="AIza…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={saving}
              />
              <Button className="w-full gap-2" size="lg" disabled={saving || !apiKey.trim()} onClick={saveKey}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Verifying…" : "Save & unlock AI features"}
              </Button>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-foreground/40 underline-offset-4 hover:text-foreground/70 hover:underline"
              >
                Get a free Gemini API key
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </OnboardingShell>
  );
}
