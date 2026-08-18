"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

export default function VerifyPage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (state.participant.emailVerified) router.replace("/onboarding/github");
  }, [loading, state, router]);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.error ?? "Something went wrong";
        setError(message);
        toast.error(message);
        return;
      }
      router.push("/onboarding/github");
    } catch {
      const message = "You're offline — check your connection and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/resend-otp", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.error ?? "Could not resend code";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("A new code is on its way.");
    } catch {
      const message = "You're offline — check your connection and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <OnboardingShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Check your inbox
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          Verify it&apos;s you.
        </h1>
        <p className="mt-3 text-sm text-foreground/50">
          We sent a 6-digit code to {state?.participant?.email ?? "your email"}.
        </p>

        <div className="mt-10 space-y-5">
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            disabled={submitting}
            className="text-center text-2xl tracking-[0.5em]"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            onClick={onSubmit}
            disabled={submitting || code.length !== 6}
            className="w-full gap-2"
            size="lg"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Verifying…" : "Verify & continue"}
          </Button>

          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="mx-auto flex items-center gap-1.5 text-xs text-foreground/40 underline-offset-4 hover:text-foreground/70 hover:underline disabled:no-underline"
          >
            {resending && <Loader2 className="h-3 w-3 animate-spin" />}
            {resending ? "Sending…" : "Didn't get it? Resend code"}
          </button>
        </div>
      </motion.div>
    </OnboardingShell>
  );
}
