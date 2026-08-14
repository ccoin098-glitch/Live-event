"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  AttendedHistory,
  type AttendedEventItem,
} from "@/components/AttendedHistory";
import { showAppToast } from "@/components/AppToast";
import type { ProfilePayload } from "@/lib/data/profile";
import { cacheLocation, tabCache } from "@/lib/tab-cache";

const PRESETS = ["Music", "Food", "Sports", "Arts"] as const;

export function LocationView() {
  const seed = tabCache.location;
  const [ready, setReady] = useState(Boolean(seed));
  const [cityOrAddress, setCityOrAddress] = useState("");
  const [radiusKm, setRadiusKm] = useState(25);
  const [preferencesText, setPreferencesText] = useState(
    seed?.profile.preferencesText ?? "",
  );
  const [preferenceTags, setPreferenceTags] = useState<string[]>(
    seed?.profile.preferenceTags ?? [],
  );
  const [upcomingGoing, setUpcomingGoing] = useState<AttendedEventItem[]>(
    seed?.upcomingGoing ?? [],
  );
  const [attendedHistory, setAttendedHistory] = useState<AttendedEventItem[]>(
    seed?.attendedHistory ?? [],
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [addingCity, setAddingCity] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profile");
        const json = (await res.json()) as ProfilePayload;
        if (cancelled) return;
        cacheLocation(json);
        if (json.profile) {
          setPreferencesText(json.profile.preferencesText);
          setPreferenceTags(json.profile.preferenceTags ?? []);
        }
        setUpcomingGoing(json.upcomingGoing ?? []);
        setAttendedHistory(json.attendedHistory ?? []);
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  function toggleTag(tag: string) {
    setPreferenceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function onAddCity(e: React.FormEvent) {
    e.preventDefault();
    setAddingCity(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityOrAddress, radiusKm, makeActive: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Could not add city",
        );
      }
      setCityOrAddress("");
      const label = json.place?.label ?? "City";
      showAppToast(`${label} successfully added`);
      setReloadToken((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add city");
      showAppToast(
        err instanceof Error ? err.message : "Could not add city",
        false,
      );
    } finally {
      setAddingCity(false);
    }
  }

  async function onSavePrefs(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrefs(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferencesText, preferenceTags }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Save failed",
        );
      }
      setMessage("Preferences saved. Ranking uses these across all cities.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPrefs(false);
    }
  }

  if (!ready) {
    return (
      <p className="py-20 text-center text-sm text-[var(--muted)]">
        Loading…
      </p>
    );
  }

  return (
    <main className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="page-title">Location</h1>
      </header>

      <form onSubmit={onAddCity} className="surface animate-fade-up-delay space-y-5 rounded-3xl p-4 min-[400px]:p-5">
        <div>
          <h2 className="font-[family-name:var(--font-outfit)] text-base font-semibold">
            Add a city
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Each city keeps its own event list. Switch cities from the dropdown
            on Upcoming or Agenda.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            City or address
          </label>
          <input
            required
            value={cityOrAddress}
            onChange={(e) => setCityOrAddress(e.target.value)}
            placeholder="e.g. Rotterdam, Netherlands"
            className="field w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <div>
          <div className="mb-3 flex items-end justify-between gap-3">
            <label
              htmlFor="distance-slider"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Distance
            </label>
            <span className="rounded-full bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold text-white">
              {radiusKm} km
            </span>
          </div>
          <input
            id="distance-slider"
            type="range"
            min={5}
            max={100}
            step={5}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="distance-slider"
            style={
              {
                "--progress": `${((radiusKm - 5) / (100 - 5)) * 100}%`,
              } as CSSProperties
            }
            aria-valuemin={5}
            aria-valuemax={100}
            aria-valuenow={radiusKm}
            aria-valuetext={`${radiusKm} kilometers`}
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-[var(--muted)]">
            <span>5 km</span>
            <span>100 km</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={addingCity}
          className="w-full rounded-xl bg-[var(--ink)] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {addingCity ? "Adding…" : "Add city"}
        </button>
      </form>

      <form onSubmit={onSavePrefs} className="surface space-y-5 rounded-3xl p-4 min-[400px]:p-5">
        <div>
          <h2 className="font-[family-name:var(--font-outfit)] text-base font-semibold">
            Preferences
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Shared across cities — used to rank what shows up first.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Event types I like
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((tag) => {
              const on = preferenceTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    on
                      ? "bg-[var(--ink)] text-white"
                      : "chip text-[var(--muted)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            More about what you enjoy
          </label>
          <textarea
            value={preferencesText}
            onChange={(e) => setPreferencesText(e.target.value)}
            rows={4}
            placeholder="Jazz nights, street food markets, indie cinema, football matches…"
            className="field w-full resize-none rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
        </div>

        <button
          type="submit"
          disabled={savingPrefs}
          className="w-full rounded-xl bg-[var(--ink)] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {savingPrefs ? "Saving…" : "Save preferences"}
        </button>
      </form>

      {message && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <AttendedHistory upcoming={upcomingGoing} history={attendedHistory} />
    </main>
  );
}
