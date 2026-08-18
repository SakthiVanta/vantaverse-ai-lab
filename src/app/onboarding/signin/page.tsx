"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useOnboardingState, type OnboardingState } from "@/hooks/use-onboarding-state";
import { nextRouteFor } from "@/lib/onboarding-routes";

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .refine((v) => /^[^\s@]+@gmail\.com$/i.test(v), "Only Gmail addresses for Cohort 01"),
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!loading && state?.participant) {
      router.replace(nextRouteFor(state));
    }
  }, [loading, state, router]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setServerError(null);
    setNotFound(false);
    try {
      const res = await fetch("/api/onboarding/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.error ?? "Something went wrong";
        setServerError(message);
        setNotFound(!!data.notFound);
        toast.error(message);
        return;
      }

      if (!data.emailVerified) {
        router.push("/onboarding/verify");
        return;
      }

      const meRes = await fetch("/api/onboarding/me", { cache: "no-store" });
      const freshState: OnboardingState = meRes.ok
        ? await meRes.json()
        : { participant: null, completedChallengeKeys: [], nextChallengeKey: null, allChallengesComplete: false };
      router.push(nextRouteFor(freshState));
    } catch {
      const message = "You're offline — check your connection and try again.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
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
          Welcome back
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          Sign in to Vantaverse.
        </h1>
        <p className="mt-3 text-sm text-foreground/50">
          Enter your Gmail address and we&apos;ll send you a one-time code.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@gmail.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-destructive">
              {serverError}
              {notFound && (
                <>
                  {" "}
                  <Link href="/onboarding" className="underline underline-offset-2">
                    Create one
                  </Link>
                  .
                </>
              )}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Sending code…" : "Send me a code"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground/40">
          New to Vantaverse?{" "}
          <Link href="/onboarding" className="text-foreground/70 underline underline-offset-2 hover:text-foreground">
            Create your Builder Identity
          </Link>
        </p>
      </motion.div>
    </OnboardingShell>
  );
}
