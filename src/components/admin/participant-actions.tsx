"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    const res = await fetch(`/api/admin/participants/${participantId}/analyze`, {
      method: "POST",
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast.error(data.error ?? "Analysis failed");
      return;
    }
    toast.success("Analysis complete");
    router.refresh();
  };

  const sendReport = async () => {
    setBusy("report");
    const res = await fetch(`/api/admin/participants/${participantId}/send-report`, {
      method: "POST",
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      toast.error(data.error ?? "Could not send report");
      return;
    }
    toast.success("Report emailed");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={!!busy} onClick={runAnalysis}>
        {busy === "analyze" ? "Running…" : hasAnalysis ? "Re-analyze" : "Run AI Analysis"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!busy || !hasAnalysis} onClick={sendReport}>
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
