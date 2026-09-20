import { Circle, Document, Line, Page, Path, Polyline, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { BRAND } from "@/domain/colors";
import { ICON_NODES } from "@/domain/iconNodes";
import type { Report } from "./report";

const C = BRAND;

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 52, paddingHorizontal: 36, fontSize: 9, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.35 },
  accent: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: C.saffron },
  footer: { position: "absolute", top: 806, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 6 },
  footText: { fontSize: 7.5, color: C.muted },

  // Cover
  band: { backgroundColor: C.sea900, marginTop: -40, marginHorizontal: -36, paddingTop: 34, paddingBottom: 26, paddingHorizontal: 36 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandMark: { width: 20, height: 20, borderRadius: 6, backgroundColor: C.sea700, alignItems: "center", justifyContent: "center", marginRight: 7 },
  brandName: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#FFFFFF", letterSpacing: 0.4 },
  brandTag: { marginLeft: "auto", fontSize: 8, color: "#A9C7CF" },
  title: { marginTop: 26, fontFamily: "Helvetica-Bold", fontSize: 25, color: "#FFFFFF", lineHeight: 1.15 },
  routeRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  routeCity: { fontFamily: "Helvetica-Bold", fontSize: 15, color: "#FFFFFF" },
  routeLine: { flexGrow: 1, height: 1, backgroundColor: "#3E6E7B", marginHorizontal: 10, maxWidth: 90 },
  dates: { marginTop: 8, fontSize: 10.5, color: "#CFE3E8" },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  chip: { backgroundColor: "#16505F", color: "#E6F2F5", fontSize: 8.5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 10, marginRight: 6, marginBottom: 4 },

  // Summary cards
  cards: { flexDirection: "row", marginTop: 16 },
  card: { flex: 1, borderWidth: 0.75, borderColor: C.line, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 13, backgroundColor: "#FFFFFF" },
  cardHero: { flex: 1.25, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 13, backgroundColor: C.saffron100, borderWidth: 0.75, borderColor: "#F3D9A8" },
  cardLabel: { fontSize: 8, color: C.muted },
  cardValue: { marginTop: 4, fontFamily: "Helvetica-Bold", fontSize: 16, color: C.sea900, lineHeight: 1.15 },
  cardValueHero: { marginTop: 4, fontFamily: "Helvetica-Bold", fontSize: 21, color: C.saffron700, lineHeight: 1.15 },
  cardSub: { marginTop: 5, fontSize: 7.5, color: C.muted },

  // Section headings
  h2: { fontFamily: "Helvetica-Bold", fontSize: 14, color: C.sea900, marginTop: 22 },
  h2Sub: { fontSize: 8.5, color: C.muted, marginTop: 2, marginBottom: 9 },
  rule: { height: 2, width: 26, backgroundColor: C.saffron, marginTop: 5, borderRadius: 1 },

  // Split bar
  bar: { flexDirection: "row", height: 9, borderRadius: 4.5, overflow: "hidden", backgroundColor: C.sea50, marginTop: 4 },
  legend: { flexDirection: "row", flexWrap: "wrap", marginTop: 9 },
  legendItem: { width: "50%", flexDirection: "row", alignItems: "center", marginBottom: 5, paddingRight: 12 },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },

  // Hotels
  hotel: { flexDirection: "row", borderWidth: 0.75, borderColor: C.line, borderRadius: 8, marginBottom: 7, overflow: "hidden" },
  hotelBar: { width: 5 },
  hotelBody: { flex: 1, paddingVertical: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  hotelName: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  muted: { color: C.muted },
  small: { fontSize: 8 },

  // Days
  day: { borderWidth: 0.75, borderColor: C.line, borderRadius: 9, marginBottom: 12 },
  dayHead: { flexDirection: "row", alignItems: "center", backgroundColor: C.sea50, paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 0.75, borderBottomColor: C.line },
  dayBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.sea700, alignItems: "center", justifyContent: "center", marginRight: 10 },
  dayBadgeTop: { fontSize: 6.5, color: "#BFE0E6", letterSpacing: 0.6 },
  dayBadgeNum: { fontFamily: "Helvetica-Bold", fontSize: 14, color: "#FFFFFF", lineHeight: 1 },
  dayTitle: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  dayCost: { marginLeft: "auto", alignItems: "flex-end" },
  dayBody: { paddingTop: 10, paddingBottom: 6, paddingHorizontal: 12 },
  lodge: { flexDirection: "row", alignItems: "center", backgroundColor: C.sea50, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 6 },
  lodgeWarn: { backgroundColor: C.saffron100 },

  // Timeline rows
  row: { flexDirection: "row" },
  time: { width: 38, textAlign: "right", paddingRight: 8, paddingTop: 1, fontFamily: "Helvetica-Bold", fontSize: 8.5, color: C.sea700 },
  rail: { width: 16, alignItems: "center" },
  railLine: { position: "absolute", top: 0, bottom: 0, left: 7, width: 1.5, backgroundColor: C.sea100 },
  node: { width: 15, height: 15, borderRadius: 7.5, backgroundColor: C.sea700, alignItems: "center", justifyContent: "center", marginTop: 0 },
  nodeHotel: { backgroundColor: "#7B61C9" },
  nodeSmall: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: C.sea500, marginTop: 2, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingLeft: 8, paddingBottom: 9 },
  place: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  connector: { flexDirection: "row", alignItems: "center", backgroundColor: C.sea50, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, alignSelf: "flex-start" },
  activity: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  actTime: { width: 32, fontFamily: "Helvetica-Bold", fontSize: 8, color: C.sea700 },
  notes: { marginTop: 4, marginBottom: 6, padding: 9, backgroundColor: C.saffron100, borderRadius: 6, fontSize: 8.5, color: "#5B4514" },

  // Tables
  tableTitle: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 5 },
  th: { flexDirection: "row", backgroundColor: C.sea900, borderRadius: 5, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 2 },
  thText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: 5.5, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.line },
  trAlt: { backgroundColor: "#F8FBFC" },
  cItem: { flex: 3.2, flexDirection: "row", alignItems: "center" },
  cUnit: { flex: 1.5, textAlign: "right" },
  cQty: { flex: 0.8, textAlign: "right" },
  cPp: { flex: 1.5, textAlign: "right" },
  cTotal: { flex: 1.6, textAlign: "right", fontFamily: "Helvetica-Bold" },
  subtotal: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 6, paddingHorizontal: 8, marginTop: 2 },
  grand: { flexDirection: "row", marginTop: 12, backgroundColor: C.sea900, borderRadius: 9, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  disclaimer: { marginTop: 18, fontSize: 7.5, color: C.muted, lineHeight: 1.5 },
});

