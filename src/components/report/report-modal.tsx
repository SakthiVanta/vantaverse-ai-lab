"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReportView, type ReportResultData } from "@/components/report/report-view";

function formatGeneratedAt(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ReportModal({
  open,
  onOpenChange,
  result,
  participantId,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ReportResultData;
  participantId: string;
  onDeleted: () => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [deleting, setDeleting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const deleteReport = async () => {
    const ok = await confirm({
      title: "Delete this report?",
      description:
        "This removes your AI-generated Builder Report. You'll need to regenerate it to view it again.",
      confirmLabel: "Delete report",
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/onboarding/analyze", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Couldn't delete your report");
        return;
      }
      toast.success("Report deleted");
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };

  const generatedAt = formatGeneratedAt(result.generatedAt);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
          initialFocus={topRef}
        >
          {/* Focus anchor so opening the dialog doesn't auto-scroll to the
             delete button below (the first — and only — tabbable element
             in the body otherwise). */}
          <div ref={topRef} tabIndex={-1} className="outline-none" />
          <DialogHeader>
            <DialogTitle>Your Builder Report</DialogTitle>
          </DialogHeader>
          {generatedAt && (
            <p className="text-xs text-foreground/40">Generated {generatedAt}</p>
          )}
          <ReportView result={result} participantId={participantId} />
          <div className="-mx-4 -mb-4 mt-4 rounded-b-xl border-t bg-muted/50 p-4">
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting}
              onClick={deleteReport}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
