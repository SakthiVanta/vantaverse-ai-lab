"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

export default function ParticipantProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { state, loading } = useOnboardingState();

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (!state.participant.emailVerified) router.replace("/onboarding/verify");
  }, [loading, state, router]);

  return (
    <OnboardingShell>
      <Link
        href="/onboarding/dashboard"
        className="mb-6 flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70"
      >
        <ArrowLeft className="h-3 w-3" /> Dashboard
      </Link>
      <ProjectWorkspace projectId={id} actorType="participant" />
    </OnboardingShell>
  );
}
