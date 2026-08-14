"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, startOfMonth } from "date-fns";
import type { EventsPayload } from "@/lib/data/events";
import type { ProfilePayload } from "@/lib/data/profile";
import { cacheAgenda, cacheLocation, cacheUpcoming } from "@/lib/tab-cache";

const tabs = [
  { href: "/", label: "Upcoming", icon: HomeIcon },
  { href: "/agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/location", label: "Location", icon: LocationIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const tab of tabs) {
      router.prefetch(tab.href);
    }

    const monthKey = format(startOfMonth(new Date()), "yyyy-MM");
    let cancelled = false;

    async function warm() {
      try {
        const [upcomingRes, agendaRes, locationRes] = await Promise.all([
          fetch("/api/events"),
          fetch(`/api/events?month=${monthKey}`),
          fetch("/api/profile"),
        ]);
        if (cancelled) return;
        if (upcomingRes.ok) {
          cacheUpcoming((await upcomingRes.json()) as EventsPayload);
        }
        if (agendaRes.ok) {
          cacheAgenda(monthKey, (await agendaRes.json()) as EventsPayload);
        }
        if (locationRes.ok) {
          cacheLocation((await locationRes.json()) as ProfilePayload);
        }
      } catch {
        /* ignore prefetch errors */
      }
    }

    void warm();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="nav-island pointer-events-auto flex w-auto max-w-[calc(100vw-1.5rem)] items-center justify-center gap-0.5 rounded-full px-1.5 py-1.5 sm:gap-1 sm:px-2">
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              aria-label={tab.label}
              className={`flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-medium transition-all duration-200 sm:gap-2 sm:px-3.5 ${
                active
                  ? "bg-[var(--ink)] !text-white shadow-sm"
                  : "text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--ink)]"
              }`}
              style={active ? { color: "#ffffff" } : undefined}
            >
              <Icon active={active} />
              <span
                className={`hidden min-[480px]:inline ${
                  active ? "text-white" : ""
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        <div
          className="mx-0.5 h-6 w-px shrink-0 bg-black/10 sm:mx-1"
          aria-hidden
        />

        <DiscoverNavButton />
      </div>
    </nav>
  );
}

function DiscoverNavButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function notify(ok: boolean, message: string) {
    window.dispatchEvent(
      new CustomEvent("lockal:discover", {
        detail: { ok, message },
      }),
    );
  }

  async function runDiscover() {
    if (loading) return;
    setLoading(true);
    try {
      const placesRes = await fetch("/api/places");
      const placesJson = (await placesRes.json()) as {
        places?: Array<{ id: string }>;
        activePlaceId?: string | null;
        activePlace?: { id: string } | null;
      };

      const hasPlace =
        Boolean(placesJson.activePlace?.id || placesJson.activePlaceId) ||
        (placesJson.places?.length ?? 0) > 0;

      if (!hasPlace) {
        notify(
          false,
          "Select a location first — add a city on Location before searching for events.",
        );
        return;
      }

      const res = await fetch("/api/discover", { method: "POST" });
      const json = (await res.json()) as {
        status: string;
        eventsFound?: number;
        error?: string;
      };

      if (!res.ok || json.status === "skipped") {
        notify(
          false,
          json.error ||
            "Select a location first — add a city on Location before searching.",
        );
        return;
      }

      if (json.status === "failed") {
        notify(false, json.error || "Discover failed");
        return;
      }

      notify(true, `Found ${json.eventsFound ?? 0} events.`);
      router.refresh();
    } catch (e) {
      notify(false, e instanceof Error ? e.message : "Discover failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void runDiscover()}
      disabled={loading}
      aria-label={loading ? "Searching for events" : "Find events near me"}
      title={
        loading
          ? "Deep search running — this can take a minute…"
          : "Find events near me"
      }
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-black/[0.06] disabled:opacity-80 sm:h-11 sm:w-11"
    >
      <SearchRadarIcon spinning={loading} />
    </button>
  );
}

function SearchRadarIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={spinning ? "animate-discover-spin" : undefined}
    >
      <circle
        cx="12"
        cy="12"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="4.25"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <path
        d="M12 12V5.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? "#ffffff" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeWidth={active ? "2" : "1.7"}
        strokeLinejoin="round"
        fill={active ? color : "none"}
        fillOpacity={active ? 0.2 : 0}
      />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = active ? "#ffffff" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2.5"
        stroke={color}
        strokeWidth={active ? "2" : "1.7"}
        fill={active ? color : "none"}
        fillOpacity={active ? 0.2 : 0}
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 10h17"
        stroke={color}
        strokeWidth={active ? "2" : "1.7"}
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon({ active }: { active: boolean }) {
  const color = active ? "#ffffff" : "currentColor";
  const w = active ? "2" : "1.7";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s6.5-5.2 6.5-11A6.5 6.5 0 0 0 5.5 10C5.5 15.8 12 21 12 21Z"
        stroke={color}
        strokeWidth={w}
        strokeLinejoin="round"
        fill={active ? color : "none"}
        fillOpacity={active ? 0.2 : 0}
      />
      <circle
        cx="12"
        cy="10"
        r="2.3"
        stroke={color}
        strokeWidth={w}
        fill={active ? color : "none"}
        fillOpacity={active ? 0.35 : 0}
      />
    </svg>
  );
}
