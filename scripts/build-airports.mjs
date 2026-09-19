// Generates src/data/airports.json from the OurAirports open dataset (public domain).
// Run: node scripts/build-airports.mjs   (needs network; the generated file is committed)
import fs from "node:fs";

const BASE = "https://davidmegginson.github.io/ourairports-data";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const get = async (f) => parseCsv(await (await fetch(`${BASE}/${f}.csv`)).text());
const [airports, countries, regions] = await Promise.all([get("airports"), get("countries"), get("regions")]);
const countryName = Object.fromEntries(countries.map((c) => [c.code, c.name]));
const regionName = Object.fromEntries(regions.map((r) => [r.code, r.name]));
const rank = { large_airport: 0, medium_airport: 1, small_airport: 2 };

const rows = airports
  .filter((a) => a.iata_code && a.scheduled_service === "yes" && a.type in rank)
  .sort((a, b) => rank[a.type] - rank[b.type] || a.name.localeCompare(b.name))
  // [place, airport name, IATA, country, region]
  .map((a) => [a.municipality || a.name, a.name, a.iata_code, countryName[a.iso_country] ?? a.iso_country, regionName[a.iso_region] ?? ""]);

fs.writeFileSync(new URL("../src/data/airports.json", import.meta.url), JSON.stringify(rows));
console.log(`Wrote ${rows.length} airports`);
