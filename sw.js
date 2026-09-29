/* HomeStore POS service worker — makes the app installable and lets the shell open when the network is flaky.
   Strategy: network first for everything (so updates always win), cache only as the offline fallback.
   Page loads (navigations) go to the network exactly as the browser asked — never rebuilt — so redirects such as
   /admin → /admin/ → /#admin keep working. version.txt and config.js always ask the web host whether they changed
   ("no-cache"), so the update check never reads an old copy; the update itself reloads with ?v=<build>. */
const CACHE="hs-shell-v3";
const SHELL=["./","./index.html","./config.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{}))); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const req=e.request; if(req.method!=="GET") return; const url=new URL(req.url); if(url.origin!==self.location.origin) return; /* Firebase, Google, relay: never intercepted */
  const nav=req.mode==="navigate";
  const fresh=!nav&&/\/(version\.txt|config\.js)$/.test(url.pathname);
  const net=fresh?fetch(url.href,{cache:"no-cache",credentials:"same-origin"}):fetch(req);
  e.respondWith(net.then(res=>{ if(res&&res.ok&&res.type==="basic"&&!res.redirected){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}); } return res; }).catch(()=>caches.match(req).then(hit=>hit||(nav?caches.match("./index.html"):undefined)))); });