const TAGS = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline } as const;

function Icon({ name, size = 11, color = C.sea700 }: { name: string; size?: number; color?: string }) {
  const nodes = ICON_NODES[name] ?? [];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {nodes.map(([tag, attrs], i) => {
        const Tag = TAGS[tag as keyof typeof TAGS] as React.ElementType | undefined;
        return Tag ? <Tag key={i} {...attrs} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null;
      })}
    </Svg>
  );
}

const Heading = ({ title, sub }: { title: string; sub?: string }) => (
  <View minPresenceAhead={60}>
    <Text style={s.h2}>{title}</Text>
    <View style={s.rule} />
    {sub ? <Text style={s.h2Sub}>{sub}</Text> : <View style={{ height: 8 }} />}
  </View>
);

function Cover({ r }: { r: Report }) {
  return (
    <View>
      <View style={s.band}>
        <View style={s.brandRow}>
          <View style={s.brandMark}><Icon name="plane" size={12} color="#FFFFFF" /></View>
          <Text style={s.brandName}>{r.brand}</Text>
          <Text style={s.brandTag}>Trip plan and cost estimate</Text>
        </View>
        <Text style={s.title}>{r.title}</Text>
        {(r.cover.from || r.cover.to) && (
          <View style={s.routeRow}>
            {r.cover.from ? <Text style={s.routeCity}>{r.cover.from}</Text> : null}
            {r.cover.from && r.cover.to ? <View style={s.routeLine} /> : null}
            {r.cover.from && r.cover.to ? <Icon name="plane" size={13} color={C.saffron} /> : null}
            {r.cover.from && r.cover.to ? <View style={s.routeLine} /> : null}
            {r.cover.to ? <Text style={s.routeCity}>{r.cover.to}</Text> : null}
          </View>
        )}
        {r.cover.dates ? <Text style={s.dates}>{r.cover.dates}</Text> : null}
        <View style={s.chips}>{r.cover.chips.map((c) => <Text key={c} style={s.chip}>{c}</Text>)}</View>
      </View>

      <View style={s.cards}>
        <View style={s.cardHero}>
          <Text style={s.cardLabel}>Per person</Text>
          <Text style={s.cardValueHero}>{r.perPerson}</Text>
          <Text style={s.cardSub}>{r.people} {r.people === 1 ? "traveler" : "travelers"} share the trip</Text>
        </View>
        <View style={[s.card, { marginLeft: 8 }]}>
          <Text style={s.cardLabel}>Whole trip</Text>
          <Text style={s.cardValue}>{r.grandTotal}</Text>
          <Text style={s.cardSub}>All costs included</Text>
        </View>
        <View style={[s.card, { marginLeft: 8 }]}>
          <Text style={s.cardLabel}>Trip length</Text>
          <Text style={s.cardValue}>{r.days} {r.days === 1 ? "day" : "days"}</Text>
          <Text style={s.cardSub}>{r.nights} {r.nights === 1 ? "night" : "nights"}</Text>
        </View>
      </View>
    </View>
  );
}

