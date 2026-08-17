"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
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
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (state.participant.emailVerified) router.replace("/onboarding/github");
  }, [loading, state, router]);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/onboarding/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/onboarding/github");
  };

  const onResend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/onboarding/resend-otp", { method: "POST" });
    const data = await res.json();
    setResending(false);
    if (!res.ok) {
      setError(data.error ?? "Could not resend code");
      return;
    }
    setNotice("A new code is on its way.");
  };

  return (
    <OnboardingShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-vv-cyan">
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
            className="text-center text-2xl tracking-[0.5em]"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {notice && <p className="text-xs text-vv-cyan">{notice}</p>}

          <Button
            onClick={onSubmit}
            disabled={submitting || code.length !== 6}
            className="w-full"
            size="lg"
          >
            {submitting ? "Verifying…" : "Verify & continue"}
          </Button>

          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="mx-auto block text-xs text-foreground/40 underline-offset-4 hover:text-foreground/70 hover:underline"
          >
            {resending ? "Sending…" : "Didn't get it? Resend code"}
          </button>
        </div>
      </motion.div>
    </OnboardingShell>
  );
}
