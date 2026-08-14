"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { markEventSeenLocal } from "@/lib/viewed-events";
import {
  getCachedEvent,
  prefetchEvent,
  setCachedEvent,
  type CachedEvent,
} from "@/lib/event-cache";
import { googleMapsUrl } from "@/lib/maps";
import { tabCache } from "@/lib/tab-cache";

export function EventDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [event, setEvent] = useState<CachedEvent | null>(() =>
    id ? getCachedEvent(id) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [savingGoing, setSavingGoing] = useState(false);

  useEffect(() => {
    if (!id) return;
    markEventSeenLocal(id);
    const cached = getCachedEvent(id);
    if (cached) setEvent(cached);

    let cancelled = false;
    async function load() {
      const next = await prefetchEvent(id);
      if (cancelled) return;
      if (next) {
        setEvent(next);
        setError(null);
      } else if (!cached) {
        setError("Event not found");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  async function toggleGoing() {
    if (!event || savingGoing) return;
    setSavingGoing(true);
    const next = !event.isGoing;
    const optimistic = { ...event, isGoing: next };
    setEvent(optimistic);
    setCachedEvent(optimistic);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGoing: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const json = (await res.json()) as { event: CachedEvent };
      setCachedEvent(json.event);
      setEvent(json.event);
    } catch {
      const reverted = { ...event, isGoing: !next };
      setCachedEvent(reverted);
      setEvent(reverted);
    } finally {
      setSavingGoing(false);
    }
  }

  if (!event && !error) {
    return (
      <p className="py-20 text-center text-sm text-[var(--muted)]">
        Loading event…
      </p>
    );
  }

  if (error || !event) {
    return (
      <main className="space-y-4">
        <button
          type="button"
          onClick={goBack}
          className="chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--ink)]"
        >
          <span aria-hidden>‹</span> Back
        </button>
        <p className="surface rounded-3xl p-6 text-center text-sm text-red-600">
          {error ?? "Event not found"}
        </p>
      </main>
    );
  }

  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : null;
  const cityHint =
    event.placeCity ??
    tabCache.upcoming?.places.find((p) => p.id === event.placeId)?.cityOrAddress ??
    tabCache.agenda?.data.places.find((p) => p.id === event.placeId)?.cityOrAddress ??
    null;
  const mapsUrl = googleMapsUrl({
    venue: event.venue,
    address: event.address,
    lat: event.lat,
    lng: event.lng,
    cityHint,
  });

  const lore =
    event.description?.trim() ||
    `${event.title} is a ${event.category.toLowerCase()} event${
      event.venue ? ` at ${event.venue}` : ""
    }. Check back after the next daily discover for a fuller write-up.`;

  return (
    <main className="space-y-5">
      <button
        type="button"
        onClick={goBack}
        className="chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--ink)] transition hover:bg-white/55"
      >
        <span aria-hidden>‹</span> Back
      </button>

      <article className="surface animate-fade-up overflow-hidden rounded-3xl">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            className="aspect-[16/9] max-h-56 w-full object-cover sm:max-h-64"
          />
        ) : null}

        <div className="space-y-5 p-4 min-[400px]:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {event.category}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                via {event.source}
              </span>
            </div>
            <h1 className="page-title mt-3">{event.title}</h1>
          </div>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              About this event
            </h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]/90">
              {lore}
            </p>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoBlock label="When">
              <p className="font-medium">{format(startsAt, "EEEE, MMM d, yyyy")}</p>
              <p className="text-sm text-[var(--muted)]">
                {format(startsAt, "h:mm a")}
                {endsAt ? ` – ${format(endsAt, "h:mm a")}` : ""}
              </p>
            </InfoBlock>
            <InfoBlock label="Where">
              <p className="font-medium">{event.venue || "Local venue"}</p>
              {event.address ? (
                <p className="text-sm text-[var(--muted)]">{event.address}</p>
              ) : null}
              {event.distanceKm != null ? (
                <p className="text-sm text-[var(--muted)]">
                  {event.distanceKm.toFixed(1)} km away
                </p>
              ) : null}
            </InfoBlock>
          </div>

          <button
            type="button"
            onClick={toggleGoing}
            disabled={savingGoing}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition disabled:opacity-60 ${
              event.isGoing
                ? "bg-[var(--ink)] text-white"
                : "chip text-[var(--ink)] hover:bg-white/55"
            }`}
          >
            {event.isGoing ? "You're going ✓" : "I'm going"}
          </button>

          <section className="field space-y-3 rounded-2xl p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Found online
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Source: {sourceLabel(event.source)}
                {event.sourceUrl ? (
                  <>
                    {" · "}
                    <span className="text-[var(--ink)]">
                      {hostnameOf(event.sourceUrl)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            {event.sourceUrl ? (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                View original listing
                <span aria-hidden>↗</span>
              </a>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                No public listing URL was saved for this event yet. After the next
                ingest, links from Ticketmaster, Eventbrite, or web search will
                appear here.
              </p>
            )}
          </section>

          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="chip flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/55"
            >
              Open in Google Maps
            </a>
          ) : null}
        </div>
      </article>
    </main>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field rounded-2xl p-3.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case "ticketmaster":
      return "Ticketmaster";
    case "eventbrite":
      return "Eventbrite";
    case "llm":
      return "Web search";
    default:
      return source;
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
