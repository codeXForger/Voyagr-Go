"use client";
import { useId, useMemo, useState } from "react";
import type { IconKey } from "@/domain/types";
import { IconBadge } from "./IconBadge";

export interface SuggestGroup {
  label: string;
  icon: IconKey;
  options: string[];
}

interface Props {
  value: string;
  onChange(value: string): void;
  label: string;
  placeholder?: string;
  groups: SuggestGroup[];
  className?: string;
  /** Marks the input so a parent can move focus to it. */
  dataInput?: string;
  /** Called for keys the dropdown does not use (for example Enter to add another row). */
  onKeyDown?(e: React.KeyboardEvent<HTMLInputElement>): void;
}

/** A text box that suggests names (hotels, places) as you type or focus, and still accepts anything you type. */
export function SuggestInput({ value, onChange, label, placeholder, groups, className = "", dataInput, onKeyDown }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const q = value.trim().toLowerCase();

  // Filter by what is typed; hide an option that already equals the text.
  const flat = useMemo(
    () =>
      groups.flatMap((g) =>
        g.options
          .filter((o) => o.toLowerCase() !== q && (!q || o.toLowerCase().includes(q)))
          .map((o) => ({ option: o, group: g })),
      ),
    [groups, q],
  );

  const choose = (i: number) => {
    onChange(flat[i].option);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        role="combobox" aria-expanded={open && flat.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={label} data-input={dataInput} autoComplete="off" placeholder={placeholder} value={value} className={className}
        onFocus={() => { setOpen(true); setActive(-1); }}
        onBlur={() => setOpen(false)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && flat.length) { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, flat.length - 1)); }
          else if (e.key === "ArrowUp" && flat.length) { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && open && active >= 0 && flat[active]) { e.preventDefault(); choose(active); }
          else if (e.key === "Escape") setOpen(false);
          else onKeyDown?.(e);
        }}
      />
      {open && flat.length > 0 && (
        <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="panel absolute z-30 mt-1 max-h-56 w-full min-w-48 overflow-auto p-1 shadow-lg">
          {flat.map(({ option, group }, i) => {
            const firstOfGroup = i === 0 || flat[i - 1].group !== group;
            return (
              <li key={`${group.label}-${option}`} role="presentation">
                {firstOfGroup && <div className="px-2 pb-0.5 pt-1.5 text-[11px] font-medium text-muted">{group.label}</div>}
                <div
                  id={`${listId}-${i}`} role="option" aria-selected={i === active}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${i === active ? "bg-sea-100" : "hover:bg-sea-50"}`}
                  onMouseDown={(e) => { e.preventDefault(); choose(i); }} onMouseEnter={() => setActive(i)}
                >
                  <IconBadge name={group.icon} className="h-4 w-4 shrink-0 text-sea-700" />
                  <span className="truncate">{option}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
