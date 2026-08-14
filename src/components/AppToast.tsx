"use client";

import { useEffect, useState } from "react";

type ToastDetail = {
  ok?: boolean;
  message?: string;
};

export function showAppToast(message: string, ok = true) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("lockal:toast", {
      detail: { message, ok },
    }),
  );
}

export function AppToast() {
  const [toast, setToast] = useState<{
    message: string;
    tone: "ok" | "warn";
  } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function show(detail: ToastDetail | undefined) {
      if (!detail?.message) return;
      setToast({
        message: detail.message,
        tone: detail.ok === false ? "warn" : "ok",
      });
      setVisible(true);
    }

    function onToast(e: Event) {
      show((e as CustomEvent<ToastDetail>).detail);
    }
    function onDiscover(e: Event) {
      show((e as CustomEvent<ToastDetail>).detail);
    }

    window.addEventListener("lockal:toast", onToast);
    window.addEventListener("lockal:discover", onDiscover);
    return () => {
      window.removeEventListener("lockal:toast", onToast);
      window.removeEventListener("lockal:discover", onDiscover);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), 4000);
    const clear = window.setTimeout(() => setToast(null), 4500);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(clear);
    };
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] min-[400px]:px-4">
      <p
        role="status"
        className={`pointer-events-auto w-full max-w-md rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl transition-all duration-300 sm:max-w-lg ${
          visible
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0"
        } ${
          toast.tone === "ok"
            ? "border-emerald-200/80 bg-white/90 text-emerald-800"
            : "border-amber-200/80 bg-white/90 text-amber-900"
        }`}
      >
        {toast.message}
      </p>
    </div>
  );
}
