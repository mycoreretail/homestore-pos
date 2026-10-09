/* HomeStore POS — Spin & Win prize wheel for the store's website.  Paste before </body>:
   <script src="https://app.homestorepos.com/spin.js" data-store="YOUR-STORE-ID"></script>
   Prizes, odds, wording and timing come from Settings › Spin & Win in HomeStore POS. Every spin is saved to the
   store's account (Spin & Win list + a CRM lead) and the prize code can be redeemed at the register.
   The wheel runs in a transparent full-screen frame served from app.homestorepos.com, so the store's site needs no keys. */
(function () {
  var s = document.currentScript || (function () { var a = document.getElementsByTagName("script"); return a[a.length - 1]; })();
  if (!s || window.__hsSpin) return; window.__hsSpin = true;
  var tid = s.getAttribute("data-store") || ""; if (!tid) return;
  var base = (s.getAttribute("data-base") || s.src.replace(/\/spin\.js.*$/, "")).replace(/\/$/, "");
  var origin; try { origin = new URL(base, location.href).origin; } catch (e) { return; }
  var K = "hs_spin:" + tid + ":";
  var testMode = /[?&#]spintest/i.test(location.search + location.hash);
  function get(k) { try { var v = localStorage.getItem(K + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function put(k, v) { try { if (v === null) localStorage.removeItem(K + k); else localStorage.setItem(K + k, JSON.stringify(v)); } catch (e) {} }

  var frame = null, cfg = null, ready = false, isOpen = false, wantOpen = false, tab = null, prevOverflow = "";

  function ink(hex) { var h = String(hex || "").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16); if (isNaN(n)) return "#fff"; var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? "#1E1B18" : "#fff"; }

  function makeFrame() {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.title = "Spin and win";
    frame.setAttribute("allowtransparency", "true");
    frame.setAttribute("allow", "clipboard-write");
    frame.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;z-index:2147483646;background:transparent;color-scheme:light;visibility:hidden;pointer-events:none;opacity:0;transition:opacity .2s";
    frame.src = base + "/#spin/" + encodeURIComponent(tid);
    document.body.appendChild(frame);
  }

  function played() { return cfg ? get("played:" + cfg.id) : null; }

  function showTab(label) {
    if (!cfg || (cfg.showTab === false && cfg.mode !== "button" && !label)) return;
    if (!tab) {
      tab = document.createElement("button"); tab.type = "button"; tab.id = "hs-spin-tab";
      var css = document.createElement("style");
      css.textContent = "#hs-spin-tab{position:fixed;bottom:18px;" + (cfg.tabSide === "right" ? "right:18px" : "left:18px") + ";z-index:2147483000;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;background:" + (cfg.button || "#B3261E") + ";color:" + ink(cfg.button) + ";font:700 15px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:13px 18px 13px 14px;box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer}#hs-spin-tab:hover{filter:brightness(1.06)}#hs-spin-tab:focus-visible{outline:3px solid #F2C14E;outline-offset:2px}#hs-spin-tab svg{width:22px;height:22px}";
      document.head.appendChild(css);
      tab.addEventListener("click", open);
      document.body.appendChild(tab);
    }
    tab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg><span></span>';
    tab.querySelector("span").textContent = label || cfg.tabText || "Spin & Win";
    tab.style.display = isOpen ? "none" : "flex";
  }

  function open() {
    if (isOpen) return;
    if (!ready) { wantOpen = true; makeFrame(); return; }
    isOpen = true;
    frame.style.visibility = "visible"; frame.style.pointerEvents = "auto"; frame.style.opacity = "1";
    prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    if (tab) tab.style.display = "none";
    try { frame.contentWindow.postMessage({ hs: "spin", type: "open", fresh: testMode }, origin); frame.focus(); } catch (e) {}
  }

  function closed() {
    isOpen = false;
    frame.style.opacity = "0"; frame.style.pointerEvents = "none";
    setTimeout(function () { if (!isOpen) frame.style.visibility = "hidden"; }, 220);
    document.documentElement.style.overflow = prevOverflow || "";
    if (cfg && !played()) { put("dismissed:" + cfg.id, Date.now()); try { sessionStorage.setItem(K + "closed:" + cfg.id, "1"); } catch (e) {} }
    showTab(played() ? "View your prize" : null);
  }

  function start() {
    if (!cfg || !cfg.enabled) { if (frame) { frame.remove(); frame = null; } return; }
    if (wantOpen) { wantOpen = false; open(); return; }
    if (testMode) { showTab(); setTimeout(open, 1000); return; }
    if (played()) { showTab("View your prize"); return; }
    if (cfg.mode === "button") { showTab(); return; }
    var d = get("dismissed:" + cfg.id), closedThisVisit = false;
    try { closedThisVisit = sessionStorage.getItem(K + "closed:" + cfg.id) === "1"; } catch (e) {}
    if (closedThisVisit || (d && Date.now() - d < (Number(cfg.repeatDays) || 0) * 864e5)) { showTab(); return; }
    showTab();
    var fired = false, go = function () { if (fired || isOpen) return; fired = true; open(); };
    setTimeout(go, Math.max(0, Number(cfg.delaySeconds) || 0) * 1000);
    if (cfg.exitIntent) document.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY <= 0) go(); });
  }

  window.addEventListener("message", function (e) {
    if (!frame || e.source !== frame.contentWindow || e.origin !== origin) return;
    var m = e.data; if (!m || m.hs !== "spin") return;
    if (m.type === "ready") { cfg = m.cfg || { enabled: false }; ready = true; start(); }
    else if (m.type === "close") closed();
    else if (m.type === "won" && cfg) put("played:" + cfg.id, { code: m.code, at: Date.now() });
  });

  function boot() { makeFrame(); }
  var idle = window.requestIdleCallback || function (f) { setTimeout(f, 1200); };
  if (document.readyState === "complete") idle(boot); else window.addEventListener("load", function () { idle(boot); });
})();
