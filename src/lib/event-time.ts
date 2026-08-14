import { addHours, endOfDay } from "date-fns";

type Timed = {
  startsAt: Date;
  endsAt?: Date | null;
};

/**
 * When an event is considered finished.
 * - Prefer explicit endsAt
 * - Otherwise keep it through the rest of its start day (all-day / unknown duration)
 * - Timed listings without an end get a 3h grace after start so mid-event items stay visible
 */
export function eventEndsAt(event: Timed): Date {
  if (event.endsAt) return event.endsAt;

  const start = event.startsAt;
  const hours = start.getHours();
  const minutes = start.getMinutes();
  // Midnight / early all-day style starts → keep until end of that day
  if (hours === 0 && minutes === 0) return endOfDay(start);
  return addHours(start, 3);
}

export function isEventOver(event: Timed, now = new Date()): boolean {
  return eventEndsAt(event).getTime() < now.getTime();
}

export function filterActiveEvents<T extends Timed>(
  events: T[],
  now = new Date(),
): T[] {
  return events.filter((e) => !isEventOver(e, now));
}
