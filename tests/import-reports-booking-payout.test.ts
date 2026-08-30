import assert from "node:assert/strict";
import test from "node:test";

import {
  date,
  dedupeEntities,
  financeFields,
  materiallyEqual,
  mergeExisting,
  parseCSV,
  parseEntities,
} from "../supabase/functions/import-reports/parser.ts";

const header = [
  "Tipologia",
  "Numero prenotazione",
  "Check-in",
  "Checkout",
  "Nome dell'ospite",
  "Fornitore di servizi di pagamento",
  "Stato della prenotazione",
  "Valuta",
  "Stato del pagamento",
  "Importo",
  "Commissione",
  "VAT for online platform services",
  "Costo di transazione",
  "Netto",
  "Data del pagamento",
  "ID pagamento",
].join(",");

function entities(csv: string) {
  const parsed = parseCSV(csv);
  const items = parsed.rows.flatMap((row) =>
    parseEntities("booking", row.row, row.data, "test:booking.csv", parsed.format)
  );
  return { parsed, items: dedupeEntities(items) };
}

test("parses Italian abbreviated dates", () => {
  assert.equal(date("13 mar 2026"), "2026-03-13");
  assert.equal(date("9 ago 2026"), "2026-08-09");
  assert.equal(date("27 dic 2026"), "2026-12-27");
});

test("recognizes Booking payout rows without changing reservations", () => {
  const csv = [
    header,
    "Prenotazione,1111111111,13 mar 2026,17 mar 2026,Ospite,Booking.com Payments,ok,EUR,by_booking,501.00,-71.55,-17.40,-7.52,404.53,19 mar 2026,SAME-PAYOUT",
    ",3500000001,,18 mar 2026,,,,EUR,,,,,,-100.17,19 mar 2026,SAME-PAYOUT",
    "Prenotazione,2222222222,20 mar 2026,24 mar 2026,Ospite,Booking.com Payments,ok,EUR,by_booking,452.40,-65.46,-15.90,-6.79,364.25,26 mar 2026,SAME-PAYOUT",
  ].join("\n");

  const result = entities(csv);
  assert.equal(result.parsed.format, "booking_payout");
  assert.equal(result.items.length, 3);
  assert.equal(result.items.filter((item) => item.entity_type === "reservation").length, 0);
  assert.deepEqual(
    result.items.map((item) => item.external_key),
    [
      "reservation_payout:1111111111",
      "tax_withholding_adjustment:3500000001",
      "reservation_payout:2222222222",
    ],
  );

  const first = result.items[0].normalized;
  assert.equal(first.transaction_date, "2026-03-19");
  assert.equal(first.platform_commission, 71.55);
  assert.equal(first.vat_platform_services, 17.4);
  assert.equal(first.transaction_fee, 7.52);
  assert.equal(first.payout_amount, 404.53);

  const adjustment = result.items[1].normalized;
  assert.equal(adjustment.line_type, "tax_withholding_adjustment");
  assert.equal(adjustment.tax_withheld, 100.17);
  assert.equal(adjustment.payout_amount, -100.17);
});

test("repairs Booking rows that contain an undeclared withholding column", () => {
  const csv = [
    header,
    "Prenotazione,3333333333,25 lug 2026,27 lug 2026,Ospite,Booking.com Payments,ok,EUR,by_booking,322.80,-46.92,-65.69,-11.38,-4.84,193.97,30 lug 2026,PAYOUT-3",
  ].join("\n");

  const result = entities(csv);
  assert.equal(result.parsed.repaired_rows, 1);
  assert.equal(result.items.length, 1);
  assert.deepEqual(
    {
      tax: result.items[0].normalized.tax_withheld,
      vat: result.items[0].normalized.vat_platform_services,
      fee: result.items[0].normalized.transaction_fee,
      payout: result.items[0].normalized.payout_amount,
      date: result.items[0].normalized.transaction_date,
    },
    { tax: 65.69, vat: 11.38, fee: 4.84, payout: 193.97, date: "2026-07-30" },
  );
});

test("does not turn provenance changes into financial updates", () => {
  const existing = {
    source: "booking",
    external_ref: "3333333333",
    line_type: "reservation_payout",
    transaction_date: "2026-07-30",
    gross_amount: 322.8,
    platform_commission: 46.92,
    vat_platform_services: 11.38,
    transaction_fee: 4.84,
    tax_withheld: 65.69,
    payout_amount: 193.97,
    currency: "EUR",
    raw_origin: "booking_payouts_2026_csv",
  };
  const incoming = { ...existing, raw_origin: "manual:new-report.csv" };
  const merged = mergeExisting(existing, incoming, financeFields);
  assert.equal(merged.raw_origin, "booking_payouts_2026_csv");
  assert.equal(materiallyEqual(existing, merged, incoming, financeFields), true);
});

test("rejects unexplained extra columns", () => {
  const generic = "id,date,amount\n1,2026-01-01,10,unexpected";
  assert.throws(() => parseCSV(generic), /contiene 4 colonne/);
});
