"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Project = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  deadline: string | null;
  createdAt: string;
  memberCount: number;
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [deadline, setDeadline] = useState("");

  const load = () => {
    fetch("/api/admin/projects", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setProjects(data.projects))
      .catch(() => setProjects([]));
  };

  useEffect(load, []);

  const createProject = async () => {
    if (!title.trim() || !description.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          difficulty,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't create that project");
        return;
      }
      toast.success("Project created");
      setTitle("");
      setDescription("");
      setDeadline("");
      setShowForm(false);
      load();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            AI Projects
          </p>
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </div>

        {showForm && (
          <div className="hairline mt-4 space-y-3 rounded-2xl bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="flex h-12 w-full min-w-0 rounded-2xl border-[1.5px] border-border bg-card px-4 text-sm outline-none focus-visible:border-foreground"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={creating || !title.trim() || !description.trim()}
              onClick={createProject}
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Creating…" : "Create project"}
            </Button>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {projects === null && <div className="h-20 animate-pulse rounded-2xl bg-card" />}
          {projects?.length === 0 && (
            <div className="hairline rounded-2xl bg-card px-6 py-10 text-center text-sm text-foreground/45">
              No projects yet.
            </div>
          )}
          {projects?.map((p) => (
            <Link
              key={p.id}
              href={`/admin/projects/${p.id}`}
              className="hairline flex items-center justify-between gap-4 rounded-2xl bg-card px-5 py-4 transition-colors hover:bg-accent/60"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  <Badge variant="secondary" className="capitalize">
                    {p.difficulty}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-foreground/45">{p.description}</p>
              </div>
              <span className="shrink-0 text-xs text-foreground/40">{p.memberCount} builders</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
