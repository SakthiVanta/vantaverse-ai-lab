"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { CHALLENGES, getChallenge, TOTAL_CHALLENGES, type ChallengeKey } from "@/lib/challenges";

// These form types transition to a second internal step (a card choice or
// ranking, then a reasoning/reflection textarea) whose meaning no longer
// matches the challenge's top-level `prompt` — e.g. "the_clock"'s "Drag
// your top three into 1, 2, 3." would keep showing above a plain textarea
// once ranking is done. Those forms render their own prompt only during
// the step it actually describes, instead of the page rendering it once
// and leaving it stuck through both steps.
const FORM_OWNS_PROMPT = new Set([
  "choice-with-reason",
  "rank-and-reflect",
  "choice-with-sentence",
  "tradeoff-with-reason",
]);
import {
  ChoiceWithReasonForm,
  RankAndReflectForm,
  ChoiceWithSentenceForm,
  SequenceForm,
  FreeformForm,
  TradeoffWithReasonForm,
  ProblemForm,
  SentenceCompleteForm,
} from "@/components/onboarding/challenge-forms";

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams<{ key: string }>();
  const { state, loading } = useOnboardingState();
  const [submitting, setSubmitting] = useState(false);

  const challenge = getChallenge(params.key as ChallengeKey);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (!state.participant.emailVerified) router.replace("/onboarding/verify");
    else if (!state.participant.spiritId) router.replace("/onboarding/github");
  }, [loading, state, router]);

  useEffect(() => {
    if (!challenge) router.replace("/onboarding/challenge/the_unknown");
  }, [challenge, router]);

  if (!challenge) return null;

  const handleSubmit = async (response: unknown, reasoning?: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeKey: challenge.key, response, reasoning }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Couldn't save your answer — try again.");
        setSubmitting(false);
        return;
      }
    } catch {
      toast.error("You're offline — check your connection and try again.");
      setSubmitting(false);
      return;
    }

    const currentIndex = CHALLENGES.findIndex((c) => c.key === challenge.key);
    const next = CHALLENGES[currentIndex + 1];
    if (next) {
      router.push(`/onboarding/challenge/${next.key}`);
    } else {
      router.push("/onboarding/analyzing");
    }
  };

  const isClosing = challenge.key === "closing";

  return (
    <OnboardingShell
      step={isClosing ? undefined : { label: challenge.title, index: challenge.index, total: TOTAL_CHALLENGES }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={challenge.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            {challenge.title}
          </p>
          <p className="mt-4 text-base leading-relaxed text-foreground/80 sm:text-lg">
            {challenge.situation}
          </p>
          {"prompt" in challenge && !FORM_OWNS_PROMPT.has(challenge.type) && (
            <p className="mt-3 font-heading text-xl font-semibold text-foreground sm:text-2xl">
              {challenge.prompt}
            </p>
          )}

          <div className="mt-8">
            <ChallengeBody
              challenge={challenge}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  );
}

function ChallengeBody({
  challenge,
  onSubmit,
  submitting,
}: {
  challenge: NonNullable<ReturnType<typeof getChallenge>>;
  onSubmit: (response: unknown, reasoning?: string) => void;
  submitting: boolean;
}) {
  const wrapped = (response: unknown, reasoning?: string) => {
    if (submitting) return;
    onSubmit(response, reasoning);
  };

  switch (challenge.type) {
    case "choice-with-reason":
      return <ChoiceWithReasonForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    case "rank-and-reflect":
      return <RankAndReflectForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    case "choice-with-sentence":
      return <ChoiceWithSentenceForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    case "sequence":
      return <SequenceForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    case "freeform":
      return <FreeformForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    case "tradeoff-with-reason":
      return <TradeoffWithReasonForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    case "problem-form":
      return <ProblemForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    case "sentence-complete":
      return <SentenceCompleteForm challenge={challenge} onSubmit={wrapped} submitting={submitting} />;
    default:
      return null;
  }
}
