export type CsvFormat = "booking_payout" | "generic";

export type Entity = {
  row_number: number;
  entity_type: "reservation" | "finance";
  source: string;
  external_key: string | null;
  identity: string;
  normalized: Record<string, unknown>;
  raw: Record<string, unknown>;
  preconflict?: string | null;
};

export type ParsedCsv = {
  rows: Array<{ row: number; data: Record<string, string> }>;
  delimiter: string;
  format: CsvFormat;
  repaired_rows: number;
};

export function norm(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clean(s: unknown) {
  const v = String(s ?? "").trim();
  return v === "" ? null : v;
}

function num(v: unknown): number | null {
  let s = String(v ?? "").trim();
  if (!s || /^(?:-|—|n\/a|null)$/i.test(s)) return null;
  s = s.replace(/[€$£%\s]/g, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function int(v: unknown) {
  const n = num(v);
  return n === null ? null : Math.round(n);
}

export function date(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  if ((m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/))) {
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  const normalized = norm(s);
  if ((m = normalized.match(/^(\d{1,2}) ([a-z]+) (\d{4})$/))) {
    const months: Record<string, number> = {
      gen: 1, gennaio: 1, jan: 1, january: 1,
      feb: 2, febbraio: 2, february: 2,
      mar: 3, marzo: 3, march: 3,
      apr: 4, aprile: 4, april: 4,
      mag: 5, maggio: 5, may: 5,
      giu: 6, giugno: 6, jun: 6, june: 6,
      lug: 7, luglio: 7, jul: 7, july: 7,
      ago: 8, agosto: 8, aug: 8, august: 8,
      set: 9, sett: 9, settembre: 9, sep: 9, sept: 9, september: 9,
      ott: 10, ottobre: 10, oct: 10, october: 10,
      nov: 11, novembre: 11, november: 11,
      dic: 12, dicembre: 12, dec: 12, december: 12,
    };
    const month = months[m[2]];
    if (month) return `${m[3]}-${String(month).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function days(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const x = new Date(a + "T00:00:00Z");
  const y = new Date(b + "T00:00:00Z");
  return Math.max(0, Math.round((y.getTime() - x.getTime()) / 86400000));
}

function status(v: unknown, source: string) {
  const s = norm(v);
  if (/cancel|cancell|annull|no show/.test(s)) return "cancelled";
  if (/reject|rifiut/.test(s)) return "rejected";
  if (/complete|completed|soggiorn|past/.test(s)) return "completed";
  return source === "booking" ? "confirmed" : "completed";
}

export function detectDelimiter(text: string) {
  const line = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((x) => x.trim()) || "";
  const counts: Array<[string, number]> = [
    [";", (line.match(/;/g) || []).length],
    [",", (line.match(/,/g) || []).length],
    ["\t", (line.match(/\t/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][0];
}

function isBookingPayoutHeader(heads: string[]) {
  const set = new Set(heads);
  return [
    "tipologia",
    "numero prenotazione",
    "netto",
    "data del pagamento",
    "id pagamento",
  ].every((header) => set.has(header));
}

export function parseCSV(text: string): ParsedCsv {
  text = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const rawRows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim() !== "")) rawRows.push(row);
      row = [];
    } else {
      cell += c;
    }
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rawRows.push(row);

  if (quoted) throw new Error("CSV non valido: virgolette non chiuse");
  if (rawRows.length < 2) throw new Error("Il file non contiene righe dati");

  const heads = rawRows[0].map(norm);
  if (new Set(heads.filter(Boolean)).size < 2) {
    throw new Error("Intestazioni CSV non riconosciute");
  }

  const format: CsvFormat = isBookingPayoutHeader(heads) ? "booking_payout" : "generic";
  const commissionIndex = heads.indexOf("commissione");
  const missingWithholding = !heads.includes("ritenuta sugli affitti a breve termine");
  let repairedRows = 0;

  const rows = rawRows.slice(1).map((values, i) => {
    let rowHeads = heads;
    if (
      format === "booking_payout" &&
      missingWithholding &&
      commissionIndex >= 0 &&
      values.length === heads.length + 1
    ) {
      rowHeads = [
        ...heads.slice(0, commissionIndex + 1),
        "ritenuta sugli affitti a breve termine",
        ...heads.slice(commissionIndex + 1),
      ];
      repairedRows++;
    } else if (values.length > heads.length) {
      throw new Error(
        `La riga ${i + 2} contiene ${values.length} colonne, ma l'intestazione ne contiene ${heads.length}`,
      );
    }

    const data: Record<string, string> = {};
    rowHeads.forEach((header, j) => {
      if (header) data[header] = values[j] ?? "";
    });
    return { row: i + 2, data };
  });

  return { rows, delimiter, format, repaired_rows: repairedRows };
}

