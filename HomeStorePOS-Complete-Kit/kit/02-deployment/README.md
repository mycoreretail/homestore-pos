# HomeStore POS — self-hosting guide

You are deploying three things:

| Piece | What it is | Where it runs | Cost |
|---|---|---|---|
| **App** | `index.html` + `config.js` (this folder) | GitHub Pages, at `app.homestorepos.com` | free |
| **Database** | Firebase Firestore | Google (Firebase) | free tier, then usage-based |
| **Relay** | `relay/` (Node.js) — vendor APIs, live stock, card terminals, address lookup | Render.com (or Railway / Fly / your own server) | free tier to start |

The app works without the relay (vendor live stock, terminal charging and address lookup simply stay off until it exists).

---

## 1. Firebase (the database) — 10 minutes

1. Go to https://console.firebase.google.com → **Add project** → name it `homestore-pos` → Continue (Analytics optional).
2. Left menu **Build → Firestore Database → Create database** → Production mode → pick a US region → Enable.
3. **Build → Authentication → Get started → Sign-in method** → enable **Anonymous** (registers) and **Email/Password** (you). Then **Users → Add user**: your owner email + a strong password — this is what the administration console asks for.
4. **Rules** tab of Firestore → paste the contents of `firestore.rules` → Publish.
5. **Build → Storage → Get started** → Production mode → same region → Done. **Rules** tab → paste `storage.rules` → Publish. (Delivery photos, damage photos, signatures and ID photos are stored here as files; only a link is kept in the database.)
6. Project settings (gear) → **General → Your apps → Web (</>)** → register app `HomeStore POS` → copy the `firebaseConfig` values into `config.js` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
7. **Authentication → Settings → Authorized domains** → add `app.homestorepos.com` (and `<your-github-username>.github.io` while testing).

## 2. GitHub Pages (the app) — 10 minutes

1. Create a GitHub account (github.com) if you don't have one. **New repository** → name `homestore-pos` → Public → Create.
2. **Add file → Upload files** → drag in everything from this folder except `relay/`: `index.html`, `config.js`, `CNAME`, `.nojekyll`, and the two folders `signin/` and `admin/` (they give you the clean addresses `/signin` and `/admin`) → Commit.
3. Repository **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/ (root)` → Save.
4. Under **Custom domain** enter `app.homestorepos.com` → Save. Tick **Enforce HTTPS** once the certificate appears (can take up to an hour after DNS is set).
5. Test first at `https://<your-username>.github.io/homestore-pos/` — you should see the software-owner setup screen.

To update the app later: upload the new `index.html` **and** `version.txt` (Add file → Upload → replace both). Open registers notice the new version within 15 minutes and show an *Update now / Later* prompt; everyone else gets it on their next refresh.

## 3. GoDaddy (the domain) — 5 minutes

1. GoDaddy → My Products → your domain `homestorepos.com` → **DNS → Manage DNS**.
2. **Add record**: Type `CNAME` · Name `app` · Value `<your-username>.github.io` · TTL 1 hour → Save.  
   (This makes `app.homestorepos.com` point to GitHub Pages. Keep `homestorepos.com` itself for your marketing site.)
3. If you'd rather use the bare domain for the app, add four `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and change `CNAME` (the file) to `homestorepos.com`.
4. Wait for DNS (usually minutes, up to 24 h). Then go back to GitHub Pages settings and enable **Enforce HTTPS**.

## 4. Addresses

| Who | Address | What they see |
|---|---|---|
| Dealers / stores (public, link it from homestorepos.com) | `https://app.homestorepos.com/signin` (also `/#signin`) | One field: store code (e.g. NFM01) → that store's sign-in. The device remembers the store. Wrong code → "No store found with that code." Nothing on this page mentions the administration console. |
| You (keep private) | `https://app.homestorepos.com/admin` (also `/#admin`) | Owner email/password, then your administrator PIN → the console. |
| Per-dealer link (optional) | `…/#store/NFM01` | Same as typing the code; handy for QR codes on registers. |

## 5. First run

Open the **#admin** address → create the software-owner login → add your first dealer (it gets a store code) → give the store the public sign-in address and their code.

## 6. Relay service (vendor live stock, POs by API, terminals) — 20 minutes

1. Firebase console → Project settings → **Service accounts → Generate new private key** → download the JSON.
2. Create an account at https://render.com → **New → Web Service** → connect your GitHub repo (put the `relay/` folder in its own repo, or set Root Directory to `relay`).  
   Build command `npm install` · Start command `npm start` · Instance: Free.
