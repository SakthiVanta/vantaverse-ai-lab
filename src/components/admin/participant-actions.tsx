"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ParticipantActions({
  participantId,
  hasAnalysis,
}: {
  participantId: string;
  hasAnalysis: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

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
        render={<a href={`/api/builder-card/${participantId}`} target="_blank" rel="noreferrer" />}
      >
        View Builder Card
      </Button>
    </div>
  );
}
