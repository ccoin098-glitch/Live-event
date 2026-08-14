import {
  addDays,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subHours,
} from "date-fns";
import {
  ensureProfile,
  getActivePlace,
  getEventById,
  getPlaceById,
  listEvents,
  listPlaces,
  markEventViewed,
} from "@/lib/db";
import { rankEvents } from "@/lib/rank";
import { dedupeEvents } from "@/lib/dedupe";
import { filterActiveEvents } from "@/lib/event-time";
import {
  celebrationsForDate,
  celebrationsInRange,
  primaryCelebrationName,
} from "@/lib/celebrations";

export type EventsQuery = {
  day?: string | null;
  category?: string | null;
  month?: string | null;
  placeId?: string | null;
};

export async function getEventsPayload(query: EventsQuery = {}) {
  const { day, category, month, placeId: placeIdParam } = query;

  const [profile, places] = await Promise.all([
    ensureProfile(),
    listPlaces(),
  ]);

  let activePlace = placeIdParam
    ? await getPlaceById(placeIdParam)
    : await getActivePlace();

  if (!activePlace && places[0]) activePlace = places[0];

  const countryCode = activePlace?.countryCode || "NL";
  const now = new Date();

  let celebrationFrom = startOfDay(now);
  let celebrationTo = addDays(startOfDay(now), 60);
  let startsAtGte: Date | undefined = subHours(now, 36);
  let startsAtLt: Date | undefined;

  if (day) {
    const start = new Date(`${day}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    startsAtGte = start;
    startsAtLt = end;
    celebrationFrom = startOfDay(start);
    celebrationTo = startOfDay(start);
  } else if (month) {
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    startsAtGte = start;
    startsAtLt = end;
    celebrationFrom = startOfMonth(start);
    celebrationTo = endOfMonth(start);
  }

  const events = activePlace
    ? await listEvents({
        placeId: activePlace.id,
        startsAtGte,
        startsAtLt,
        category: category ?? undefined,
        limit: 200,
      })
    : [];

  const active = filterActiveEvents(dedupeEvents(events), now);

  const ranked = rankEvents(active, {
    preferencesText: profile.preferencesText,
    preferenceTags: profile.preferenceTags,
    radiusKm: activePlace?.radiusKm ?? 25,
  });

  const placeLabelById = new Map(places.map((p) => [p.id, p.label]));

  const goingStartsAtGte =
    month || day ? startsAtGte ?? subHours(now, 36) : subHours(now, 36);

  const goingEvents = filterActiveEvents(
    dedupeEvents(
      await listEvents({
        startsAtGte: goingStartsAtGte,
        startsAtLt: month || day ? startsAtLt : undefined,
        isGoing: true,
        limit: 100,
      }),
    ),
    now,
  ).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const dayCounts: Record<
    string,
    {
      date: string;
      count: number;
      categories: string[];
      celebration: string | null;
      hasGoing: boolean;
    }
  > = {};

  const monthCelebrations = celebrationsInRange(
    celebrationFrom,
    celebrationTo,
    countryCode,
  );

  for (const c of monthCelebrations) {
    if (!dayCounts[c.date]) {
      dayCounts[c.date] = {
        date: c.date,
        count: 0,
        categories: [],
        celebration: c.name,
        hasGoing: false,
      };
    } else if (!dayCounts[c.date].celebration) {
      dayCounts[c.date].celebration = c.name;
    }
  }

  for (const e of ranked) {
    const key = e.startsAt.toISOString().slice(0, 10);
    if (!dayCounts[key]) {
      dayCounts[key] = {
        date: key,
        count: 0,
        categories: [],
        celebration: primaryCelebrationName(
          celebrationsForDate(e.startsAt, countryCode),
        ),
        hasGoing: false,
      };
    }
    dayCounts[key].count += 1;
    if (!dayCounts[key].categories.includes(e.category)) {
      dayCounts[key].categories.push(e.category);
    }
    if (e.isGoing) dayCounts[key].hasGoing = true;
  }

  for (const e of goingEvents) {
    const key = e.startsAt.toISOString().slice(0, 10);
    if (!dayCounts[key]) {
      dayCounts[key] = {
        date: key,
        count: 0,
        categories: [],
        celebration: primaryCelebrationName(
          celebrationsForDate(e.startsAt, countryCode),
        ),
        hasGoing: true,
      };
    } else {
      dayCounts[key].hasGoing = true;
    }
  }

  const todayKey = format(startOfDay(now), "yyyy-MM-dd");
  const todayCelebrations = celebrationsForDate(now, countryCode);

  return {
    profile: activePlace
      ? {
          cityOrAddress: activePlace.cityOrAddress,
          lat: activePlace.lat,
          lng: activePlace.lng,
          radiusKm: activePlace.radiusKm,
          countryCode,
          preferenceTags: profile.preferenceTags,
        }
      : null,
    places,
    activePlaceId: activePlace?.id ?? null,
    activePlace,
    events: ranked.map((e) => {
      const key = e.startsAt.toISOString().slice(0, 10);
      return {
        ...e,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt?.toISOString() ?? null,
        isGoing: e.isGoing,
        isViewed: e.isViewed,
        celebration: dayCounts[key]?.celebration ?? null,
      };
    }),
    goingEvents: goingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      venue: e.venue,
      distanceKm: e.distanceKm,
      startsAt: e.startsAt.toISOString(),
      sourceUrl: e.sourceUrl,
      isGoing: true as const,
      isViewed: e.isViewed,
      placeId: e.placeId,
      placeLabel: placeLabelById.get(e.placeId) ?? null,
    })),
    dayCounts: Object.values(dayCounts),
    celebrations: monthCelebrations,
    todayCelebration: todayCelebrations[0]
      ? {
          date: todayKey,
          name: todayCelebrations[0].name,
          type: todayCelebrations[0].type,
        }
      : null,
  };
}

export type EventsPayload = Awaited<ReturnType<typeof getEventsPayload>>;

export function serializeEvent(event: NonNullable<Awaited<ReturnType<typeof getEventById>>>) {
  return {
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

export async function getEventDetailPayload(id: string) {
  const event = await getEventById(id);
  if (!event) return null;
  const viewed = event.isViewed ? event : await markEventViewed(id);
  const place = await getPlaceById(viewed.placeId);
  return {
    event: serializeEvent(viewed),
    placeCity: place?.cityOrAddress ?? place?.label ?? null,
  };
}

export type EventDetailPayload = NonNullable<
  Awaited<ReturnType<typeof getEventDetailPayload>>
>;
