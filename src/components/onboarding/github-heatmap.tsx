import type { ContributionCalendar } from "@/lib/github";

const LEVEL_CLASS = ["bg-chart-5/40", "bg-chart-5", "bg-chart-4", "bg-chart-2", "bg-chart-1"];

function levelFor(count: number, max: number): number {
  if (count === 0) return 0;
  if (max === 0) return 1;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function GithubHeatmap({ calendar }: { calendar: ContributionCalendar }) {
  const days = calendar.weeks.flatMap((w) => w.contributionDays);
  const total = days.reduce((sum, d) => sum + d.contributionCount, 0);
  const max = Math.max(0, ...days.map((d) => d.contributionCount));

  if (days.length === 0) {
    return (
      <div className="hairline rounded-2xl bg-card px-6 py-10 text-center">
        <p className="text-sm text-foreground/45">No activity in the last year.</p>
      </div>
    );
  }

  return (
    <div className="hairline rounded-2xl bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
          Activity — last year
        </p>
        <p className="text-xs text-foreground/45">{total} contributions</p>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex w-max gap-[3px]">
          {calendar.weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.contributionDays.map((day) => (
                <div
                  key={day.date}
                  title={`${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"} on ${day.date}`}
                  className={`h-2.5 w-2.5 rounded-[2px] ${LEVEL_CLASS[levelFor(day.contributionCount, max)]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-foreground/40">
        <span>Less</span>
        {LEVEL_CLASS.map((cls, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
