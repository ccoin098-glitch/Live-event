import OpenAI from "openai";
import { addDays, format } from "date-fns";
import { geocodeAddress, haversineKm } from "@/lib/geocode";
import { dedupeEvents } from "@/lib/dedupe";
import type { DiscoveredEvent } from "@/lib/ingest/upsert";
import { normalizeExternalId } from "@/lib/ingest/upsert";

type ProfileCtx = {
  cityOrAddress: string;
  lat: number;
  lng: number;
  radiusKm: number;
  preferencesText: string;
  preferenceTags: string[];
};

type RawGrokEvent = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  venue?: unknown;
  address?: unknown;
  neighborhood?: unknown;
  lat?: unknown;
  lng?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  sourceUrl?: unknown;
  estimatedDistanceKm?: unknown;
  whyNearby?: unknown;
};

type SearchMission = {
  id: string;
  brief: string;
};

function createGrokClient() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeCategory(value: string): string {
  const c = value.toLowerCase();
  if (c.includes("music") || c.includes("concert") || c.includes("dj") || c.includes("festival"))
    return "Music";
  if (c.includes("food") || c.includes("drink") || c.includes("market") || c.includes("culinary"))
    return "Food";
  if (
    c.includes("sport") ||
    c.includes("run") ||
    c.includes("fitness") ||
    c.includes("match") ||
    c.includes("ski") ||
    c.includes("hike") ||
    c.includes("polo")
  )
    return "Sports";
  if (
    c.includes("art") ||
    c.includes("gallery") ||
    c.includes("theatre") ||
    c.includes("theater") ||
    c.includes("film") ||
    c.includes("comedy")
  )
    return "Arts";
  return "Other";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortCity(cityOrAddress: string): string {
  return cityOrAddress.split(",")[0]?.trim() || cityOrAddress;
}

function extractOutputText(response: {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text) chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function extractJsonValue(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }

  const objectStart = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");
  let start = -1;
  if (objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)) {
    start = objectStart;
  } else if (arrayStart >= 0) {
    start = arrayStart;
  }
  if (start < 0) throw new Error("No JSON found in Grok response");

  const opener = cleaned[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === opener) depth += 1;
    if (ch === closer) {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }

  throw new Error("Incomplete JSON in Grok response");
}

function eventsFromParsed(parsed: unknown): RawGrokEvent[] {
  if (Array.isArray(parsed)) return parsed as RawGrokEvent[];
  if (parsed && typeof parsed === "object") {
    const obj = parsed as { events?: unknown; data?: unknown; results?: unknown };
    if (Array.isArray(obj.events)) return obj.events as RawGrokEvent[];
    if (Array.isArray(obj.data)) return obj.data as RawGrokEvent[];
    if (Array.isArray(obj.results)) return obj.results as RawGrokEvent[];
  }
  return [];
}

async function geocodeEventLocation(
  venue: string,
  address: string,
  cityHint: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  const queries = [
    [venue, address, cityHint].filter(Boolean).join(", "),
    [address, cityHint].filter(Boolean).join(", "),
    [venue, cityHint].filter(Boolean).join(", "),
    [venue, shortCity(cityHint)].filter(Boolean).join(", "),
  ].filter((q) => q.replace(/,/g, "").trim().length > 3);

  const unique = Array.from(new Set(queries));
  for (const q of unique) {
    try {
      const geo = await geocodeAddress(q);
      if (geo) {
        return { lat: geo.lat, lng: geo.lng, label: geo.displayName };
      }
    } catch (err) {
      console.warn("[ingest/llm] geocode failed:", q, err);
    }
    await sleep(1100);
  }
  return null;
}

