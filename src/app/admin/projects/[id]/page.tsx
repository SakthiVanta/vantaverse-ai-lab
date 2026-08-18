"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { Button } from "@/components/ui/button";

type Member = {
  targetId: string;
  status: string;
  participantId: string;
  name: string;
  email: string;
};

type Candidate = { id: string; name: string; email: string };

export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const loadMembers = () => {
    fetch(`/api/admin/projects/${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setMembers(data.members))
      .catch(() => setMembers([]));
  };

  useEffect(loadMembers, [id]);

  useEffect(() => {
    if (!showAssign || candidates.length) return;
    // Reuse the dashboard's full participant list — small cohort scale,
    // no dedicated "all builders" API needed yet.
    fetch("/api/admin/participants-lite", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { participants: [] }))
      .then((data) => setCandidates(data.participants))
      .catch(() => setCandidates([]));
  }, [showAssign, candidates.length]);

  const toggle = (pid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const assign = async () => {
    if (selected.size === 0 || assigning) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't assign builders");
        return;
      }
      toast.success(`Assigned ${data.assigned} builder(s) — ${data.emailed} emailed`);
      setSelected(new Set());
      setShowAssign(false);
      loadMembers();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setAssigning(false);
    }
  };

  const memberIds = new Set((members ?? []).map((m) => m.participantId));
  const assignable = candidates.filter((c) => !memberIds.has(c.id));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/admin/projects"
          className="mb-6 flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70"
        >
          <ArrowLeft className="h-3 w-3" /> All projects
        </Link>

        <ProjectWorkspace projectId={id} actorType="admin" />

        <div className="mt-10 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
              Builders ({members?.length ?? 0})
            </p>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAssign((s) => !s)}>
              <UserPlus className="h-3.5 w-3.5" />
              Assign builders
            </Button>
          </div>

          {showAssign && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {assignable.length === 0 && (
                <p className="text-xs text-foreground/40">Everyone is already assigned.</p>
              )}
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {assignable.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 accent-foreground"
                    />
                    {c.name}
                    <span className="text-xs text-foreground/40">{c.email}</span>
                  </label>
                ))}
              </div>
              <Button
                size="sm"
                className="mt-2 gap-1.5"
                disabled={selected.size === 0 || assigning}
                onClick={assign}
              >
                {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {assigning ? "Assigning…" : `Assign ${selected.size || ""}`}
              </Button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {members?.map((m) => (
              <div key={m.targetId} className="flex items-center justify-between text-sm">
                <span>{m.name}</span>
                <span className="text-xs text-foreground/40">{m.status}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