3. **Environment** tab → add the variables from `relay/.env.example`:  
   `ALLOWED_ORIGINS=https://app.homestorepos.com` · `RELAY_TOKEN=<long random string>` · `FIREBASE_SERVICE_ACCOUNT=<the JSON on one line>` · optionally `GOOGLE_MAPS_KEY`.
4. Deploy. Copy the service URL (e.g. `https://homestore-pos-relay.onrender.com`) and test `https://…/health` → `{"ok":true}`.
5. GoDaddy → DNS → add `CNAME` `relay` → the Render hostname, and add the custom domain in Render so it becomes `https://relay.homestorepos.com`.
6. In the app: **Administration → Software settings → Relay service URL** = `https://relay.homestorepos.com`. In `config.js` set `relayUrl` and `relayToken` (same token as the relay) and re-upload it.

### Vendor live stock
Administration → **Vendor integrations** → for a vendor with an API: Base URL, API key/auth header, and now **Live stock path** (e.g. `/inventory/{sku}`) and **Stock fields** (the vendor's field names for available quantity, next available date, on-order quantity, e.g. `qtyAvailable, nextAvailableDate, onOrderQty`). Then:
- Register: a supplier-order line shows **live stock** → "vendor: 12 available · next Oct 3" with *use as ETA*.
- Purchase order → More → **Check live availability with the vendor** → per line, and *Use vendor dates as ETA*.

### Ashley Furniture (PSAPI) — built-in adapter
Administration → Vendor integrations → Add → **Ashley Furniture (PSAPI)** preset → enter the **Client ID** Ashley Content Services issued → Save → assign to dealers. Each dealer then enters its AshleyDirect **username, password, customer account, ship-to and servicing warehouse** (e.g. 17 = Advance NC) on the supplier. The relay pulls the REST catalog (/Products) and the GraphQL prices per account (netPriceBeforeFreight → cost, freight, surcharge, totalNetPrice → landed), joins them by SKU, maps MAP/MSRP/images/UPC/weights/kits, and serves them to the store's **Update from catalog** and **Browse**. Live stock shows orderable / unavailable at the dealer's warehouse (PSAPI carries no quantities). See `relay/ashley.js`.

### Dealer-specific vendor accounts
Some vendors issue an API account per dealer instead of one for the software. In **Vendor integrations** set **API credentials → Dealer-specific** and list what each dealer must enter (e.g. `apiKey, dealerId`). Use those names as `{dealerId}` placeholders in the base URL, paths or auth prefix. Each store then sees **Add API access** on the vendor (Inventory → Suppliers) and enters its own account; it is stored write-only in `vendorCredentials/` and only the relay can read it. Live stock, catalog pulls and orders for that store run under its own account.

### Address autocomplete as you type (Google)
1. Google Cloud console (the same project Firebase created, `homestore-pos`) → **APIs & Services → Library** → enable **Places API** and **Maps JavaScript API**.
2. **APIs & Services → Credentials → Create credentials → API key**. Edit the key → *Application restrictions*: **Websites** → add `https://app.homestorepos.com/*` (and `https://mycoreretail.github.io/*` for testing) → *API restrictions*: Places API, Maps JavaScript API → Save.
3. Put the key in `config.js` as `googleMapsKey` and re-upload it. The customer form's street field then suggests real addresses as you type and fills city, state, ZIP and the map pin automatically.
Cost: Google gives $200/month free credit; a store's usage stays well inside it. Restricting the key to your website means nobody can use it elsewhere.

### Card terminals
`/charge` in `relay/server.js` is the adapter point. Set `PROCESSOR` (stripe, pax, …) and add the processor's SDK call; the register already sends the amount/terminal and fills in the approval from the response.

## Security notes (read these)
- `config.js` is public by design; it contains no secrets. All vendor keys and processor secrets live only on the relay (environment variables) and in Firestore, which the browser can only reach after anonymous sign-in.
- The included Firestore rules let any signed-in app user read/write. The app enforces PINs and permissions itself, which is fine for a trusted set of stores. Before scaling to many dealers, move to per-user Firebase Auth with tenant-scoped rules — ask and I'll write those.
- Back up: Firebase console → Firestore → Import/Export, or the app's Data & backup export per dealer.
