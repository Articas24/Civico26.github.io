import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAILS = new Set([
  "stefanoalfonso@hotmail.it",
  "andrealfonso@live.it",
]);
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const clean = (value: unknown) => String(value ?? "").trim();
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const ascii = (value: unknown) =>
  clean(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^A-Z0-9 .,/()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function fixed(value: unknown, length: number, label: string, required = false) {
  const text = ascii(value);
  if (required && !text) throw new ApiError(`${label}: dato mancante`, 422);
  if (text.length > length) {
    throw new ApiError(`${label}: supera la lunghezza massima di ${length} caratteri`, 422);
  }
  return text.padEnd(length, " ");
}

function validDate(value: unknown, label: string) {
  const date = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new ApiError(`${label}: data non valida`, 422);
  }
  return date;
}

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T00:00:00Z`).getTime() / 86400000);
}

function ageOn(birthDate: string, onDate: string) {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [oy, om, od] = onDate.split("-").map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age--;
  return age;
}

function isReggioResident(guest: Record<string, unknown>) {
  const country = ascii(guest.residence_country);
  if (!["ITALIA", "ITALY", "IT"].includes(country)) return false;
  const city = ascii(guest.residence_city).replace(/\bDI\b/g, "").replace(/\s+/g, " ").trim();
  return city === "REGGIO CALABRIA";
}

function touristTaxLine(
  guest: Record<string, unknown>,
  checkin: string,
  checkout: string,
) {
  const birthDate = validDate(guest.birth_date, "Data di nascita");
  const fields = [
    checkin,
    checkout,
    fixed(guest.last_name, 30, "Cognome", true),
    fixed(guest.first_name, 30, "Nome", true),
    " ".repeat(16), // Codice fiscale: non raccolto e facoltativo.
    birthDate,
    " ".repeat(50), // Ente rilascio documento: facoltativo.
    " ".repeat(30), // Numero documento: facoltativo.
    " ".repeat(10), // Data rilascio documento: facoltativa.
    fixed(guest.birth_city, 30, "Comune di nascita"),
    fixed(guest.birth_province, 2, "Provincia di nascita"),
    fixed(guest.birth_country, 30, "Stato di nascita", true),
    " ".repeat(5), // CAP residenza: non raccolto e facoltativo.
    fixed(guest.residence_city, 30, "Comune di residenza"),
    " ".repeat(2), // Provincia di residenza: non raccolta e facoltativa.
    " ".repeat(30), // Telefono: non necessario per il tracciato.
    " ".repeat(100), // Email: non necessaria per il tracciato.
    "0", // Il file contiene solo soggetti paganti, quindi non residenti a Reggio.
  ];
  const line = fields.join("");
  const bytes = new TextEncoder().encode(line).length;
  if (line.length !== 426 || bytes !== 426) {
    throw new Error(`Errore interno tracciato tassa di soggiorno: riga di ${line.length} caratteri/${bytes} byte`);
  }
  return line;
}

async function touristTaxFile(req: Request, body: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = req.headers.get("authorization") || "";
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user || !ADMIN_EMAILS.has(String(user.email || "").toLowerCase())) {
    throw new ApiError("Non autorizzato", 403);
  }

  const sessionId = clean(body.session_id);
  if (!sessionId) throw new ApiError("Pre-check-in mancante", 400);
  const db = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: sessionError } = await db
    .from("precheckin_sessions")
    .select("id,calendar_entry_id,status,checkin_date,checkout_date")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) throw new ApiError("Pre-check-in non trovato", 404);
  if (!["submitted", "verified"].includes(session.status)) {
    throw new ApiError("Il pre-check-in non è ancora stato compilato", 409);
  }

  const [{ data: guests, error: guestError }, { data: entry, error: entryError }] =
    await Promise.all([
      db.from("precheckin_guests").select("*").eq("session_id", sessionId).order("guest_order"),
      db.from("calendar_entries").select("id,start_date,end_date").eq("id", session.calendar_entry_id).maybeSingle(),
    ]);
  if (guestError) throw guestError;
  if (entryError) throw entryError;
  if (!entry) throw new ApiError("Prenotazione collegata non trovata", 404);
  if (!(guests || []).length) throw new ApiError("Nessun ospite nel pre-check-in", 409);

  const checkin = validDate(session.checkin_date || entry.start_date, "Check-in");
  const checkout = validDate(session.checkout_date || entry.end_date, "Check-out");
  if (dayNumber(checkout) <= dayNumber(checkin)) {
    throw new ApiError("Le date del soggiorno non sono valide", 422);
  }

  const payingGuests = (guests || []).filter((guest: Record<string, unknown>) => {
    const birthDate = validDate(guest.birth_date, "Data di nascita");
    const age = ageOn(birthDate, checkin);
    if (age < 0) throw new ApiError("Data di nascita successiva al check-in", 422);
    return age >= 14 && !isReggioResident(guest);
  });
  if (!payingGuests.length) {
    throw new ApiError("Nessun ospite soggetto alla tassa: non è necessario generare il TXT", 409);
  }

  const lines = payingGuests.map((guest: Record<string, unknown>) =>
    touristTaxLine(guest, checkin, checkout)
  );
  const text = lines.join("\r\n");
  const expectedBytes = lines.length * 426 + Math.max(0, lines.length - 1) * 2;
  if (new TextEncoder().encode(text).length !== expectedBytes || text.endsWith("\r\n")) {
    throw new Error("Errore interno nei separatori del tracciato tassa di soggiorno");
  }

  const leadSurname = ascii((guests || [])[0]?.last_name).replace(/\s+/g, "_").slice(0, 30) || "Ospite";
  const filename = `TassaSoggiorno_Civico26_${checkin}_${leadSurname}.txt`;
  return new Response(text, {
    status: 200,
    headers: {
      ...CORS,
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

const fixRoss = (text: string) =>
  text
    .replaceAll("<tipoturismo>NON DICHIARATO</tipoturismo>", "<tipoturismo>Non specificato</tipoturismo>")
    .replaceAll("<mezzotrasporto>NON DICHIARATO</mezzotrasporto>", "<mezzotrasporto>Non Specificato</mezzotrasporto>");

async function callOld(req: Request, body: unknown) {
  const base = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  return fetch(`${base}/functions/v1/precheckin-export`, {
    method: "POST",
    headers: {
      authorization: req.headers.get("authorization") || "",
      apikey: anon,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const format = String(body.format || "");
    if (!["alloggiati", "ross1000", "validate", "tourist_tax"].includes(format)) {
      return json({ error: "Formato non valido" }, 400);
    }
    if (format === "tourist_tax") return await touristTaxFile(req, body);

    if (format === "alloggiati") {
      const response = await callOld(req, body);
      const text = await response.text();
      if (!response.ok) {
        return new Response(text, {
          status: response.status,
          headers: { ...CORS, "content-type": response.headers.get("content-type") || "application/json" },
        });
      }
      return new Response(text, {
        status: 200,
        headers: {
          ...CORS,
          "content-type": "text/plain; charset=utf-8",
          "content-disposition": response.headers.get("content-disposition") || 'attachment; filename="Alloggiati_Civico26.txt"',
          "cache-control": "no-store",
        },
      });
    }

    if (format === "ross1000") {
      const response = await callOld(req, body);
      const text = await response.text();
      if (!response.ok) {
        return new Response(text, {
          status: response.status,
          headers: { ...CORS, "content-type": response.headers.get("content-type") || "application/json" },
        });
      }
      const fixed = fixRoss(text);
      if (fixed.includes("NON DICHIARATO")) return json({ error: "ROSS1000: valore statistico non riconosciuto" }, 500);
      if (!fixed.includes("<tipoturismo>Non specificato</tipoturismo>") ||
        !fixed.includes("<mezzotrasporto>Non Specificato</mezzotrasporto>")) {
        return json({ error: "ROSS1000: campi Tipo Turismo/Mezzo Trasporto mancanti" }, 500);
      }
      return new Response(fixed, {
        status: 200,
        headers: {
          ...CORS,
          "content-type": "application/xml; charset=utf-8",
          "content-disposition": response.headers.get("content-disposition") || 'attachment; filename="ROSS1000_Civico26.xml"',
          "cache-control": "no-store",
        },
      });
    }

    const validationResponse = await callOld(req, body);
    const validation = await validationResponse.json().catch(() => ({}));
    if (!validationResponse.ok) throw new Error(validation.error || "Validazione interna non superata");
    const rossResponse = await callOld(req, { ...body, format: "ross1000" });
    const raw = await rossResponse.text();
    if (!rossResponse.ok) throw new Error("Impossibile generare XML ROSS1000 per il controllo");
    const fixed = fixRoss(raw);
    const tourism = (fixed.match(/<tipoturismo>Non specificato<\/tipoturismo>/g) || []).length;
    const transport = (fixed.match(/<mezzotrasporto>Non Specificato<\/mezzotrasporto>/g) || []).length;
    if (tourism !== Number(validation.ross1000?.arrivi || 0) ||
      transport !== Number(validation.ross1000?.arrivi || 0)) {
      throw new Error("ROSS1000: Tipo Turismo/Mezzo Trasporto non valorizzati con una definizione riconosciuta");
    }
    validation.ross1000 = validation.ross1000 || {};
    validation.ross1000.controlli = [
      ...(validation.ross1000.controlli || []),
      "Tipo Turismo = Non specificato (definizione riconosciuta)",
      "Mezzo Trasporto = Non Specificato (definizione riconosciuta)",
    ];
    validation.ross1000.valori_statistici = {
      tipo_turismo: "Non specificato",
      mezzo_trasporto: "Non Specificato",
    };
    validation.note = "Verifica interna avanzata completata. Nessun dato trasmesso a Questura o ROSS1000.";
    return json(validation);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return json({ error: error instanceof Error ? error.message : String(error) }, status);
  }
});
