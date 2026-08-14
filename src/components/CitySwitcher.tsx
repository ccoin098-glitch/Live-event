"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export type PlaceOption = {
  id: string;
  label: string;
  cityOrAddress: string;
  radiusKm: number;
};

type Props = {
  places: PlaceOption[];
  activePlaceId: string | null;
  /** Called after a successful switch/remove. Pass the new active place id when known. */
  onChanged: (activePlaceId?: string | null) => void;
  variant?: "default" | "hero";
};

type MenuPos = { top: number; left: number; width: number };

export function CitySwitcher({
  places,
  activePlaceId,
  onChanged,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  /** Keeps the UI on the city you just tapped until props catch up. */
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveId = optimisticId ?? activePlaceId;
  const active =
    places.find((p) => p.id === effectiveId) ?? places[0] ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (optimisticId && activePlaceId === optimisticId) {
      setOptimisticId(null);
    }
  }, [activePlaceId, optimisticId]);

  function updatePosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 224),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    function onReposition() {
      updatePosition();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function selectPlace(id: string) {
    if (id === effectiveId) {
      setOpen(false);
      return;
    }
    setOptimisticId(id);
    setBusyId(id);
    try {
      const res = await fetch(`/api/places/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("Could not switch city");
      setOpen(false);
      onChanged(id);
    } catch {
      setOptimisticId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function removePlace(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Remove this city and its events?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/places/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove city");
      const json = (await res.json()) as { activePlaceId?: string | null };
      if (optimisticId === id) setOptimisticId(null);
      onChanged(json.activePlaceId ?? null);
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  }

  if (places.length === 0) {
    return (
      <Link
        href="/location"
        className={
          variant === "hero"
            ? "inline-block font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-[var(--accent)]"
            : "pb-1 text-sm font-medium text-[var(--accent)]"
        }
      >
        Add a city
      </Link>
    );
  }

  const menu =
    open && mounted && pos
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="fixed z-[80] overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-white/95 shadow-xl backdrop-blur-xl"
            style={{
              top: pos.top,
              left: Math.min(
                Math.max(12, pos.left),
                window.innerWidth - pos.width - 12,
              ),
              minWidth: Math.min(pos.width, window.innerWidth - 24),
              maxWidth: "min(20rem, calc(100vw - 1.5rem))",
              maxHeight: "min(18rem, calc(100dvh - 6rem))",
            }}
          >
            <ul className="max-h-[inherit] overflow-auto py-1">
              {places.map((place) => {
                const selected = place.id === (effectiveId ?? active?.id);
                const busy = busyId === place.id;
                return (
                  <li key={place.id}>
                    <div
                      role="option"
                      aria-selected={selected}
                      className={`flex items-center gap-1 px-2 py-1 ${
                        selected ? "bg-[var(--accent)]/10" : ""
                      }`}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void selectPlace(place.id)}
                        className="min-w-0 flex-1 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-black/5 disabled:opacity-50"
                      >
                        <span className="block truncate font-medium text-[var(--ink)]">
                          {place.label}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          within {place.radiusKm} km
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => void removePlace(place.id, e)}
                        className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-[var(--muted)] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Remove ${place.label}`}
                        title="Remove city"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-black/5 px-3 py-2">
              <Link
                href="/location"
                onClick={() => setOpen(false)}
                className="block text-sm font-medium text-[var(--accent)]"
              >
                + Add another city
              </Link>
            </div>
          </div>,
          document.body,
        )
      : null;

  const isHero = variant === "hero";

  return (
    <div ref={rootRef} className="relative z-[80]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          isHero
            ? "inline-flex max-w-full items-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2.5 text-left backdrop-blur-md transition hover:bg-white/50"
            : "inline-flex max-w-[min(11rem,46vw)] items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-left text-sm font-medium text-[var(--ink)] backdrop-blur-md transition hover:bg-white/50 min-[400px]:max-w-[12rem]"
        }
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={
            isHero
              ? "truncate font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-[var(--ink)]"
              : "truncate"
          }
        >
          {active?.label ?? "Cities"}
        </span>
        <svg
          width={isHero ? 16 : 12}
          height={isHero ? 16 : 12}
          viewBox="0 0 12 12"
          fill="none"
          className={`shrink-0 text-[var(--muted)] transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {menu}
    </div>
  );
}
