export type RankableEvent = {
  title: string;
  description: string;
  category: string;
  distanceKm: number | null;
  startsAt: Date;
};

export type RankProfile = {
  preferencesText: string;
  preferenceTags: string[];
  radiusKm: number;
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export function preferenceScore(event: RankableEvent, profile: RankProfile): number {
  const tags = profile.preferenceTags.map((t) => t.toLowerCase());
  const prefs = [
    ...tags,
    ...tokenize(profile.preferencesText),
  ];

  if (prefs.length === 0) return 0;

  const haystack = [
    event.title,
    event.description,
    event.category,
  ]
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const p of prefs) {
    if (haystack.includes(p.toLowerCase())) hits += 1;
  }

  // Strong weight for preference matches
  return hits * 100;
}

export function rankEvents<T extends RankableEvent>(
  events: T[],
  profile: RankProfile,
): T[] {
  return [...events]
    .filter((e) => e.distanceKm == null || e.distanceKm <= profile.radiusKm)
    .sort((a, b) => {
      const scoreDiff = preferenceScore(b, profile) - preferenceScore(a, profile);
      if (scoreDiff !== 0) return scoreDiff;

      const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (distA !== distB) return distA - distB;

      return a.startsAt.getTime() - b.startsAt.getTime();
    });
}

export const CATEGORY_FILTERS = [
  { id: "Music", label: "Music", color: "#7C3AED" },
  { id: "Food", label: "Food", color: "#F97316" },
  { id: "Sports", label: "Sports", color: "#22C55E" },
  { id: "Arts", label: "Arts", color: "#3B82F6" },
] as const;
