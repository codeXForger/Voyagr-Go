"use client";
import { MapPin } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { searchLocations } from "@/domain/locations";
import { useLocationsReady } from "../useLocationsReady";

interface Props {
  value: string;
  onChange(value: string): void;
  label: string;
  placeholder: string;
}

/** Searchable dropdown of places (by name, country or airport code). Free text is allowed too. */
export function LocationCombobox({ value, onChange, label, placeholder }: Props) {
  const ready = useLocationsReady();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const typed = value.trim();
  // "Chosen" means the text is exactly a place name (an airport code alone still searches).
  const chosen = searchLocations(typed, 1)[0]?.name.toLowerCase() === typed.toLowerCase();

  // When a known place is already chosen, show popular places so it is easy to pick another.
  const results = useMemo(() => searchLocations(chosen ? "" : typed, chosen || !typed ? 8 : 40), [chosen, typed, ready]);
  const custom = typed && !chosen ? typed : "";
  const optionCount = results.length + (custom ? 1 : 0);

  const choose = (i: number) => {
    onChange(i < results.length ? results[i].name : custom);
    setOpen(false);
  };

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
      <input
        role="combobox" aria-label={label} aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && optionCount ? `${listId}-${active}` : undefined}
        autoComplete="off" className="field pl-9" placeholder={placeholder} value={value}
        onFocus={(e) => { setOpen(true); setActive(0); e.currentTarget.select(); }}
        onBlur={() => setOpen(false)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, optionCount - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && open && optionCount) { e.preventDefault(); choose(active); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && optionCount > 0 && (
        <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="panel absolute z-30 mt-1 max-h-64 w-full overflow-auto p-1 shadow-lg">
          {results.map((l, i) => (
            <li
              key={`${l.name}-${l.iata}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm ${i === active ? "bg-sea-100" : "hover:bg-sea-50"}`}
              onMouseDown={(e) => { e.preventDefault(); choose(i); }} onMouseEnter={() => setActive(i)}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{l.name}</div>
                <div className="truncate text-xs text-muted">{[l.note, l.region, l.country].filter(Boolean).join(" · ")}</div>
              </div>
              <span className="num rounded bg-sea-50 px-1.5 py-0.5 text-xs font-medium text-sea-900">{l.iata}</span>
            </li>
          ))}
          {custom && (
            <li
              id={`${listId}-${results.length}`} role="option" aria-selected={active === results.length}
              className={`cursor-pointer rounded-md px-2.5 py-2 text-sm ${active === results.length ? "bg-sea-100" : "hover:bg-sea-50"}`}
              onMouseDown={(e) => { e.preventDefault(); choose(results.length); }} onMouseEnter={() => setActive(results.length)}
            >
              Use “{custom}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
