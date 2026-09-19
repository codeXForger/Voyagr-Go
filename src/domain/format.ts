export const currencySymbol = (currency: string) =>
  (0).toLocaleString("en", { style: "currency", currency, maximumFractionDigits: 0 }).replace(/[\d\s.,]/g, "") || currency;

/** `code` display avoids glyphs (e.g. the rupee sign) missing from built-in PDF fonts. */
export function formatMoney(amount: number, currency: string, display: "symbol" | "code" = "symbol", maxDigits = 2): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay: display,
      maximumFractionDigits: maxDigits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