function pick(o: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const key = norm(alias);
    if (
      Object.prototype.hasOwnProperty.call(o, key) &&
      String(o[key]).trim() !== ""
    ) {
      return o[key];
    }
  }
  return null;
}

const A = {
  id: ["reservation id", "reservation number", "booking number", "booking id", "prenotazione", "numero prenotazione", "numero di prenotazione", "codice conferma", "confirmation code", "confirmation code reservation"],
  guest: ["guest name", "guest", "nome ospite", "nome dell ospite", "nome del cliente", "customer name"],
  start: ["check in", "check-in", "arrival", "arrival date", "data check in", "data di arrivo", "start date", "data inizio"],
  end: ["check out", "check-out", "checkout", "departure", "departure date", "data check out", "data di partenza", "end date", "data fine"],
  booked: ["booking date", "booked at", "reservation date", "data prenotazione", "data di prenotazione", "created"],
  nights: ["nights", "notti", "number of nights"],
  listing: ["listing", "listing name", "property", "property name", "struttura", "nome struttura", "accommodation"],
  adults: ["adults", "adulti"],
  children: ["children", "bambini"],
  infants: ["infants", "neonati"],
  persons: ["guests", "ospiti", "persons", "persone", "number of guests"],
  state: ["status", "reservation status", "stato", "stato della prenotazione"],
  currency: ["currency", "valuta"],
  gross: ["gross amount", "gross earnings", "gross", "total price", "total amount", "importo", "importo lordo", "lordo", "prezzo totale", "reservation amount"],
  earnings: ["earnings", "host earnings", "net earnings", "guadagni", "guadagno", "ricavi", "net revenue"],
  commission: ["commission", "platform commission", "booking commission", "host fee", "service fee", "commissione", "commissioni", "costi del servizio"],
  vat: ["vat", "vat on commission", "vat platform services", "vat for online platform services", "iva", "iva commissione", "iva sui servizi"],
  fee: ["transaction fee", "payment fee", "processing fee", "costo di transazione", "costo transazione", "costi transazione", "commissione pagamento"],
  tax: ["tax withheld", "withholding tax", "ritenuta", "ritenuta fiscale", "ritenuta sugli affitti a breve termine", "cedolare secca", "withheld tax"],
  payout: ["payout", "paid out", "payout amount", "net payout", "netto", "importo versato", "pagamento", "accredito"],
  transDate: ["transaction date", "payout date", "payment date", "data del pagamento", "data transazione", "data pagamento", "data accredito"],
  genericDate: ["date", "data"],
  type: ["type", "transaction type", "tipologia", "tipo", "tipo transazione", "details", "dettagli"],
  invoice: ["invoice number", "invoice", "numero fattura"],
  ref: ["transaction id", "transaction reference", "payout id", "id pagamento", "payment reference", "reference", "riferimento", "id transazione"],
};

function p(o: Record<string, string>, key: keyof typeof A) {
  return pick(o, A[key]);
}

function compact(o: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  );
}

function finType(raw: unknown) {
  const s = norm(raw);
  if (/tax|withhold|riten|cedolare/.test(s)) return "tax_withholding_adjustment";
  if (/commission.*adjust|adjust.*commission|rettif.*commission/.test(s)) return "commission_adjustment";
  if (/cancel.*penal|penal.*cancel/.test(s)) return "cancellation_penalty";
  if (/resolution|adjust|correz|rettif|rimbor/.test(s)) return "resolution_adjustment";
  return "reservation_payout";
}

