import type { CategoryId } from "./types";

/** Brand palette shared by the app (Tailwind theme mirrors it) and the PDF. */
export const BRAND = {
  ink: "#16323B",
  muted: "#5C7480",
  line: "#D9E2E6",
  mist: "#EDF2F4",
  sea900: "#0C3B47",
  sea700: "#0F6172",
  sea500: "#1B8A9C",
  sea100: "#DDF0F3",
  sea50: "#EEF8FA",
  saffron: "#F0A030",
  saffron100: "#FDF0DA",
  saffron700: "#A8650A",
} as const;

/** One color per hotel, in check-in order. */
export const STAY_COLORS = ["#0F8B8D", "#7B61C9", "#D98A1F", "#2F7DD1", "#A2467F", "#4C9A5A"];

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
  transfers: "#5B6B7A",
  parking: "#6D7F8F",
};
