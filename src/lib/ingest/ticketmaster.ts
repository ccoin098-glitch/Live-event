import type { DiscoveredEvent } from "@/lib/ingest/upsert";

type ProfileCtx = {
  cityOrAddress: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

type TmEvent = {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  images?: Array<{ url: string; width?: number }>;
  dates?: {
    start?: { dateTime?: string; localDate?: string; localTime?: string };
    end?: { dateTime?: string };
  };
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
  }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      address?: { line1?: string };
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }>;
  };
};

function mapCategory(segment?: string, genre?: string): string {
  const s = `${segment ?? ""} ${genre ?? ""}`.toLowerCase();
  if (s.includes("music") || s.includes("concert")) return "Music";
  if (s.includes("sport")) return "Sports";
  if (s.includes("art") || s.includes("theatre") || s.includes("theater") || s.includes("comedy"))
    return "Arts";
  if (s.includes("food") || s.includes("culinary")) return "Food";
  return "Other";
}

function parseStart(e: TmEvent): Date | null {
  const dt = e.dates?.start?.dateTime;
  if (dt) {
    const d = new Date(dt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const localDate = e.dates?.start?.localDate;
  if (localDate) {
    const localTime = e.dates?.start?.localTime ?? "12:00:00";
    const d = new Date(`${localDate}T${localTime}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export async function discoverEventsFromTicketmaster(
  profile: ProfileCtx,
): Promise<DiscoveredEvent[]> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) {
    console.warn("[ingest/tm] TICKETMASTER_API_KEY missing — skipping");
    return [];
  }

  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", key);
  url.searchParams.set("latlong", `${profile.lat},${profile.lng}`);
  url.searchParams.set("radius", String(Math.ceil(profile.radiusKm)));
  url.searchParams.set("unit", "km");
  url.searchParams.set("size", "50");
  url.searchParams.set("sort", "date,asc");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Ticketmaster failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    _embedded?: { events?: TmEvent[] };
  };

  const out: DiscoveredEvent[] = [];
  for (const e of data._embedded?.events ?? []) {
    const startsAt = parseStart(e);
    if (!startsAt) continue;

    const venue = e._embedded?.venues?.[0];
    const lat = venue?.location?.latitude
      ? parseFloat(venue.location.latitude)
      : null;
    const lng = venue?.location?.longitude
      ? parseFloat(venue.location.longitude)
      : null;

    const image =
      [...(e.images ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]
        ?.url ?? null;

    const segment = e.classifications?.[0]?.segment?.name;
    const genre = e.classifications?.[0]?.genre?.name;

    out.push({
      title: e.name,
      description: e.info || e.pleaseNote || "",
      category: mapCategory(segment, genre),
      venue: venue?.name ?? "",
      address: [venue?.address?.line1, venue?.city?.name].filter(Boolean).join(", "),
      lat,
      lng,
      startsAt,
      endsAt: e.dates?.end?.dateTime ? new Date(e.dates.end.dateTime) : null,
      source: "ticketmaster",
      sourceUrl: e.url ?? null,
      externalId: e.id,
      imageUrl: image,
      rawPayload: e as unknown as Record<string, unknown>,
    });
  }

  return out;
}