function expense(v: number | null, source: string) {
  return v === null ? null : source === "booking" ? Math.abs(v) : v;
}

export function parseEntities(
  source: string,
  rowNo: number,
  o: Record<string, string>,
  origin: string,
  format: CsvFormat = "generic",
): Entity[] {
  const out: Entity[] = [];
  const id = clean(p(o, "id"));
  const start = date(p(o, "start"));
  const end = date(p(o, "end"));
  const nights = int(p(o, "nights")) ?? days(start, end);
  const currency = clean(p(o, "currency")) || "EUR";
  const gross = num(p(o, "gross"));
  const earnings = num(p(o, "earnings"));
  const commission = num(p(o, "commission"));
  const vat = num(p(o, "vat"));
  const fee = num(p(o, "fee"));
  const tax = num(p(o, "tax"));
  const payout = num(p(o, "payout"));
  const commissionCost = expense(commission, source);
  const vatCost = expense(vat, source);
  const feeCost = expense(fee, source);
  const taxCost = expense(tax, source);
  const booked = date(p(o, "booked"));
  const guest = clean(p(o, "guest"));
  const listing = clean(p(o, "listing"));
  const stateRaw = clean(p(o, "state"));
  const isBookingPayout = source === "booking" && format === "booking_payout";
  const explicitReservation = !!(
    !isBookingPayout &&
    id &&
    start &&
    end &&
    nights !== null &&
    (source === "airbnb" || guest || booked || listing || stateRaw)
  );

  if (explicitReservation) {
    const reservation = compact({
      source,
      external_id: id,
      status: status(stateRaw, source),
      guest_name: guest,
      start_date: start,
      end_date: end,
      nights,
      booked_at: booked,
      listing_name: listing,
      accommodation_scope: "entire_home",
      adults: int(p(o, "adults")),
      children: int(p(o, "children")),
      infants: int(p(o, "infants")),
      persons: int(p(o, "persons")),
      earnings: earnings ?? (
        source === "booking" && gross !== null && commissionCost !== null
          ? gross - commissionCost - (feeCost || 0)
          : null
      ),
      gross_amount: source === "booking" ? gross : null,
      commission_amount: source === "booking" ? commissionCost : null,
      payment_fee: source === "booking" ? feeCost : null,
      net_after_fees: earnings,
      currency,
      earnings_basis: "report",
      invoice_number: clean(p(o, "invoice")),
      raw_origin: origin,
    });
    out.push({
      row_number: rowNo,
      entity_type: "reservation",
      source,
      external_key: id,
      identity: `reservation|${source}|id|${id}`,
      normalized: reservation,
      raw: o,
    });
  }

  const typeRaw = clean(p(o, "type"));
  const explicitTransactionDate = date(p(o, "transDate"));
  const genericDate = source === "airbnb" ? date(p(o, "genericDate")) : null;
  const hasFinance = [gross, commission, vat, fee, tax, payout].some((v) => v !== null);
  const explicitFinance = hasFinance && (
    !!explicitTransactionDate ||
    payout !== null ||
    !!typeRaw ||
    (source === "airbnb" && !!genericDate)
  );

  if (explicitFinance) {
    let lineType = finType(typeRaw);
    if (
      isBookingPayout &&
      !typeRaw &&
      id &&
      !start &&
      payout !== null &&
      payout < 0
    ) {
      lineType = "tax_withholding_adjustment";
    }

    const reportReference = clean(p(o, "ref"));
    const externalRef = isBookingPayout
      ? id || reportReference
      : reportReference || id;
    const transactionDate = explicitTransactionDate || genericDate || end || start;

    if (transactionDate) {
      let platformCommission = commissionCost ?? 0;
      let taxWithheld = taxCost ?? 0;
      if (lineType === "commission_adjustment" && commission === null && payout !== null) {
        platformCommission = -payout;
      }
      if (lineType === "tax_withholding_adjustment" && tax === null && payout !== null) {
        taxWithheld = Math.abs(payout);
      }

      const finance = compact({
        source,
        external_ref: externalRef,
        line_type: lineType,
        transaction_date: transactionDate,
        stay_start: start,
        stay_end: end,
        gross_amount: gross ?? 0,
        platform_commission: platformCommission,
        vat_platform_services: vatCost ?? 0,
        transaction_fee: feeCost ?? 0,
        tax_withheld: taxWithheld,
        payout_amount: payout ?? (earnings !== null ? earnings : null),
        currency,
        raw_origin: origin,
      });
      const identity = externalRef
        ? `finance|${source}|${lineType}|ref|${externalRef}`
        : `finance|${source}|${lineType}|${transactionDate}|${start || ""}|${end || ""}|${norm(typeRaw)}`;
      out.push({
        row_number: rowNo,
        entity_type: "finance",
        source,
        external_key: externalRef ? `${lineType}:${externalRef}` : null,
        identity,
        normalized: finance,
        raw: o,
      });
    }
  }

  return out;
}

