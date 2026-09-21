/* Ashley Furniture — Product Syndication API (PSAPI) adapter
   REST catalog:   GET  https://apigw3.ashleyfurniture.com/productinformation/Products?...   (also /Packages, /Series, /Masters)
   GraphQL prices: POST https://apigw3.ashleyfurniture.com/productinformation/graphql/v1  (query Prices)
   Auth: Basic (AshleyDirect username:password) + Client_Id header. Everything is per dealer account (customer + shipTo).
*/
const BASE = "https://apigw3.ashleyfurniture.com/productinformation";

function headers(creds, clientId) {
  return {
    Authorization: "Basic " + Buffer.from(`${creds.username || ""}:${creds.password || ""}`).toString("base64"),
    Client_Id: creds.clientId || clientId || "",
    "Accept-Language": "en",
    "Accept-Encoding": "gzip,deflate",
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}
async function get(path, creds, clientId) {
  const r = await fetch(BASE + path, { headers: headers(creds, clientId) });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error(`Ashley ${r.status}: ${text.slice(0, 200)}`), { status: 502 });
  return JSON.parse(text);
}
async function prices(creds, clientId, skus, page = 1, limit = 500) {
  const q = `query Prices($customer:String!,$shipTo:String!,$limit:Int!,$page:Int!,$acceptLanguage:String!,$environment:String!,$skus:String!){ prices(filter:{acceptLanguage:$acceptLanguage,customer:$customer,shipTo:$shipTo,environment:$environment,skus:$skus},pagination:{limit:$limit,page:$page}){ totalCount pageInfo{ page limit hasNextPage totalPages } nodes{ sku description discount dfiDiscount basePrice sellPrice surcharge fobPoint netPriceBeforeFreight freight expressFreight totalNetPrice containerPrice } } }`;
  const body = { query: q, variables: { customer: String(creds.customer || ""), shipTo: String(creds.shipto || creds.shipTo || ""), limit, page, acceptLanguage: "en", environment: "afi", skus: skus || "" } };
  const r = await fetch(BASE + "/graphql/v1", { method: "POST", headers: headers(creds, clientId), body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw Object.assign(new Error("Ashley prices: " + JSON.stringify(j.errors || j).slice(0, 300)), { status: 502 });
  return j.data.prices;
}
const num = v => { const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };
const first = (o, ...keys) => { for (const k of keys) { const v = o[k] ?? o[k[0].toLowerCase() + k.slice(1)]; if (v !== undefined && v !== null && v !== "") return v; } return ""; };
function image(assetOrUrl, width) {
  if (!assetOrUrl) return "";
  if (/^https?:\/\//.test(assetOrUrl)) return assetOrUrl.includes("?") ? assetOrUrl : `${assetOrUrl}?width=${width}&auto=webp&optimize=medium`;
  return `https://cdn.ashley.com/assets/${assetOrUrl}${/\.[a-z]{3,4}$/i.test(assetOrUrl) ? "" : ".jpg"}?width=${width}&auto=webp&optimize=medium`;
}
// Ashley product record -> HomeStore item shape
function mapProduct(p, price, warehouse) {
  const sku = first(p, "Sku", "ItemNumber", "itemNumber");
  const status = String(first(p, "Status", "ItemStatusKey") || "").toUpperCase();
  const unavailable = (first(p, "UnavailableByWarehouse") || []);
  const unavailableHere = warehouse ? unavailable.map(String).includes(String(warehouse)) : false;
  const kit = String(first(p, "ItemType") || "").toLowerCase() === "kit";
  const chairPair = !!first(p, "DiningChair") && num(first(p, "ChairQtyPerCarton")) > 1;
  return {
    vendorSku: sku, sku,
    name: first(p, "ItemName") || [first(p, "ItemSeriesName"), first(p, "ConsumerDescription")].filter(Boolean).join(" "),
    description: first(p, "DetailedDescription") || first(p, "ConsumerDescription"),
    collection: first(p, "ItemSeriesName"), series: first(p, "SeriesId"),
    category: (first(p, "NavigableCategories") || [])[0] || first(p, "ItemGeneralLongDescription") || "",
    subcategory: first(p, "ItemDefaultGroupingLookupCodeKey") || "",
    brand: first(p, "BrandNameOverride") || first(p, "BrandName"),
    color: first(p, "Color") || (first(p, "GeneralColor") || [])[0] || "", finish: first(p, "Shade") || "", material: (first(p, "Material") || [])[0] || "",
    size: first(p, "BedSize") || first(p, "RugSize") || first(p, "UpholsterySleeperSize") || "",
    dims: first(p, "UnitFriendlyDimensionsInches") || "",
    weightLbs: num(first(p, "ItemWeightLbs")), shipWeightLbs: num(first(p, "ShippingWeightLbs")),
    cartonCuFt: num(first(p, "CartonVolumeCuFeet")), pieces: 1, upc: first(p, "Upc") || "",
    map: num(first(p, "minimumAdvertisedPrice", "MinimumAdvertisedPrice")), msrp: num(first(p, "manufacturerSuggestedRetailPrice", "ManufacturerSuggestedRetailPrice")),
    warrantyYears: Math.round(num(first(p, "ManufacturerWarrantyDays")) / 365 * 10) / 10,
    isKit: kit, kitIncludes: kit ? (first(p, "KitIncludes") || []).map(c => (typeof c === "string" ? { sku: c, quantity: 1 } : { sku: first(c, "Sku", "sku"), quantity: num(first(c, "Quantity", "quantity")) || 1, type: first(c, "Type", "type") })) : [],
    customerSku: (first(p, "CustomerProductInfo") || {}).customerSKU || (first(p, "CustomerProductInfo") || {}).CustomerSKU || "",
    customerUpc: (first(p, "CustomerProductInfo") || {}).customerUPC || (first(p, "CustomerProductInfo") || {}).CustomerUPC || "",
    chairPair, chairQtyPerCarton: num(first(p, "ChairQtyPerCarton")) || 1,
    expressShip: !!first(p, "IsExpressShipEligible"), dropShipOnly: !!first(p, "IsSupplierDirectShipOnly"), rta: !!first(p, "IsReadyToAssemble"),
    image: image(first(p, "LargeImageUrl") || first(p, "MediumImageUrl"), 1200), thumb: image(first(p, "MediumImageUrl") || first(p, "LargeImageUrl"), 480),
    assemblyUrl: first(p, "AssemblyInstructionsUrl") || first(p, "InstructionsUrl") || "",
    status, active: status === "C" || status === "N" || /^current$/i.test(status),
    unavailableAtWarehouse: unavailableHere, unavailableWarehouses: unavailable,
    lastModified: first(p, "LastModifiedDateTime") || "",
    cost: price ? num(price.netPriceBeforeFreight) : undefined, freight: price ? num(price.freight) : undefined, surcharge: price ? num(price.surcharge) : undefined,
    landed: price ? num(price.totalNetPrice) : undefined, fobPoint: price ? price.fobPoint : "", basePrice: price ? num(price.basePrice) : undefined
  };
}
// live stock for the register: availability flag at the dealer's DC (PSAPI has no quantities)
async function stock(creds, clientId, sku) {
  const wh = creds.warehouse || "";
  const j = await get(`/Products?Customer=${encodeURIComponent(creds.customer)}&ShipTo=${encodeURIComponent(creds.shipto || creds.shipTo || "")}&Skus=${encodeURIComponent(sku)}&Limit=5${wh ? "&Warehouse=" + encodeURIComponent(wh) : ""}`, creds, clientId);
  const list = Array.isArray(j) ? j : (j.items || j.products || j.data || j.nodes || []);
  const p = list.find(x => String(first(x, "Sku", "ItemNumber")) === String(sku)) || list[0];
  if (!p) return { sku, available: "not found", note: "Ashley returned no product for this SKU" };
  const m = mapProduct(p, null, wh);
  const status = m.status;
  const note = status === "D" ? "Discontinued" : status === "R" ? "Replaced" : status === "T" ? "Tentative" : status === "I" ? "Introduced — not yet shipping" : "";
  return { sku, available: m.unavailableAtWarehouse ? 0 : (m.active ? "available" : 0), onOrder: "", nextDate: "", note: (m.unavailableAtWarehouse ? `Unavailable at warehouse ${wh}` : (m.active ? `Orderable at ${wh || "your DC"}` : "")) + (note ? " · " + note : ""), warehouse: wh, schedule: [], source: "ashley-psapi", checkedAt: new Date().toISOString() };
}
// catalog pull (full or incremental) joined with prices
async function catalog(creds, clientId, opts = {}) {
  const wh = creds.warehouse || ""; const out = []; let page = 1, limit = 500;
  for (;;) {
    let q = `/Products?Customer=${encodeURIComponent(creds.customer)}&ShipTo=${encodeURIComponent(creds.shipto || creds.shipTo || "")}&Status=current&Page=${page}&Limit=${limit}${wh ? "&Warehouse=" + encodeURIComponent(wh) : ""}`;
    if (opts.since) q += `&StartUtcLastModifiedDateTime=${encodeURIComponent(opts.since)}`;
    if (opts.skus) q += `&Skus=${encodeURIComponent(opts.skus)}`;
    const j = await get(q, creds, clientId);
    const list = Array.isArray(j) ? j : (j.items || j.products || j.data || j.nodes || []);
    out.push(...list); if (list.length < limit || (j.pageInfo && j.pageInfo.hasNextPage === false)) break; page++; if (page > 200) break;
  }
  const bySku = {}; for (const p of out) bySku[first(p, "Sku", "ItemNumber")] = p;
  const skus = Object.keys(bySku); const priceMap = {};
  for (let i = 0; i < skus.length; i += 200) {
    const chunk = skus.slice(i, i + 200).join(",");
    let pg = 1; for (;;) { const pr = await prices(creds, clientId, chunk, pg, 500); for (const n of (pr.nodes || [])) priceMap[n.sku] = n; if (!pr.pageInfo || !pr.pageInfo.hasNextPage) break; pg++; }
  }
  return skus.map(s => mapProduct(bySku[s], priceMap[s], wh));
}
// Ashley package deals for the dealer account -> app packages (name, pieces with quantities, cost)
async function packages(creds, clientId) {
  const q = `query Package($limit:Int!,$page:Int!,$customer:String!,$shipTo:String!,$acceptLanguage:String!,$environment:String!,$packageIds:String!){ packages(filter:{acceptLanguage:$acceptLanguage,customer:$customer,shipTo:$shipTo,environment:$environment,packageIds:$packageIds},pagination:{limit:$limit,page:$page}){ pageInfo{ hasNextPage page totalPages } totalCount nodes{ id homestorePackageId packageName alternatePackageName detailedDescription isExpressShip isSupplierDirectShipOnly packageSeries packageUOM retailType rolloverImage status packageIsStandardPackage packageItemQuantityList{ sku quantity type } navigableCategories lastModifiedDateTime } } }`;
  const out = []; let page = 1;
  for (;;) {
    const body = { query: q, variables: { limit: 500, page, customer: String(creds.customer || ""), shipTo: String(creds.shipto || creds.shipTo || ""), acceptLanguage: "en", environment: "afi", packageIds: "" } };
    const r = await fetch(BASE + "/graphql/v1", { method: "POST", headers: headers(creds, clientId), body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errors) throw Object.assign(new Error("Ashley packages: " + JSON.stringify(j.errors || j).slice(0, 300)), { status: 502 });
    const pk = j.data.packages; out.push(...(pk.nodes || [])); if (!pk.pageInfo || !pk.pageInfo.hasNextPage) break; page++; if (page > 50) break;
  }
  // package prices (REST, per account/ship-to)
  const priceMap = {};
  try {
    let pg = 1; for (;;) { const j = await get(`/PackagePrices?Customer=${encodeURIComponent(creds.customer)}&ShipTo=${encodeURIComponent(creds.shipto || creds.shipTo || "")}&Page=${pg}&Limit=1000`, creds, clientId); const list = Array.isArray(j) ? j : (j.items || j.nodes || j.data || []); for (const x of list) { const id = first(x, "PackageId", "packageId", "Id", "id"); if (id) priceMap[id] = x; } if (list.length < 1000) break; pg++; if (pg > 20) break; }
  } catch (e) { /* prices optional */ }
  return out.filter(p => /^current$/i.test(String(p.status || "")) || String(p.status || "").toUpperCase() === "C").map(p => { const pr = priceMap[p.id] || priceMap[p.homestorePackageId] || null; return {
    id: p.id, name: p.packageName || p.alternatePackageName || p.id, description: p.detailedDescription || "", series: p.packageSeries || "", category: p.retailType || (p.navigableCategories || [])[0] || "",
    image: image(p.rolloverImage, 800), expressShip: !!p.isExpressShip, dropShipOnly: !!p.isSupplierDirectShipOnly, standard: !!p.packageIsStandardPackage,
    pieces: (p.packageItemQuantityList || []).map(x => ({ sku: x.sku, qty: num(x.quantity) || 1, type: x.type })),
    cost: pr ? num(first(pr, "TotalNetPrice", "totalNetPrice", "NetPrice", "netPrice", "Price", "price")) : undefined, priceRaw: pr || null, lastModified: p.lastModifiedDateTime || "" }; });
}
module.exports = { stock, catalog, prices, packages, mapProduct };
