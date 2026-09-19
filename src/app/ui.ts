import type { CategoryId } from "@/domain/types";

/** Presentation-only colors per cost category (used by chips and the split bar). */
export const CATEGORY_COLOR: Record<CategoryId, string> = {
  flight: "#2F7DD1",
  stay: "#0F8B8D",
  extraBed: "#7B61C9",
  cab: "#D98A1F",
  breakfast: "#C9A227",
  lunch: "#E0693A",
  dinner: "#A2467F",
  places: "#4C9A5A",
  activities: "#D6515C",
};
