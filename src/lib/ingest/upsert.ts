import { geocodeAddress, haversineKm } from "@/lib/geocode";
import { upsertDiscoveredEventRow } from "@/lib/db";
import { dedupeEvents, showingExternalKey } from "@/lib/dedupe";

export type EventSource = "llm" | "ticketmaster" | "eventbrite";

export type DiscoveredEvent = {
  title: string;
  description?: string;
  category?: string;
  venue?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  startsAt: Date;
  endsAt?: Date | null;
  source: EventSource;
  sourceUrl?: string | null;
  externalId: string;
  imageUrl?: string | null;
  rawPayload?: unknown;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureCoords(
  event: DiscoveredEvent,
  cityHint: string,
): Promise<DiscoveredEvent> {
  if (event.lat != null && event.lng != null) return event;

  const queries = [
    [event.venue, event.address, cityHint].filter(Boolean).join(", "),
    [event.address, cityHint].filter(Boolean).join(", "),
    [event.venue, cityHint].filter(Boolean).join(", "),
  ].filter((q) => q.replace(/,/g, "").trim().length > 3);

  for (const q of queries) {
    try {
      const geo = await geocodeAddress(q);
      if (geo) {
        return {
          ...event,
          lat: geo.lat,
          lng: geo.lng,
          address: event.address || geo.displayName,
        };
      }
    } catch {
      /* continue */
    }
    await sleep(1100);
  }

  return event;
}

export async function upsertDiscoveredEvents(
  events: DiscoveredEvent[],
  place: {
    placeId: string;
    lat: number;
    lng: number;
    radiusKm: number;
    cityOrAddress?: string;
  },
): Promise<number> {
  let upserted = 0;
  const cityHint = place.cityOrAddress || "";

  // Same title + same day/time → one row. Different days stay (multi-day).
  const unique = dedupeEvents(events).map((event) => ({
    ...event,
    // Stable id so re-discover merges Polo Club / Polo Field style dupes
    externalId:
      event.source === "llm"
        ? `llm|${showingExternalKey(event.title, event.startsAt)}`
        : event.externalId,
  }));

  for (const raw of unique) {
    const event = cityHint ? await ensureCoords(raw, cityHint) : raw;

    const hasOwnCoords =
      event.lat != null &&
      event.lng != null &&
      Number.isFinite(event.lat) &&
      Number.isFinite(event.lng) &&
      !(event.lat === 0 && event.lng === 0);

    const lat = hasOwnCoords ? event.lat! : null;
    const lng = hasOwnCoords ? event.lng! : null;
    const distanceKm = hasOwnCoords
      ? Number(haversineKm(place.lat, place.lng, lat!, lng!).toFixed(2))
      : null;

    const slack = Math.max(5, place.radiusKm * 0.08);
    // Only enforce radius when we have real venue coordinates (not city-center fakes).
    if (
      hasOwnCoords &&
      distanceKm != null &&
      distanceKm > place.radiusKm + slack
    ) {
      continue;
    }

    await upsertDiscoveredEventRow({
      placeId: place.placeId,
      title: event.title,
      description: event.description ?? "",
      category: event.category ?? "Other",
      venue: event.venue ?? "",
      address: event.address ?? "",
      lat,
      lng,
      distanceKm,
      startsAt: event.startsAt,
      endsAt: event.endsAt ?? null,
      source: event.source,
      sourceUrl: event.sourceUrl ?? null,
      externalId: event.externalId,
      imageUrl: event.imageUrl ?? null,
      rawPayload: event.rawPayload,
    });
    upserted += 1;
  }

  return upserted;
}

export function normalizeExternalId(parts: string[]): string {
  return parts
    .join("|")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 180);
}
