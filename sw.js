/* HomeStore POS service worker — makes the app installable and lets the shell open when the network is flaky.
   Strategy: network first for the app itself (so updates always win), cache fallback when offline; icons cached. */
const CACHE="hs-shell-v1";
const SHELL=["./","./index.html","./config.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{}))); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const req=e.request; if(req.method!=="GET") return; const url=new URL(req.url); if(url.origin!==self.location.origin) return; /* Firebase, Google, relay: never intercepted */
  e.respondWith(fetch(req).then(res=>{ if(res&&res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{}); } return res; }).catch(()=>caches.match(req).then(hit=>hit||(req.mode==="navigate"?caches.match("./index.html"):undefined)))); });
