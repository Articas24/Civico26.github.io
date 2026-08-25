import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_EMAILS = new Set(["stefanoalfonso@hotmail.it", "andrealfonso@live.it"]);
const PHOTO_TTL_HOURS = 24;
const CORS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });
const clean = (v) => String(v ?? "").trim();
const enc = new TextEncoder();
const errText = (e) => e instanceof Error ? e.message : (typeof e === "object" ? JSON.stringify(e) : String(e));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c] || c));
function dateIt(v) { const s=String(v||""); const [y,m,d]=s.split("-"); return y&&m&&d ? `${d}/${m}/${y}` : s; }

async function sha256(v) {
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(v));
  return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a, b) {
  const left = enc.encode(String(a || ""));
  const right = enc.encode(String(b || ""));
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
function newToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function extFor(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  return "jpg";
}
function isItaly(v) { return /^(italia|italy|it)$/i.test(v); }
function validStayDates(checkin, checkout) {
  if (!ISO_DATE.test(checkin) || !ISO_DATE.test(checkout)) return false;
  const a = Date.parse(`${checkin}T00:00:00Z`);
  const b = Date.parse(`${checkout}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) && b > a;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({ error: "Configurazione server incompleta" }, 500);
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  async function sendPrecheckinNotification(entry, guestCount) {
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const fromEmail = Deno.env.get("CIVICO26_FROM_EMAIL") || "";
    if (!resendKey || !fromEmail) {
      console.warn("precheckin_notification_skipped", "Resend non configurato");
      return false;
    }
    const checkin = entry.start_date;
    const checkout = entry.end_date;
    const bookingName = clean(entry.guest_name) || "Prenotazione Civico 26";
    const subject = `Pre-check-in completato · ${dateIt(checkin)} → ${dateIt(checkout)}`;
    const html = `<h2>Pre-check-in completato · Civico 26</h2>
      <p>Un ospite ha appena inviato i dati richiesti per la registrazione.</p>
      <p><strong>Prenotazione:</strong> ${esc(bookingName)}<br>
      <strong>Check-in:</strong> ${esc(dateIt(checkin))}<br>
      <strong>Check-out:</strong> ${esc(dateIt(checkout))}<br>
      <strong>Ospiti inseriti:</strong> ${esc(guestCount)}${entry.source ? `<br><strong>Canale:</strong> ${esc(entry.source)}` : ""}</p>
      <p>Per motivi di sicurezza, questa email non contiene estremi o immagini dei documenti.</p>
      <p><a href="https://www.civico26reggiocalabria.it/admin.html">Apri il pannello admin di Civico 26</a></p>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [...ADMIN_EMAILS],
        subject,
        html,
        reply_to: [...ADMIN_EMAILS],
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.message || `Resend HTTP ${r.status}`);
    return true;
  }

  async function purgeExpired() {
    const now = new Date().toISOString();
    const { data, error } = await db.from("precheckin_sessions")
      .select("id,document_photo_path")
      .lte("photo_expires_at", now)
      .limit(100);
    if (error) throw error;
    const rows = (data || []).filter((r) => r.document_photo_path);
    if (!rows.length) return 0;
    const paths = rows.map((r) => r.document_photo_path);
    const { error: removeError } = await db.storage.from("precheckin-docs").remove(paths);
    if (removeError) throw removeError;
    for (const row of rows) {
      const { error: updateError } = await db.from("precheckin_sessions").update({
        document_photo_path: null,
        photo_expires_at: null,
        photo_deleted_at: now,
        updated_at: now,
      }).eq("id", row.id);
      if (updateError) throw updateError;
    }
    return rows.length;
  }

  async function byPublicToken(token) {
    if (token.length < 32) return null;
    const tokenHash = await sha256(token);
    const { data, error } = await db.from("precheckin_sessions").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function requireAdmin() {
    const auth = req.headers.get("authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return null;
    const { data: { user }, error } = await db.auth.getUser(jwt);
    if (error || !user) return null;
    if (!ADMIN_EMAILS.has(String(user.email || "").toLowerCase())) return null;
    return user;
  }

  async function erasePhoto(session) {
    if (session?.document_photo_path) {
      const { error } = await db.storage.from("precheckin-docs").remove([session.document_photo_path]);
      if (error) throw error;
    }
    const now = new Date().toISOString();
    const { error } = await db.from("precheckin_sessions").update({
      document_photo_path: null,
      photo_expires_at: null,
      photo_deleted_at: now,
      updated_at: now,
    }).eq("id", session.id);
    if (error) throw error;
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      const cronBody = await req.clone().json().catch(() => ({}));
      if (clean(cronBody.action) === "cleanup-expired-photos") {
        const expectedSecret = Deno.env.get("PRECHECKIN_CRON_SECRET") || "";
        const providedSecret = req.headers.get("x-cron-secret") || "";
        if (!expectedSecret) return json({ ok: false, error: "Cron secret non configurato" }, 503);
        if (!providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
          return json({ ok: false, error: "Non autorizzato" }, 403);
        }
        const deletedPhotos = await purgeExpired();
        return json({ ok: true, deleted_photos: deletedPhotos });
      }
    }

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      if (clean(form.get("action")) !== "submit") return json({ error: "Azione non valida" }, 400);
      const session = await byPublicToken(clean(form.get("token")));
      if (!session) return json({ error: "Link non valido o scaduto" }, 404);
      if (["verified", "closed"].includes(session.status)) return json({ error: "Pre-check-in già chiuso" }, 410);

      const { data: entry, error: entryError } = await db.from("calendar_entries")
        .select("id,start_date,end_date,status,guest_name,source")
        .eq("id", session.calendar_entry_id).maybeSingle();
      if (entryError) throw entryError;
      if (!entry || entry.status !== "booked") return json({ error: "Prenotazione non disponibile" }, 409);

      let guests = [];
      try { guests = JSON.parse(clean(form.get("guests")) || "[]"); }
      catch { return json({ error: "Dati ospiti non validi" }, 400); }
      if (!Array.isArray(guests) || guests.length < 1 || guests.length > 20) return json({ error: "Inserisci almeno un ospite" }, 400);

      for (let i = 0; i < guests.length; i++) {
        const g = guests[i] || {};
        for (const k of ["first_name", "last_name", "sex", "birth_date", "birth_country", "citizenship", "residence_country", "residence_city"]) {
          if (!clean(g[k])) return json({ error: `Ospite ${i + 1}: campo obbligatorio mancante` }, 400);
        }
        if (!["M", "F"].includes(clean(g.sex))) return json({ error: `Ospite ${i + 1}: sesso non valido` }, 400);
        if (isItaly(clean(g.birth_country)) && (!clean(g.birth_city) || !clean(g.birth_province))) return json({ error: `Ospite ${i + 1}: comune e provincia di nascita obbligatori` }, 400);
        if (i === 0) {
          for (const k of ["document_type", "document_number", "document_issuer"]) {
            if (!clean(g[k])) return json({ error: "Completa gli estremi del documento dell’ospite principale" }, 400);
          }
        }
      }

      const file = form.get("photo");
      let newPath = null;
      if (file instanceof File && file.size > 0) {
        if (file.size > 8 * 1024 * 1024) return json({ error: "La foto supera 8 MB" }, 400);
        const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
        if (!allowed.has(file.type)) return json({ error: "Formato foto non supportato" }, 400);
        newPath = `${session.id}/${crypto.randomUUID()}.${extFor(file.type)}`;
        const { error } = await db.storage.from("precheckin-docs").upload(newPath, file, { contentType: file.type, upsert: false });
        if (error) throw error;
      } else if (!session.document_photo_path) {
        return json({ error: "Carica la foto del documento dell’ospite principale" }, 400);
      }

      const normalized = guests.map((g, i) => ({
        session_id: session.id,
        guest_order: i + 1,
        guest_role: i === 0 ? "lead" : (clean(g.guest_role) === "family" ? "family" : "group_member"),
        first_name: clean(g.first_name),
        last_name: clean(g.last_name),
        sex: clean(g.sex),
        birth_date: clean(g.birth_date),
        birth_country: clean(g.birth_country),
        birth_city: clean(g.birth_city) || null,
        birth_province: clean(g.birth_province) || null,
        citizenship: clean(g.citizenship),
        residence_country: clean(g.residence_country),
        residence_city: clean(g.residence_city),
        document_type: i === 0 ? clean(g.document_type) : null,
        document_number: i === 0 ? clean(g.document_number) : null,
        document_issuer: i === 0 ? clean(g.document_issuer) : null,
      }));

      const { error: deleteGuestsError } = await db.from("precheckin_guests").delete().eq("session_id", session.id);
      if (deleteGuestsError) {
        if (newPath) await db.storage.from("precheckin-docs").remove([newPath]);
        throw deleteGuestsError;
      }
      const { error: insertGuestsError } = await db.from("precheckin_guests").insert(normalized);
      if (insertGuestsError) {
        if (newPath) await db.storage.from("precheckin-docs").remove([newPath]);
        throw insertGuestsError;
      }

      if (newPath && session.document_photo_path) await db.storage.from("precheckin-docs").remove([session.document_photo_path]);
      const now = new Date();
      const firstSubmission = session.status !== "submitted";
      const update = {
        status: "submitted",
        guest_count: normalized.length,
        submitted_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      if (newPath) {
        update.document_photo_path = newPath;
        update.photo_deleted_at = null;
        update.photo_expires_at = new Date(now.getTime() + PHOTO_TTL_HOURS * 3600000).toISOString();
      }
      const { error: updateError } = await db.from("precheckin_sessions").update(update).eq("id", session.id);
      if (updateError) throw updateError;

      let notificationSent = false;
      if (firstSubmission) {
        try {
          notificationSent = await sendPrecheckinNotification({
            ...entry,
            start_date: session.checkin_date || entry.start_date,
            end_date: session.checkout_date || entry.end_date,
          }, normalized.length);
        } catch (e) {
          console.error("precheckin_notification_error", errText(e));
        }
      }
      return json({ ok: true, guest_count: normalized.length, photo_retention_hours: PHOTO_TTL_HOURS, notification_sent: notificationSent });
    }

    const body = await req.json().catch(() => ({}));
    const action = clean(body.action);

    if (action === "get") {
      const session = await byPublicToken(clean(body.token));
      if (!session || session.status === "closed") return json({ error: "Link non valido o scaduto" }, 404);
      if (session.status === "verified") return json({ session: { status: "verified" } });
      const { data: entry, error: entryError } = await db.from("calendar_entries")
        .select("id,start_date,end_date,status,guest_name,source")
        .eq("id", session.calendar_entry_id).maybeSingle();
      if (entryError) throw entryError;
      if (!entry || entry.status !== "booked") return json({ error: "Prenotazione non disponibile" }, 409);
      const { data: guestRows, error: guestError } = await db.from("precheckin_guests")
        .select("guest_order,guest_role,first_name,last_name,sex,birth_date,birth_country,birth_city,birth_province,citizenship,residence_country,residence_city,document_type,document_number,document_issuer")
        .eq("session_id", session.id).order("guest_order");
      if (guestError) throw guestError;
      const booking = {
        ...entry,
        start_date: session.checkin_date || entry.start_date,
        end_date: session.checkout_date || entry.end_date,
      };
      return json({
        session: {
          status: session.status,
          guest_count: session.guest_count,
          submitted_at: session.submitted_at,
          has_photo: !!session.document_photo_path,
        },
        booking,
        guests: guestRows || [],
        photo_retention_hours: PHOTO_TTL_HOURS,
      });
    }

    const admin = await requireAdmin();
    if (!admin) return json({ error: "Non autorizzato" }, 403);

    if (action === "create") {
      const entryId = Number(body.calendar_entry_id);
      if (!entryId) return json({ error: "Prenotazione non valida" }, 400);
      const { data: entry, error: entryError } = await db.from("calendar_entries")
        .select("id,start_date,end_date,status,guest_name,source")
        .eq("id", entryId).maybeSingle();
      if (entryError) throw entryError;
      if (!entry || entry.status !== "booked") return json({ error: "La prenotazione non è attiva" }, 409);

      const checkinDate = clean(body.checkin_date) || clean(entry.start_date);
      const checkoutDate = clean(body.checkout_date) || clean(entry.end_date);
      if (!validStayDates(checkinDate, checkoutDate)) {
        return json({ error: "Controlla le date: il check-out deve essere successivo al check-in" }, 400);
      }

      const rawToken = newToken();
      const tokenHash = await sha256(rawToken);
      const now = new Date().toISOString();
      const { data: existing, error: existingError } = await db.from("precheckin_sessions")
        .select("id,status")
        .eq("calendar_entry_id", entryId).maybeSingle();
      if (existingError) throw existingError;

      let session;
      if (existing) {
        const { data, error } = await db.from("precheckin_sessions").update({
          token_hash: tokenHash,
          status: existing.status === "closed" ? "open" : existing.status,
          created_by: admin.id,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          updated_at: now,
        }).eq("id", existing.id)
          .select("id,status,guest_count,submitted_at,verified_at,checkin_date,checkout_date").single();
        if (error) throw error;
        session = data;
      } else {
        const { data, error } = await db.from("precheckin_sessions").insert({
          calendar_entry_id: entryId,
          token_hash: tokenHash,
          created_by: admin.id,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
        }).select("id,status,guest_count,submitted_at,verified_at,checkin_date,checkout_date").single();
        if (error) throw error;
        session = data;
      }
      return json({
        token: rawToken,
        session,
        booking: { ...entry, start_date: checkinDate, end_date: checkoutDate },
      });
    }

    if (action === "admin-list") {
      const ids = Array.isArray(body.calendar_entry_ids) ? body.calendar_entry_ids.map(Number).filter(Boolean) : [];
      if (!ids.length) return json({ sessions: [] });
      const { data, error } = await db.from("precheckin_sessions")
        .select("id,calendar_entry_id,status,guest_count,submitted_at,verified_at,document_photo_path,photo_expires_at,photo_deleted_at,checkin_date,checkout_date,updated_at")
        .in("calendar_entry_id", ids);
      if (error) throw error;
      return json({ sessions: (data || []).map((s) => ({ ...s, has_photo: !!s.document_photo_path, document_photo_path: undefined })) });
    }

    const sessionId = clean(body.session_id);
    if (!sessionId) return json({ error: "Sessione mancante" }, 400);
    const { data: session, error: sessionError } = await db.from("precheckin_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return json({ error: "Sessione non trovata" }, 404);

    if (action === "admin-detail") {
      const { data, error } = await db.from("precheckin_guests").select("*").eq("session_id", sessionId).order("guest_order");
      if (error) throw error;
      return json({ session: { ...session, document_photo_path: undefined, has_photo: !!session.document_photo_path }, guests: data || [] });
    }
    if (action === "photo-url") {
      if (!session.document_photo_path) return json({ error: "Foto non disponibile" }, 404);
      const { data, error } = await db.storage.from("precheckin-docs").createSignedUrl(session.document_photo_path, 300);
      if (error) throw error;
      return json({ url: data.signedUrl, expires_in: 300 });
    }
    if (action === "delete-photo") {
      await erasePhoto(session);
      return json({ ok: true });
    }
    if (action === "verify") {
      await erasePhoto(session);
      const now = new Date().toISOString();
      const { error } = await db.from("precheckin_sessions").update({ status: "verified", verified_at: now, updated_at: now }).eq("id", sessionId);
      if (error) throw error;
      return json({ ok: true, status: "verified", photo_deleted: true });
    }
    if (action === "close") {
      await erasePhoto(session);
      const { error } = await db.from("precheckin_sessions").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", sessionId);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: "Azione non valida" }, 400);
  } catch (e) {
    console.error("precheckin_error", errText(e));
    return json({ error: errText(e) }, 500);
  }
});