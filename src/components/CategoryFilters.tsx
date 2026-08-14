"use client";

import { CATEGORY_FILTERS } from "@/lib/rank";
import { categoryAccent } from "@/components/EventListItem";

export function CategoryFilters({
  active,
  onChange,
}: {
  active: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="animate-fade-up-delay h-scroll">
      <FilterChip
        label="All"
        selected={active === null}
        onClick={() => onChange(null)}
      />
      {CATEGORY_FILTERS.map((c) => (
        <FilterChip
          key={c.id}
          label={c.label}
          category={c.id}
          selected={active === c.id}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  category,
  selected,
  onClick,
}: {
  label: string;
  category?: string;
  selected: boolean;
  onClick: () => void;
}) {
  const accent = category ? categoryAccent(category) : "var(--ink)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
        selected
          ? "text-white shadow-sm"
          : "chip text-[var(--muted)] hover:bg-white/55 hover:text-[var(--ink)]"
      }`}
      style={selected ? { backgroundColor: accent, color: "#ffffff" } : undefined}
    >
      {label}
    </button>
  );
}
