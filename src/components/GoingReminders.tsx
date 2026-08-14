"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { EventListItemData } from "@/components/EventListItem";
import { markEventSeenLocal } from "@/lib/viewed-events";
import { prefetchEvent, seedEventFromList } from "@/lib/event-cache";

export type GoingEventItem = EventListItemData & {
  placeLabel?: string | null;
};

export function GoingReminders({ events }: { events: GoingEventItem[] }) {
  if (events.length === 0) return null;

  return (
    <section className="animate-fade-up space-y-3">
      <div className="space-y-3">
        {events.map((event, index) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            prefetch
            onClick={() => {
              markEventSeenLocal(event.id);
              seedEventFromList(event);
              void prefetchEvent(event.id);
            }}
            onPointerEnter={() => {
              seedEventFromList(event);
              void prefetchEvent(event.id);
            }}
            className="surface block rounded-3xl p-4 transition hover:bg-white/45 active:scale-[0.99] min-[400px]:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
                {index === 0 ? "Next up" : "Reminder"}
              </p>
              {event.placeLabel ? (
                <p className="max-w-[40%] truncate text-xs text-[var(--muted)]">
                  {event.placeLabel}
                </p>
              ) : null}
            </div>
            <h3 className="mt-2 font-[family-name:var(--font-outfit)] text-[clamp(1.25rem,5vw,1.5rem)] font-bold leading-tight text-[var(--ink)]">
              {event.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {event.venue || "Local venue"}
              {event.distanceKm != null
                ? ` · ${event.distanceKm.toFixed(1)} km`
                : ""}
              {" · "}
              {format(new Date(event.startsAt), "EEE, MMM d · h:mm a")}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
