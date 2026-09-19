"use client";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  value: number;
  onChange(n: number): void;
  label: string;
  min?: number;
  step?: number;
  className?: string;
  /** Show -/+ buttons (for small counts like people or rooms). */
  stepper?: boolean;
  /** Text shown before the number, e.g. a currency symbol. */
  prefix?: string;
  /** Shorter control for dense rows. */
  compact?: boolean;
}

/** Number input that lets the user clear the field while typing. */
export function NumField({ value, onChange, label, min = 0, step = 1, className = "", stepper, prefix, compact }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText((t) => (Number(t) === value ? t : String(value))), [value]);

  const input = (
    <input
      type="number" inputMode="decimal" aria-label={label} min={min} step={step}
      className={`num field ${compact ? "h-8 text-xs" : ""} ${stepper ? "text-center" : ""} ${prefix ? "pl-7" : ""} ${className}`} value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFloat(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
    />
  );

  if (prefix) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span>
        {input}
      </div>
    );
  }
  if (!stepper) return input;
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className="icon-btn border border-line" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        <Minus className="h-4 w-4" />
      </button>
      {input}
      <button type="button" className="icon-btn border border-line" aria-label={`Increase ${label}`} onClick={() => onChange(value + step)}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
