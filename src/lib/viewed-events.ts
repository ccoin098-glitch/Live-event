"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "lockal-viewed-events";
const EVENT_NAME = "lockal:viewed";

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

let cache = new Set<string>();
let cacheReady = false;

function getSnapshot(): Set<string> {
  if (!cacheReady && typeof window !== "undefined") {
    cache = readIds();
    cacheReady = true;
  }
  return cache;
}

function getServerSnapshot(): Set<string> {
  return cache;
}

function subscribe(onStoreChange: () => void) {
  function onViewed() {
    cache = readIds();
    onStoreChange();
  }
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) {
      cache = readIds();
      onStoreChange();
    }
  }
  window.addEventListener(EVENT_NAME, onViewed);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onViewed);
    window.removeEventListener("storage", onStorage);
  };
}

/** Instant client-side mark; also notifies list UIs. */
export function markEventSeenLocal(id: string) {
  if (typeof window === "undefined" || !id) return;
  const ids = readIds();
  if (ids.has(id)) return;
  ids.add(id);
  writeIds(ids);
  cache = ids;
  cacheReady = true;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id } }));
}

export function useEventSeen(id: string, serverViewed?: boolean): boolean {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return Boolean(serverViewed) || ids.has(id);
}
