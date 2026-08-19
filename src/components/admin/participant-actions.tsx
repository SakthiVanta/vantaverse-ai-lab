"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export function ParticipantActions({
  participantId,
  hasAnalysis,
  githubConnected,
}: {
  participantId: string;
  hasAnalysis: boolean;
  githubConnected: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const runAnalysis = async () => {
    setBusy("analyze");
    try {
      const res = await fetch(`/api/admin/participants/${participantId}/analyze`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Analysis failed");
        return;
      }
      toast.success(
        data.emailed
          ? "Analysis complete — builder has been emailed their report"
          : "Analysis complete, but the report email failed to send"
      );
      router.refresh();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const analyzeGithub = async () => {
    setBusy("github");
    try {
      const res = await fetch(`/api/admin/participants/${participantId}/analyze-github`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not run GitHub analysis");
        return;
      }
      toast.success("GitHub AI analysis complete");
      router.refresh();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const revokeGithub = async () => {
    const ok = await confirm({
      title: "Revoke GitHub connection?",
      description:
        "This deletes all stored GitHub data for this builder (repos, languages, AI summary, token). It only comes back if they reconnect GitHub themselves.",
      confirmLabel: "Revoke & delete data",
      destructive: true,
    });
    if (!ok) return;

    setBusy("revoke");
    try {
      const res = await fetch(`/api/admin/participants/${participantId}/revoke-github`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not revoke GitHub connection");
        return;
      }
      toast.success("GitHub disconnected and data deleted");
      router.refresh();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const sendReport = async () => {
    setBusy("report");
    try {
      const res = await fetch(`/api/admin/participants/${participantId}/send-report`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not send report");
        return;
      }
      toast.success("Report emailed");
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5" disabled={!!busy} onClick={runAnalysis}>
          {busy === "analyze" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy === "analyze" ? "Running…" : hasAnalysis ? "Re-analyze" : "Run AI Analysis"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!!busy || !hasAnalysis}
          onClick={sendReport}
        >
          {busy === "report" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy === "report" ? "Sending…" : "Send Report"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!!busy || !githubConnected}
          onClick={analyzeGithub}
          title={githubConnected ? undefined : "This builder hasn't connected GitHub yet"}
        >
          {busy === "github" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy === "github" ? "Analyzing…" : "Analyze GitHub"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-destructive hover:text-destructive"
          disabled={!!busy || !githubConnected}
          onClick={revokeGithub}
          title={githubConnected ? undefined : "This builder hasn't connected GitHub yet"}
        >
          {busy === "revoke" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy === "revoke" ? "Revoking…" : "Revoke GitHub"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={<a href={`/api/builder-card/${participantId}`} target="_blank" rel="noreferrer" />}
        >
          View Builder Card
        </Button>
      </div>
      {dialog}
    </>
  );
}