function Split({ r }: { r: Report }) {
  if (r.categoryTotals.length === 0) return null;
  return (
    <View wrap={false}>
      <Heading title="Where the money goes" sub="Share of the whole trip by type of cost" />
      <View style={s.bar}>
        {r.categoryTotals.map((c) => c.share > 0 && <View key={c.label} style={{ width: `${c.share * 100}%`, backgroundColor: c.color }} />)}
      </View>
      <View style={s.legend}>
        {r.categoryTotals.map((c) => (
          <View key={c.label} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: c.color }]} />
            <Text style={{ flex: 1 }}>{c.label}</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{c.perPerson}</Text>
            <Text style={[s.muted, s.small, { marginLeft: 4 }]}>pp</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Hotels({ r }: { r: Report }) {
  if (r.stays.length === 0) return null;
  return (
    <View>
      <Heading title="Where you stay" sub="Your hotels, in order" />
      {r.stays.map((h, i) => (
        <View key={i} style={s.hotel} wrap={false}>
          <View style={[s.hotelBar, { backgroundColor: h.color }]} />
          <View style={s.hotelBody}>
            <View style={{ flex: 1 }}>
              <Text style={s.hotelName}>{h.name}</Text>
              <Text style={[s.muted, { marginTop: 2 }]}>{h.range}</Text>
              <Text style={[s.muted, s.small, { marginTop: 2 }]}>{h.detail}</Text>
            </View>
            <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
              <Text style={[s.small, s.muted]}>Hotel total</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11.5, color: C.sea900 }}>{h.total}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function Day({ d }: { d: Report["itinerary"][number] }) {
  const isHotel = (name: string) => d.hotelNames.some((h) => h.toLowerCase() === name.toLowerCase());
  const empty = d.places.length === 0;
  // Keep a day on one page when it comfortably fits; a very long day is allowed to flow onto the next page.
  const size = d.places.reduce((n, p) => n + 2.2 + (p.transfer ? 1.3 : 0) + p.activities.length, 0) + d.lodging.length + (d.notes ? 2.5 : 0);
  return (
    <View style={s.day} wrap={size > 16}>
      <View style={s.dayHead} wrap={false}>
        <View style={s.dayBadge}>
          <Text style={s.dayBadgeTop}>DAY</Text>
          <Text style={s.dayBadgeNum}>{d.day}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.dayTitle}>{d.title && d.title !== `Day ${d.day}` ? d.title : d.date || `Day ${d.day}`}</Text>
          {d.date && d.title && d.title !== `Day ${d.day}` ? <Text style={[s.muted, s.small]}>{d.date}</Text> : null}
        </View>
        {d.dayCost ? (
          <View style={s.dayCost}>
            <Text style={[s.muted, { fontSize: 7 }]}>Day cost</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: C.sea900 }}>{d.dayCost}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.dayBody}>
        {d.lodging.filter((l) => l.startsWith("Check out")).map((l) => (
          <View key={l} style={s.lodge} wrap={false}><Icon name="hotel" size={10} color={C.sea700} /><Text style={{ marginLeft: 6, color: C.muted }}>{l}</Text></View>
        ))}

        {empty ? <Text style={[s.muted, { marginBottom: 6 }]}>Nothing planned for this day.</Text> : null}

        {d.places.map((p, i) => {
          const hotel = isHotel(p.name);
          const last = i === d.places.length - 1;
          return (
            <View key={i}>
              {p.transfer && (
                <View style={s.row} wrap={false}>
                  <Text style={[s.time, { color: C.muted, fontFamily: "Helvetica" }]}>{p.transfer.time}</Text>
                  <View style={s.rail}><View style={s.railLine} /><View style={s.nodeSmall} /></View>
                  <View style={[s.content, { paddingBottom: 7 }]}>
                    <View style={s.connector}>
                      <Icon name="route" size={9} color={C.sea700} />
                      <Text style={{ marginLeft: 5, fontSize: 8.5 }}>{p.transfer.text}</Text>
                      <Text style={[s.muted, { marginLeft: 6, fontSize: 8 }]}>{p.transfer.detail}</Text>
                    </View>
                  </View>
                </View>
              )}
              <View style={s.row} wrap={false}>
                <Text style={s.time}>{p.time}</Text>
                <View style={s.rail}>
                  {!(last && p.activities.length === 0) ? <View style={s.railLine} /> : null}
                  <View style={[s.node, hotel ? s.nodeHotel : {}]}><Icon name={hotel ? "hotel" : "landmark"} size={8.5} color="#FFFFFF" /></View>
                </View>
                <View style={s.content}>
                  <Text style={s.place}>{p.name}</Text>
                  <Text style={[s.muted, s.small]}>{p.detail}</Text>
                  {p.activities.map((a, k) => (
                    <View key={k} style={s.activity}>
                      <Icon name="ticket" size={9} color={C.sea500} />
                      {a.time ? <Text style={[s.actTime, { marginLeft: 5 }]}>{a.time}</Text> : <View style={{ width: 5 }} />}
                      <Text style={{ flex: 1 }}>{a.name}</Text>
                      <Text style={[s.muted, s.small]}>{a.detail}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })}

        {d.lodging.filter((l) => !l.startsWith("Check out")).map((l) => (
          <View key={l} style={[s.lodge, l.startsWith("No hotel") ? s.lodgeWarn : {}]} wrap={false}>
            <Icon name="hotel" size={10} color={l.startsWith("No hotel") ? C.saffron700 : C.sea700} />
            <Text style={{ marginLeft: 6, color: l.startsWith("No hotel") ? C.saffron700 : C.ink }}>{l}</Text>
          </View>
        ))}
        {d.notes ? <Text style={s.notes}>{d.notes}</Text> : null}
      </View>
    </View>
  );
}

function CostTables({ r }: { r: Report }) {
  return (
    <View>
      <Heading title="Cost breakdown" sub="Every price, per person and for the whole trip" />
      {r.costSections.filter((sec) => sec.rows.length > 0).map((sec) => (
        <View key={sec.title}>
          <View style={s.tableTitle} minPresenceAhead={70}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{sec.title}</Text>
            {sec.perDay ? <Text style={[s.muted, s.small, { marginLeft: 8 }]}>{sec.perDay} per day, {sec.perPersonPerDay} per person per day</Text> : null}
          </View>
          <View style={s.th} wrap={false}>
            <Text style={[s.thText, { flex: 3.2 }]}>Item</Text>
            <Text style={[s.thText, s.cUnit]}>Unit price</Text>
            <Text style={[s.thText, s.cQty]}>Qty</Text>
            <Text style={[s.thText, s.cPp]}>Per person</Text>
            <Text style={[s.thText, s.cTotal]}>Total</Text>
          </View>
          {sec.rows.map((row, i) => (
            <View key={i} style={[s.tr, i % 2 ? s.trAlt : {}]} wrap={false}>
              <View style={s.cItem}>
                <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: row.color, alignItems: "center", justifyContent: "center", marginRight: 7 }}>
                  <Icon name={row.icon} size={9.5} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{row.label}</Text>
                  <Text style={[s.muted, { fontSize: 7 }]}>{row.note}</Text>
                </View>
              </View>
              <Text style={s.cUnit}>{row.unitPrice}</Text>
              <Text style={s.cQty}>{row.quantity}</Text>
              <Text style={s.cPp}>{row.perPerson}</Text>
              <Text style={s.cTotal}>{row.total}</Text>
            </View>
          ))}
          <View style={s.subtotal} wrap={false}>
            <Text style={s.muted}>{sec.title} subtotal   </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: C.sea900 }}>{sec.total}</Text>
          </View>
        </View>
      ))}

      <View style={s.grand} wrap={false}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#A9C7CF", fontSize: 8 }}>Per person</Text>
          <Text style={{ color: C.saffron, fontFamily: "Helvetica-Bold", fontSize: 19 }}>{r.perPerson}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#A9C7CF", fontSize: 8 }}>Whole trip, {r.people} {r.people === 1 ? "person" : "people"}</Text>
          <Text style={{ color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 15 }}>{r.grandTotal}</Text>
        </View>
      </View>
    </View>
  );
}

function Scenarios({ r }: { r: Report }) {
  return (
    <View wrap={false}>
      <Heading title="If a different number of people travel" sub="Hotel rooms set to automatic and per-person costs follow the group size; a group price (like a cab) stays as entered." />
      <View style={s.th}>
        <Text style={[s.thText, { flex: 1 }]}>People</Text>
        <Text style={[s.thText, { flex: 1 }]}>Rooms</Text>
        <Text style={[s.thText, { flex: 2, textAlign: "right" }]}>Per person</Text>
        <Text style={[s.thText, { flex: 2, textAlign: "right" }]}>Total</Text>
      </View>
      {r.scenarios.map((row, i) => (
        <View key={row.people} style={[s.tr, i % 2 ? s.trAlt : {}, row.people === r.people ? { backgroundColor: C.saffron100 } : {}]}>
          <Text style={{ flex: 1, fontFamily: row.people === r.people ? "Helvetica-Bold" : "Helvetica" }}>{row.people}{row.people === r.people ? "  (this plan)" : ""}</Text>
          <Text style={{ flex: 1 }}>{row.rooms}</Text>
          <Text style={{ flex: 2, textAlign: "right" }}>{row.perPerson}</Text>
          <Text style={{ flex: 2, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{row.total}</Text>
        </View>
      ))}
    </View>
  );
}

export function TripDocument({ report: r }: { report: Report }): ReactElement {
  return (
    <Document title={`${r.title} | ${r.brand}`} author={r.brand} subject="Trip plan and cost estimate" creator={r.brand} producer={r.brand}>
      <Page size="A4" style={s.page}>
        <Cover r={r} />
        <View style={s.accent} fixed />
        <View style={s.footer} fixed>
          <Text style={s.footText}>{r.brand}  |  {r.title}</Text>
          <Text style={s.footText}>Prepared {r.generatedOn}</Text>
          <Text style={s.footText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

        <Split r={r} />
        <Hotels r={r} />

        <View break />
        <Heading title="Day by day" sub="Your plan with the stops, transfers and what each costs" />
        {r.itinerary.map((d) => <Day key={d.day} d={d} />)}

        <View break />
        <CostTables r={r} />
        <Scenarios r={r} />
        <Text style={s.disclaimer}>{r.disclaimer}</Text>

      </Page>
    </Document>
  );
}
