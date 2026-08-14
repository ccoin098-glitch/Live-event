"use client";

import Link from "next/link";
import { format } from "date-fns";
import { categoryAccent } from "@/components/EventListItem";
import { markEventSeenLocal } from "@/lib/viewed-events";
import { prefetchEvent, seedEventFromList } from "@/lib/event-cache";

export type AttendedEventItem = {
  id: string;
  title: string;
  category: string;
  venue: string;
  distanceKm: number | null;
  startsAt: string;
  placeLabel: string | null;
};

export function AttendedHistory({
  upcoming,
  history,
}: {
  upcoming: AttendedEventItem[];
  history: AttendedEventItem[];
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-outfit)] text-base font-semibold">
          Attended
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Events you marked as going — upcoming and past history.
        </p>
      </div>

      {upcoming.length === 0 && history.length === 0 ? (
        <div className="surface rounded-3xl px-4 py-8 text-center text-sm text-[var(--muted)]">
          Nothing here yet. Open an event and tap I&apos;m going to build your
          history.
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Still going
            </h3>
            <p className="text-xs text-[var(--muted)]">
              {upcoming.length === 1 ? "1 event" : `${upcoming.length} events`}
            </p>
          </div>
          <ul className="space-y-2">
            {upcoming.map((event) => (
              <AttendedRow key={event.id} event={event} tone="upcoming" />
            ))}
          </ul>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              History
            </h3>
            <p className="text-xs text-[var(--muted)]">
              {history.length === 1
                ? "1 past event"
                : `${history.length} past events`}
            </p>
          </div>
          <ul className="space-y-2">
            {history.map((event) => (
              <AttendedRow key={event.id} event={event} tone="history" />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function AttendedRow({
  event,
  tone,
}: {
  event: AttendedEventItem;
  tone: "upcoming" | "history";
}) {
  const color = categoryAccent(event.category);
  const when = format(new Date(event.startsAt), "EEE, MMM d · h:mm a");

  return (
    <li>
      <Link
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
        className={`surface flex items-start gap-3 rounded-2xl px-3.5 py-3 transition hover:bg-white/50 active:scale-[0.99] ${
          tone === "history" ? "opacity-90" : ""
        }`}
      >
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-[family-name:var(--font-outfit)] text-sm font-semibold leading-snug text-[var(--ink)]">
              {event.title}
            </h4>
            {tone === "history" ? (
              <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Done
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {when}
            {event.venue ? ` · ${event.venue}` : ""}
            {event.placeLabel ? ` · ${event.placeLabel}` : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}
