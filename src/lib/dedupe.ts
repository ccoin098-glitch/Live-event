import { format, isSameDay } from "date-fns";

export type DedupeableEvent = {
  title: string;
  description?: string | null;
  venue?: string | null;
  address?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  distanceKm?: number | null;
};

/** Collapse title noise so near-identical listings match. */
export function normalizeEventTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|at|in|of|for|and|official)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function startHourBucket(date: Date): string {
  // Same calendar day + same hour ≈ same showing.
  // Different days stay separate (multi-day festivals / series).
  return format(date, "yyyy-MM-dd-HH");
}

/**
 * True when two rows are the same showing:
 * - same normalized title
 * - same calendar day
 * - start times within `windowMinutes` (default 90)
 *
 * Different days never match — multi-day events stay.
 */
export function isSameShowing(
  a: Pick<DedupeableEvent, "title" | "startsAt">,
  b: Pick<DedupeableEvent, "title" | "startsAt">,
  windowMinutes = 90,
): boolean {
  if (normalizeEventTitle(a.title) !== normalizeEventTitle(b.title)) {
    return false;
  }
  if (!isSameDay(a.startsAt, b.startsAt)) {
    return false;
  }
  const diffMs = Math.abs(a.startsAt.getTime() - b.startsAt.getTime());
  return diffMs <= windowMinutes * 60_000;
}

function richness(event: DedupeableEvent): number {
  let score = 0;
  if (event.sourceUrl) score += 4;
  if (event.imageUrl) score += 2;
  if ((event.description ?? "").trim().length > 40) score += 2;
  else if ((event.description ?? "").trim().length > 0) score += 1;
  if ((event.venue ?? "").trim().length > 0) score += 1;
  if ((event.address ?? "").trim().length > 0) score += 1;
  // Prefer a real distance over a pinned 0 when both exist
  if (event.distanceKm != null && event.distanceKm > 0) score += 1;
  // Slightly prefer longer venue names (more specific)
  score += Math.min(2, Math.floor((event.venue ?? "").length / 20));
  return score;
}

/**
 * Drop true duplicate showings. Keeps the richest listing in each group.
 * Events on different days with the same title are kept.
 */
export function dedupeEvents<T extends DedupeableEvent>(events: T[]): T[] {
  const kept: T[] = [];

  for (const event of events) {
    const idx = kept.findIndex((other) => isSameShowing(event, other));
    if (idx < 0) {
      kept.push(event);
      continue;
    }

    const existing = kept[idx];
    if (richness(event) > richness(existing)) {
      kept[idx] = event;
    }
  }

  return kept;
}

/** Stable key for ingest upserts — ignores minor venue wording differences. */
export function showingExternalKey(title: string, startsAt: Date): string {
  return `${normalizeEventTitle(title)}|${startHourBucket(startsAt)}`;
}
