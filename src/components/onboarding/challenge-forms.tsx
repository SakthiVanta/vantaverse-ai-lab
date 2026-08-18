"use client";

import { useState } from "react";
import { motion, Reorder } from "motion/react";
import { GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Challenge, ChallengeCard } from "@/lib/challenges";

type SubmitFn = (response: unknown, reasoning?: string) => void;

type FormProps<T extends Challenge["type"]> = {
  challenge: Extract<Challenge, { type: T }>;
  onSubmit: SubmitFn;
  submitting: boolean;
};

function ContinueButton({
  submitting,
  disabled,
  label = "Continue",
  submittingLabel = "Saving…",
  onClick,
}: {
  submitting: boolean;
  disabled?: boolean;
  label?: string;
  submittingLabel?: string;
  onClick: () => void;
}) {
  return (
    <Button className="w-full gap-2" size="lg" disabled={disabled || submitting} onClick={onClick}>
      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
      {submitting ? submittingLabel : label}
    </Button>
  );
}

function CardButton({
  card,
  selected,
  disabled,
  onClick,
}: {
  card: ChallengeCard;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-2xl border-[1.5px] px-5 py-4 text-left text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
        selected
          ? "border-foreground bg-accent text-foreground"
          : "border-border bg-card text-foreground/70 hover:border-foreground/40 hover:bg-accent/60"
      }`}
    >
      {card.label}
    </button>
  );
}

export function ChoiceWithReasonForm({
  challenge,
  onSubmit,
  submitting,
}: FormProps<"choice-with-reason">) {
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
        disabled={submitting}
      />
      <ContinueButton
        submitting={submitting}
        disabled={!reason.trim()}
        onClick={() => onSubmit({ choice }, reason.trim())}
      />
    </div>
  );
}

export function RankAndReflectForm({
  challenge,
  onSubmit,
  submitting,
}: FormProps<"rank-and-reflect">) {
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
              className={`flex items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-sm font-medium ${
                i < challenge.rankCount
                  ? "border-foreground bg-accent text-foreground"
                  : "border-border bg-card text-foreground/50"
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
        <ContinueButton
          submitting={false}
          label={`Lock in my top ${challenge.rankCount}`}
          onClick={() => setRanked(order.slice(0, challenge.rankCount).map((c) => c.id))}
        />
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
        disabled={submitting}
      />
      <ContinueButton
        submitting={submitting}
        disabled={!reflection.trim()}
        onClick={() => onSubmit({ ranked }, reflection.trim())}
      />
    </div>
  );
}

export function ChoiceWithSentenceForm({
  challenge,
  onSubmit,
  submitting,
}: FormProps<"choice-with-sentence">) {
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
        disabled={submitting}
      />
      <ContinueButton
        submitting={submitting}
        disabled={!sentence.trim()}
        onClick={() => onSubmit({ choice, sentence: sentence.trim() })}
      />
    </div>
  );
}

export function SequenceForm({ challenge, onSubmit, submitting }: FormProps<"sequence">) {
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
            className="flex h-12 items-center gap-3 rounded-2xl border border-dashed border-border px-4 text-sm text-foreground/40"
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
              className="rounded-2xl border-[1.5px] border-border bg-card px-3 py-2.5 text-left text-xs font-medium text-foreground/70 transition-colors duration-200 hover:border-foreground/40 hover:bg-accent/60"
            >
              {card.label}
            </button>
          ))}
        </div>
      )}
      {isComplete && (
        <ContinueButton
          submitting={submitting}
          onClick={() => onSubmit({ sequence: picked.map((c) => c.id) })}
        />
      )}
    </div>
  );
}

export function FreeformForm({ challenge, onSubmit, submitting }: FormProps<"freeform">) {
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
        disabled={submitting}
      />
      <ContinueButton
        submitting={submitting}
        disabled={!text.trim()}
        onClick={() => onSubmit({ text: text.trim() })}
      />
    </div>
  );
}

export function TradeoffWithReasonForm({
  challenge,
  onSubmit,
  submitting,
}: FormProps<"tradeoff-with-reason">) {
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
              className="flex flex-col items-start gap-1 rounded-2xl border-[1.5px] border-border bg-card p-4 text-left transition-colors duration-200 hover:border-foreground/40 hover:bg-accent/60"
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
      <Textarea
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        disabled={submitting}
      />
      <ContinueButton
        submitting={submitting}
        disabled={!reason.trim()}
        onClick={() => onSubmit({ choice }, reason.trim())}
      />
    </div>
  );
}

export function ProblemForm({ challenge, onSubmit, submitting }: FormProps<"problem-form">) {
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
            disabled={submitting}
          />
        </div>
      ))}
      <ContinueButton
        submitting={submitting}
        disabled={!allFilled}
        onClick={() =>
          onSubmit({
            description: values.description.trim(),
            who: values.who.trim(),
            why: values.why.trim(),
          })
        }
      />
    </div>
  );
}

export function SentenceCompleteForm({
  challenge,
  onSubmit,
  submitting,
}: FormProps<"sentence-complete">) {
  const [sentence, setSentence] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm italic text-foreground/60">&ldquo;{challenge.sentenceStem}&rdquo;</p>
      <Textarea
        autoFocus
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        rows={3}
        disabled={submitting}
      />
      <ContinueButton
        submitting={submitting}
        label="Finish"
        submittingLabel="Finishing…"
        disabled={!sentence.trim()}
        onClick={() => onSubmit({ sentence: sentence.trim() })}
      />
    </div>
  );
}
