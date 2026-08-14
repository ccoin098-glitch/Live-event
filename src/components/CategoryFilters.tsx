"use client";

import { CATEGORY_FILTERS } from "@/lib/rank";

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
          selected={active === c.id}
          onClick={() => onChange(c.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
        selected
          ? "bg-[var(--ink)] text-white shadow-sm"
          : "chip text-[var(--muted)] hover:bg-white/55 hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  );
}
