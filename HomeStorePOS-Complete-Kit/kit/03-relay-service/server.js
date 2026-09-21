/* HomeStore POS relay
   ------------------------------------------------------------
   Runs outside the browser so vendor API keys and processor secrets never reach the register.
   Reads vendor integration settings from Firestore (the same records the admin console edits).
   Endpoints:
     GET  /health
     GET  /vendor/:id/stock?sku=...   -> { available, onOrder, nextDate, note }
     (all /vendor routes read the X-Tenant header; vendors marked "dealer-specific" use that
      store's own credentials from vendorCredentials/{tenantId}_{integrationId})
     GET  /vendor/:id/catalog         -> vendor catalog (JSON or CSV text passthrough)
     POST /vendor/:id/order           -> forwards a purchase order to the vendor's order endpoint
     POST /charge                     -> card terminal charge (processor adapter; stub until configured)
     GET  /geocode?q=...              -> address lookup via Google Geocoding (optional)
*/
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const ashley = require("./ashley");

const PORT = process.env.PORT || 8080;
const ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
const TOKEN = process.env.RELAY_TOKEN || "";

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
} else {
  admin.initializeApp(); // works on Google Cloud with default credentials
}
const db = admin.firestore();

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: (origin, cb) => cb(null, !origin || ORIGINS.length === 0 || ORIGINS.includes(origin)) }));
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (TOKEN && req.get("X-Relay-Token") !== TOKEN) return res.status(401).json({ error: "bad relay token" });
  next();
});

// ---- helpers ----
async function integration(id) {
  const snap = await db.collection("integrations").doc(id).get();
  if (!snap.exists) throw Object.assign(new Error("integration not found"), { status: 404 });
  return Object.assign({ id }, snap.data());
}
// Dealer-specific credentials: integrations with credMode === "dealer" use the calling
// store's own account, stored write-only by the app at vendorCredentials/{tenantId}_{integrationId}.
async function dealerCreds(i, tenantId) {
  if (i.credMode !== "dealer") return {};
  if (!tenantId) throw Object.assign(new Error("store not identified"), { status: 400 });
  const snap = await db.collection("vendorCredentials").doc(`${tenantId}_${i.id || ""}`).get();
  if (!snap.exists) throw Object.assign(new Error("this store has not entered its API access for this vendor yet"), { status: 428 });
  return snap.data().creds || {};
}
function fill(str, creds) { return String(str || "").replace(/\{(\w+)\}/g, (m, k) => (creds[k] !== undefined ? encodeURIComponent(creds[k]) : m)); }
function vendorHeaders(i, creds) {
  creds = creds || {};
  const h = { "Content-Type": "application/json", Accept: "application/json, text/csv" };
  const type = i.authType || "apikey";
  if (type === "basic") {
    const u = creds.username || i.username || "", p = creds.password || i.password || "";
    if (u || p) h.Authorization = "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
  } else if (type === "apikey") {
    const key = creds.apiKey || i.apiKey;
    if (key) h[i.authHeader || "Authorization"] = fill((i.authPrefix || ""), creds) + key;
  }
  // extra headers: "name=value, name2={placeholder}" — placeholders come from the dealer's credentials, then the integration
  const all = Object.assign({}, i, creds);
  for (const part of String(i.extraHeaders || "").split(",")) {
    const m = part.trim().match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (m) h[m[1]] = m[2].trim().replace(/\{(\w+)\}/g, (mm, k) => (all[k] !== undefined ? all[k] : mm));
  }
  return h;
}
function pick(obj, path) { // dotted path with [0] support: "data.items[0].qty"
  if (!path) return undefined;
  return path.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
async function vendorFetch(i, path, opts, creds) {
  creds = Object.assign({}, { clientId: i.clientId || "" }, creds || {});
  const url = fill((i.apiUrl || "").replace(/\/$/, ""), creds) + fill(path || "", creds);
  const r = await fetch(url, Object.assign({ headers: vendorHeaders(i, creds) }, opts || {}));
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error(`vendor ${r.status}: ${text.slice(0, 200)}`), { status: 502 });
  try { return JSON.parse(text); } catch (e) { return text; }
}

// ---- routes ----
app.get("/health", (req, res) => res.json({ ok: true, service: "homestore-pos-relay" }));

