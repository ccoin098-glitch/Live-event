import {
  ensureProfile,
  getActivePlace,
  listEvents,
  listPlaces,
} from "@/lib/db";
import { isEventOver } from "@/lib/event-time";

export const PRESET_TAGS = ["Music", "Food", "Sports", "Arts"] as const;

function serializeAttended(
  event: Awaited<ReturnType<typeof listEvents>>[number],
  placeLabel: string | null,
) {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    venue: event.venue,
    distanceKm: event.distanceKm,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    sourceUrl: event.sourceUrl,
    isGoing: event.isGoing,
    isViewed: event.isViewed,
    placeId: event.placeId,
    placeLabel,
  };
}

export async function getProfilePayload() {
  const [profile, places, activePlace, goingEvents] = await Promise.all([
    ensureProfile(),
    listPlaces(),
    getActivePlace(),
    listEvents({ isGoing: true, order: "desc", limit: 150 }),
  ]);

  const placeLabel = new Map(places.map((p) => [p.id, p.label]));
  const now = new Date();

  const upcomingGoing = goingEvents
    .filter((e) => !isEventOver(e, now))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .map((e) => serializeAttended(e, placeLabel.get(e.placeId) ?? null));

  const attendedHistory = goingEvents
    .filter((e) => isEventOver(e, now))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((e) => serializeAttended(e, placeLabel.get(e.placeId) ?? null));

  return {
    profile: {
      ...profile,
      cityOrAddress: activePlace?.cityOrAddress ?? "",
      lat: activePlace?.lat ?? null,
      lng: activePlace?.lng ?? null,
      radiusKm: activePlace?.radiusKm ?? 25,
      countryCode: activePlace?.countryCode ?? "NL",
    },
    places,
    activePlace,
    presetTags: PRESET_TAGS,
    upcomingGoing,
    attendedHistory,
  };
}

export type ProfilePayload = Awaited<ReturnType<typeof getProfilePayload>>;