export function sameVal(a: unknown, b: unknown) {
  if (a === null || a === undefined || a === "") {
    return b === null || b === undefined || b === "";
  }
  const an = typeof a === "number" ? a : Number(a);
  const bn = typeof b === "number" ? b : Number(b);
  if (
    Number.isFinite(an) &&
    Number.isFinite(bn) &&
    String(a).match(/^-?[\d.,]+$/) &&
    String(b).match(/^-?[\d.,]+$/)
  ) {
    return Math.abs(an - bn) < 0.005;
  }
  return String(a) === String(b);
}

function mergeEntity(a: Entity, b: Entity): Entity {
  const normalized = { ...a.normalized };
  let conflict = a.preconflict || null;
  for (const [key, value] of Object.entries(b.normalized)) {
    if (value === null || value === undefined || value === "") continue;
    if (
      Object.prototype.hasOwnProperty.call(normalized, key) &&
      normalized[key] !== null &&
      normalized[key] !== undefined &&
      normalized[key] !== "" &&
      !sameVal(normalized[key], value) &&
      key !== "raw_origin"
    ) {
      conflict = `Lo stesso identificativo compare più volte nel file con valori diversi (${key})`;
    } else {
      normalized[key] = value;
    }
  }
  const rows = [
    ...(Array.isArray((a.raw as { __merged_rows?: unknown[] }).__merged_rows)
      ? (a.raw as { __merged_rows: unknown[] }).__merged_rows
      : [a.raw]),
    b.raw,
  ];
  return {
    ...a,
    normalized,
    raw: { __merged_rows: rows },
    preconflict: conflict,
  };
}

export function dedupeEntities(items: Entity[]) {
  const map = new Map<string, Entity>();
  for (const entity of items) {
    if (!map.has(entity.identity)) {
      map.set(entity.identity, entity);
    } else {
      map.set(entity.identity, mergeEntity(map.get(entity.identity)!, entity));
    }
  }
  return [...map.values()];
}

export const bookingFields = [
  "source", "external_id", "status", "guest_name", "start_date", "end_date",
  "nights", "booked_at", "listing_name", "accommodation_scope", "adults",
  "children", "infants", "earnings", "currency", "earnings_basis",
  "gross_amount", "commission_amount", "payment_fee", "net_after_fees",
  "persons", "invoice_number", "tax_withheld", "vat_platform_services",
  "payout_amount",
];

export const financeFields = [
  "source", "external_ref", "line_type", "transaction_date", "stay_start",
  "stay_end", "gross_amount", "platform_commission", "vat_platform_services",
  "transaction_fee", "tax_withheld", "payout_amount", "currency",
];

export function mergeExisting(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  fields: string[],
) {
  const out = { ...existing };
  for (const key of fields) {
    if (
      Object.prototype.hasOwnProperty.call(incoming, key) &&
      incoming[key] !== null &&
      incoming[key] !== undefined &&
      incoming[key] !== ""
    ) {
      out[key] = incoming[key];
    }
  }
  return out;
}

export function materiallyEqual(
  existing: Record<string, unknown>,
  merged: Record<string, unknown>,
  incoming: Record<string, unknown>,
  fields: string[],
) {
  return fields.every(
    (key) =>
      !Object.prototype.hasOwnProperty.call(incoming, key) ||
      sameVal(existing[key], merged[key]),
  );
}