app.get("/vendor/:id/stock", async (req, res) => {
  try {
    const i = await integration(req.params.id);
    if (i.adapter === "ashley") { const creds = await dealerCreds(i, req.get("X-Tenant")); return res.json(await ashley.stock(creds, i.clientId, String(req.query.sku || ""))); }
    if (!i.stockPath) return res.status(400).json({ error: "no live stock path configured for this vendor" });
    const creds = await dealerCreds(i, req.get("X-Tenant"));
    const sku = String(req.query.sku || "");
    const data = await vendorFetch(i, i.stockPath.replace("{sku}", encodeURIComponent(sku)), null, creds);
    const [aPath, dPath, oPath, listPath, listDate, listQty] = (i.stockMap || "").split(",").map(s => s.trim());
    const available = pick(data, aPath); const nextDate = pick(data, dPath); const onOrder = pick(data, oPath);
    // optional: the vendor's list of future arrivals -> [{date, qty}] for the date/quantity table
    let schedule = [];
    const list = listPath ? pick(data, listPath) : (data.availabilityByDate || data.schedule || data.futureAvailability);
    if (Array.isArray(list)) schedule = list.map(x => ({ date: String(pick(x, listDate || "date") || x.date || x.eta || "").slice(0, 10), qty: Number(pick(x, listQty || "qty") ?? x.qty ?? x.quantity ?? 0) })).filter(x => x.date).sort((a, b) => a.date.localeCompare(b.date));
    res.json({ sku, available: available === undefined ? data.available ?? data.qty ?? data.quantity : available,
               nextDate: nextDate || data.nextAvailableDate || data.eta || (schedule[0] && schedule[0].date) || "",
               onOrder: onOrder ?? data.onOrder ?? "", schedule, checkedAt: new Date().toISOString() });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get("/vendor/:id/catalog", async (req, res) => {
  try {
    const i = await integration(req.params.id);
    if (i.adapter === "ashley") { const creds = await dealerCreds(i, req.get("X-Tenant")); return res.json({ items: await ashley.catalog(creds, i.clientId, { since: req.query.since || "", skus: req.query.skus || "" }) }); }
    if (!i.catalogPath) return res.status(400).json({ error: "no catalog path configured" });
    const creds = await dealerCreds(i, req.get("X-Tenant"));
    const data = await vendorFetch(i, i.catalogPath, null, creds);
    if (typeof data === "string") { res.type("text/plain").send(data); } else res.json(data);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.get("/vendor/:id/packages", async (req, res) => {
  try {
    const i = await integration(req.params.id);
    if (i.adapter !== "ashley") return res.status(400).json({ error: "packages are only available for adapters that support them" });
    const creds = await dealerCreds(i, req.get("X-Tenant"));
    res.json({ packages: await ashley.packages(creds, i.clientId) });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post("/vendor/:id/order", async (req, res) => {
  try {
    const i = await integration(req.params.id);
    if (!i.orderPath) return res.status(400).json({ error: "no order path configured" });
    const creds = await dealerCreds(i, req.get("X-Tenant"));
    const data = await vendorFetch(i, i.orderPath, { method: "POST", body: JSON.stringify(req.body || {}) }, creds);
    res.json({ ok: true, vendorResponse: data });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

// Card terminal: plug in your processor here. The register calls this with
// { amount, terminalId, merchantId, invoice, ref } and expects
// { approved, brand, last4, authCode, reference, message }.
app.post("/charge", async (req, res) => {
  const p = (process.env.PROCESSOR || "").toLowerCase();
  if (!p) return res.status(501).json({ approved: false, message: "No card processor configured on the relay yet" });
  // Example shape for a semi-integrated processor SDK; replace with the real SDK calls.
  // if (p === "stripe") { ... stripe.terminal.readers.processPaymentIntent(...) ... }
  // if (p === "pax")    { ... call the PAX POSLink/semi-integrated endpoint for terminalId ... }
  return res.status(501).json({ approved: false, message: `Processor "${p}" adapter not implemented yet` });
});

app.get("/geocode", async (req, res) => {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) return res.status(501).json({ error: "GOOGLE_MAPS_KEY not set" });
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(String(req.query.q || ""))}&key=${key}`);
    const j = await r.json();
    res.json({ results: (j.results || []).slice(0, 5).map(x => ({ address: x.formatted_address, lat: x.geometry.location.lat, lng: x.geometry.location.lng })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log("HomeStore POS relay listening on", PORT));
