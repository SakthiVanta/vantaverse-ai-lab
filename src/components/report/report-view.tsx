import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SIGNAL_LABELS, type SignalDimension } from "@/lib/signals";

export type ReportResultData = {
  archetype?: { primary: string; secondary: string | null };
  signals?: Record<SignalDimension, number>;
  strengthSignals?: string[];
  growthSignals?: string[];
  interests?: string[];
  githubSummary?: string | null;
  githubStale?: boolean;
  cardImageUrl?: string | null;
  problem?: { description: string; who: string; why: string } | null;
  firstDirection?: string;
  generatedAt?: string;
};

/** The Builder Report body — shared by the post-onboarding reveal page and
 * the "View Report" modal on the dashboard, so the two never drift. */
export function ReportView({
  result,
  participantId,
}: {
  result: ReportResultData;
  participantId: string;
}) {
  const topSignals = Object.entries(result.signals ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [SignalDimension, number][];

  return (
    <div className="w-full">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Your Builder Identity
        </p>
        <h2 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">
          {result.archetype?.primary}
        </h2>
        {result.archetype?.secondary && (
          <p className="mt-1 text-sm text-foreground/50">
            with traits of {result.archetype.secondary}
          </p>
        )}
      </div>

      <div className="hairline mx-auto mt-6 max-w-56 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.cardImageUrl ?? `/api/builder-card/${participantId}`}
          alt="Your Builder Card"
          className="w-full"
        />
      </div>

      <div className="mt-10 space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
          Builder Signal
        </p>
        {topSignals.map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs text-foreground/60">
              <span>{SIGNAL_LABELS[key]}</span>
              <span>{value}</span>
            </div>
            <Progress value={value} />
          </div>
        ))}
      </div>

      {!!result.interests?.length && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
            Current Interests
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.interests.map((interest) => (
              <Badge key={interest} variant="secondary">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!!result.strengthSignals?.length && (
        <ReportSection title="What we observed">
          <ul className="space-y-2">
            {result.strengthSignals.map((s, i) => (
              <li key={i} className="text-sm text-foreground/70">
                · {s}
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {!!result.growthSignals?.length && (
        <ReportSection title="Growth opportunities">
          <ul className="space-y-2">
            {result.growthSignals.map((s, i) => (
              <li key={i} className="text-sm text-foreground/70">
                · {s}
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {result.githubSummary && (
        <ReportSection title="GitHub Building Snapshot">
          <p className="text-sm text-foreground/70">{result.githubSummary}</p>
        </ReportSection>
      )}

      {result.problem && (
        <ReportSection title="A problem you seem naturally drawn toward">
          <p className="text-sm text-foreground/70">{result.problem.description}</p>
          <p className="mt-1 text-xs text-foreground/45">Who: {result.problem.who}</p>
        </ReportSection>
      )}

      {result.firstDirection && (
        <ReportSection title="Your first Vantaverse direction">
          <p className="text-sm text-foreground/70">{result.firstDirection}</p>
        </ReportSection>
      )}
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
