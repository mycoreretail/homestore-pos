# HomeStore POS — complete build kit
Build 20260919-0623 (includes Google address autocomplete, split lease invoice documents, mixed fulfillment, public sign-in, training mode, audit log, Spanish).

| Folder | What it is |
|---|---|
| 01-app-for-github | Exactly what lives in the GitHub repo: index.html (the whole app), config.js (your Firebase values), CNAME, .nojekyll, version.txt, and the signin/ and admin/ redirect folders. Upload these to rebuild the site. |
| 02-deployment | Firestore + Storage security rules, the setup README, and the Go-live guide PDF. |
| 03-relay-service | The Node.js relay: vendor APIs, live stock, dealer-specific vendor accounts, card terminals, address lookup. |
| 04-source-parts | The app's source as editable parts (p1_head.html + p2…p31 .js). assemble.py joins them into one HTML file; build_deploy.py stamps a version and writes index.html + version.txt; check.sh is a syntax check. |
| 05-brand | Logo files (charcoal, white, dark-background) and the trimmed copies embedded in the app. |
| 06-manuals | Full user manual (with the admin chapter), the dealer-only Store User Guide, and their generator sources with screenshots. |
| 07-tests | Automated test suites (node test.js, test_db.js, …) that run against the assembled app. |

## Rebuilding the app from source
1. Copy 04-source-parts to a folder, e.g. /home/claude/pos (assemble.py expects that path; edit the two paths at the top of assemble.py if you use another).
2. `python3 assemble.py` → writes the combined app.
3. `node test.js` (Node 18+) — should end with ALL TESTS PASSED.
4. `python3 build_deploy.py` → index.html + version.txt for the repo.

## Disaster recovery — rebuild everything on new accounts
1. Firebase: new project → Firestore (production, nam5) → Storage → Authentication (Anonymous + Email/Password, add the owner user) → paste the two rules files → register a web app and put its six values in config.js.
2. GitHub: new public repo → upload the contents of 01-app-for-github → Settings → Pages → main / (root) → custom domain app.homestorepos.com.
3. GoDaddy: DNS → CNAME `app` → `<github-username>.github.io`.
4. Data: Firebase console → Firestore → Import from your scheduled export, or import each dealer's backup from the app's Settings → Data & backup.
5. Relay (optional): deploy 03-relay-service with the .env values; set the URL in Administration → Software settings and in config.js.

Addresses: dealers → https://app.homestorepos.com/signin · owner → https://app.homestorepos.com/admin
