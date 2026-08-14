import type { EventDetailPayload } from "@/lib/data/events";
import type { EventListItemData } from "@/components/EventListItem";

export type CachedEvent = EventDetailPayload["event"];

const cache = new Map<string, CachedEvent>();
const inflight = new Map<string, Promise<CachedEvent | null>>();

export function getCachedEvent(id: string): CachedEvent | null {
  return cache.get(id) ?? null;
}

export function setCachedEvent(event: CachedEvent) {
  cache.set(event.id, event);
}

/** Seed enough detail from a list row so the detail page can paint instantly. */
export function seedEventFromList(item: EventListItemData) {
  const startsAt =
    typeof item.startsAt === "string"
      ? item.startsAt
      : item.startsAt.toISOString();
  const existing = cache.get(item.id);
  const seeded: CachedEvent = {
    id: item.id,
    placeId: existing?.placeId ?? "",
    title: item.title,
    description: existing?.description ?? "",
    category: item.category,
    venue: item.venue,
    address: existing?.address ?? "",
    lat: existing?.lat ?? null,
    lng: existing?.lng ?? null,
    distanceKm: item.distanceKm,
    startsAt,
    endsAt: existing?.endsAt ?? null,
    source: existing?.source ?? "llm",
    sourceUrl: item.sourceUrl ?? existing?.sourceUrl ?? null,
    externalId: existing?.externalId ?? null,
    imageUrl: existing?.imageUrl ?? null,
    rawPayload: existing?.rawPayload ?? null,
    isGoing: Boolean(item.isGoing ?? existing?.isGoing),
    isViewed: true,
    createdAt: existing?.createdAt ?? startsAt,
    updatedAt: existing?.updatedAt ?? startsAt,
  };
  cache.set(item.id, seeded);
  return seeded;
}

export async function prefetchEvent(id: string): Promise<CachedEvent | null> {
  if (!id) return null;
  const cached = cache.get(id);
  if (cached?.description || cached?.imageUrl || cached?.address) {
    // Already have a fuller payload; still refresh in background below.
  }
  const existing = inflight.get(id);
  if (existing) return existing;

  const req = (async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load event");
      const json = (await res.json()) as { event: CachedEvent };
      cache.set(id, json.event);
      return json.event;
    } catch {
      return cache.get(id) ?? null;
    } finally {
      inflight.delete(id);
    }
  })();

  inflight.set(id, req);
  return req;
}
