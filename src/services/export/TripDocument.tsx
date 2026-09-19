import { Document, Page, Path, Circle, Rect, Line, Polyline, Svg, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ICON_NODES } from "@/domain/iconNodes";
import type { Report } from "./report";

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#0f766e" },
  subtitle: { marginTop: 4, marginBottom: 14, color: "#6b7280" },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, color: "#0f766e" },
  day: { marginBottom: 6 },
  dayTitle: { fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderColor: "#e5e7eb", paddingVertical: 4 },
  head: { backgroundColor: "#f0fdfa", fontFamily: "Helvetica-Bold" },
  cIcon: { width: 22 },
  cLabel: { flex: 3 },
  cNum: { flex: 2, textAlign: "right" },
  cQty: { flex: 1, textAlign: "right" },
  total: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 8, textAlign: "right" },
});

const TAGS = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline } as const;

function Icon({ name }: { name: string }) {
  const nodes = ICON_NODES[name] ?? [];
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      {nodes.map(([tag, attrs], i) => {
        const Tag = TAGS[tag as keyof typeof TAGS] as React.ElementType | undefined;
        return Tag ? (
          <Tag key={i} {...attrs} stroke="#0f766e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ) : null;
      })}
    </Svg>
  );
}

export function TripDocument({ report }: { report: Report }) {
  return (
    <Document title={report.title}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{report.title}</Text>
        <Text style={s.subtitle}>{report.subtitle}</Text>

        <Text style={s.h2}>Itinerary</Text>
        {report.itinerary.map((d, i) => (
          <View key={i} style={s.day} wrap={false}>
            <Text style={s.dayTitle}>{d.title}{d.date ? `  (${d.date})` : ""}</Text>
            {d.places.map((p, j) => (
              <View key={j} style={{ marginTop: 2 }}>
                <Text style={s.dayTitle}>{"  -  "}{p.name}<Text style={{ fontFamily: "Helvetica", color: "#6b7280" }}>{"   "}{p.detail}</Text></Text>
                {p.activities.map((a, k) => <Text key={k}>{"        o  "}{a.name}<Text style={{ color: "#6b7280" }}>{"   "}{a.detail}</Text></Text>)}
              </View>
            ))}
            {d.notes ? <Text>{d.notes}</Text> : null}
          </View>
        ))}

        <Text style={s.h2}>Cost breakdown</Text>
        {report.costSections.map((sec) => (
          <View key={sec.title} style={{ marginBottom: 8 }}>
            <Text style={s.dayTitle}>
              {sec.title}
              {sec.perDay ? `  (per day ${sec.perDay}, per person per day ${sec.perPersonPerDay})` : ""}
            </Text>
            <View style={[s.row, s.head]}>
              <Text style={s.cIcon} />
              <Text style={s.cLabel}>Item</Text>
              <Text style={s.cNum}>Unit price</Text>
              <Text style={s.cQty}>Qty</Text>
              <Text style={s.cNum}>Per person</Text>
              <Text style={s.cNum}>Total</Text>
            </View>
            {sec.rows.map((r, i) => (
              <View key={i} style={s.row} wrap={false}>
                <View style={s.cIcon}><Icon name={r.icon} /></View>
                <Text style={s.cLabel}>{r.label}</Text>
                <Text style={s.cNum}>{r.unitPrice}</Text>
                <Text style={s.cQty}>{r.quantity}</Text>
                <Text style={s.cNum}>{r.perPerson}</Text>
                <Text style={s.cNum}>{r.total}</Text>
              </View>
            ))}
            <Text style={[s.total, { fontSize: 9, marginTop: 4 }]}>{sec.title} subtotal: {sec.total}</Text>
          </View>
        ))}
        <Text style={s.total}>Grand total: {report.grandTotal}</Text>
        <Text style={[s.total, { fontSize: 9, marginTop: 2 }]}>Per person: {report.perPerson}</Text>

        <Text style={s.h2}>If N people go</Text>
        <View style={[s.row, s.head]}>
          <Text style={s.cQty}>People</Text>
          <Text style={s.cQty}>Rooms</Text>
          <Text style={s.cNum}>Per person</Text>
          <Text style={s.cNum}>Total</Text>
        </View>
        {report.scenarios.map((r) => (
          <View key={r.people} style={s.row} wrap={false}>
            <Text style={s.cQty}>{r.people}</Text>
            <Text style={s.cQty}>{r.rooms}</Text>
            <Text style={s.cNum}>{r.perPerson}</Text>
            <Text style={s.cNum}>{r.total}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
