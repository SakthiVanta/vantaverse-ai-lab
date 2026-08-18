"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, Loader2, Search, Star, GitFork, Archive } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import type { GithubRepoInput } from "@/lib/github-summary";

const ALLOWED_RETURN = ["/onboarding/spirit", "/onboarding/profile"];

export default function SelectReposPage() {
  return (
    <Suspense fallback={null}>
      <SelectReposContent />
    </Suspense>
  );
}

function SelectReposContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, loading } = useOnboardingState();
  const returnTo = ALLOWED_RETURN.includes(params.get("returnTo") ?? "")
    ? params.get("returnTo")!
    : "/onboarding/spirit";

  const [repos, setRepos] = useState<GithubRepoInput[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (!state.participant.emailVerified) router.replace("/onboarding/verify");
  }, [loading, state, router]);

  useEffect(() => {
    fetch("/api/onboarding/github/repos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { repositories: [], selectedRepoNames: null }))
      .then((data: { repositories: GithubRepoInput[]; selectedRepoNames: string[] | null }) => {
        setRepos(data.repositories);
        if (data.selectedRepoNames) {
          setSelected(new Set(data.selectedRepoNames));
        } else {
          // First time — default to non-fork, non-archived repos. Forks
          // and archived repos are still listed below, just unchecked.
          setSelected(new Set(data.repositories.filter((r) => !r.fork && !r.archived).map((r) => r.name)));
        }
      })
      .catch(() => setRepos([]));
  }, []);

  const filtered = useMemo(() => {
    if (!repos) return [];
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q)
    );
  }, [repos, query]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(repos?.map((r) => r.name) ?? []));
  const selectNone = () => setSelected(new Set());

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedRepoNames: [...selected] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't save your selection");
        return;
      }
      router.push(returnTo);
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell wide>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Building History
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          Which repos represent your work?
        </h1>
        <p className="mt-3 text-sm text-foreground/50">
          These are the repos we&apos;ll actually look at — languages, activity, themes. Forks and
          archived repos are unchecked by default, but you can include them if they matter.
        </p>

        {repos === null && (
          <div className="mt-8 space-y-2">
            <div className="h-14 animate-pulse rounded-2xl bg-card" />
            <div className="h-14 animate-pulse rounded-2xl bg-card" />
            <div className="h-14 animate-pulse rounded-2xl bg-card" />
          </div>
        )}

        {repos?.length === 0 && (
          <div className="hairline mt-8 rounded-2xl bg-card px-6 py-10 text-center">
            <p className="text-sm text-foreground/50">
              No public repositories found on your GitHub account.
            </p>
            <p className="mt-1 text-xs text-foreground/35">
              That&apos;s fine — you can continue without GitHub evidence.
            </p>
          </div>
        )}

        {!!repos?.length && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/35" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search repos…"
                  className="pl-9"
                />
              </div>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium text-foreground/50 hover:text-foreground"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="text-xs font-medium text-foreground/50 hover:text-foreground"
              >
                Select none
              </button>
            </div>

            <p className="mt-3 text-xs text-foreground/40">
              {selected.size} of {repos.length} selected
              {selected.size === 0 && " — your analysis will skip GitHub evidence"}
            </p>

            <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {filtered.map((repo) => {
                const checked = selected.has(repo.name);
                return (
                  <button
                    key={repo.name}
                    type="button"
                    onClick={() => toggle(repo.name)}
                    className={`hairline flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors ${
                      checked ? "bg-card" : "bg-transparent hover:bg-card/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors ${
                        checked
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-foreground">{repo.name}</span>
                        {repo.fork && (
                          <span className="hairline flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground/45">
                            <GitFork className="h-2.5 w-2.5" /> fork
                          </span>
                        )}
                        {repo.archived && (
                          <span className="hairline flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] text-foreground/45">
                            <Archive className="h-2.5 w-2.5" /> archived
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-foreground/45">
                          {repo.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-foreground/35">
                        {repo.languages[0] && <span>{repo.languages[0].name}</span>}
                        <span className="flex items-center gap-1">
                          <Star className="h-2.5 w-2.5" /> {repo.stargazersCount}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <Button className="mt-8 w-full gap-2" size="lg" disabled={saving} onClick={save}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Continue"}
        </Button>
      </motion.div>
    </OnboardingShell>
  );
}
