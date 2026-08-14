"use client";

import Link from "next/link";
import { format, isToday, isTomorrow, isSameDay } from "date-fns";
import { markEventSeenLocal, useEventSeen } from "@/lib/viewed-events";
import { prefetchEvent, seedEventFromList } from "@/lib/event-cache";

export type EventListItemData = {
  id: string;
  title: string;
  category: string;
  venue: string;
  distanceKm: number | null;
  startsAt: string | Date;
  sourceUrl?: string | null;
  celebration?: string | null;
  isGoing?: boolean;
  isViewed?: boolean;
  placeLabel?: string | null;
};

const categoryColor: Record<string, string> = {
  Music: "#7C3AED",
  Food: "#F59E0B",
  Sports: "#22C55E",
  Arts: "#3B82F6",
  Other: "#94A3B8",
};

function dayBadge(date: Date): string | null {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return null;
}

export function categoryAccent(category: string): string {
  return categoryColor[category] ?? categoryColor.Other;
}

export function EventListItem({
  event,
  showTimeline = false,
  isFirst = false,
  isLast = false,
}: {
  event: EventListItemData;
  showTimeline?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  accent?: string;
}) {
  const startsAt = new Date(event.startsAt);
  const badge = dayBadge(startsAt);
  const distance =
    event.distanceKm != null ? `${event.distanceKm.toFixed(1)} km` : null;
  const color = categoryAccent(event.category);
  const locallySeen = useEventSeen(event.id, event.isViewed);
  const seen = locallySeen && !event.isGoing;

  function onOpen() {
    markEventSeenLocal(event.id);
    seedEventFromList(event);
    void prefetchEvent(event.id);
  }

  if (showTimeline) {
    return (
      <Link
        href={`/events/${event.id}`}
        prefetch
        onClick={onOpen}
        onPointerEnter={() => {
          seedEventFromList(event);
          void prefetchEvent(event.id);
        }}
        className={`group relative flex gap-3 pb-4 last:pb-0 ${
          seen ? "opacity-70" : ""
        }`}
      >
        <div className="relative flex w-4 shrink-0 justify-center">
          {!isFirst && (
            <span
              className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-white/70"
              style={{ height: "1.15rem" }}
              aria-hidden
            />
          )}
          {!isLast && (
            <span
              className="absolute left-1/2 bottom-0 top-5 w-px -translate-x-1/2 bg-white/70"
              aria-hidden
            />
          )}
          <span
            className={`relative z-10 mt-3.5 h-3.5 w-3.5 rounded-full border-[2.5px] shadow-sm ${
              seen ? "bg-[var(--muted)]/25" : "bg-white/80"
            }`}
            style={{ borderColor: seen ? "#94A3B8" : color }}
            aria-hidden
          />
        </div>

        <div className="surface min-w-0 flex-1 rounded-2xl px-3 py-3 transition group-hover:bg-white/50 group-active:scale-[0.99] min-[400px]:px-3.5">
          <div className="flex items-start justify-between gap-2 min-[400px]:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 min-[400px]:gap-2">
                <p
                  className={`line-clamp-2 font-[family-name:var(--font-outfit)] text-[15px] font-semibold leading-snug ${
                    seen ? "text-[var(--muted)]" : "text-[var(--ink)]"
                  }`}
                >
                  {event.title}
                </p>
                {event.isGoing && (
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Going
                  </span>
                )}
                {seen && (
                  <span className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Seen
                  </span>
                )}
                {badge && (
                  <span className="rounded-md bg-white/45 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {badge}
                  </span>
                )}
                {event.celebration && (
                  <span className="rounded-md bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--accent)]">
                    {event.celebration}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {format(startsAt, "h:mm a")}
                {" · "}
                {[
                  event.venue || "Local venue",
                  distance,
                  event.placeLabel,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span
              className="mt-0.5 shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ background: event.isGoing ? "#059669" : color }}
            >
              {event.isGoing ? "Going" : event.category}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.id}`}
      prefetch
      onClick={onOpen}
      onPointerEnter={() => {
        seedEventFromList(event);
        void prefetchEvent(event.id);
      }}
      className={`-mx-2 flex items-start gap-3 rounded-2xl px-2 py-3.5 transition hover:bg-white/25 active:scale-[0.99] ${
        seen ? "opacity-70" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`line-clamp-2 font-[family-name:var(--font-outfit)] text-[15px] font-semibold leading-snug ${
              seen ? "text-[var(--muted)]" : "text-[var(--ink)]"
            }`}
          >
            {event.title}
          </p>
          {seen && (
            <span className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Seen
            </span>
          )}
          {badge && (
            <span className="rounded-md bg-white/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] backdrop-blur-sm">
              {badge}
            </span>
          )}
          {event.celebration && (
            <span className="rounded-md bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--accent)]">
              {event.celebration}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
          {[event.venue || "Local venue", distance, event.category]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="shrink-0 pt-0.5 text-right text-xs font-medium text-[var(--muted)]">
        {format(startsAt, "h:mm a")}
      </div>
    </Link>
  );
}

export function EventTimelineList({ events }: { events: EventListItemData[] }) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-0">
      {events.map((event, index) => (
        <EventListItem
          key={event.id}
          event={event}
          showTimeline
          isFirst={index === 0}
          isLast={index === events.length - 1}
        />
      ))}
    </div>
  );
}

export function EventDayGroups({ events }: { events: EventListItemData[] }) {
  if (events.length === 0) return null;

  const groups = new Map<string, EventListItemData[]>();
  for (const event of events) {
    const key = format(new Date(event.startsAt), "yyyy-MM-dd");
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  const days = Array.from(groups.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-7">
      {days.map(([key, dayEvents]) => {
        const day = new Date(`${key}T12:00:00`);
        const celebration = dayEvents.find((e) => e.celebration)?.celebration;
        return (
          <section key={key} className="space-y-3">
            <div className="flex items-end justify-between gap-2 min-[400px]:gap-3">
              <div className="min-w-0">
                <h3 className="font-[family-name:var(--font-outfit)] text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] min-[400px]:text-sm">
                  <span className="min-[480px]:hidden">
                    {format(day, "EEE d")}
                  </span>
                  <span className="hidden min-[480px]:inline">
                    {format(day, "EEEE d, yyyy")}
                  </span>
                </h3>
                {celebration ? (
                  <p className="mt-0.5 text-xs font-medium text-[var(--accent)]">
                    {celebration}
                  </p>
                ) : null}
              </div>
              <p className="pb-0.5 text-xs text-[var(--muted)]">
                {isToday(day)
                  ? "Today"
                  : isTomorrow(day)
                    ? "Tomorrow"
                    : dayEvents.length === 1
                      ? "1 event"
                      : `${dayEvents.length} events`}
              </p>
            </div>
            <EventTimelineList events={dayEvents} />
          </section>
        );
      })}
    </div>
  );
}

export function eventsOnDay<T extends { startsAt: string | Date }>(
  events: T[],
  day: Date,
): T[] {
  return events.filter((e) => isSameDay(new Date(e.startsAt), day));
}
