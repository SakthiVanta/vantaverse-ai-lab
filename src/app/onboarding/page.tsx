"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { nextRouteFor } from "@/lib/onboarding-routes";

const schema = z.object({
  name: z.string().trim().min(1, "Tell us your first name"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .refine((v) => /^[^\s@]+@gmail\.com$/i.test(v), "Only Gmail addresses for Cohort 01"),
});

type FormValues = z.infer<typeof schema>;

export default function IdentityPage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
    const res = await fetch("/api/onboarding/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong");
      return;
    }
    router.push(data.emailVerified ? "/onboarding/github" : "/onboarding/verify");
  };

  return (
    <OnboardingShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Builder Discovery
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          Let&apos;s create your Builder Identity.
        </h1>
        <p className="mt-3 text-sm text-foreground/50">
          Just your name and a Gmail address — we&apos;ll verify it&apos;s you.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">First name</Label>
            <Input
              id="name"
              autoComplete="given-name"
              placeholder="Sakthi"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
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

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            {submitting ? "Sending code…" : "Continue"}
          </Button>
        </form>
      </motion.div>
    </OnboardingShell>
  );
}
