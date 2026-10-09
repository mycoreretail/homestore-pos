/*! HomeStore POS — Spin & Win prize wheel v1.1. Used by spin.js (dealer websites) and Settings › Spin & Win (preview). */
(function () {
  'use strict';
  if (window.SpinWin && window.SpinWin.__loaded) return;

  var DEFAULTS = {
    id: 'spin-2026',
    enabled: true,
    startDate: '',
    endDate: '',
    store: { name: 'Your Furniture Store', phone: '', logoUrl: '' },
    theme: { button: '#E4202C', wheelBg: '#0B1A4A', rim: '#F5C518', panel: '#FFFFFF', text: '#0B1A4A' },
    eyebrow: 'Exclusive online offer',
    headline: 'Spin to win a prize on your new furniture',
    subhead: 'Enter your info for one free spin. Every spin wins a prize you can use in store or on your next order.',
    buttonText: 'Spin the wheel',
    trigger: { delaySeconds: 6, exitIntent: true, showTab: true, tabText: 'Spin & Win', repeatDays: 3 },
    codeExpiryDays: 30,
    requirePhone: true,
    requireZip: true,
    optInText: 'Yes, send me deals by email and text. Msg & data rates may apply. Reply STOP to opt out.',
    showOddsInTerms: true,
    webhookUrl: '',
    prizes: [],
    terms: ''
  };

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(a, b) {
    var out = {}, k;
    for (k in a) out[k] = a[k];
    for (k in b) {
      if (b[k] === undefined) continue;
      out[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k];
    }
    return out;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(key, val) {
    try {
      if (val === undefined) { var r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function rand() {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); }
  }
  function makeCode(prefix) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 6; i++) s += chars[Math.floor(rand() * chars.length)];
    return (prefix ? String(prefix).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' : '') + s;
  }
  function lum(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16); if (isNaN(n)) return 1;
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function inkFor(bg) { return lum(bg) > 0.4 ? '#1E1B18' : '#FFFFFF'; }
  function fmtDate(d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  function inWindow(cfg) {
    var now = new Date();
    if (cfg.startDate && now < new Date(cfg.startDate + 'T00:00:00')) return false;
    if (cfg.endDate && now > new Date(cfg.endDate + 'T23:59:59')) return false;
    return true;
  }
  var SLICE_DEFAULTS = ['#E4202C', '#FFD400', '#1E63D6', '#1FA347', '#8E3FCF', '#FF7A00', '#E83E8C', '#00A6D6'];
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.sw{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--text);line-height:1.4;-webkit-font-smoothing:antialiased}',
    '.ov{position:fixed;inset:0;z-index:2147483646;background:rgba(15,12,10,.62);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s ease}',
    '.ov.on{opacity:1}',
    '.card{position:relative;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);width:min(880px,100%);max-height:calc(100vh - 32px);background:var(--panel);border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45);transform:translateY(14px) scale(.98);transition:transform .3s cubic-bezier(.2,.8,.2,1)}',
    '.ov.on .card{transform:none}',
    '.inline .card{transform:none;box-shadow:0 12px 40px rgba(0,0,0,.18);max-height:none}',
    '.wside{position:relative;background:var(--wheelBg);display:flex;align-items:center;justify-content:center;padding:34px 26px 26px;overflow:hidden}',
    '.wside:before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.10),transparent 55%)}',
    '.wwrap{position:relative;width:min(380px,100%);aspect-ratio:1/1;max-width:100%}',
    '.wwrap canvas{width:100%;height:100%;display:block;will-change:transform}',
    '.ptr{position:absolute;left:50%;top:-14px;transform:translateX(-50%);width:34px;height:44px;z-index:2;filter:drop-shadow(0 3px 3px rgba(0,0,0,.4))}',
    '.hub{position:absolute;left:50%;top:50%;width:22%;height:22%;transform:translate(-50%,-50%);border-radius:50%;background:var(--rim);color:var(--wheelBg);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:clamp(11px,2.4vw,16px);letter-spacing:.06em;box-shadow:0 0 0 5px var(--wheelBg),0 4px 14px rgba(0,0,0,.4);z-index:2;user-select:none}',
    '.panel{position:relative;padding:34px 32px 26px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;min-width:0}',
    '.x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:#1E1B18;box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:22px;line-height:1;cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center}',
    '.x:hover{background:#fff}',
    '.logo{max-height:44px;max-width:180px;object-fit:contain;align-self:flex-start}',
    '.eb{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--button)}',
    'h2{margin:0;font-size:clamp(22px,3vw,28px);line-height:1.12;font-weight:800;letter-spacing:-.01em;text-wrap:balance}',
    'p{margin:0}',
    '.sub{font-size:15px;opacity:.82}',
    'form{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.f{display:flex;flex-direction:column;gap:4px;min-width:0}',
    '.f.full{grid-column:1/-1}',
    'label.l{font-size:12px;font-weight:600;opacity:.8}',
    'input[type=text],input[type=email],input[type=tel]{font:inherit;font-size:16px;padding:11px 12px;border:1.5px solid rgba(0,0,0,.18);border-radius:8px;background:#fff;color:#1E1B18;width:100%}',
    'input:focus{outline:none;border-color:var(--button);box-shadow:0 0 0 3px color-mix(in srgb,var(--button) 25%,transparent)}',
    'input.bad{border-color:#C62828}',
    '.err{font-size:12px;color:#C62828;min-height:0}',
    '.chk{grid-column:1/-1;display:flex;gap:9px;align-items:flex-start;font-size:12.5px;line-height:1.35;opacity:.9;cursor:pointer}',
    '.chk input{margin:2px 0 0;width:17px;height:17px;flex:none;accent-color:var(--button)}',
    '.btn{grid-column:1/-1;font:inherit;font-size:17px;font-weight:800;letter-spacing:.02em;padding:15px 18px;border:0;border-radius:10px;background:var(--button);color:var(--buttonInk);cursor:pointer;box-shadow:0 6px 18px color-mix(in srgb,var(--button) 40%,transparent);transition:transform .15s,filter .15s}',
    '.btn:hover{filter:brightness(1.07);transform:translateY(-1px)}',
    '.btn:disabled{opacity:.6;cursor:default;transform:none}',
    '.btn:focus-visible,.x:focus-visible,.lnk:focus-visible,.tab:focus-visible{outline:3px solid var(--rim);outline-offset:2px}',
    '.fine{font-size:12px;opacity:.7}',
    '.lnk{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer}',
    '.win{display:flex;flex-direction:column;gap:12px}',
    '.prize{font-size:clamp(28px,4vw,38px);font-weight:900;line-height:1.05;color:var(--button);letter-spacing:-.01em}',
    '.pdet{font-size:16px;font-weight:600}',
    '.code{display:flex;align-items:center;justify-content:space-between;gap:10px;border:2px dashed var(--button);border-radius:10px;padding:12px 14px;background:color-mix(in srgb,var(--button) 6%,#fff)}',
    '.code b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:22px;letter-spacing:.08em;color:#1E1B18}',
    '.code small{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65}',
    '.cp{font:inherit;font-size:13px;font-weight:700;padding:8px 12px;border-radius:8px;border:1.5px solid var(--button);background:#fff;color:var(--button);cursor:pointer;flex:none}',
    '.steps{margin:0;padding-left:18px;font-size:14px;display:grid;gap:4px}',
    '.terms{font-size:13px;white-space:pre-wrap;line-height:1.5;max-height:46vh;overflow:auto;padding-right:6px}',
    '.spinmsg{font-size:22px;font-weight:800}',
    '.tab{position:fixed;z-index:2147483645;bottom:18px;left:18px;display:flex;align-items:center;gap:8px;font:700 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:13px 18px 13px 14px;border:0;border-radius:999px;background:var(--button);color:var(--buttonInk);box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer;transition:transform .2s}',
    '.tab:hover{transform:translateY(-2px)}',
    '.tab svg{width:22px;height:22px}',
    '.tab.right{left:auto;right:18px}',
    '.confetti{position:absolute;inset:0;pointer-events:none;z-index:6;width:100%;height:100%}',
    '[hidden]{display:none!important}',
    '@media (max-width:720px){.card{grid-template-columns:1fr;max-height:calc(100vh - 24px);overflow-y:auto}.panel{overflow:visible;padding:22px 18px 18px}.wside{padding:28px 18px 14px}.wwrap{width:min(230px,62vw)}.ov{padding:12px;align-items:flex-start}.inline .wwrap{width:min(300px,80%)}}',
    '@media (max-width:400px){form{grid-template-columns:1fr}}',
    '.inline{container-type:inline-size}',
    '@container (max-width:680px){.card{grid-template-columns:1fr}.panel{padding:22px 18px 18px}.wside{padding:30px 18px 16px}.wwrap{width:min(270px,72%)}}',
    '@container (max-width:360px){form{grid-template-columns:1fr}}',
    '@media (prefers-reduced-motion:reduce){.ov,.card,.btn,.tab{transition:none}}'
  ].join('\n');

  var GIFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>';

  function Widget(userCfg, opts) {
    opts = opts || {};
    var cfg = merge(DEFAULTS, userCfg || {});
    cfg.prizes = (cfg.prizes || []).filter(function (p) { return p && p.label && Number(p.weight) > 0; });
    if (cfg.prizes.length < 2) { if (window.console) console.warn('[SpinWin] needs at least 2 prizes with odds above 0'); return null; }
    var preview = !!opts.preview;
    var inline = !!opts.container;
    var K = 'spinwin:' + cfg.id + ':';
    var self = this;
    var rotation = 0, spinning = false, opened = false, lastFocus = null;

    var host = document.createElement('div');
    host.setAttribute('data-spinwin', cfg.id);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var t = cfg.theme;
    var vars = '--button:' + t.button + ';--buttonInk:' + inkFor(t.button) + ';--wheelBg:' + t.wheelBg + ';--rim:' + t.rim + ';--panel:' + t.panel + ';--text:' + t.text;

    var storeName = esc(cfg.store.name);
    root.innerHTML =
      '<style>' + CSS + '</style>' +
      '<div class="sw ' + (inline ? 'inline' : '') + '" style="' + vars + '">' +
      (inline ? '' : '<div class="ov" hidden role="dialog" aria-modal="true" aria-labelledby="sw-h">') +
      '<div class="card">' +
      (inline ? '' : '<button class="x" type="button" aria-label="Close">&times;</button>') +
      '<div class="wside"><div class="wwrap">' +
      '<svg class="ptr" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43 L2 8 A16 16 0 1 1 32 8 Z" fill="' + esc(t.rim) + '" stroke="' + esc(t.wheelBg) + '" stroke-width="2"/><circle cx="17" cy="15" r="5" fill="' + esc(t.wheelBg) + '"/></svg>' +
      '<canvas aria-hidden="true"></canvas><div class="hub">SPIN</div></div></div>' +
      '<div class="panel">' +
      // form view
      '<div class="v-form" style="display:flex;flex-direction:column;gap:14px">' +
      (cfg.store.logoUrl ? '<img class="logo" alt="' + storeName + '" src="' + esc(cfg.store.logoUrl) + '">' : '') +
      (cfg.eyebrow ? '<div class="eb">' + esc(cfg.eyebrow) + '</div>' : '') +
      '<h2 id="sw-h">' + esc(cfg.headline) + '</h2>' +
      (cfg.subhead ? '<p class="sub">' + esc(cfg.subhead) + '</p>' : '') +
      '<form novalidate>' +
      '<div class="f full"><label class="l" for="sw-name">Full name</label><input id="sw-name" name="name" type="text" autocomplete="name" required></div>' +
      '<div class="f full"><label class="l" for="sw-email">Email</label><input id="sw-email" name="email" type="email" autocomplete="email" inputmode="email" required></div>' +
      '<div class="f"><label class="l" for="sw-phone">Mobile phone' + (cfg.requirePhone ? '' : ' (optional)') + '</label><input id="sw-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" placeholder="(555) 555-5555"></div>' +
      '<div class="f"><label class="l" for="sw-zip">ZIP code' + (cfg.requireZip ? '' : ' (optional)') + '</label><input id="sw-zip" name="zip" type="text" autocomplete="postal-code" inputmode="numeric" maxlength="5"></div>' +
      '<label class="chk"><input type="checkbox" name="terms"><span>I agree to the <button type="button" class="lnk" data-act="terms">official terms &amp; conditions</button>.</span></label>' +
      (cfg.optInText ? '<label class="chk"><input type="checkbox" name="optin"><span>' + esc(cfg.optInText) + '</span></label>' : '') +
      '<div class="err f full" aria-live="polite"></div>' +
      '<button class="btn" type="submit">' + esc(cfg.buttonText) + '</button>' +
      '</form>' +
      '<p class="fine">One spin per person. Prizes require a qualifying purchase. Terms apply.</p>' +
      '</div>' +
      // spinning view
      '<div class="v-spin" hidden><div class="eb">Good luck</div><p class="spinmsg"></p><p class="sub">The wheel is spinning&hellip;</p></div>' +
      // result view
      '<div class="v-win win" hidden aria-live="polite"></div>' +
      // terms view
      '<div class="v-terms" hidden style="display:flex;flex-direction:column;gap:12px"><div class="eb">Official terms &amp; conditions</div><div class="terms"></div><button type="button" class="btn" data-act="back">Back</button></div>' +
      '</div></div>' +
      (inline ? '' : '</div>') +
      (inline || !cfg.trigger.showTab ? '' : '<button class="tab" type="button" hidden>' + GIFT + '<span></span></button>') +
      '</div>';

    var $ = function (s) { return root.querySelector(s); };
    var ov = $('.ov'), card = $('.card'), canvas = $('canvas'), form = $('form'), errBox = $('.err'), tab = $('.tab');
    var views = { form: $('.v-form'), spin: $('.v-spin'), win: $('.v-win'), terms: $('.v-terms') };
    var current = 'form', beforeTerms = 'form';

    function show(name) {
      for (var k in views) views[k].hidden = k !== name;
      current = name;
    }

    // ---------- wheel ----------
    var N = cfg.prizes.length, SEG = Math.PI * 2 / N;
    function sliceColor(i) { return cfg.prizes[i].color || SLICE_DEFAULTS[i % SLICE_DEFAULTS.length]; }
    function draw() {
      var cssW = canvas.clientWidth || 340;
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssW * dpr);
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var c = cssW / 2, R = c - 2, rim = Math.max(10, R * 0.075), r = R - rim;
      ctx.clearRect(0, 0, cssW, cssW);
      // rim
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fillStyle = t.rim; ctx.fill();
      ctx.beginPath(); ctx.arc(c, c, R - rim * 0.25, 0, Math.PI * 2); ctx.fillStyle = t.wheelBg; ctx.fill();
      // slices
      for (var i = 0; i < N; i++) {
        var a0 = -Math.PI / 2 + i * SEG, a1 = a0 + SEG, col = sliceColor(i);
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r, a0, a1); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = Math.max(1.5, R * 0.012); ctx.strokeStyle = t.rim; ctx.stroke();
        // label
        var mid = a0 + SEG / 2, flip = Math.cos(mid) < -0.01;
        ctx.save(); ctx.translate(c, c); ctx.rotate(flip ? mid + Math.PI : mid);
        ctx.fillStyle = inkFor(col); ctx.textAlign = flip ? 'left' : 'right'; ctx.textBaseline = 'middle';
        var lines = String(cfg.prizes[i].label).split('|');
        var maxW = r * 0.66, size = Math.min(r * 0.12, (r * SEG * 0.62) / (lines.length * 1.05));
        var fam = 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
        ctx.font = '800 ' + size + 'px ' + fam;
        var widest = 0; lines.forEach(function (ln) { widest = Math.max(widest, ctx.measureText(ln).width); });
        if (widest > maxW) { size *= maxW / widest; ctx.font = '800 ' + size + 'px ' + fam; }
        var lh = size * 1.05, y0 = -((lines.length - 1) * lh) / 2;
        lines.forEach(function (ln, j) { ctx.fillText(ln, (flip ? -1 : 1) * (r - r * 0.07), y0 + j * lh); });
        ctx.restore();
      }
      // bulbs
      var bulbs = Math.max(12, N * 3);
      for (var b = 0; b < bulbs; b++) {
        var ang = -Math.PI / 2 + b * (Math.PI * 2 / bulbs);
        var bx = c + Math.cos(ang) * (R - rim * 0.55), by = c + Math.sin(ang) * (R - rim * 0.55);
        ctx.beginPath(); ctx.arc(bx, by, Math.max(2, rim * 0.22), 0, Math.PI * 2);
        ctx.fillStyle = b % 2 ? '#FFF8E1' : t.wheelBg; ctx.fill();
      }
    }

    function pick() {
      var total = 0, i;
      for (i = 0; i < N; i++) total += Number(cfg.prizes[i].weight);
      var x = rand() * total;
      for (i = 0; i < N; i++) { x -= Number(cfg.prizes[i].weight); if (x < 0) return i; }
      return N - 1;
    }

    function spinTo(i, done) {
      var segDeg = 360 / N;
      var jitter = (rand() - 0.5) * segDeg * 0.7;
      var target = i * segDeg + segDeg / 2 + jitter; // clockwise from top
      var curMod = ((rotation % 360) + 360) % 360;
      var want = (360 - target) % 360;
      var delta = (want - curMod + 360) % 360;
      var dur = reduceMotion ? 900 : 5200;
      rotation += (reduceMotion ? 360 : 360 * 6) + delta;
      canvas.style.transition = 'transform ' + dur + 'ms cubic-bezier(.12,.67,.1,1)';
      canvas.style.transform = 'rotate(' + rotation + 'deg)';
      var fired = false;
      function fin() { if (fired) return; fired = true; done(); }
      canvas.addEventListener('transitionend', fin, { once: true });
      setTimeout(fin, dur + 300);
    }

    // ---------- confetti ----------
    function confetti() {
      if (reduceMotion) return;
      var cv = document.createElement('canvas'); cv.className = 'confetti'; card.appendChild(cv);
      var w = cv.width = card.clientWidth, h = cv.height = card.clientHeight, ctx = cv.getContext('2d');
      var cols = [t.rim, t.button, '#FFFFFF', '#2E7D32', '#1565C0'], ps = [];
      for (var i = 0; i < 140; i++) ps.push({ x: w * (0.2 + rand() * 0.6), y: h * 0.35, vx: (rand() - 0.5) * 9, vy: -rand() * 10 - 3, s: 4 + rand() * 6, r: rand() * 6, vr: (rand() - 0.5) * 0.3, c: cols[i % cols.length] });
      var t0 = performance.now();
      (function frame(now) {
        var el = now - t0; ctx.clearRect(0, 0, w, h);
        ps.forEach(function (p) { p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - el / 2600); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
        if (el < 2600) requestAnimationFrame(frame); else cv.remove();
      })(t0);
    }

    // ---------- terms ----------
    function termsText() {
      var txt = cfg.terms || '';
      if (cfg.showOddsInTerms) {
        var total = cfg.prizes.reduce(function (s, p) { return s + Number(p.weight); }, 0);
        txt += (txt ? '\n\n' : '') + 'Odds of winning (every spin wins one prize):\n' + cfg.prizes.map(function (p) {
          return '• ' + (p.title || p.label.replace(/\|/g, ' ')) + (p.detail ? ' ' + p.detail : '') + ': ' + (Math.round(Number(p.weight) / total * 1000) / 10) + '%';
        }).join('\n');
      }
      return txt.replace(/\{store\}/g, cfg.store.name).replace(/\{days\}/g, cfg.codeExpiryDays);
    }
    function openTerms() { beforeTerms = current === 'terms' ? beforeTerms : current; $('.terms').textContent = termsText(); show('terms'); $('[data-act=back]').focus(); }

    // ---------- result ----------
    function renderWin(w, isReturn) {
      var p = w;
      views.win.innerHTML =
        '<div class="eb">' + (isReturn ? 'Your prize' : 'Congratulations, ' + esc(w.first) + '!') + '</div>' +
        '<div><div class="prize">' + esc(p.title) + '</div>' + (p.detail ? '<div class="pdet">' + esc(p.detail) + '</div>' : '') + '</div>' +
        '<div class="code"><div><small>Your prize code</small><b>' + esc(p.code) + '</b></div><button type="button" class="cp">Copy</button></div>' +
        '<p class="fine" style="opacity:.85">Expires ' + esc(p.expires) + '.' + (cfg.webhookUrl ? ' We also sent it to ' + esc(p.email) + '.' : '') + '</p>' +
        '<ol class="steps"><li>Take a screenshot' + (cfg.webhookUrl ? ' or keep the email' : '') + '.</li><li>Show your code to a sales associate' + (cfg.store.phone ? ' or call ' + esc(cfg.store.phone) : '') + '.</li><li>Prize applies when your purchase meets the minimum.</li></ol>' +
        '<p class="fine"><button type="button" class="lnk" data-act="terms">Terms &amp; conditions apply</button>. Not valid on floor samples, clearance or special-price items.</p>' +
        (inline ? '' : '<button type="button" class="btn" data-act="close">Start shopping</button>');
      show('win');
      var cp = views.win.querySelector('.cp');
      cp.addEventListener('click', function () {
        var ok = function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy'; }, 1600); };
        try { navigator.clipboard.writeText(p.code).then(ok, function () { selectCode(); }); } catch (e) { selectCode(); }
      });
      function selectCode() { try { var r = document.createRange(); r.selectNodeContents(views.win.querySelector('.code b')); var s = (root.getSelection ? root : window).getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }
    }

    // ---------- form ----------
    var phoneIn = $('#sw-phone'), zipIn = $('#sw-zip');
    phoneIn.addEventListener('input', function () {
      var d = phoneIn.value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10);
      phoneIn.value = d.length > 6 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : d.length > 3 ? '(' + d.slice(0, 3) + ') ' + d.slice(3) : d;
    });
    zipIn.addEventListener('input', function () { zipIn.value = zipIn.value.replace(/\D/g, '').slice(0, 5); });

    function validate() {
      var f = form.elements, errs = [];
      [].forEach.call(form.querySelectorAll('input'), function (i) { i.classList.remove('bad'); });
      function bad(el, msg) { el.classList.add('bad'); errs.push(msg); }
      var name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.replace(/\D/g, ''), zip = f.zip.value.trim();
      if (name.length < 2) bad(f.name, 'Enter your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad(f.email, 'Enter a valid email address.');
      if ((cfg.requirePhone || phone) && phone.length !== 10) bad(f.phone, 'Enter a 10-digit phone number.');
      if ((cfg.requireZip || zip) && !/^\d{5}$/.test(zip)) bad(f.zip, 'Enter a 5-digit ZIP code.');
      if (!f.terms.checked) { errs.push('Please agree to the terms to spin.'); }
      errBox.textContent = errs[0] || '';
      if (errs.length) { var first = form.querySelector('.bad'); if (first) first.focus(); return null; }
      return { name: name, email: email, phone: phone ? '(' + phone.slice(0, 3) + ') ' + phone.slice(3, 6) + '-' + phone.slice(6) : '', zip: zip, optIn: !!(f.optin && f.optin.checked) };
    }

    function send(lead) {
      try { window.dispatchEvent(new CustomEvent('spinwin:lead', { detail: lead })); } catch (e) {}
      if (preview || !cfg.webhookUrl) return;
      try {
        fetch(cfg.webhookUrl, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(lead) });
      } catch (e) {}
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (spinning) return;
      var info = validate(); if (!info) return;
      spinning = true;
      var sbtn = form.querySelector('.btn');
      sbtn.disabled = true; sbtn.textContent = 'One moment\u2026'; errBox.textContent = '';
      var idx = pick(), prize = cfg.prizes[idx];
      var exp = new Date(); exp.setDate(exp.getDate() + Number(cfg.codeExpiryDays || 30));
      var title = prize.title || prize.label.replace(/\|/g, ' ');
      var win = {
        campaign: cfg.id, store: cfg.store.name,
        name: info.name, first: info.name.split(' ')[0], email: info.email, phone: info.phone, zip: info.zip, optIn: info.optIn,
        prizeIndex: idx, prize: title, title: title, detail: prize.detail || '',
        kind: prize.kind || 'other', amount: Number(prize.amount) || 0, min: Number(prize.min) || 0,
        code: makeCode(prize.code), expires: fmtDate(exp), expiresISO: exp.getFullYear() + '-' + String(exp.getMonth() + 1).padStart(2, '0') + '-' + String(exp.getDate()).padStart(2, '0'),
        wonAt: new Date().toISOString(), page: (opts.page || location.href), terms: termsText()
      };
      var saving = opts.onLead && !preview
        ? Promise.race([Promise.resolve().then(function () { return opts.onLead(win); }), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 15000); })])
        : Promise.resolve();
      saving.then(function () {
        $('.spinmsg').textContent = 'Good luck, ' + win.first + '!';
        show('spin');
        if (!preview) store(K + 'played', win);
        send(win);
        spinTo(idx, function () {
          spinning = false;
          renderWin(win, false);
          confetti();
          var cb = views.win.querySelector('.cp'); if (cb) cb.focus();
          if (tab) { tab.querySelector('span').textContent = 'View your prize'; }
          if (opts.onWin) try { opts.onWin(win); } catch (e) {}
        });
      }, function () {
        spinning = false; sbtn.disabled = false; sbtn.textContent = cfg.buttonText;
        errBox.textContent = 'We couldn\u2019t connect just now. Check your internet connection and try again.';
      });
    });

    root.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-act]');
      if (!a) return;
      var act = a.getAttribute('data-act');
      if (act === 'terms') openTerms();
      else if (act === 'back') { show(beforeTerms); }
      else if (act === 'close') close();
    });

    // ---------- open / close ----------
    function onKey(e) {
      if (e.key === 'Escape' && !spinning) close();
      if (e.key === 'Tab') {
        var f = [].filter.call(root.querySelectorAll('.ov button,.ov input,.ov img[tabindex]'), function (el) { return !el.disabled && el.offsetParent !== null; });
        if (!f.length) return;
        var act = root.activeElement, i = f.indexOf(act);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    }
    function open() {
      if (inline || opened) return;
      opened = true; lastFocus = document.activeElement;
      var played = !preview && store(K + 'played');
      if (played) renderWin(played, true);
      ov.hidden = false;
      if (tab) tab.hidden = true;
      requestAnimationFrame(function () { ov.classList.add('on'); draw(); var first = root.querySelector(played ? '.cp' : '#sw-name'); if (first) first.focus({ preventScroll: true }); });
      document.addEventListener('keydown', onKey, true);
      self._prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }
    function close() {
      if (inline || !opened || spinning) return;
      opened = false;
      ov.classList.remove('on');
      setTimeout(function () { ov.hidden = true; }, reduceMotion ? 0 : 250);
      document.removeEventListener('keydown', onKey, true);
      document.documentElement.style.overflow = self._prevOverflow || '';
      if (!preview && !store(K + 'played')) store(K + 'dismissed', Date.now());
      if (tab) tab.hidden = false;
      if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
      if (opts.onClose) try { opts.onClose(); } catch (e) {}
    }
    if (ov) {
      $('.x').addEventListener('click', close);
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    }
    if (tab) {
      tab.querySelector('span').textContent = cfg.trigger.tabText || 'Spin & Win';
      if (cfg.trigger.tabSide === 'right') tab.classList.add('right');
      tab.addEventListener('click', open);
    }

    // ---------- mount ----------
    (inline ? opts.container : document.body).appendChild(host);
    var ro;
    if (window.ResizeObserver) { ro = new ResizeObserver(function () { if (inline || opened) draw(); }); ro.observe(canvas); }
    if (inline) {
      draw();
      var playedI = !preview && store(K + 'played');
      if (playedI) renderWin(playedI, true);
    }

    this.open = open;
    this.close = close;
    this.destroy = function () { try { if (ro) ro.disconnect(); document.removeEventListener('keydown', onKey, true); if (opened) document.documentElement.style.overflow = self._prevOverflow || ''; host.remove(); } catch (e) {} };
    this.reset = function () { store(K + 'played', null); store(K + 'dismissed', null); };
    this.redraw = draw;
    this.showTab = function () { if (tab) tab.hidden = false; };

    // ---------- auto triggers (popup mode on a live site) ----------
    if (!inline && !opts.manual) {
      var played0 = store(K + 'played');
      var dismissed = store(K + 'dismissed');
      var cool = dismissed && (Date.now() - dismissed) < Number(cfg.trigger.repeatDays || 0) * 864e5;
      if (played0) { if (tab) { tab.querySelector('span').textContent = 'View your prize'; tab.hidden = false; } }
      else if (cool) { if (tab) tab.hidden = false; }
      else {
        var fired = false;
        var go = function () { if (fired) return; fired = true; open(); };
        if (Number(cfg.trigger.delaySeconds) >= 0) setTimeout(go, Number(cfg.trigger.delaySeconds) * 1000);
        if (cfg.trigger.exitIntent) document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) go(); });
        if (tab) tab.hidden = false;
      }
    }
  }

  function init(cfg, opts) {
    cfg = cfg || window.SpinWinConfig;
    if (!cfg) return null;
    var full = merge(DEFAULTS, cfg);
    if (!(opts && opts.preview) && (!full.enabled || !inWindow(full))) return null;
    return new Widget(cfg, opts);
  }

  window.SpinWin = { __loaded: true, version: '1.0', init: init, defaults: DEFAULTS };

  // Auto-start on a live site when a config is present on the page.
  if (window.SpinWinConfig && !window.SpinWinConfig.manual) {
    var boot = function () {
      var c = window.SpinWinConfig, el = c.mountTo ? document.querySelector(c.mountTo) : null;
      window.SpinWin.instance = init(c, el ? { container: el } : undefined);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
})();
