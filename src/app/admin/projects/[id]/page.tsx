"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type Member = {
  targetId: string;
  status: string;
  participantId: string;
  name: string;
  email: string;
};

type Candidate = { id: string; name: string; email: string };

type ProjectDetail = {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  deadline: string | null;
  expectedOutput: string | null;
};

export default function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("intermediate");
  const [editDeadline, setEditDeadline] = useState("");
  const [editExpectedOutput, setEditExpectedOutput] = useState("");

  const loadMembers = () => {
    fetch(`/api/admin/projects/${id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members);
        setProject(data.project);
      })
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

  const startEditing = () => {
    if (!project) return;
    setEditTitle(project.title);
    setEditDescription(project.description);
    setEditDifficulty(project.difficulty);
    setEditDeadline(project.deadline ? project.deadline.slice(0, 10) : "");
    setEditExpectedOutput(project.expectedOutput ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim() || !editDescription.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          difficulty: editDifficulty,
          deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
          expectedOutput: editExpectedOutput.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't save those changes");
        return;
      }
      toast.success("Project updated");
      setEditing(false);
      setWorkspaceRefreshKey((k) => k + 1);
      loadMembers();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!project) return;
    const ok = await confirm({
      title: `Delete "${project.title}"?`,
      description: "This also permanently removes its chat and research history.",
      confirmLabel: "Delete project",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Couldn't delete that project");
        setDeleting(false);
        return;
      }
      toast.success("Project deleted");
      router.push("/admin/projects");
    } catch {
      toast.error("You're offline — check your connection and try again.");
      setDeleting(false);
    }
  };

  const memberIds = new Set((members ?? []).map((m) => m.participantId));
  const assignable = candidates.filter((c) => !memberIds.has(c.id));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/projects"
            className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70"
          >
            <ArrowLeft className="h-3 w-3" /> All projects
          </Link>
          {project && !editing && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={deleting}
                onClick={deleteProject}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="hairline mt-6 space-y-3 rounded-2xl bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-difficulty">Difficulty</Label>
                <select
                  id="edit-difficulty"
                  value={editDifficulty}
                  onChange={(e) => setEditDifficulty(e.target.value)}
                  className="flex h-12 w-full min-w-0 rounded-2xl border-[1.5px] border-border bg-card px-4 text-sm outline-none focus-visible:border-foreground"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Deadline (optional)</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-output">Expected output (optional)</Label>
              <Input
                id="edit-output"
                value={editExpectedOutput}
                onChange={(e) => setEditExpectedOutput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                disabled={saving || !editTitle.trim() || !editDescription.trim()}
                onClick={saveEdit}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="outline" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <Suspense fallback={null}>
              <ProjectWorkspace projectId={id} actorType="admin" refreshKey={workspaceRefreshKey} />
            </Suspense>
          </div>
        )}

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
      {confirmDialog}
    </div>
  );
}
