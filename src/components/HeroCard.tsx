"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { EventListItemData } from "@/components/EventListItem";
import { markEventSeenLocal } from "@/lib/viewed-events";

export function HeroCard({
  featured,
  locationLabel,
}: {
  featured: EventListItemData | null;
  locationLabel: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Next up
        </p>
        {locationLabel && (
          <p className="text-xs text-[var(--muted)]">{locationLabel}</p>
        )}
      </div>
      <h2 className="mt-2 font-[family-name:var(--font-outfit)] text-2xl font-bold leading-tight text-[var(--ink)]">
        {featured?.title ?? "No events yet"}
      </h2>
      {featured ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {featured.venue || "Local venue"}
          {featured.distanceKm != null
            ? ` · ${featured.distanceKm.toFixed(1)} km`
            : ""}
          {" · "}
          {format(new Date(featured.startsAt), "EEE, MMM d · h:mm a")}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">
          Save your city on Location, then run a daily discover to fill this.
        </p>
      )}
    </>
  );

  if (!featured) {
    return (
      <section className="surface animate-fade-up rounded-3xl p-5">{inner}</section>
    );
  }

  return (
    <Link
      href={`/events/${featured.id}`}
      onClick={() => markEventSeenLocal(featured.id)}
      className="surface animate-fade-up block rounded-3xl p-5 transition hover:bg-white/45 active:scale-[0.99]"
    >
      {inner}
    </Link>
  );
}