function buildInstructions(profile: ProfileCtx, nowIso: string, untilIso: string) {
  const city = shortCity(profile.cityOrAddress);
  const prefs = [...profile.preferenceTags, profile.preferencesText]
    .filter(Boolean)
    .join(", ");

  return `You are Lockal's exhaustive local-events scout. Use web_search aggressively to find REAL upcoming attendable events.

ORIGIN
- Place: ${profile.cityOrAddress}
- Coordinates: ${profile.lat}, ${profile.lng}
- Search radius: ${profile.radiusKm} km (MUST include nearby towns/villages inside this radius)
- Preferences (rank higher, but still collect everything else): ${prefs || "any local culture / nightlife / community events"}

WINDOW
- Only events starting between ${nowIso} and ${untilIso}

SEARCH HARD
1. Always use web_search multiple times in this turn. Do not stop after 1–2 queries.
2. Search official tourism calendars, festival programs, venue sites, Ticketmaster/Eventbrite/Resident Advisor, local papers, municipal agendas, sports clubs.
3. Search the city AND surrounding towns within ${profile.radiusKm} km.
4. Pull concrete listings with venue + date. Weekly markets, club nights, exhibitions, matches, and festival program days are valid.
5. Aim for MAXIMUM coverage for this mission — prefer 12–25 events over a shortlist. Empty is failure.
6. If a festival spans multiple days, include each distinct dated performance/day as its own event (different dates are NOT duplicates).
7. Do not invent distant mega-tours outside the radius.

OUTPUT
Return ONLY valid JSON (no markdown):
{
  "events": [
    {
      "title": string,
      "description": string,
      "category": "Music" | "Food" | "Sports" | "Arts" | "Other",
      "venue": string,
      "address": string,
      "neighborhood": string,
      "lat": number | null,
      "lng": number | null,
      "startsAt": "ISO-8601 datetime",
      "endsAt": "ISO-8601 datetime" | null,
      "sourceUrl": string | null,
      "estimatedDistanceKm": number,
      "whyNearby": string
    }
  ]
}

Hard constraints:
- category must be exactly one of Music, Food, Sports, Arts, Other
- estimatedDistanceKm must be <= ${profile.radiusKm}
- startsAt must be inside the window
- Prefer ${city} and places within ${profile.radiusKm} km of the coordinates`;
}

function buildMissions(profile: ProfileCtx, fromLabel: string, toLabel: string): SearchMission[] {
  const city = shortCity(profile.cityOrAddress);
  const prefs =
    profile.preferenceTags.length > 0
      ? profile.preferenceTags.join(", ")
      : "music, food, sports, arts";
  const extra = profile.preferencesText.trim();

  return [
    {
      id: "calendar",
      brief: `Exhaustive what's-on calendar for ${city} and towns within ${profile.radiusKm}km from ${fromLabel} to ${toLabel}. Cover tourism calendars, municipal agendas, and major festival programs. Return as many dated events as you can find.`,
    },
    {
      id: "music-arts",
      brief: `Find Music and Arts events near ${city} within ${profile.radiusKm}km (${fromLabel}–${toLabel}): concerts, festivals, DJ nights, theatre, cinema, galleries, comedy. Search venue calendars and ticket sites thoroughly.`,
    },
    {
      id: "food-sports",
      brief: `Find Food and Sports events near ${city} within ${profile.radiusKm}km (${fromLabel}–${toLabel}): markets, food festivals, tastings, matches, races, outdoor sports, polo, hiking events. Search local listings thoroughly.`,
    },
    {
      id: "prefs-regional",
      brief: `Prioritize preferences (${prefs}${extra ? `; ${extra}` : ""}) near ${city}, then fill with strong regional events in nearby towns inside ${profile.radiusKm}km for ${fromLabel}–${toLabel}. Dig into smaller venues and recurring weekly events.`,
    },
  ];
}

