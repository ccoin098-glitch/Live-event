"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { CalendarGrid } from "@/components/CalendarGrid";
import { Timeline } from "@/components/Timeline";
import type { EventListItemData } from "@/components/EventListItem";
import {
  CitySwitcher,
  type PlaceOption,
} from "@/components/CitySwitcher";
import type { EventsPayload } from "@/lib/data/events";
import { cacheAgenda, tabCache } from "@/lib/tab-cache";

type DayCount = {
  date: string;
  count: number;
  categories: string[];
  celebration?: string | null;
  hasGoing?: boolean;
};

type EventsResponse = {
  events: EventListItemData[];
  goingEvents: EventListItemData[];
  dayCounts: DayCount[];
  places: PlaceOption[];
  activePlaceId: string | null;
};

function toClientPayload(data: EventsPayload): EventsResponse {
  return {
    events: data.events as EventListItemData[],
    goingEvents: data.goingEvents as EventListItemData[],
    dayCounts: data.dayCounts,
    places: data.places,
    activePlaceId: data.activePlaceId,
  };
}

export function AgendaView() {
  const nowMonthKey = format(startOfMonth(new Date()), "yyyy-MM");
  const seed =
    tabCache.agenda?.monthKey === nowMonthKey ? tabCache.agenda.data : null;

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [data, setData] = useState<EventsResponse | null>(() =>
    seed ? toClientPayload(seed) : null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [placeId, setPlaceId] = useState<string | null>(
    () => seed?.activePlaceId ?? null,
  );
  const placeIdRef = useRef(placeId);
  const fetchGen = useRef(0);

  placeIdRef.current = placeId;

  const monthKey = format(month, "yyyy-MM");
  const selectedKey = format(selected, "yyyy-MM-dd");

  useEffect(() => {
    const gen = ++fetchGen.current;
    const controller = new AbortController();

    async function load() {
      setRefreshing(true);
      try {
        const params = new URLSearchParams({ month: monthKey });
        const active = placeIdRef.current;
        if (active) params.set("placeId", active);
        const res = await fetch(`/api/events?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as EventsPayload;
        if (gen !== fetchGen.current) return;
        if (
          active &&
          json.activePlaceId &&
          json.activePlaceId !== active
        ) {
          return;
        }
        cacheAgenda(monthKey, json);
        setData(toClientPayload(json));
        if (json.activePlaceId) setPlaceId(json.activePlaceId);
      } catch {
        /* keep stale / aborted */
      } finally {
        if (gen === fetchGen.current) setRefreshing(false);
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, [monthKey, reloadToken]);

  useEffect(() => {
    function onDiscover(e: Event) {
      const detail = (e as CustomEvent<{ ok?: boolean }>).detail;
      if (detail?.ok) setReloadToken((n) => n + 1);
    }
    window.addEventListener("lockal:discover", onDiscover);
    return () => window.removeEventListener("lockal:discover", onDiscover);
  }, []);

  function onPlaceChanged(nextId?: string | null) {
    if (nextId !== undefined) {
      setPlaceId(nextId);
      placeIdRef.current = nextId;
      setData((prev) =>
        prev
          ? {
              ...prev,
              activePlaceId: nextId,
              events: nextId === prev.activePlaceId ? prev.events : [],
              dayCounts: nextId === prev.activePlaceId ? prev.dayCounts : [],
            }
          : prev,
      );
    }
    setReloadToken((n) => n + 1);
  }

  const events = useMemo(() => data?.events ?? [], [data]);
  const goingEvents = useMemo(() => data?.goingEvents ?? [], [data]);
  const places = data?.places ?? [];
  const selectedCelebration = useMemo(() => {
    return (
      data?.dayCounts.find((d) => d.date === selectedKey)?.celebration ?? null
    );
  }, [data, selectedKey]);

  const today = useMemo(() => new Date(), []);
  const todayLabel = format(today, "EEEE d MMMM");

  return (
    <main className="space-y-6">
      <header className="animate-fade-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Agenda</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Today · {todayLabel}
            </p>
          </div>
          <CitySwitcher
            places={places}
            activePlaceId={placeId ?? data?.activePlaceId ?? null}
            onChanged={onPlaceChanged}
          />
        </div>
      </header>

      <CalendarGrid
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={setSelected}
        dayCounts={data?.dayCounts ?? []}
      />

      <div className={refreshing ? "opacity-70 transition-opacity" : ""}>
        {data ? (
          <Timeline
            day={selected}
            events={events}
            goingEvents={goingEvents}
            celebration={selectedCelebration}
          />
        ) : (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            Loading…
          </p>
        )}
      </div>
    </main>
  );
}
