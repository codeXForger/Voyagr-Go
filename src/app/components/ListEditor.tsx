"use client";
import { GripVertical, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { IconKey } from "@/domain/categories";
import { moveItem } from "@/domain/list";
import { IconBadge } from "./IconBadge";
import { SuggestInput, type SuggestGroup } from "./SuggestInput";

interface Props<T> {
  items: T[];
  onChange(items: T[]): void;
  getLabel(item: T): string;
  setLabel(item: T, label: string): T;
  makeBlank(): T;
  /** Accessible-name prefix, e.g. "Day 2" or "Day 2 place 1". */
  name: string;
  singular: string;
  icon: IconKey;
  placeholder: string;
  /** Heading shown above the list (omit for nested lists). */
  title?: string;
  /** Names to suggest while typing a row's label (e.g. your hotels). Free text is still allowed. */
  suggestions?(item: T, index: number): SuggestGroup[];
  /** Icon for a row when it should differ from `icon` (e.g. a hotel among places). */
  rowIcon?(item: T): IconKey;
  /** Content above the row, e.g. how you get to a place. */
  renderBefore?(item: T, index: number, update: (item: T) => void): ReactNode;
  /** Extra fields shown right under the row, e.g. people and price. */
  renderMeta?(item: T, index: number, update: (item: T) => void): ReactNode;
  /** Content rendered under a row, e.g. the activities that belong to a place. */
  renderChildren?(item: T, index: number, update: (item: T) => void): ReactNode;
}

/** One item per row. Rows reorder by dragging the grip, or with Arrow Up/Down while it is focused. */
export function ListEditor<T>({ items, onChange, getLabel, setLabel, makeBlank, name, singular, icon, placeholder, title, suggestions, rowIcon, renderBefore, renderMeta, renderChildren }: Props<T>) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [focusHandle, setFocusHandle] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusIndex === null) return;
    root.current?.querySelector<HTMLInputElement>(`[data-input="${singular}-${focusIndex}"]`)?.focus();
    setFocusIndex(null);
  }, [focusIndex, items.length, singular]);

  useEffect(() => {
    if (focusHandle === null) return;
    root.current?.querySelector<HTMLElement>(`[data-handle="${singular}-${focusHandle}"]`)?.focus();
    setFocusHandle(null);
  }, [focusHandle, items, singular]);

  const update = (i: number, item: T) => onChange(items.map((x, j) => (j === i ? item : x)));
  const insertAfter = (i: number) => {
    onChange([...items.slice(0, i + 1), makeBlank(), ...items.slice(i + 1)]);
    setFocusIndex(i + 1);
  };
  const endDrag = () => { setDragFrom(null); setDragOver(null); };

  return (
    <div ref={root} className="flex flex-col gap-2">
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <IconBadge name={icon} className="h-4 w-4 text-sea-700" />
          {title}
          {items.length > 0 && <span className="num rounded-full bg-sea-100 px-2 text-xs text-sea-900">{items.length}</span>}
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            data-testid={`${name}-row-${i}`}
            onDragOver={(e) => { if (dragFrom !== null) { e.preventDefault(); e.stopPropagation(); setDragOver(i); } }}
            onDrop={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              e.stopPropagation();
              onChange(moveItem(items, dragFrom, i));
              endDrag();
            }}
            className={`rounded-lg border bg-white transition-colors ${
              dragOver === i && dragFrom !== null && dragFrom !== i ? "border-saffron-500 bg-saffron-100/60" : "border-line"
            } ${dragFrom === i ? "opacity-40" : ""}`}
          >
            {renderBefore && <div className="mx-2 mt-2">{renderBefore(item, i, (next) => update(i, next))}</div>}
            <div className="flex items-center gap-1 pr-1">
              <button
                type="button" draggable data-handle={`${singular}-${i}`}
                aria-label={`Reorder ${singular} ${i + 1}. Drag, or use Arrow Up and Arrow Down.`}
                title="Drag to reorder"
                className="icon-btn h-9 w-7 shrink-0 cursor-grab touch-none active:cursor-grabbing"
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragFrom(i);
                  e.dataTransfer?.setData?.("text/plain", String(i));
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                  const row = e.currentTarget.closest("li");
                  if (row) e.dataTransfer?.setDragImage?.(row, 16, 16);
                }}
                onDragEnd={endDrag}
                onKeyDown={(e) => {
                  const to = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : null;
                  if (to === null || to < 0 || to >= items.length) return;
                  e.preventDefault();
                  onChange(moveItem(items, i, to));
                  setFocusHandle(to);
                }}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <IconBadge name={rowIcon?.(item) ?? icon} className="h-4 w-4 shrink-0 text-sea-700" />
              {suggestions ? (
                <SuggestInput
                  dataInput={`${singular}-${i}`} label={`${name} ${singular} ${i + 1}`} value={getLabel(item)} placeholder={placeholder}
                  className="ghost h-9 w-full min-w-0 font-medium" groups={suggestions(item, i)}
                  onChange={(v) => update(i, setLabel(item, v))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertAfter(i); } }}
                />
              ) : (
                <input
                  data-input={`${singular}-${i}`} aria-label={`${name} ${singular} ${i + 1}`} value={getLabel(item)} placeholder={placeholder}
                  className="ghost h-9 min-w-0 flex-1 font-medium"
                  onChange={(e) => update(i, setLabel(item, e.target.value))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); insertAfter(i); } }}
                />
              )}
              <button type="button" className="icon-btn h-7 w-7" aria-label={`Remove ${singular} ${i + 1} from ${name}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderMeta && <div className="mb-2 ml-9 mr-2">{renderMeta(item, i, (next) => update(i, next))}</div>}
            {renderChildren && (
              <div className="mb-2 ml-9 mr-2 border-l-2 border-sea-100 pl-3">{renderChildren(item, i, (next) => update(i, next))}</div>
            )}
          </li>
        ))}
      </ul>

      <button type="button" className="btn h-9 w-fit border-dashed text-sea-700" aria-label={`Add ${singular} to ${name}`} onClick={() => { onChange([...items, makeBlank()]); setFocusIndex(items.length); }}>
        <Plus className="h-4 w-4" />Add {singular}
      </button>
    </div>
  );
}
