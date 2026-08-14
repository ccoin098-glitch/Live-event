import type { EventsPayload } from "@/lib/data/events";
import type { ProfilePayload } from "@/lib/data/profile";

/** In-memory cache so bottom-nav tab switches can render instantly. */
export const tabCache = {
  upcoming: null as EventsPayload | null,
  agenda: null as { monthKey: string; data: EventsPayload } | null,
  location: null as ProfilePayload | null,
};

export function cacheUpcoming(data: EventsPayload) {
  tabCache.upcoming = data;
}

export function cacheAgenda(monthKey: string, data: EventsPayload) {
  tabCache.agenda = { monthKey, data };
}

export function cacheLocation(data: ProfilePayload) {
  tabCache.location = data;
}
