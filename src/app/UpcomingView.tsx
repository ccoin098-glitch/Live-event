"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryFilters } from "@/components/CategoryFilters";
import { EventDayGroups, type EventListItemData } from "@/components/EventListItem";
import { CelebrationBanner } from "@/components/CelebrationBanner";
import { GoingReminders, type GoingEventItem } from "@/components/GoingReminders";
import {
  CitySwitcher,
  type PlaceOption,
} from "@/components/CitySwitcher";
import type { EventsPayload } from "@/lib/data/events";

type EventsResponse = {
  profile: {
    cityOrAddress: string;
    radiusKm: number;
  } | null;
  places: PlaceOption[];
  activePlaceId: string | null;
  events: EventListItemData[];
  goingEvents: GoingEventItem[];
  todayCelebration: { date: string; name: string; type: string } | null;
};

type DiscoverDetail = {
  ok: boolean;
  message?: string;
  eventsFound?: number;
};

function toClientPayload(data: EventsPayload): EventsResponse {
  return {
    profile: data.profile
      ? {
          cityOrAddress: data.profile.cityOrAddress,
          radiusKm: data.profile.radiusKm,
        }
      : null,
    places: data.places,
    activePlaceId: data.activePlaceId,
    events: data.events as EventListItemData[],
    goingEvents: data.goingEvents as GoingEventItem[],
    todayCelebration: data.todayCelebration,
  };
}

export function UpcomingView({ initialData }: { initialData: EventsPayload }) {
  const [data, setData] = useState<EventsResponse>(() =>
    toClientPayload(initialData),
  );
  const [category, setCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [placeId, setPlaceId] = useState<string | null>(
    () => initialData.activePlaceId,
  );
  const placeIdRef = useRef(placeId);
  const fetchGen = useRef(0);
  const skipClientFetch = useRef(true);
  const initialDataRef = useRef(initialData);

  placeIdRef.current = placeId;

  useEffect(() => {
    // Ignore stale RSC refreshes that still report the previous city.
    if (initialData === initialDataRef.current) return;
    initialDataRef.current = initialData;
    const next = toClientPayload(initialData);
    if (placeIdRef.current && next.activePlaceId !== placeIdRef.current) {
      return;
    }
    setData(next);
    if (next.activePlaceId) setPlaceId(next.activePlaceId);
  }, [initialData]);

  useEffect(() => {
    if (skipClientFetch.current && category === null && reloadToken === 0) {
      skipClientFetch.current = false;
      return;
    }
    skipClientFetch.current = false;

    const gen = ++fetchGen.current;
    const controller = new AbortController();

    async function load() {
      setRefreshing(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        const active = placeIdRef.current;
        if (active) params.set("placeId", active);
        const qs = params.toString();
        const res = await fetch(`/api/events${qs ? `?${qs}` : ""}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load events");
        const json = (await res.json()) as EventsResponse;
        if (gen !== fetchGen.current) return;
        // Drop responses that don't match the city we asked for.
        if (
          active &&
          json.activePlaceId &&
          json.activePlaceId !== active
        ) {
          return;
        }
        setData(json);
        if (json.activePlaceId) setPlaceId(json.activePlaceId);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (gen !== fetchGen.current) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (gen === fetchGen.current) setRefreshing(false);
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, [category, reloadToken]);

  useEffect(() => {
    function onDiscover(e: Event) {
      const detail = (e as CustomEvent<DiscoverDetail>).detail;
      if (detail?.ok) setReloadToken((n) => n + 1);
    }
    window.addEventListener("lockal:discover", onDiscover);
    return () => window.removeEventListener("lockal:discover", onDiscover);
  }, []);

  function onPlaceChanged(nextId?: string | null) {
    if (nextId !== undefined) {
      setPlaceId(nextId);
      placeIdRef.current = nextId;
      setData((prev) => ({
        ...prev,
        activePlaceId: nextId,
        // Clear events immediately so we don't flash the previous city's list.
        events: nextId === prev.activePlaceId ? prev.events : [],
      }));
    }
    skipClientFetch.current = false;
    setReloadToken((n) => n + 1);
  }

  const places = data.places ?? [];
  const active =
    places.find((p) => p.id === (placeId ?? data.activePlaceId)) ??
    places[0] ??
    null;
  const cityShort = active?.label ?? "";
  const goingEvents = data.goingEvents ?? [];

  return (
    <main className="space-y-6">
      <header className="animate-fade-up">
        <div className="flex items-center justify-between gap-3">
          <CitySwitcher
            places={places}
            activePlaceId={placeId ?? data.activePlaceId ?? null}
            onChanged={onPlaceChanged}
          />
          {active ? (
            <p className="shrink-0 self-center text-xs leading-none text-[var(--muted)]">
              within {active.radiusKm} km
            </p>
          ) : null}
        </div>
      </header>

      {data.todayCelebration ? (
        <CelebrationBanner name={data.todayCelebration.name} />
      ) : null}

      <GoingReminders events={goingEvents} />

      <CategoryFilters active={category} onChange={setCategory} />

      <section className={refreshing ? "opacity-70 transition-opacity" : ""}>
        {error && (
          <div className="surface rounded-3xl px-4 py-8 text-center text-sm text-red-500">
            {error}
          </div>
        )}
        {!error && places.length === 0 && (
          <div className="surface rounded-3xl px-4 py-8 text-center text-sm text-[var(--muted)]">
            Add a city on Location, then tap the search icon in the nav to find
            events.
          </div>
        )}
        {!error && places.length > 0 && data.events.length === 0 && (
          <div className="surface rounded-3xl px-4 py-8 text-center text-sm text-[var(--muted)]">
            No events for {cityShort} yet. Tap the search icon on the right of
            the nav.
          </div>
        )}
        {!error && data.events.length > 0 && (
          <EventDayGroups events={data.events} />
        )}
      </section>
    </main>
  );
}
