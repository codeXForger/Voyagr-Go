import { ICON_NODES } from "@/domain/iconNodes";
import type { IconKey } from "@/domain/categories";
import { createElement } from "react";

/** Renders a category icon from the shared icon data (same source the PDF uses). */
export function IconBadge({ name, className = "h-4 w-4" }: { name: IconKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" data-icon={name}
    >
      {(ICON_NODES[name] ?? []).map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
