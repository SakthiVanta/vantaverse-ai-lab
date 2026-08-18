"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProjectChat } from "@/components/projects/project-chat";
import { ProjectResearch } from "@/components/projects/project-research";

type ProjectDetail = {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  deadline: string | null;
  expectedOutput: string | null;
  resources: { type: string; label: string; url: string }[] | null;
};

export function ProjectWorkspace({
  projectId,
  actorType,
}: {
  projectId: string;
  actorType: "participant" | "admin";
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setProject(data.project))
      .catch(() => setNotFound(true));
  }, [projectId]);

  if (notFound) {
    return (
      <div className="hairline rounded-2xl bg-card px-6 py-10 text-center text-sm text-foreground/50">
        You don&apos;t have access to this project.
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-card" />
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{project.title}</h1>
          <p className="mt-2 text-sm text-foreground/60">{project.description}</p>
        </div>
        <Badge variant="secondary" className="shrink-0 capitalize">
          {project.difficulty}
        </Badge>
      </div>

      {(project.deadline || project.expectedOutput) && (
        <div className="hairline mt-4 flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-card px-4 py-3 text-xs text-foreground/50">
          {project.deadline && <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>}
          {project.expectedOutput && <span>Expected output: {project.expectedOutput}</span>}
        </div>
      )}

      {!!project.resources?.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {project.resources.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="hairline rounded-full bg-card px-3 py-1 text-xs text-foreground/60 hover:text-foreground"
            >
              {r.label}
            </a>
          ))}
        </div>
      )}

      <Tabs defaultValue="chat" className="mt-8">
        <TabsList variant="line">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="research">Research</TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="mt-6">
          <ProjectChat projectId={projectId} />
        </TabsContent>
        <TabsContent value="research" className="mt-6">
          <ProjectResearch projectId={projectId} canPublish={actorType === "participant"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