async function askGrokMission(
  grok: OpenAI,
  profile: ProfileCtx,
  nowIso: string,
  untilIso: string,
  mission: SearchMission,
  alreadyTitles: string[],
): Promise<RawGrokEvent[]> {
  const city = shortCity(profile.cityOrAddress);
  const avoid =
    alreadyTitles.length > 0
      ? `Already collected (do NOT repeat these titles): ${alreadyTitles
          .slice(0, 40)
          .join(" · ")}`
      : "No prior list — collect a wide first batch.";

  const response = await grok.responses.create({
    model: process.env.XAI_MODEL?.trim() || "grok-3",
    tools: [{ type: "web_search" }],
    temperature: 0.25,
    instructions: buildInstructions(profile, nowIso, untilIso),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Mission (${mission.id}): ${mission.brief}`,
              `Pin: ${city} @ ${profile.lat}, ${profile.lng}`,
              `Radius: ${profile.radiusKm} km`,
              `Dates: ${nowIso} → ${untilIso}`,
              avoid,
              "Use many web_search queries. Open promising calendar pages.",
              "Return JSON only with a large events array.",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const text = extractOutputText(response as never);
  if (!text) {
    console.warn(`[ingest/llm] mission=${mission.id} empty text`);
    return [];
  }

  console.log(`[ingest/llm] mission=${mission.id} raw chars=${text.length}`);
  try {
    return eventsFromParsed(extractJsonValue(text));
  } catch (err) {
    console.error(
      `[ingest/llm] mission=${mission.id} JSON parse failed:`,
      err instanceof Error ? err.message : err,
      text.slice(0, 300),
    );
    return [];
  }
}

async function askGrokChatFallback(
  grok: OpenAI,
  profile: ProfileCtx,
  nowIso: string,
  untilIso: string,
): Promise<RawGrokEvent[]> {
  const completion = await grok.chat.completions.create({
    model: process.env.XAI_MODEL?.trim() || "grok-3",
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content: buildInstructions(profile, nowIso, untilIso).replace(
          /Use web_search[^\n]*/gi,
          "Use your best up-to-date knowledge of local venues and seasonal calendars.",
        ),
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Return as many upcoming attendable events near this pin as possible (aim 15+).",
          origin: {
            label: profile.cityOrAddress,
            lat: profile.lat,
            lng: profile.lng,
            radiusKm: profile.radiusKm,
          },
          window: { from: nowIso, to: untilIso },
          preferences: {
            tags: profile.preferenceTags,
            text: profile.preferencesText,
          },
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    return eventsFromParsed(extractJsonValue(raw));
  } catch {
    return [];
  }
}

function toCandidates(
  rawEvents: RawGrokEvent[],
  now: Date,
  until: Date,
): DiscoveredEvent[] {
  const candidates: DiscoveredEvent[] = [];
  for (const item of rawEvents) {
    const title = asString(item.title);
    const startsAt = parseDate(item.startsAt);
    if (!title || !startsAt) continue;
    if (startsAt.getTime() < now.getTime() - 12 * 60 * 60 * 1000) continue;
    if (startsAt.getTime() > until.getTime()) continue;

    const venue = asString(item.venue);
    const address = asString(item.address) || asString(item.neighborhood);
    const sourceUrl = asString(item.sourceUrl) || null;
    const category = normalizeCategory(asString(item.category) || "Other");

    candidates.push({
      title,
      description: asString(item.description),
      category,
      venue,
      address,
      lat: asNumber(item.lat),
      lng: asNumber(item.lng),
      startsAt,
      endsAt: parseDate(item.endsAt),
      source: "llm",
      sourceUrl,
      externalId: normalizeExternalId([
        "llm",
        title,
        startsAt.toISOString(),
        venue || sourceUrl || "",
      ]),
      imageUrl: null,
      rawPayload: item,
    });
  }
  return candidates;
}

async function verifyInRadius(
  candidates: DiscoveredEvent[],
  profile: ProfileCtx,
): Promise<DiscoveredEvent[]> {
  const verified: DiscoveredEvent[] = [];
  const radiusSlack = Math.max(5, profile.radiusKm * 0.08);

  for (const event of candidates) {
    let lat = event.lat ?? null;
    let lng = event.lng ?? null;

    const coordsLookValid =
      lat != null &&
      lng != null &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180 &&
      !(lat === 0 && lng === 0);

    if (!coordsLookValid) {
      const geo = await geocodeEventLocation(
        event.venue ?? "",
        event.address ?? "",
        profile.cityOrAddress,
      );
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        if (!event.address) event.address = geo.label;
      } else {
        lat = profile.lat;
        lng = profile.lng;
        console.warn(`[ingest/llm] pin-fallback (no geocode): ${event.title}`);
      }
    }

    const distanceKm = haversineKm(profile.lat, profile.lng, lat!, lng!);
    if (distanceKm > profile.radiusKm + radiusSlack) {
      console.warn(
        `[ingest/llm] drop (too far ${distanceKm.toFixed(1)}km > ${profile.radiusKm}km): ${event.title}`,
      );
      continue;
    }

    verified.push({
      ...event,
      lat,
      lng,
      rawPayload: {
        ...(typeof event.rawPayload === "object" && event.rawPayload
          ? event.rawPayload
          : {}),
        verifiedDistanceKm: Number(distanceKm.toFixed(2)),
      },
    });
  }

  return verified;
}

export async function discoverEventsWithLlm(
  profile: ProfileCtx,
): Promise<DiscoveredEvent[]> {
  const grok = createGrokClient();
  if (!grok) {
    console.warn("[ingest/llm] XAI_API_KEY missing — skipping Grok discovery");
    return [];
  }

  const now = new Date();
  const until = addDays(now, 60);
  const nowIso = now.toISOString();
  const untilIso = until.toISOString();
  const fromLabel = format(now, "d MMM yyyy");
  const toLabel = format(until, "d MMM yyyy");

  const missions = buildMissions(profile, fromLabel, toLabel);
  const mergedRaw: RawGrokEvent[] = [];
  const seenTitles = new Set<string>();

  // Run missions in pairs for coverage without serializing the whole run.
  for (let i = 0; i < missions.length; i += 2) {
    const batch = missions.slice(i, i + 2);
    const already = Array.from(seenTitles);
    const results = await Promise.all(
      batch.map(async (mission) => {
        try {
          const found = await askGrokMission(
            grok,
            profile,
            nowIso,
            untilIso,
            mission,
            already,
          );
          console.log(
            `[ingest/llm] mission=${mission.id} events=${found.length}`,
          );
          return found;
        } catch (err) {
          console.error(
            `[ingest/llm] mission=${mission.id} failed:`,
            err instanceof Error ? err.message : err,
          );
          return [] as RawGrokEvent[];
        }
      }),
    );

    for (const found of results) {
      for (const item of found) {
        const title = asString(item.title).toLowerCase();
        if (title) seenTitles.add(title);
        mergedRaw.push(item);
      }
    }
  }

  // Final sweep: hunt for anything still missing.
  if (mergedRaw.length > 0) {
    try {
      const sweep = await askGrokMission(
        grok,
        profile,
        nowIso,
        untilIso,
        {
          id: "gap-fill",
          brief: `Final sweep near ${shortCity(profile.cityOrAddress)} within ${profile.radiusKm}km (${fromLabel}–${toLabel}). Find events NOT already listed. Check more niche venues, clubs, churches, sports halls, markets, and nearby towns.`,
        },
        Array.from(seenTitles),
      );
      console.log(`[ingest/llm] mission=gap-fill events=${sweep.length}`);
      mergedRaw.push(...sweep);
    } catch (err) {
      console.warn(
        "[ingest/llm] gap-fill failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (mergedRaw.length === 0) {
    console.warn("[ingest/llm] all web missions empty — chat fallback");
    try {
      mergedRaw.push(
        ...(await askGrokChatFallback(grok, profile, nowIso, untilIso)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Grok request failed: ${message}`);
    }
  }

  const candidates = toCandidates(mergedRaw, now, until);
  const verified = await verifyInRadius(candidates, profile);
  const unique = dedupeEvents(verified);

  const prefTokens = [
    ...profile.preferenceTags.map((t) => t.toLowerCase()),
    ...profile.preferencesText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  ];

  unique.sort((a, b) => {
    const score = (e: DiscoveredEvent) => {
      const hay = `${e.title} ${e.description} ${e.category}`.toLowerCase();
      const hits = prefTokens.reduce(
        (n, t) => (hay.includes(t) ? n + 1 : n),
        0,
      );
      const dist =
        e.lat != null && e.lng != null
          ? haversineKm(profile.lat, profile.lng, e.lat, e.lng)
          : profile.radiusKm;
      return hits * 100 - dist;
    };
    return score(b) - score(a);
  });

  console.log(
    `[ingest/llm] merged raw=${mergedRaw.length} candidates=${candidates.length} unique-in-radius=${unique.length} (radius=${profile.radiusKm}km)`,
  );

  return unique.slice(0, 80);
}
