"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";

type DayCount = {
  date: string;
  count: number;
  categories: string[];
  celebration?: string | null;
  hasGoing?: boolean;
};

export function CalendarGrid({
  month,
  onMonthChange,
  selected,
  onSelect,
  dayCounts,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selected: Date;
  onSelect: (d: Date) => void;
  dayCounts: DayCount[];
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const countMap = new Map(dayCounts.map((d) => [d.date, d]));

  return (
    <section className="surface animate-fade-up rounded-3xl p-3 min-[400px]:p-4">
      <div className="mb-3 flex items-center justify-between gap-2 min-[400px]:mb-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
          onClick={() => onMonthChange(addMonths(month, -1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h2 className="min-w-0 truncate text-center font-[family-name:var(--font-outfit)] text-base font-semibold min-[400px]:text-lg">
          {format(month, "MMMM yyyy")}
        </h2>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
          onClick={() => onMonthChange(addMonths(month, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] min-[400px]:gap-1 min-[400px]:text-[11px]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`} aria-hidden className="min-[480px]:hidden">
            {d}
          </div>
        ))}
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="hidden min-[480px]:block">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 min-[400px]:gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const info = countMap.get(key);
          const selectedDay = isSameDay(day, selected);
          const today = isToday(day);
          const inMonth = isSameMonth(day, month);
          const hasEvents = (info?.count ?? 0) > 0;
          const hasCelebration = Boolean(info?.celebration);
          const hasGoing = Boolean(info?.hasGoing);

          return (
            <button
              key={key}
              type="button"
              title={
                [
                  today ? "Today" : null,
                  hasGoing ? "You're going" : null,
                  info?.celebration ?? null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              aria-current={today ? "date" : undefined}
              onClick={() => onSelect(day)}
              className={`relative flex aspect-square max-h-14 min-h-10 flex-col items-center justify-center rounded-xl text-xs transition min-[400px]:min-h-11 min-[400px]:text-sm ${
                selectedDay
                  ? "bg-[var(--ink)] font-semibold text-white"
                  : hasGoing
                    ? "bg-emerald-500/15 font-semibold text-[var(--ink)] ring-2 ring-emerald-500/45 hover:bg-emerald-500/20"
                    : today
                      ? "bg-[var(--accent)]/15 font-semibold text-[var(--ink)] ring-2 ring-[var(--accent)]/50 hover:bg-[var(--accent)]/20"
                      : inMonth
                        ? "text-[var(--ink)] hover:bg-black/5"
                        : "text-black/25"
              }`}
            >
              <span>{format(day, "d")}</span>
              {today && !hasGoing ? (
                <span
                  className={`mt-0.5 hidden text-[8px] font-bold uppercase tracking-wide min-[420px]:inline ${
                    selectedDay ? "text-white/80" : "text-[var(--accent)]"
                  }`}
                >
                  Today
                </span>
              ) : hasGoing ? (
                <span
                  className={`mt-0.5 hidden text-[8px] font-bold uppercase tracking-wide min-[420px]:inline ${
                    selectedDay ? "text-emerald-200" : "text-emerald-600"
                  }`}
                >
                  Going
                </span>
              ) : hasEvents || hasCelebration ? (
                <span className="mt-0.5 flex gap-0.5">
                  {hasCelebration && (
                    <span className="h-1 w-1 rounded-full bg-amber-500" />
                  )}
                  {hasEvents && (
                    <span
                      className={`h-1 w-1 rounded-full ${
                        selectedDay ? "bg-white" : "bg-[var(--accent)]"
                      }`}
                    />
                  )}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-[var(--muted)] min-[400px]:text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full ring-2 ring-[var(--accent)]/60" />{" "}
          Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Going
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Celebration
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Events
        </span>
      </div>
    </section>
  );
}
