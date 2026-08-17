"use client";

import { useState } from "react";
import { motion, Reorder } from "motion/react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Challenge, ChallengeCard } from "@/lib/challenges";

type SubmitFn = (response: unknown, reasoning?: string) => void;

function CardButton({
  card,
  selected,
  onClick,
}: {
  card: ChallengeCard;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-5 py-4 text-left text-sm font-medium transition-all ${
        selected
          ? "border-vv-violet/60 bg-vv-violet/10 text-foreground"
          : "border-white/10 bg-white/[0.02] text-foreground/70 hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      {card.label}
    </button>
  );
}

export function ChoiceWithReasonForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "choice-with-reason" }>;
  onSubmit: SubmitFn;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!choice) {
    return (
      <div className="space-y-3">
        {challenge.cards.map((card) => (
          <CardButton
            key={card.id}
            card={card}
            selected={false}
            onClick={() => setChoice(card.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground/80">{challenge.reasonPrompt}</p>
      <Textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="One line is enough…"
        rows={3}
      />
      <Button
        className="w-full"
        size="lg"
        disabled={!reason.trim()}
        onClick={() => onSubmit({ choice }, reason.trim())}
      >
        Continue
      </Button>
    </div>
  );
}

export function RankAndReflectForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "rank-and-reflect" }>;
  onSubmit: SubmitFn;
}) {
  const [order, setOrder] = useState<ChallengeCard[]>(challenge.cards);
  const [ranked, setRanked] = useState<string[] | null>(null);
  const [reflection, setReflection] = useState("");

  if (!ranked) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-foreground/40">Drag to reorder — top 3 count.</p>
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
          {order.map((card, i) => (
            <Reorder.Item
              key={card.id}
              value={card}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
                i < challenge.rankCount
                  ? "border-vv-violet/50 bg-vv-violet/10 text-foreground"
                  : "border-white/10 bg-white/[0.02] text-foreground/50"
              }`}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-foreground/30" />
              <span className="w-5 text-xs text-foreground/40">
                {i < challenge.rankCount ? i + 1 : ""}
              </span>
              {card.label}
            </Reorder.Item>
          ))}
        </Reorder.Group>
        <Button
          className="w-full"
          size="lg"
          onClick={() => setRanked(order.slice(0, challenge.rankCount).map((c) => c.id))}
        >
          Lock in my top {challenge.rankCount}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground/80">{challenge.reflectPrompt}</p>
      <Textarea
        autoFocus
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        rows={3}
      />
      <Button
        className="w-full"
        size="lg"
        disabled={!reflection.trim()}
        onClick={() => onSubmit({ ranked }, reflection.trim())}
      >
        Continue
      </Button>
    </div>
  );
}

export function ChoiceWithSentenceForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "choice-with-sentence" }>;
  onSubmit: SubmitFn;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");

  if (!choice) {
    return (
      <div className="space-y-3">
        {challenge.cards.map((card) => (
          <CardButton
            key={card.id}
            card={card}
            selected={false}
            onClick={() => setChoice(card.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground/80">Complete this sentence:</p>
      <p className="text-sm italic text-foreground/50">&ldquo;{challenge.sentenceStem}&rdquo;</p>
      <Textarea
        autoFocus
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        rows={2}
      />
      <Button
        className="w-full"
        size="lg"
        disabled={!sentence.trim()}
        onClick={() => onSubmit({ choice, sentence: sentence.trim() })}
      >
        Continue
      </Button>
    </div>
  );
}

export function SequenceForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "sequence" }>;
  onSubmit: SubmitFn;
}) {
  const [picked, setPicked] = useState<ChallengeCard[]>([]);
  const remaining = challenge.cards.filter((c) => !picked.some((p) => p.id === c.id));

  const pick = (card: ChallengeCard) => {
    if (picked.length >= challenge.sequenceLength) return;
    setPicked([...picked, card]);
  };

  const isComplete = picked.length === challenge.sequenceLength;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {Array.from({ length: challenge.sequenceLength }).map((_, i) => (
          <div
            key={i}
            className="flex h-12 items-center gap-3 rounded-xl border border-dashed border-white/15 px-4 text-sm text-foreground/40"
          >
            <span className="text-xs">{i + 1}.</span>
            {picked[i] ? (
              <span className="text-foreground/90">{picked[i].label}</span>
            ) : (
              <span>Choose your next step…</span>
            )}
          </div>
        ))}
      </div>
      {!isComplete && (
        <div className="grid grid-cols-2 gap-2">
          {remaining.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => pick(card)}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-xs font-medium text-foreground/70 hover:border-white/20 hover:bg-white/[0.04]"
            >
              {card.label}
            </button>
          ))}
        </div>
      )}
      {isComplete && (
        <Button
          className="w-full"
          size="lg"
          onClick={() => onSubmit({ sequence: picked.map((c) => c.id) })}
        >
          Continue
        </Button>
      )}
    </div>
  );
}

export function FreeformForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "freeform" }>;
  onSubmit: SubmitFn;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-4">
      {challenge.helperText && (
        <p className="text-xs text-foreground/40">{challenge.helperText}</p>
      )}
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Your first genuine idea…"
      />
      <Button
        className="w-full"
        size="lg"
        disabled={!text.trim()}
        onClick={() => onSubmit({ text: text.trim() })}
      >
        Continue
      </Button>
    </div>
  );
}

export function TradeoffWithReasonForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "tradeoff-with-reason" }>;
  onSubmit: SubmitFn;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!choice) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {challenge.cards.map((card) => {
          const [title, ...rest] = card.label.split(" — ");
          return (
            <motion.button
              key={card.id}
              type="button"
              whileHover={{ y: -3 }}
              onClick={() => setChoice(card.id)}
              className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-white/20 hover:bg-white/[0.04]"
            >
              <span className="text-sm font-bold tracking-wide text-foreground">{title}</span>
              <span className="text-xs text-foreground/50">{rest.join(" — ")}</span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground/80">{challenge.reasonPrompt}</p>
      <Textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      <Button
        className="w-full"
        size="lg"
        disabled={!reason.trim()}
        onClick={() => onSubmit({ choice }, reason.trim())}
      >
        Continue
      </Button>
    </div>
  );
}

export function ProblemForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "problem-form" }>;
  onSubmit: SubmitFn;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const allFilled = challenge.fields.every((f) => values[f.id]?.trim());

  return (
    <div className="space-y-4">
      {challenge.fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <p className="text-sm font-medium text-foreground/80">{field.label}</p>
          <Textarea
            value={values[field.id] ?? ""}
            onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
            rows={2}
          />
        </div>
      ))}
      <Button
        className="w-full"
        size="lg"
        disabled={!allFilled}
        onClick={() =>
          onSubmit({
            description: values.description.trim(),
            who: values.who.trim(),
            why: values.why.trim(),
          })
        }
      >
        Continue
      </Button>
    </div>
  );
}

export function SentenceCompleteForm({
  challenge,
  onSubmit,
}: {
  challenge: Extract<Challenge, { type: "sentence-complete" }>;
  onSubmit: SubmitFn;
}) {
  const [sentence, setSentence] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm italic text-foreground/60">&ldquo;{challenge.sentenceStem}&rdquo;</p>
      <Textarea
        autoFocus
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        rows={3}
      />
      <Button
        className="w-full"
        size="lg"
        disabled={!sentence.trim()}
        onClick={() => onSubmit({ sentence: sentence.trim() })}
      >
        Finish
      </Button>
    </div>
  );
}
