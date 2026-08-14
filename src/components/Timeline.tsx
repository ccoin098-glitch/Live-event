import { format, isSameDay, isToday } from "date-fns";
import {
  EventTimelineList,
  type EventListItemData,
} from "@/components/EventListItem";
import { CelebrationBanner } from "@/components/CelebrationBanner";

export function Timeline({
  day,
  events,
  goingEvents = [],
  celebration,
}: {
  day: Date;
  events: EventListItemData[];
  goingEvents?: EventListItemData[];
  celebration?: string | null;
}) {
  const dayEvents = (() => {
    const goingForDay = goingEvents.filter((e) =>
      isSameDay(new Date(e.startsAt), day),
    );
    const goingIds = new Set(goingForDay.map((e) => e.id));

    const fromCity = events
      .filter((e) => isSameDay(new Date(e.startsAt), day))
      .map((e) => ({
        ...e,
        isGoing: Boolean(e.isGoing) || goingIds.has(e.id),
      }));

    const cityIds = new Set(fromCity.map((e) => e.id));
    const extras = goingForDay
      .filter((e) => !cityIds.has(e.id))
      .map((e) => ({ ...e, isGoing: true }));

    return [...extras, ...fromCity].sort((a, b) => {
      const goingDiff = Number(Boolean(b.isGoing)) - Number(Boolean(a.isGoing));
      if (goingDiff !== 0) return goingDiff;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  })();

  const goingCount = dayEvents.filter((e) => e.isGoing).length;

  return (
    <section className="animate-fade-up-delay space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-outfit)] text-sm font-bold uppercase tracking-[0.08em] text-[var(--ink)]">
            {isToday(day)
              ? `Today · ${format(day, "EEEE d MMMM")}`
              : format(day, "EEEE d MMMM yyyy")}
          </h3>
          {celebration ? (
            <CelebrationBanner name={celebration} tone="compact" />
          ) : null}
        </div>
        <p className="pb-0.5 text-xs text-[var(--muted)]">
          {goingCount > 0
            ? goingCount === 1
              ? "1 going"
              : `${goingCount} going`
            : isToday(day)
              ? "Today"
              : dayEvents.length === 1
                ? "1 event"
                : `${dayEvents.length} events`}
        </p>
      </div>

      {dayEvents.length === 0 ? (
        <div className="surface rounded-3xl px-4 py-6 text-center text-sm text-[var(--muted)]">
          {celebration
            ? `No local events listed, but this day is ${celebration}.`
            : "No events on this day within your radius."}
        </div>
      ) : (
        <EventTimelineList events={dayEvents} />
      )}
    </section>
  );
}
