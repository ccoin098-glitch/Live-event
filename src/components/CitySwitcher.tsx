"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
  /** Called after a successful switch/remove/edit. Pass the new active place id when known. */
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
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRadius, setEditRadius] = useState(25);
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

  useEffect(() => {
    if (!open) setEditingId(null);
  }, [open]);

  function updatePosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 260),
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
  }, [open, editingId]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editingId) setEditingId(null);
        else setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, editingId]);

  async function selectPlace(id: string) {
    if (editingId) return;
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

  function startEdit(place: PlaceOption, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(place.id);
    setEditRadius(place.radiusKm);
  }

  async function saveRadius(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setBusyId(id);
    try {
      const res = await fetch(`/api/places/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radiusKm: editRadius }),
      });
      if (!res.ok) throw new Error("Could not update distance");
      setEditingId(null);
      onChanged(id === effectiveId ? id : effectiveId);
    } catch {
      /* keep editor open */
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
      if (editingId === id) setEditingId(null);
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
              maxWidth: "min(22rem, calc(100vw - 1.5rem))",
              maxHeight: "min(22rem, calc(100dvh - 6rem))",
            }}
          >
            <ul className="max-h-[inherit] overflow-auto py-1">
              {places.map((place) => {
                const selected = place.id === (effectiveId ?? active?.id);
                const busy = busyId === place.id;
                const editing = editingId === place.id;
                return (
                  <li key={place.id}>
                    <div
                      role="option"
                      aria-selected={selected}
                      className={`px-2 py-1 ${
                        selected ? "bg-[var(--accent)]/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={busy || editing}
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
                          onClick={(e) => startEdit(place, e)}
                          className={`shrink-0 rounded-lg px-2 py-2 text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] disabled:opacity-50 ${
                            editing ? "bg-black/5 text-[var(--ink)]" : ""
                          }`}
                          aria-label={`Edit distance for ${place.label}`}
                          title="Edit distance"
                        >
                          <EditIcon />
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

                      {editing ? (
                        <div
                          className="mt-1 space-y-2 rounded-xl bg-black/[0.03] px-2.5 py-2.5"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                              Distance
                            </span>
                            <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[11px] font-semibold text-white">
                              {editRadius} km
                            </span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={100}
                            step={5}
                            value={editRadius}
                            onChange={(e) =>
                              setEditRadius(Number(e.target.value))
                            }
                            className="distance-slider"
                            style={
                              {
                                "--progress": `${((editRadius - 5) / (100 - 5)) * 100}%`,
                              } as CSSProperties
                            }
                            aria-label={`Distance for ${place.label}`}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setEditingId(null)}
                              className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-black/5"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={(e) => void saveRadius(place.id, e)}
                              className="flex-1 rounded-lg bg-[var(--ink)] px-2 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                              {busy ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : null}
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

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5 16.5 11.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
