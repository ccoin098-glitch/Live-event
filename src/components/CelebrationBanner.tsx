export function CelebrationBanner({
  name,
  tone = "default",
}: {
  name: string;
  tone?: "default" | "compact";
}) {
  if (tone === "compact") {
    return (
      <p className="text-sm font-medium text-[var(--accent)]">
        Celebration day · {name}
      </p>
    );
  }

  return (
    <div className="surface animate-fade-up flex items-start gap-3 rounded-3xl px-4 py-3.5">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm text-white"
        aria-hidden
      >
        ★
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Special day
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-outfit)] text-base font-semibold text-[var(--ink)]">
          {name}
        </p>
      </div>
    </div>
  );
}
