"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck, Trash2, GitFork, RefreshCw, ListChecks } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GithubHeatmap } from "@/components/onboarding/github-heatmap";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAiKeyStatus } from "@/hooks/use-ai-key-status";
import { getSpiritById } from "@/lib/spirits";
import { GITHUB_ERROR_MESSAGES } from "@/lib/github-errors";
import type { ContributionCalendar } from "@/lib/github";
import type { GithubRepoInput } from "@/lib/github-summary";

type GithubProfileData = {
  username: string;
  repositories: GithubRepoInput[];
  selectedRepoNames: string[] | null;
  contributionCalendar: ContributionCalendar;
};

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, loading } = useOnboardingState();
  const { status, loading: keyLoading, refresh } = useAiKeyStatus();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [github, setGithub] = useState<GithubProfileData | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (!state.participant.emailVerified) router.replace("/onboarding/verify");
  }, [loading, state, router]);

  useEffect(() => {
    const error = params.get("error");
    if (error) toast.error(GITHUB_ERROR_MESSAGES[error] ?? error);
  }, [params]);

  useEffect(() => {
    if (!state?.participant?.githubConnected) return;
    fetch("/api/onboarding/github/repos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setGithub)
      .catch(() => setGithub(null));
  }, [state?.participant?.githubConnected]);

  const spirit = state?.participant?.spiritId ? getSpiritById(state.participant.spiritId) : undefined;
  const selectedCount = github?.selectedRepoNames?.length ?? github?.repositories.length ?? 0;

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
        </div>

        <div className="mt-10">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-foreground/50" />
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
                GitHub
              </p>
            </div>
            {state?.participant?.githubConnected && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link
                  href="/onboarding/github/select-repos?returnTo=/onboarding/profile"
                  className="flex items-center gap-1 text-xs font-medium text-foreground/50 hover:text-foreground"
                >
                  <ListChecks className="h-3 w-3" />
                  Edit selected repos
                </Link>
                <Button
                  render={<a href="/api/github/connect?returnTo=/onboarding/profile" />}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reconnect
                </Button>
              </div>
            )}
          </div>

          {!state?.participant?.githubConnected ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-foreground/60">
                Connect GitHub so your Builder Analysis can use real evidence — languages,
                activity, and the repos you choose to include.
              </p>
              <Button
                render={<a href="/api/github/connect?returnTo=/onboarding/profile" />}
                className="w-full gap-2"
                size="lg"
              >
                <GitFork className="h-4 w-4" />
                Connect GitHub now
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="hairline flex items-center justify-between rounded-2xl bg-card px-4 py-3.5">
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <ShieldCheck className="h-4 w-4 text-foreground/50" />
                  <span>@{state.participant.githubUsername}</span>
                </div>
                {github && (
                  <span className="text-xs text-foreground/40">
                    {selectedCount} of {github.repositories.length} repos selected
                  </span>
                )}
              </div>
              {github?.contributionCalendar ? (
                <GithubHeatmap calendar={github.contributionCalendar} />
              ) : (
                <div className="h-32 animate-pulse rounded-2xl bg-card" />
              )}
            </div>
          )}
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
