import Holidays from "date-holidays";
import { format, isWithinInterval, parseISO, startOfDay } from "date-fns";

export type Celebration = {
  date: string; // yyyy-MM-dd
  name: string;
  type: string;
};

function createCalendar(countryCode?: string | null): Holidays {
  const code = (countryCode || "NL").toUpperCase().slice(0, 2);
  try {
    return new Holidays(code);
  } catch {
    return new Holidays("NL");
  }
}

function toDateKey(value: string | Date): string {
  if (typeof value === "string") {
    // date-holidays returns "YYYY-MM-DD HH:mm:ss"
    return value.slice(0, 10);
  }
  return format(startOfDay(value), "yyyy-MM-dd");
}

function normalizeHoliday(
  holiday: { date: string; name: string; type: string },
): Celebration {
  return {
    date: toDateKey(holiday.date),
    name: holiday.name,
    type: holiday.type,
  };
}

function isCelebrationType(type: string): boolean {
  return (
    type === "public" ||
    type === "bank" ||
    type === "observance" ||
    type === "optional" ||
    type === "school"
  );
}

export function celebrationsForDate(
  date: Date,
  countryCode?: string | null,
): Celebration[] {
  const hd = createCalendar(countryCode);
  const found = hd.isHoliday(date);
  if (!found) return [];

  const list = Array.isArray(found) ? found : [found];
  return list.filter((h) => isCelebrationType(h.type)).map(normalizeHoliday);
}

export function celebrationsInRange(
  from: Date,
  to: Date,
  countryCode?: string | null,
): Celebration[] {
  const hd = createCalendar(countryCode);
  const years = new Set<number>([from.getFullYear(), to.getFullYear()]);
  const interval = { start: startOfDay(from), end: startOfDay(to) };
  const out: Celebration[] = [];
  const seen = new Set<string>();

  for (const year of years) {
    for (const holiday of hd.getHolidays(year)) {
      if (!isCelebrationType(holiday.type)) continue;
      const celebration = normalizeHoliday(holiday);
      const day = parseISO(celebration.date);
      if (!isWithinInterval(day, interval)) continue;
      const id = `${celebration.date}:${celebration.name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(celebration);
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function primaryCelebrationName(
  celebrations: Celebration[],
): string | null {
  return celebrations[0]?.name ?? null;
}
