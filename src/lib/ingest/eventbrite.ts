import type { DiscoveredEvent } from "@/lib/ingest/upsert";

type ProfileCtx = {
  cityOrAddress: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

type EbEvent = {
  id: string;
  name?: { text?: string };
  description?: { text?: string };
  url?: string;
  start?: { utc?: string; local?: string };
  end?: { utc?: string };
  logo?: { url?: string };
  venue_id?: string;
  category_id?: string;
};

function mapCategory(name: string): string {
  const s = name.toLowerCase();
  if (s.includes("music") || s.includes("concert")) return "Music";
  if (s.includes("sport") || s.includes("fitness")) return "Sports";
  if (s.includes("art") || s.includes("film") || s.includes("theatre") || s.includes("theater"))
    return "Arts";
  if (s.includes("food") || s.includes("drink")) return "Food";
  return "Other";
}

export async function discoverEventsFromEventbrite(
  profile: ProfileCtx,
): Promise<DiscoveredEvent[]> {
  const key = process.env.EVENTBRITE_API_KEY;
  if (!key) {
    console.warn("[ingest/eb] EVENTBRITE_API_KEY missing — skipping");
    return [];
  }

  // Eventbrite public search by location (requires OAuth token / private token)
  const url = new URL("https://www.eventbriteapi.com/v3/events/search/");
  url.searchParams.set("location.latitude", String(profile.lat));
  url.searchParams.set("location.longitude", String(profile.lng));
  url.searchParams.set("location.within", `${Math.ceil(profile.radiusKm)}km`);
  url.searchParams.set("expand", "venue,category");
  url.searchParams.set("sort_by", "date");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    // Many Eventbrite tokens no longer support public search — soft-fail
    console.warn(
      `[ingest/eb] Eventbrite search unavailable: ${res.status} ${await res.text()}`,
    );
    return [];
  }

  const data = (await res.json()) as {
    events?: Array<
      EbEvent & {
        venue?: {
          name?: string;
          address?: {
            localized_address_display?: string;
            latitude?: string;
            longitude?: string;
          };
        };
        category?: { name?: string };
      }
    >;
  };

  const out: DiscoveredEvent[] = [];
  for (const e of data.events ?? []) {
    const title = e.name?.text?.trim();
    const startStr = e.start?.utc || e.start?.local;
    if (!title || !startStr) continue;
    const startsAt = new Date(startStr);
    if (Number.isNaN(startsAt.getTime())) continue;

    const lat = e.venue?.address?.latitude
      ? parseFloat(e.venue.address.latitude)
      : null;
    const lng = e.venue?.address?.longitude
      ? parseFloat(e.venue.address.longitude)
      : null;

    out.push({
      title,
      description: e.description?.text ?? "",
      category: mapCategory(e.category?.name ?? title),
      venue: e.venue?.name ?? "",
      address: e.venue?.address?.localized_address_display ?? "",
      lat,
      lng,
      startsAt,
      endsAt: e.end?.utc ? new Date(e.end.utc) : null,
      source: "eventbrite",
      sourceUrl: e.url ?? null,
      externalId: e.id,
      imageUrl: e.logo?.url ?? null,
      rawPayload: e as unknown as Record<string, unknown>,
    });
  }

  return out;
}
