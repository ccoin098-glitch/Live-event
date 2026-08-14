import { createServiceClient } from "@/utils/supabase/service";
import { createId } from "@/lib/id";
import { prisma } from "@/lib/prisma";
import { parseTags, stringifyTags } from "@/lib/json";

export type AppPlace = {
  id: string;
  label: string;
  cityOrAddress: string;
  lat: number;
  lng: number;
  countryCode: string;
  radiusKm: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AppProfile = {
  id: string;
  activePlaceId: string | null;
  preferencesText: string;
  preferenceTags: string[];
  createdAt: string;
  updatedAt: string;
};

export type AppEvent = {
  id: string;
  placeId: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  startsAt: Date;
  endsAt: Date | null;
  source: string;
  sourceUrl: string | null;
  externalId: string | null;
  imageUrl: string | null;
  rawPayload: unknown;
  isGoing: boolean;
  isViewed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type DbPlace = {
  id: string;
  label: string;
  city_or_address: string;
  lat: number;
  lng: number;
  country_code: string;
  radius_km: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
};

type DbProfile = {
  id: string;
  active_place_id: string | null;
  preferences_text: string;
  preference_tags: string[] | string;
  created_at: string;
  updated_at: string;
};

type DbEvent = {
  id: string;
  place_id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  starts_at: string;
  ends_at: string | null;
  source: string;
  source_url: string | null;
  external_id: string | null;
  image_url: string | null;
  raw_payload: unknown;
  is_going: boolean;
  is_viewed?: boolean;
  created_at: string;
  updated_at: string;
};

function tagsFromDb(value: DbProfile["preference_tags"]): string[] {
  if (Array.isArray(value)) return value.filter((t) => typeof t === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((t): t is string => typeof t === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapPlace(row: DbPlace): AppPlace {
  return {
    id: row.id,
    label: row.label,
    cityOrAddress: row.city_or_address,
    lat: row.lat,
    lng: row.lng,
    countryCode: row.country_code || "NL",
    radiusKm: row.radius_km,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfile(row: DbProfile): AppProfile {
  return {
    id: row.id,
    activePlaceId: row.active_place_id,
    preferencesText: row.preferences_text,
    preferenceTags: tagsFromDb(row.preference_tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row: DbEvent): AppEvent {
  return {
    id: row.id,
    placeId: row.place_id,
    title: row.title,
    description: row.description,
    category: row.category,
    venue: row.venue,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    distanceKm: row.distance_km,
    startsAt: new Date(row.starts_at),
    endsAt: row.ends_at ? new Date(row.ends_at) : null,
    source: row.source,
    sourceUrl: row.source_url,
    externalId: row.external_id,
    imageUrl: row.image_url,
    rawPayload: row.raw_payload,
    isGoing: row.is_going,
    isViewed: Boolean(row.is_viewed),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapPrismaPlace(row: {
  id: string;
  label: string;
  cityOrAddress: string;
  lat: number;
  lng: number;
  countryCode: string;
  radiusKm: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): AppPlace {
  return {
    id: row.id,
    label: row.label,
    cityOrAddress: row.cityOrAddress,
    lat: row.lat,
    lng: row.lng,
    countryCode: row.countryCode,
    radiusKm: row.radiusKm,
    lastUsedAt: row.lastUsedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPrismaProfile(row: {
  id: string;
  activePlaceId: string | null;
  preferencesText: string;
  preferenceTags: string;
  createdAt: Date;
  updatedAt: Date;
}): AppProfile {
  return {
    id: row.id,
    activePlaceId: row.activePlaceId,
    preferencesText: row.preferencesText,
    preferenceTags: parseTags(row.preferenceTags),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPrismaEvent(row: {
  id: string;
  placeId: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  startsAt: Date;
  endsAt: Date | null;
  source: string;
  sourceUrl: string | null;
  externalId: string | null;
  imageUrl: string | null;
  rawPayload: string | null;
  isGoing: boolean;
  isViewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AppEvent {
  return {
    id: row.id,
    placeId: row.placeId,
    title: row.title,
    description: row.description,
    category: row.category,
    venue: row.venue,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    distanceKm: row.distanceKm,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    source: row.source,
    sourceUrl: row.sourceUrl,
    externalId: row.externalId,
    imageUrl: row.imageUrl,
    rawPayload: row.rawPayload,
    isGoing: row.isGoing,
    isViewed: row.isViewed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUnavailable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("could not find the table") ||
    m.includes("relation") ||
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("fetch failed") ||
    m.includes("enotfound") ||
    m.includes("missing next_public_supabase")
  );
}

async function withSupabase<T>(
  run: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isUnavailable(message)) {
      console.warn("[db] Supabase unavailable, using local Prisma fallback:", message);
      return fallback();
    }
    throw err;
  }
}

export function shortCityLabel(cityOrAddress: string): string {
  return cityOrAddress.split(",")[0]?.trim() || cityOrAddress;
}

export async function ensureProfile(): Promise<AppProfile> {
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("user_profile")
        .upsert({ id: "singleton" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapProfile(data as DbProfile);
    },
    async () => {
      const row = await prisma.userProfile.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      });
      return mapPrismaProfile(row);
    },
  );
}

export async function updatePreferences(input: {
  preferencesText: string;
  preferenceTags: string[];
}): Promise<AppProfile> {
  await ensureProfile();
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("user_profile")
        .update({
          preferences_text: input.preferencesText,
          preference_tags: input.preferenceTags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "singleton")
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapProfile(data as DbProfile);
    },
    async () => {
      const row = await prisma.userProfile.update({
        where: { id: "singleton" },
        data: {
          preferencesText: input.preferencesText,
          preferenceTags: stringifyTags(input.preferenceTags),
        },
      });
      return mapPrismaProfile(row);
    },
  );
}

export async function listPlaces(): Promise<AppPlace[]> {
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .order("last_used_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as DbPlace[]).map(mapPlace);
    },
    async () => {
      const rows = await prisma.place.findMany({
        orderBy: { lastUsedAt: "desc" },
      });
      return rows.map(mapPrismaPlace);
    },
  );
}

export async function getPlaceById(id: string): Promise<AppPlace | null> {
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapPlace(data as DbPlace) : null;
    },
    async () => {
      const row = await prisma.place.findUnique({ where: { id } });
      return row ? mapPrismaPlace(row) : null;
    },
  );
}

export async function getActivePlace(): Promise<AppPlace | null> {
  const profile = await ensureProfile();
  if (profile.activePlaceId) {
    const place = await getPlaceById(profile.activePlaceId);
    if (place) return place;
  }
  const places = await listPlaces();
  return places[0] ?? null;
}

export async function upsertPlace(input: {
  cityOrAddress: string;
  lat: number;
  lng: number;
  countryCode: string;
  radiusKm: number;
  makeActive?: boolean;
}): Promise<AppPlace> {
  const label = shortCityLabel(input.cityOrAddress);
  const now = new Date().toISOString();

  const place = await withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data: existing, error: findError } = await supabase
        .from("places")
        .select("*")
        .ilike("label", label)
        .limit(1)
        .maybeSingle();
      if (findError) throw new Error(findError.message);

      if (existing) {
        const { data, error } = await supabase
          .from("places")
          .update({
            city_or_address: input.cityOrAddress,
            lat: input.lat,
            lng: input.lng,
            country_code: input.countryCode,
            radius_km: input.radiusKm,
            last_used_at: now,
            updated_at: now,
          })
          .eq("id", (existing as DbPlace).id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return mapPlace(data as DbPlace);
      }

      const id = createId();
      const { data, error } = await supabase
        .from("places")
        .insert({
          id,
          label,
          city_or_address: input.cityOrAddress,
          lat: input.lat,
          lng: input.lng,
          country_code: input.countryCode,
          radius_km: input.radiusKm,
          last_used_at: now,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapPlace(data as DbPlace);
    },
    async () => {
      const existing = await prisma.place.findFirst({
        where: { label: { equals: label } },
      });
      if (existing) {
        const row = await prisma.place.update({
          where: { id: existing.id },
          data: {
            cityOrAddress: input.cityOrAddress,
            lat: input.lat,
            lng: input.lng,
            countryCode: input.countryCode,
            radiusKm: input.radiusKm,
            lastUsedAt: new Date(),
          },
        });
        return mapPrismaPlace(row);
      }
      const row = await prisma.place.create({
        data: {
          label,
          cityOrAddress: input.cityOrAddress,
          lat: input.lat,
          lng: input.lng,
          countryCode: input.countryCode,
          radiusKm: input.radiusKm,
        },
      });
      return mapPrismaPlace(row);
    },
  );

  if (input.makeActive !== false) {
    await setActivePlace(place.id);
  }
  return place;
}

export async function setActivePlace(placeId: string): Promise<AppPlace> {
  const place = await getPlaceById(placeId);
  if (!place) throw new Error("Place not found");

  await ensureProfile();
  await withSupabase(
    async () => {
      const supabase = createServiceClient();
      const now = new Date().toISOString();
      const { error: placeError } = await supabase
        .from("places")
        .update({ last_used_at: now, updated_at: now })
        .eq("id", placeId);
      if (placeError) throw new Error(placeError.message);

      const { error } = await supabase
        .from("user_profile")
        .update({
          active_place_id: placeId,
          updated_at: now,
        })
        .eq("id", "singleton");
      if (error) throw new Error(error.message);
    },
    async () => {
      await prisma.place.update({
        where: { id: placeId },
        data: { lastUsedAt: new Date() },
      });
      await prisma.userProfile.update({
        where: { id: "singleton" },
        data: { activePlaceId: placeId },
      });
    },
  );

  return (await getPlaceById(placeId))!;
}

export async function deletePlace(placeId: string): Promise<void> {
  const profile = await ensureProfile();
  await withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { error } = await supabase.from("places").delete().eq("id", placeId);
      if (error) throw new Error(error.message);

      if (profile.activePlaceId === placeId) {
        const { data: next } = await supabase
          .from("places")
          .select("id")
          .order("last_used_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        await supabase
          .from("user_profile")
          .update({
            active_place_id: next?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", "singleton");
      }
    },
    async () => {
      await prisma.event.deleteMany({ where: { placeId } });
      await prisma.place.delete({ where: { id: placeId } });
      if (profile.activePlaceId === placeId) {
        const next = await prisma.place.findFirst({
          orderBy: { lastUsedAt: "desc" },
        });
        await prisma.userProfile.update({
          where: { id: "singleton" },
          data: { activePlaceId: next?.id ?? null },
        });
      }
    },
  );
}

export async function listEvents(filters: {
  placeId?: string | null;
  startsAtGte?: Date;
  startsAtLt?: Date;
  category?: string | null;
  isGoing?: boolean;
  limit?: number;
  order?: "asc" | "desc";
}): Promise<AppEvent[]> {
  const ascending = filters.order !== "desc";
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      let query = supabase.from("events").select("*").order("starts_at", {
        ascending,
      });
      if (filters.placeId) query = query.eq("place_id", filters.placeId);
      if (filters.startsAtGte)
        query = query.gte("starts_at", filters.startsAtGte.toISOString());
      if (filters.startsAtLt)
        query = query.lt("starts_at", filters.startsAtLt.toISOString());
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.isGoing != null) query = query.eq("is_going", filters.isGoing);
      const { data, error } = await query.limit(filters.limit ?? 200);
      if (error) throw new Error(error.message);
      return (data as DbEvent[]).map(mapEvent);
    },
    async () => {
      const rows = await prisma.event.findMany({
        where: {
          placeId: filters.placeId ?? undefined,
          startsAt: {
            gte: filters.startsAtGte,
            lt: filters.startsAtLt,
          },
          category: filters.category ?? undefined,
          isGoing: filters.isGoing,
        },
        orderBy: { startsAt: ascending ? "asc" : "desc" },
        take: filters.limit ?? 200,
      });
      return rows.map(mapPrismaEvent);
    },
  );
}

export async function getEventById(id: string): Promise<AppEvent | null> {
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? mapEvent(data as DbEvent) : null;
    },
    async () => {
      const row = await prisma.event.findUnique({ where: { id } });
      return row ? mapPrismaEvent(row) : null;
    },
  );
}

export async function setEventGoing(
  id: string,
  isGoing: boolean,
): Promise<AppEvent> {
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("events")
        .update({ is_going: isGoing, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapEvent(data as DbEvent);
    },
    async () => {
      const row = await prisma.event.update({
        where: { id },
        data: { isGoing },
      });
      return mapPrismaEvent(row);
    },
  );
}

export async function markEventViewed(id: string): Promise<AppEvent> {
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("events")
        .update({ is_viewed: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return mapEvent(data as DbEvent);
    },
    async () => {
      const row = await prisma.event.update({
        where: { id },
        data: { isViewed: true },
      });
      return mapPrismaEvent(row);
    },
  );
}

export async function upsertDiscoveredEventRow(input: {
  placeId: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  startsAt: Date;
  endsAt: Date | null;
  source: string;
  sourceUrl: string | null;
  externalId: string;
  imageUrl: string | null;
  rawPayload?: unknown;
}): Promise<void> {
  await withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { data: existing, error: findError } = await supabase
        .from("events")
        .select("id")
        .eq("place_id", input.placeId)
        .eq("source", input.source)
        .eq("external_id", input.externalId)
        .maybeSingle();
      if (findError) throw new Error(findError.message);

      const payload = {
        place_id: input.placeId,
        title: input.title,
        description: input.description,
        category: input.category,
        venue: input.venue,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        distance_km: input.distanceKm,
        starts_at: input.startsAt.toISOString(),
        ends_at: input.endsAt?.toISOString() ?? null,
        source: input.source,
        source_url: input.sourceUrl,
        external_id: input.externalId,
        image_url: input.imageUrl,
        raw_payload: input.rawPayload ?? null,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase.from("events").insert({
        id: createId(),
        ...payload,
        is_going: false,
        is_viewed: false,
      });
      if (error) throw new Error(error.message);
    },
    async () => {
      await prisma.event.upsert({
        where: {
          placeId_source_externalId: {
            placeId: input.placeId,
            source: input.source,
            externalId: input.externalId,
          },
        },
        create: {
          placeId: input.placeId,
          title: input.title,
          description: input.description,
          category: input.category,
          venue: input.venue,
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          distanceKm: input.distanceKm,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          source: input.source,
          sourceUrl: input.sourceUrl,
          externalId: input.externalId,
          imageUrl: input.imageUrl,
          rawPayload: input.rawPayload
            ? JSON.stringify(input.rawPayload)
            : null,
          isGoing: false,
          isViewed: false,
        },
        update: {
          title: input.title,
          description: input.description,
          category: input.category,
          venue: input.venue,
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          distanceKm: input.distanceKm,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          sourceUrl: input.sourceUrl,
          imageUrl: input.imageUrl,
          rawPayload: input.rawPayload
            ? JSON.stringify(input.rawPayload)
            : null,
        },
      });
    },
  );
}

export async function createIngestRun(): Promise<string> {
  return withSupabase(
    async () => {
      const supabase = createServiceClient();
      const id = createId();
      const { error } = await supabase.from("ingest_runs").insert({
        id,
        status: "running",
      });
      if (error) throw new Error(error.message);
      return id;
    },
    async () => {
      const row = await prisma.ingestRun.create({ data: { status: "running" } });
      return row.id;
    },
  );
}

export async function finishIngestRun(
  id: string,
  input: {
    status: string;
    eventsFound?: number;
    error?: string | null;
  },
): Promise<void> {
  await withSupabase(
    async () => {
      const supabase = createServiceClient();
      const { error } = await supabase
        .from("ingest_runs")
        .update({
          status: input.status,
          events_found: input.eventsFound ?? 0,
          error: input.error ?? null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    async () => {
      await prisma.ingestRun.update({
        where: { id },
        data: {
          status: input.status,
          eventsFound: input.eventsFound ?? 0,
          error: input.error ?? null,
          finishedAt: new Date(),
        },
      });
    },
  );
}
