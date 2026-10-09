/*! HomeStore POS — website prize games v2 (Spin & Win, Scratch-off, Gift boxes, Pick a card, Slots, Plinko, Style quiz).
    Used by spin.js (dealer websites) and Settings › Marketing & leads › Prize games (preview). */
(function () {
  'use strict';
  if (window.SpinWin && window.SpinWin.__loaded) return;

  var GAME_COPY = {
    wheel:  { headline: 'Spin to win a prize on your new furniture', button: 'Spin the wheel', play: 'The wheel is spinning…' },
    scratch:{ headline: 'Scratch to win a prize on your new furniture', button: 'Get my scratch card', play: 'Scratch the silver card to reveal your prize!' },
    boxes:  { headline: 'Open a gift box and win a prize on your new furniture', button: 'Pick my gift', play: 'Pick one of the gift boxes!' },
    cards:  { headline: 'Pick a card and win a prize on your new furniture', button: 'Deal my cards', play: 'Pick a card — any card!' },
    slots:  { headline: 'Hit the jackpot on your new furniture', button: 'Spin the reels', play: 'The reels are spinning…' },
    plinko: { headline: 'Drop the ball and win a prize on your new furniture', button: 'Drop the ball', play: 'Watch the ball drop…' },
    quiz:   { headline: 'Find your furniture style and win a prize', button: 'See my style & prize', play: 'Matching your style…' }
  };
  var QUIZ = [
    { key: 'room', q: 'What are you shopping for?', a: ['Living room', 'Sectional', 'Bedroom', 'Mattress', 'Dining', 'Whole home'] },
    { key: 'style', q: 'Which look do you love?', a: ['Modern', 'Farmhouse', 'Classic', 'Glam', 'Coastal', 'Industrial'] },
    { key: 'budget', q: 'What budget do you have in mind?', a: ['Under $1,000', '$1,000 – $2,500', '$2,500 – $5,000', '$5,000+'] },
    { key: 'when', q: 'When are you planning to buy?', a: ['This week', 'This month', 'In 1–3 months', 'Just looking'] }
  ];
  var STYLES = {
    Modern: { sw: ['#1F2933', '#E4E7EB', '#3E7CB1', '#C9A227'], d: 'Clean lines, low profiles and a calm, uncluttered room.' },
    Farmhouse: { sw: ['#F4EDE1', '#8B6B4A', '#5F7161', '#2F2B28'], d: 'Warm woods, cozy textures and relaxed, lived-in comfort.' },
    Classic: { sw: ['#5B2333', '#D9C5A0', '#2D3E50', '#F5F0E6'], d: 'Rich fabrics, rolled arms and timeless detail.' },
    Glam: { sw: ['#1B1B2F', '#D4AF37', '#E8D5E0', '#8E8E9A'], d: 'Velvet, metallic accents and a little sparkle.' },
    Coastal: { sw: ['#EAF4F4', '#5FA8D3', '#F2E3C6', '#1B4965'], d: 'Light, airy colors and easy beach-house comfort.' },
    Industrial: { sw: ['#3A3A3A', '#B5651D', '#9A9A9A', '#E9E4DA'], d: 'Leather, metal and reclaimed-wood character.' }
  };

  var DEFAULTS = {
    id: 'spin-2026', game: 'wheel', enabled: true, startDate: '', endDate: '',
    store: { name: 'Your Furniture Store', phone: '', logoUrl: '' },
    theme: { button: '#E4202C', wheelBg: '#0B1A4A', rim: '#F5C518', panel: '#FFFFFF', text: '#0B1A4A' },
    eyebrow: 'Exclusive online offer', headline: '', subhead: 'Enter your info for one free play. Every player wins a prize you can use in store.', buttonText: '',
    trigger: { delaySeconds: 6, exitIntent: true, showTab: true, tabText: 'Spin & Win', repeatDays: 3 },
    codeExpiryDays: 30, requirePhone: true, requireZip: true,
    optInText: 'Yes, send me deals by email and text. Msg & data rates may apply. Reply STOP to opt out.',
    showOddsInTerms: true, webhookUrl: '', prizes: [], terms: ''
  };

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(a, b) { var out = {}, k; for (k in a) out[k] = a[k]; for (k in b) { if (b[k] === undefined) continue; out[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; } return out; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(key, val) { try { if (val === undefined) { var r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } }
  function rand() { try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } }
  function makeCode(prefix) { var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 6; i++) s += chars[Math.floor(rand() * chars.length)]; return (prefix ? String(prefix).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' : '') + s; }
  function lum(hex) { var h = String(hex || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); if (isNaN(n)) return 1; var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function inkFor(bg) { return lum(bg) > 0.4 ? '#1E1B18' : '#FFFFFF'; }
  function fmtDate(d) { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  function inWindow(cfg) { var now = new Date(); if (cfg.startDate && now < new Date(cfg.startDate + 'T00:00:00')) return false; if (cfg.endDate && now > new Date(cfg.endDate + 'T23:59:59')) return false; return true; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var FAM = 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var SLICE_DEFAULTS = ['#E4202C', '#FFD400', '#1E63D6', '#1FA347', '#8E3FCF', '#FF7A00', '#E83E8C', '#00A6D6'];
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var CSS = [
    ':host{all:initial}', '*{box-sizing:border-box}',
    '.sw{font-family:' + FAM + ';color:var(--text);line-height:1.4;-webkit-font-smoothing:antialiased}',
    '.ov{position:fixed;inset:0;z-index:2147483646;background:rgba(15,12,10,.62);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .25s ease}',
    '.ov.on{opacity:1}',
    '.card{position:relative;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);width:min(880px,100%);max-height:calc(100vh - 32px);background:var(--panel);border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45);transform:translateY(14px) scale(.98);transition:transform .3s cubic-bezier(.2,.8,.2,1)}',
    '.ov.on .card{transform:none}', '.inline .card{transform:none;box-shadow:0 12px 40px rgba(0,0,0,.18);max-height:none}',
    '.wside{position:relative;background:var(--wheelBg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:34px 22px 26px;overflow:hidden;min-height:300px}',
    '.wside:before{content:"";position:absolute;inset:-40%;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.10),transparent 55%);pointer-events:none}',
    '.gcap{position:relative;color:#fff;font-weight:800;font-size:15px;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.4);min-height:20px}',
    '.gwrap{position:relative;width:min(380px,100%)}',
    /* wheel */
    '.wwrap{position:relative;width:min(380px,100%);aspect-ratio:1/1}', '.wwrap canvas{width:100%;height:100%;display:block;will-change:transform}',
    '.ptr{position:absolute;left:50%;top:-14px;transform:translateX(-50%);width:34px;height:44px;z-index:2;filter:drop-shadow(0 3px 3px rgba(0,0,0,.4))}',
    '.hub{position:absolute;left:50%;top:50%;width:22%;height:22%;transform:translate(-50%,-50%);border-radius:50%;background:var(--rim);color:var(--wheelBg);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:clamp(11px,2.4vw,16px);letter-spacing:.06em;box-shadow:0 0 0 5px var(--wheelBg),0 4px 14px rgba(0,0,0,.4);z-index:2;user-select:none}',
    /* scratch */
    '.ticket{position:relative;width:min(360px,100%);background:linear-gradient(160deg,#fff,#fff6d8);border-radius:14px;border:4px dashed var(--rim);box-shadow:0 10px 30px rgba(0,0,0,.35);padding:14px;display:flex;flex-direction:column;gap:10px;color:#1E1B18}',
    '.thead{display:flex;justify-content:space-between;align-items:baseline;font-weight:900;letter-spacing:.08em;font-size:13px;text-transform:uppercase}', '.thead b{font-size:20px;color:var(--button);letter-spacing:.02em}',
    '.tarea{position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#fff;border:2px solid #eee}',
    '.under{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px}',
    '.under .pt{font-size:clamp(22px,4.4vw,34px);font-weight:900;line-height:1.05;color:var(--button)}', '.under .pd{font-size:13px;font-weight:700;margin-top:4px}',
    '.coat{position:absolute;inset:0;width:100%;height:100%;touch-action:none;transition:opacity .5s;cursor:default}', '.coat.live{cursor:grab}',
    '.tfoot{font-size:12px;text-align:center;opacity:.7;font-weight:600}',
    '.ghost{font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:999px;border:1.5px solid rgba(255,255,255,.7);background:transparent;color:#fff;cursor:pointer;position:relative}',
    /* boxes */
    '.boxes{display:flex;gap:4%;justify-content:center;align-items:flex-end;width:min(400px,100%);padding-top:56px}',
    '.box{position:relative;flex:1;max-width:120px;aspect-ratio:1/1.05;border:0;background:none;padding:0;cursor:default;animation:bob 2.6s ease-in-out infinite;-webkit-tap-highlight-color:transparent}',
    '.box:nth-child(2){animation-delay:.4s}', '.box:nth-child(3){animation-delay:.8s}', '.boxes.live .box{cursor:pointer}', '.boxes.live .box:hover{transform:translateY(-6px) rotate(-2deg)}',
    '.bbody{position:absolute;left:6%;right:6%;bottom:0;height:68%;border-radius:6px;background:var(--bc);box-shadow:inset 0 -10px 0 rgba(0,0,0,.12),0 8px 18px rgba(0,0,0,.35)}',
    '.bbody:before{content:"";position:absolute;left:50%;top:0;bottom:0;width:16%;transform:translateX(-50%);background:var(--rib)}',
    '.blid{position:absolute;left:0;right:0;top:12%;height:24%;border-radius:6px;background:var(--bc);filter:brightness(1.08);box-shadow:0 4px 8px rgba(0,0,0,.25);transition:transform .6s cubic-bezier(.3,1.4,.5,1);z-index:2}',
    '.blid:before{content:"";position:absolute;left:50%;top:0;bottom:0;width:16%;transform:translateX(-50%);background:var(--rib)}',
    '.blid:after{content:"";position:absolute;left:50%;top:-34%;width:44%;height:50%;transform:translateX(-50%);border:5px solid var(--rib);border-radius:50% 50% 10% 10%;border-bottom:0}',
    '.box.open{animation:none}', '.box.open .blid{transform:translate(18%,-150%) rotate(28deg)}',
    '.boxes.done .box:not(.open){opacity:.35;animation:none}',
    '.ptag{position:absolute;left:50%;bottom:58%;transform:translate(-50%,30%) scale(.3);opacity:0;background:#fff;color:#1E1B18;border-radius:10px;padding:8px 10px;min-width:120px;text-align:center;font-weight:900;font-size:15px;line-height:1.1;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:transform .6s cubic-bezier(.3,1.5,.5,1) .15s,opacity .3s .15s;z-index:3;white-space:nowrap}',
    '.box.open .ptag{transform:translate(-50%,-10%) scale(1);opacity:1}',
    '@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
    /* cards */
    '.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:3%;width:min(400px,100%);perspective:900px}',
    '.pc{position:relative;aspect-ratio:5/7;border:0;padding:0;background:none;cursor:default;transform-style:preserve-3d;transition:transform .7s cubic-bezier(.3,1.2,.5,1),opacity .3s}',
    '.cards.live .pc{cursor:pointer}', '.cards.live .pc:hover{transform:translateY(-8px)}',
    '.pc .face{position:absolute;inset:0;border-radius:9px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:0 6px 14px rgba(0,0,0,.35)}',
    '.pc .back{background:repeating-linear-gradient(45deg,var(--rim) 0 6px,var(--button) 6px 12px);border:4px solid #fff}',
    '.pc .back span{width:52%;aspect-ratio:1;border-radius:50%;background:#fff;color:var(--button);font-weight:900;font-size:clamp(14px,3vw,22px);display:flex;align-items:center;justify-content:center}',
    '.pc .front{background:#fff;color:#1E1B18;transform:rotateY(180deg);font-weight:900;font-size:clamp(10px,2.1vw,14px);line-height:1.1;padding:6px;border:3px solid var(--rim)}',
    '.pc.flip{transform:rotateY(180deg) scale(1.12);z-index:2}', '.cards.done .pc:not(.flip){opacity:.35}',
    /* slots */
    '.slot{width:min(380px,100%);background:linear-gradient(#2a2a2a,#111);border:6px solid var(--rim);border-radius:18px;padding:14px 12px 16px;box-shadow:0 12px 30px rgba(0,0,0,.45);position:relative}',
    '.slot .mark{text-align:center;font-weight:900;letter-spacing:.2em;color:var(--rim);font-size:14px;margin-bottom:8px}',
    '.reels{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;position:relative}',
    '.reel{position:relative;height:92px;overflow:hidden;border-radius:8px;background:#fff;box-shadow:inset 0 8px 10px rgba(0,0,0,.25),inset 0 -8px 10px rgba(0,0,0,.25)}',
    '.strip{position:absolute;left:0;right:0;top:0;will-change:transform}',
    '.sym{height:92px;display:flex;align-items:center;justify-content:center;text-align:center;font-weight:900;font-size:clamp(12px,2.6vw,16px);line-height:1.05;padding:4px;border-bottom:1px solid rgba(0,0,0,.06)}',
    '.payline{position:absolute;left:-6px;right:-6px;top:50%;height:3px;background:var(--button);opacity:.7;transform:translateY(-50%);pointer-events:none}',
    '.slot.win .reel{box-shadow:0 0 0 3px var(--rim),0 0 18px var(--rim)}',
    /* plinko */
    '.pl{width:min(380px,100%);aspect-ratio:1/1.08}', '.pl canvas{width:100%;height:100%;display:block}',
    /* quiz */
    '.qboard{width:min(360px,100%);display:flex;flex-direction:column;gap:12px;align-items:center;color:#fff;text-align:center;position:relative}',
    '.qboard h3{margin:0;font-size:24px;font-weight:900;line-height:1.1}', '.qboard p{margin:0;font-size:14px;opacity:.85}',
    '.sws{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%}', '.sws i{display:block;aspect-ratio:1;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,.3);transition:background .4s}',
    '.qprog{display:flex;gap:6px}', '.qprog i{width:26px;height:6px;border-radius:9px;background:rgba(255,255,255,.3)}', '.qprog i.on{background:var(--rim)}',
    '.qopts{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.qo{font:inherit;font-size:15px;font-weight:700;padding:13px 10px;border-radius:10px;border:1.5px solid rgba(0,0,0,.15);background:#fff;color:#1E1B18;cursor:pointer;text-align:center}',
    '.qo:hover{border-color:var(--button);background:color-mix(in srgb,var(--button) 6%,#fff)}',
    '.qo.on{border-color:var(--button);box-shadow:0 0 0 2px var(--button)}',
    '.stylebadge{display:inline-block;padding:4px 10px;border-radius:99px;background:var(--rim);color:var(--wheelBg);font-weight:900;font-size:13px}',
    /* panel */
    '.panel{position:relative;padding:34px 32px 26px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;min-width:0}',
    '.x{position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:#1E1B18;box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:22px;line-height:1;cursor:pointer;z-index:7;display:flex;align-items:center;justify-content:center}',
    '.logo{max-height:44px;max-width:180px;object-fit:contain;align-self:flex-start}',
    '.eb{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--button)}',
    'h2{margin:0;font-size:clamp(22px,3vw,28px);line-height:1.12;font-weight:800;letter-spacing:-.01em;text-wrap:balance}', 'p{margin:0}', '.sub{font-size:15px;opacity:.82}',
    'form{display:grid;grid-template-columns:1fr 1fr;gap:10px}', '.f{display:flex;flex-direction:column;gap:4px;min-width:0}', '.f.full{grid-column:1/-1}', 'label.l{font-size:12px;font-weight:600;opacity:.8}',
    'input[type=text],input[type=email],input[type=tel]{font:inherit;font-size:16px;padding:11px 12px;border:1.5px solid rgba(0,0,0,.18);border-radius:8px;background:#fff;color:#1E1B18;width:100%}',
    'input:focus{outline:none;border-color:var(--button);box-shadow:0 0 0 3px color-mix(in srgb,var(--button) 25%,transparent)}', 'input.bad{border-color:#C62828}', '.err{font-size:12px;color:#C62828}',
    '.chk{grid-column:1/-1;display:flex;gap:9px;align-items:flex-start;font-size:12.5px;line-height:1.35;opacity:.9;cursor:pointer}', '.chk input{margin:2px 0 0;width:17px;height:17px;flex:none;accent-color:var(--button)}',
    '.btn{grid-column:1/-1;font:inherit;font-size:17px;font-weight:800;letter-spacing:.02em;padding:15px 18px;border:0;border-radius:10px;background:var(--button);color:var(--buttonInk);cursor:pointer;box-shadow:0 6px 18px color-mix(in srgb,var(--button) 40%,transparent);transition:transform .15s,filter .15s}',
    '.btn:hover{filter:brightness(1.07);transform:translateY(-1px)}', '.btn:disabled{opacity:.6;cursor:default;transform:none}',
    'button:focus-visible{outline:3px solid var(--rim);outline-offset:2px}',
    '.fine{font-size:12px;opacity:.7}', '.lnk{background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer}',
    '.win{display:flex;flex-direction:column;gap:12px}', '.prize{font-size:clamp(28px,4vw,38px);font-weight:900;line-height:1.05;color:var(--button);letter-spacing:-.01em}', '.pdet{font-size:16px;font-weight:600}',
    '.code{display:flex;align-items:center;justify-content:space-between;gap:10px;border:2px dashed var(--button);border-radius:10px;padding:12px 14px;background:color-mix(in srgb,var(--button) 6%,#fff)}',
    '.code b{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:22px;letter-spacing:.08em;color:#1E1B18}', '.code small{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.65}',
    '.cp{font:inherit;font-size:13px;font-weight:700;padding:8px 12px;border-radius:8px;border:1.5px solid var(--button);background:#fff;color:var(--button);cursor:pointer;flex:none}',
    '.steps{margin:0;padding-left:18px;font-size:14px;display:grid;gap:4px}', '.terms{font-size:13px;white-space:pre-wrap;line-height:1.5;max-height:46vh;overflow:auto;padding-right:6px}', '.spinmsg{font-size:22px;font-weight:800}',
    '.tab{position:fixed;z-index:2147483645;bottom:18px;left:18px;display:flex;align-items:center;gap:8px;font:700 15px/1 ' + FAM + ';padding:13px 18px 13px 14px;border:0;border-radius:999px;background:var(--button);color:var(--buttonInk);box-shadow:0 8px 24px rgba(0,0,0,.3);cursor:pointer}',
    '.tab svg{width:22px;height:22px}', '.tab.right{left:auto;right:18px}',
    '.confetti{position:absolute;inset:0;pointer-events:none;z-index:6;width:100%;height:100%}', '[hidden]{display:none!important}',
    '@media (max-width:720px){.card{grid-template-columns:1fr;max-height:calc(100vh - 24px);overflow-y:auto}.panel{overflow:visible;padding:22px 18px 18px}.wside{padding:30px 14px 16px;min-height:0}.wwrap{width:min(230px,62vw)}.pl{width:min(260px,70vw)}.ov{padding:12px;align-items:flex-start}.reel,.sym{height:70px}.qboard h3{font-size:19px}.qboard .sws{width:70%}}',
    '@media (max-width:400px){form{grid-template-columns:1fr}.qopts{grid-template-columns:1fr 1fr}}',
    '.inline{container-type:inline-size}',
    '@container (max-width:680px){.card{grid-template-columns:1fr}.panel{padding:22px 18px 18px}.wside{padding:30px 14px 16px;min-height:0}.wwrap{width:min(270px,72%)}.pl{width:min(280px,76%)}.reel,.sym{height:74px}}',
    '@container (max-width:360px){form{grid-template-columns:1fr}}',
    '@media (prefers-reduced-motion:reduce){.ov,.card,.btn,.blid,.ptag,.pc,.coat{transition:none!important}.box{animation:none}}'
  ].join('\n');

  var GIFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>';

  /* ======================= games =======================
     Each game builds the left-hand side and exposes:
       draw()            redraw after a resize / when the popup opens
       play(i, done)     reveal prize i (some games wait for the player to tap or scratch), then call done()  */
  var GAMES = {};

  GAMES.wheel = function (g) {
    var wrap = el('div', 'wwrap', '<svg class="ptr" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43 L2 8 A16 16 0 1 1 32 8 Z" fill="' + esc(g.t.rim) + '" stroke="' + esc(g.t.wheelBg) + '" stroke-width="2"/><circle cx="17" cy="15" r="5" fill="' + esc(g.t.wheelBg) + '"/></svg><canvas aria-hidden="true"></canvas><div class="hub">SPIN</div>');
    g.side.appendChild(wrap);
    var canvas = wrap.querySelector('canvas'), N = g.N, SEG = Math.PI * 2 / N, rotation = 0;
    function draw() {
      var cssW = canvas.clientWidth || 340, dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssW * dpr);
      var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var c = cssW / 2, R = c - 2, rim = Math.max(10, R * 0.075), r = R - rim, t = g.t;
      ctx.clearRect(0, 0, cssW, cssW);
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fillStyle = t.rim; ctx.fill();
      ctx.beginPath(); ctx.arc(c, c, R - rim * 0.25, 0, Math.PI * 2); ctx.fillStyle = t.wheelBg; ctx.fill();
      for (var i = 0; i < N; i++) {
        var a0 = -Math.PI / 2 + i * SEG, a1 = a0 + SEG, col = g.color(i);
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r, a0, a1); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = Math.max(1.5, R * 0.012); ctx.strokeStyle = t.rim; ctx.stroke();
        var mid = a0 + SEG / 2, flip = Math.cos(mid) < -0.01;
        ctx.save(); ctx.translate(c, c); ctx.rotate(flip ? mid + Math.PI : mid);
        ctx.fillStyle = inkFor(col); ctx.textAlign = flip ? 'left' : 'right'; ctx.textBaseline = 'middle';
        var lines = g.lines(i), maxW = r * 0.66, size = Math.min(r * 0.12, (r * SEG * 0.62) / (lines.length * 1.05));
        ctx.font = '800 ' + size + 'px ' + FAM;
        var widest = 0; lines.forEach(function (ln) { widest = Math.max(widest, ctx.measureText(ln).width); });
        if (widest > maxW) { size *= maxW / widest; ctx.font = '800 ' + size + 'px ' + FAM; }
        var lh = size * 1.05, y0 = -((lines.length - 1) * lh) / 2;
        lines.forEach(function (ln, j) { ctx.fillText(ln, (flip ? -1 : 1) * (r - r * 0.07), y0 + j * lh); });
        ctx.restore();
      }
      var bulbs = Math.max(12, N * 3);
      for (var b = 0; b < bulbs; b++) { var ang = -Math.PI / 2 + b * (Math.PI * 2 / bulbs); ctx.beginPath(); ctx.arc(c + Math.cos(ang) * (R - rim * 0.55), c + Math.sin(ang) * (R - rim * 0.55), Math.max(2, rim * 0.22), 0, Math.PI * 2); ctx.fillStyle = b % 2 ? '#FFF8E1' : t.wheelBg; ctx.fill(); }
    }
    function play(i, done) {
      var segDeg = 360 / N, target = i * segDeg + segDeg / 2 + (rand() - 0.5) * segDeg * 0.7;
      var curMod = ((rotation % 360) + 360) % 360, delta = ((360 - target) % 360 - curMod + 360) % 360, dur = reduceMotion ? 900 : 5200;
      rotation += (reduceMotion ? 360 : 2160) + delta;
      canvas.style.transition = 'transform ' + dur + 'ms cubic-bezier(.12,.67,.1,1)'; canvas.style.transform = 'rotate(' + rotation + 'deg)';
      g.after(dur + 250, done);
    }
    return { draw: draw, play: play };
  };

  GAMES.scratch = function (g) {
    var tk = el('div', 'ticket', '<div class="thead"><span>' + esc(g.cfg.store.name) + '</span><b>INSTANT WIN</b></div><div class="tarea"><div class="under"></div><canvas class="coat" aria-hidden="true"></canvas></div><div class="tfoot">Every card wins a prize</div>');
    var reveal = el('button', 'ghost', 'Reveal my prize'); reveal.type = 'button'; reveal.hidden = true;
    g.side.appendChild(tk); g.side.appendChild(reveal);
    var area = tk.querySelector('.tarea'), coat = tk.querySelector('.coat'), under = tk.querySelector('.under'), live = false, started = false, finished = false, doneCb = null, last = null, moves = 0;
    function paint(msg) {
      var w = area.clientWidth || 300, h = area.clientHeight || 170, dpr = Math.min(window.devicePixelRatio || 1, 2);
      coat.width = Math.round(w * dpr); coat.height = Math.round(h * dpr);
      var ctx = coat.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b9bec6'); gr.addColorStop(0.45, '#eef0f3'); gr.addColorStop(0.55, '#d3d7dd'); gr.addColorStop(1, '#a7adb6');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
      for (var y = -h; y < h * 2; y += 14) { ctx.save(); ctx.translate(0, y); ctx.rotate(-0.35); ctx.fillRect(0, 0, w * 2, 3); ctx.restore(); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#5c636e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.max(16, w * 0.085) + 'px ' + FAM; ctx.fillText('SCRATCH HERE', w / 2, h / 2 - 8);
      ctx.font = '700 ' + Math.max(11, w * 0.042) + 'px ' + FAM; ctx.fillText(msg, w / 2, h / 2 + w * 0.07);
    }
    function draw() { if (!started) paint(live ? 'Use your finger or mouse' : 'Enter your info to play'); }
    function pos(e) { var r = coat.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function scratchAt(p) {
      var ctx = coat.getContext('2d'), rad = Math.max(16, (area.clientWidth || 300) * 0.07);
      ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineWidth = rad * 2;
      ctx.beginPath(); ctx.moveTo((last || p).x, (last || p).y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      last = p; if (++moves % 6 === 0) check();
    }
    function check() {
      try { var d = coat.getContext('2d').getImageData(0, 0, coat.width, coat.height).data, clear = 0, n = 0; for (var i = 3; i < d.length; i += 64) { n++; if (d[i] < 40) clear++; } if (clear / n > 0.5) finish(); } catch (e) {}
    }
    function finish() { if (finished) return; finished = true; live = false; coat.classList.remove('live'); coat.style.opacity = '0'; reveal.hidden = true; g.after(700, doneCb); }
    var down = false;
    coat.addEventListener('pointerdown', function (e) { if (!live) return; down = true; started = true; last = null; try { coat.setPointerCapture(e.pointerId); } catch (x) {} scratchAt(pos(e)); e.preventDefault(); });
    coat.addEventListener('pointermove', function (e) { if (live && down) { scratchAt(pos(e)); e.preventDefault(); } });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { coat.addEventListener(ev, function () { down = false; last = null; }); });
    reveal.addEventListener('click', finish);
    function play(i, done) {
      var p = g.cfg.prizes[i]; doneCb = done;
      under.innerHTML = '<div class="pt">' + esc(p.title || p.label.replace(/\|/g, ' ')) + '</div>' + (p.detail ? '<div class="pd">' + esc(p.detail) + '</div>' : '');
      live = true; coat.classList.add('live'); paint('Use your finger or mouse'); g.focusGame();
      setTimeout(function () { if (!finished) reveal.hidden = false; }, 2500);
      if (reduceMotion) reveal.hidden = false;
    }
    return { draw: draw, play: play, interactive: true };
  };

  function tapGame(g, kind) {
    var n = kind === 'boxes' ? 3 : 5, row = el('div', kind === 'boxes' ? 'boxes' : 'cards'), btns = [], doneCb = null, prizeI = 0, live = false;
    var cols = [g.t.button, g.color(1 % g.N), g.color(2 % g.N)];
    for (var k = 0; k < n; k++) {
      var b = el('button', kind === 'boxes' ? 'box' : 'pc'); b.type = 'button'; b.disabled = true; b.setAttribute('aria-label', (kind === 'boxes' ? 'Gift box ' : 'Card ') + (k + 1));
      if (kind === 'boxes') { b.style.setProperty('--bc', cols[k]); b.style.setProperty('--rib', g.t.rim === cols[k] ? '#fff' : g.t.rim); b.innerHTML = '<div class="ptag"></div><div class="blid"></div><div class="bbody"></div>'; }
      else b.innerHTML = '<div class="face back"><span>?</span></div><div class="face front"></div>';
      (function (b) { b.addEventListener('click', function () { if (!live) return; live = false; row.classList.remove('live'); btns.forEach(function (x) { x.disabled = true; }); reveal(b); }); })(b);
      btns.push(b); row.appendChild(b);
    }
    g.side.appendChild(row);
    function reveal(b) {
      var p = g.cfg.prizes[prizeI], txt = esc(p.label).replace(/\|/g, '<br>');
      if (kind === 'boxes') b.querySelector('.ptag').innerHTML = txt; else b.querySelector('.front').innerHTML = txt;
      b.classList.add(kind === 'boxes' ? 'open' : 'flip'); row.classList.add('done');
      g.after(reduceMotion ? 300 : 1500, doneCb);
    }
    return { draw: function () {}, interactive: true, play: function (i, done) { prizeI = i; doneCb = done; live = true; row.classList.add('live'); btns.forEach(function (x) { x.disabled = false; }); g.focusGame(); setTimeout(function () { try { btns[0].focus({ preventScroll: true }); } catch (e) {} }, 400); } };
  }
  GAMES.boxes = function (g) { return tapGame(g, 'boxes'); };
  GAMES.cards = function (g) { return tapGame(g, 'cards'); };

  GAMES.slots = function (g) {
    var m = el('div', 'slot', '<div class="mark">★ JACKPOT ★</div><div class="reels"><div class="reel"><div class="strip"></div></div><div class="reel"><div class="strip"></div></div><div class="reel"><div class="strip"></div></div><div class="payline"></div></div>');
    g.side.appendChild(m);
    var strips = [].slice.call(m.querySelectorAll('.strip')), REP = 8, final = null;
    function tile(i) { var c = g.color(i); return '<div class="sym" style="background:' + esc(c) + ';color:' + inkFor(c) + '">' + esc(g.cfg.prizes[i].label).replace(/\|/g, '<br>') + '</div>'; }
    strips.forEach(function (s, r) { var h = ''; for (var k = 0; k < REP; k++) for (var i = 0; i < g.N; i++) h += tile((i + r * 2) % g.N); s.innerHTML = h; });
    function symH() { var t = m.querySelector('.sym'); return t ? t.getBoundingClientRect().height || 92 : 92; }
    function setIdle() { if (final === 'spinning') return; var H = symH(); strips.forEach(function (s, r) { s.style.transition = 'none'; s.style.transform = 'translateY(' + (-H * (final ? final[r] : (r + 1) % g.N)) + 'px)'; }); }
    function play(i, done) {
      var H = symH(), stops = []; final = 'spinning';
      strips.forEach(function (s, r) {
        var offs = ((i - r * 2) % g.N + g.N) % g.N, idx = (REP - 2) * g.N + offs; stops.push(idx); var dur = reduceMotion ? 300 : 1700 + r * 650;
        s.style.transition = 'none'; s.style.transform = 'translateY(0px)'; void s.offsetHeight;
        s.style.transition = 'transform ' + dur + 'ms cubic-bezier(.15,.6,.2,1.05)'; s.style.transform = 'translateY(' + (-H * idx) + 'px)';
      });
      g.after(reduceMotion ? 500 : 1700 + 2 * 650 + 300, function () { final = stops; m.classList.add('win'); g.after(500, done); });
    }
    return { draw: setIdle, play: play };
  };

  GAMES.plinko = function (g) {
    var box = el('div', 'pl', '<canvas aria-hidden="true"></canvas>'); g.side.appendChild(box);
    var cv = box.querySelector('canvas'), N = g.N, R = Math.max(1, N - 1), ball = null, hit = -1;
    function geo() { var w = cv.clientWidth || 340, h = cv.clientHeight || 360, top = h * 0.12, bottom = h * 0.78, sw = w / N; return { w: w, h: h, top: top, rowH: (bottom - top) / R, sw: sw }; }
    function draw() {
      var G = geo(), dpr = Math.min(window.devicePixelRatio || 1, 2.5); cv.width = Math.round(G.w * dpr); cv.height = Math.round(G.h * dpr);
      var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, G.w, G.h);
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(0, 0, G.w, G.h, 14); else ctx.rect(0, 0, G.w, G.h); ctx.fill();
      var pegR = Math.max(3, G.sw * 0.07);
      for (var r = 0; r < R; r++) for (var j = 0; j <= r; j++) { var x = G.w / 2 + (j - r / 2) * G.sw, y = G.top + r * G.rowH; ctx.beginPath(); ctx.arc(x, y, pegR, 0, Math.PI * 2); ctx.fillStyle = g.t.rim; ctx.fill(); }
      var sy = G.top + R * G.rowH + G.rowH * 0.35, sh = G.h - sy - 6;
      for (var i = 0; i < N; i++) {
        var c = g.color(i), x0 = i * G.sw + 3; ctx.fillStyle = c; ctx.globalAlpha = hit === -1 || hit === i ? 1 : 0.35;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, sy, G.sw - 6, sh, 7); else ctx.rect(x0, sy, G.sw - 6, sh); ctx.fill(); ctx.globalAlpha = 1;
        if (hit === i) { ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.stroke(); }
        ctx.save(); ctx.translate(x0 + (G.sw - 6) / 2, sy + sh / 2); ctx.rotate(-Math.PI / 2); ctx.fillStyle = inkFor(c); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var lines = g.lines(i), size = Math.min((G.sw - 6) * 0.38, sh * 0.2); ctx.font = '800 ' + size + 'px ' + FAM;
        var widest = 0; lines.forEach(function (l) { widest = Math.max(widest, ctx.measureText(l).width); }); if (widest > sh * 0.9) { size *= sh * 0.9 / widest; ctx.font = '800 ' + size + 'px ' + FAM; }
        lines.forEach(function (l, k) { ctx.fillText(l, 0, (k - (lines.length - 1) / 2) * size * 1.05); }); ctx.restore();
      }
      var b = ball || { x: G.w / 2, y: G.top - G.rowH * 0.7 }, br = Math.max(6, G.sw * 0.13);
      ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
    }
    function play(i, done) {
      var rights = []; for (var k = 0; k < R; k++) rights.push(k < i ? 1 : 0); for (k = R - 1; k > 0; k--) { var s = Math.floor(rand() * (k + 1)), tmp = rights[k]; rights[k] = rights[s]; rights[s] = tmp; }
      var G = geo(), pts = [{ x: G.w / 2, y: G.top - G.rowH * 0.7 }], kk = 0, br = Math.max(6, G.sw * 0.13), pegR = Math.max(3, G.sw * 0.07);
      for (var r = 0; r < R; r++) { pts.push({ x: G.w / 2 + (kk - r / 2) * G.sw, y: G.top + r * G.rowH - pegR - br }); kk += rights[r]; }
      var fx = G.w / 2 + (kk - R / 2) * G.sw; pts.push({ x: fx, y: G.top + R * G.rowH + G.rowH * 0.35 + (G.h - (G.top + R * G.rowH + G.rowH * 0.35)) / 2 });
      var seg = reduceMotion ? 60 : 380, t0 = performance.now();
      (function frame(now) {
        var el2 = Math.max(0, (now - t0) / seg), si = Math.min(pts.length - 2, Math.floor(el2)), f = Math.min(1, el2 - si), a = pts[si], b = pts[si + 1];
        var arc = si === 0 ? 0 : Math.sin(f * Math.PI) * (G.rowH * 0.35);
        ball = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * (f * f) - arc * (1 - f) }; draw();
        if (el2 < pts.length - 1) requestAnimationFrame(frame); else { ball = pts[pts.length - 1]; hit = i; draw(); g.after(500, done); }
      })(t0);
    }
    return { draw: draw, play: play };
  };

  GAMES.quiz = function (g) {
    var b = el('div', 'qboard', '<div class="qprog">' + QUIZ.map(function () { return '<i></i>'; }).join('') + '</div><h3>Find your furniture style</h3><p class="qd">Answer 4 quick questions to see your style and win a prize.</p><div class="sws"><i></i><i></i><i></i><i></i></div>');
    g.side.appendChild(b);
    var sws = [].slice.call(b.querySelectorAll('.sws i')), mix = ['#E4202C', '#F5C518', '#1E63D6', '#1FA347'];
    function paint(style) { var s = STYLES[style]; sws.forEach(function (x, k) { x.style.background = s ? s.sw[k] : mix[k]; }); }
    paint(null);
    return {
      draw: function () {},
      progress: function (n, answers) { [].forEach.call(b.querySelectorAll('.qprog i'), function (x, k) { x.classList.toggle('on', k < n); }); if (answers && answers.style) paint(answers.style); },
      play: function (i, done, answers) {
        var st = (answers && answers.style) || 'Modern'; paint(st);
        b.querySelector('h3').innerHTML = 'Your style: ' + esc(st); b.querySelector('.qd').textContent = (STYLES[st] || {}).d || '';
        g.after(reduceMotion ? 300 : 1600, done);
      }
    };
  };

  /* ======================= widget ======================= */
  function Widget(userCfg, opts) {
    opts = opts || {};
    var cfg = merge(DEFAULTS, userCfg || {});
    if (!GAMES[cfg.game]) cfg.game = 'wheel';
    var copy = GAME_COPY[cfg.game];
    cfg.headline = cfg.headline || copy.headline; cfg.buttonText = cfg.buttonText || copy.button;
    cfg.prizes = (cfg.prizes || []).filter(function (p) { return p && p.label && Number(p.weight) > 0; });
    if (cfg.prizes.length < 2) { if (window.console) console.warn('[SpinWin] needs at least 2 prizes with odds above 0'); return null; }
    var preview = !!opts.preview, inline = !!opts.container, K = 'spinwin:' + cfg.id + ':', self = this;
    var busy = false, opened = false, lastFocus = null, answers = {}, isQuiz = cfg.game === 'quiz';
    var host = document.createElement('div'); host.setAttribute('data-spinwin', cfg.id);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host, t = cfg.theme;
    var vars = '--button:' + t.button + ';--buttonInk:' + inkFor(t.button) + ';--wheelBg:' + t.wheelBg + ';--rim:' + t.rim + ';--panel:' + t.panel + ';--text:' + t.text;
    var storeName = esc(cfg.store.name), head = (cfg.store.logoUrl ? '<img class="logo" alt="' + storeName + '" src="' + esc(cfg.store.logoUrl) + '">' : '') + (cfg.eyebrow ? '<div class="eb">' + esc(cfg.eyebrow) + '</div>' : '');
    root.innerHTML = '<style>' + CSS + '</style><div class="sw ' + (inline ? 'inline' : '') + '" style="' + vars + '">' +
      (inline ? '' : '<div class="ov" hidden role="dialog" aria-modal="true" aria-labelledby="sw-h">') + '<div class="card">' +
      (inline ? '' : '<button class="x" type="button" aria-label="Close">&times;</button>') +
      '<div class="wside"><div class="gcap" aria-live="polite"></div></div><div class="panel">' +
      (isQuiz ? '<div class="v-quiz" style="display:flex;flex-direction:column;gap:14px">' + head + '<h2 id="sw-h">' + esc(cfg.headline) + '</h2><div class="qbody"></div></div>' : '') +
      '<div class="v-form" ' + (isQuiz ? 'hidden ' : '') + 'style="display:flex;flex-direction:column;gap:14px">' + (isQuiz ? '<div class="eb">Almost there</div><h2>Where should we send your style match and prize?</h2>' : head + '<h2 id="sw-h">' + esc(cfg.headline) + '</h2>' + (cfg.subhead ? '<p class="sub">' + esc(cfg.subhead) + '</p>' : '')) +
      '<form novalidate>' +
      '<div class="f full"><label class="l" for="sw-name">Full name</label><input id="sw-name" name="name" type="text" autocomplete="name" required></div>' +
      '<div class="f full"><label class="l" for="sw-email">Email</label><input id="sw-email" name="email" type="email" autocomplete="email" inputmode="email" required></div>' +
      '<div class="f"><label class="l" for="sw-phone">Mobile phone' + (cfg.requirePhone ? '' : ' (optional)') + '</label><input id="sw-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" placeholder="(555) 555-5555"></div>' +
      '<div class="f"><label class="l" for="sw-zip">ZIP code' + (cfg.requireZip ? '' : ' (optional)') + '</label><input id="sw-zip" name="zip" type="text" autocomplete="postal-code" inputmode="numeric" maxlength="5"></div>' +
      '<label class="chk"><input type="checkbox" name="terms"><span>I agree to the <button type="button" class="lnk" data-act="terms">official terms &amp; conditions</button>.</span></label>' +
      (cfg.optInText ? '<label class="chk"><input type="checkbox" name="optin"><span>' + esc(cfg.optInText) + '</span></label>' : '') +
      '<div class="err f full" aria-live="polite"></div><button class="btn" type="submit">' + esc(cfg.buttonText) + '</button></form>' +
      '<p class="fine">One play per person. Prizes require a qualifying purchase. Terms apply.</p></div>' +
      '<div class="v-spin" hidden><div class="eb">Good luck</div><p class="spinmsg"></p><p class="sub pmsg"></p></div>' +
      '<div class="v-win win" hidden aria-live="polite"></div>' +
      '<div class="v-terms" hidden style="display:flex;flex-direction:column;gap:12px"><div class="eb">Official terms &amp; conditions</div><div class="terms"></div><button type="button" class="btn" data-act="back">Back</button></div>' +
      '</div></div>' + (inline ? '' : '</div>') +
      (inline || !cfg.trigger.showTab ? '' : '<button class="tab" type="button" hidden>' + GIFT + '<span></span></button>') + '</div>';

    var $ = function (s) { return root.querySelector(s); };
    var ov = $('.ov'), card = $('.card'), side = $('.wside'), cap = $('.gcap'), form = $('form'), errBox = $('.err'), tab = $('.tab');
    var views = { quiz: $('.v-quiz'), form: $('.v-form'), spin: $('.v-spin'), win: $('.v-win'), terms: $('.v-terms') };
    var current = isQuiz ? 'quiz' : 'form', beforeTerms = current;
    function show(name) { for (var k in views) if (views[k]) views[k].hidden = k !== name; current = name; }
    var timers = [];
    var gctx = {
      cfg: cfg, t: t, N: cfg.prizes.length, side: side,
      color: function (i) { return cfg.prizes[i].color || SLICE_DEFAULTS[i % SLICE_DEFAULTS.length]; },
      lines: function (i) { return String(cfg.prizes[i].label).split('|'); },
      after: function (ms, fn) { timers.push(setTimeout(fn, ms)); },
      focusGame: function () { try { if (getComputedStyle(card).gridTemplateColumns.split(' ').length < 2) card.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); } catch (e) {} }
    };
    var game = GAMES[cfg.game](gctx);
    var idleCap = { wheel: '', scratch: '', boxes: 'Enter your info, then pick a box', cards: 'Enter your info, then pick a card', slots: '', plinko: '', quiz: '' }[cfg.game];
    cap.textContent = idleCap;
    if (cfg.game === 'scratch' || cfg.game === 'quiz' || cfg.game === 'wheel') cap.hidden = true;

    function pick() { var total = 0, i, N = cfg.prizes.length; for (i = 0; i < N; i++) total += Number(cfg.prizes[i].weight); var x = rand() * total; for (i = 0; i < N; i++) { x -= Number(cfg.prizes[i].weight); if (x < 0) return i; } return N - 1; }

    function confetti() {
      if (reduceMotion) return;
      var cv = document.createElement('canvas'); cv.className = 'confetti'; card.appendChild(cv);
      var w = cv.width = card.clientWidth, h = cv.height = card.clientHeight, ctx = cv.getContext('2d'), cols = [t.rim, t.button, '#FFFFFF', '#2E7D32', '#1565C0'], ps = [];
      for (var i = 0; i < 140; i++) ps.push({ x: w * (0.2 + rand() * 0.6), y: h * 0.35, vx: (rand() - 0.5) * 9, vy: -rand() * 10 - 3, s: 4 + rand() * 6, r: rand() * 6, vr: (rand() - 0.5) * 0.3, c: cols[i % cols.length] });
      var t0 = performance.now();
      (function frame(now) { var e2 = now - t0; ctx.clearRect(0, 0, w, h); ps.forEach(function (p) { p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.max(0, 1 - e2 / 2600); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }); if (e2 < 2600) requestAnimationFrame(frame); else cv.remove(); })(t0);
    }

    function termsText() {
      var txt = cfg.terms || '';
      if (cfg.showOddsInTerms) { var total = cfg.prizes.reduce(function (s, p) { return s + Number(p.weight); }, 0); txt += (txt ? '\n\n' : '') + 'Odds of winning (every player wins one prize):\n' + cfg.prizes.map(function (p) { return '• ' + (p.title || p.label.replace(/\|/g, ' ')) + (p.detail ? ' ' + p.detail : '') + ': ' + (Math.round(Number(p.weight) / total * 1000) / 10) + '%'; }).join('\n'); }
      return txt.replace(/\{store\}/g, cfg.store.name).replace(/\{days\}/g, cfg.codeExpiryDays);
    }
    function openTerms() { beforeTerms = current === 'terms' ? beforeTerms : current; $('.terms').textContent = termsText(); show('terms'); $('[data-act=back]').focus(); }

    function renderWin(w, isReturn) {
      var p = w;
      views.win.innerHTML = '<div class="eb">' + (isReturn ? 'Your prize' : 'Congratulations, ' + esc(w.first) + '!') + '</div>' +
        (w.answers && w.answers.style ? '<div><span class="stylebadge">Your style: ' + esc(w.answers.style) + '</span></div>' : '') +
        '<div><div class="prize">' + esc(p.title) + '</div>' + (p.detail ? '<div class="pdet">' + esc(p.detail) + '</div>' : '') + '</div>' +
        '<div class="code"><div><small>Your prize code</small><b>' + esc(p.code) + '</b></div><button type="button" class="cp">Copy</button></div>' +
        '<p class="fine" style="opacity:.85">Expires ' + esc(p.expires) + '.' + (cfg.webhookUrl ? ' We also sent it to ' + esc(p.email) + '.' : '') + '</p>' +
        '<ol class="steps"><li>Take a screenshot' + (cfg.webhookUrl ? ' or keep the email' : '') + '.</li><li>Show your code to a sales associate' + (cfg.store.phone ? ' or call ' + esc(cfg.store.phone) : '') + '.</li><li>Prize applies when your purchase meets the minimum.</li></ol>' +
        '<p class="fine"><button type="button" class="lnk" data-act="terms">Terms &amp; conditions apply</button>. Not valid on floor samples, clearance or special-price items.</p>' +
        (inline ? '' : '<button type="button" class="btn" data-act="close">Start shopping</button>');
      show('win');
      var cp = views.win.querySelector('.cp');
      cp.addEventListener('click', function () { var ok = function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy'; }, 1600); }; try { navigator.clipboard.writeText(p.code).then(ok, selectCode); } catch (e) { selectCode(); } });
      function selectCode() { try { var r = document.createRange(); r.selectNodeContents(views.win.querySelector('.code b')); var s = (root.getSelection ? root : window).getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} }
    }

    /* quiz questions */
    function quizStep(n) {
      if (!isQuiz) return;
      if (game.progress) game.progress(n, answers);
      if (n >= QUIZ.length) { show('form'); try { $('#sw-name').focus({ preventScroll: true }); } catch (e) {} return; }
      var q = QUIZ[n];
      $('.qbody').innerHTML = '<p class="fine" style="opacity:.8;margin-bottom:6px">Question ' + (n + 1) + ' of ' + QUIZ.length + '</p><p style="font-size:18px;font-weight:800;margin-bottom:10px">' + esc(q.q) + '</p><div class="qopts">' + q.a.map(function (a) { return '<button type="button" class="qo' + (answers[q.key] === a ? ' on' : '') + '" data-qa="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div>' + (n ? '<p style="margin-top:10px"><button type="button" class="lnk fine" data-qback="1">← Back</button></p>' : '');
      [].forEach.call($('.qbody').querySelectorAll('.qo'), function (b) { b.addEventListener('click', function () { answers[q.key] = b.getAttribute('data-qa'); quizStep(n + 1); }); });
      var bk = $('.qbody').querySelector('[data-qback]'); if (bk) bk.addEventListener('click', function () { quizStep(n - 1); });
    }

    var phoneIn = $('#sw-phone'), zipIn = $('#sw-zip');
    phoneIn.addEventListener('input', function () { var d = phoneIn.value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10); phoneIn.value = d.length > 6 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : d.length > 3 ? '(' + d.slice(0, 3) + ') ' + d.slice(3) : d; });
    zipIn.addEventListener('input', function () { zipIn.value = zipIn.value.replace(/\D/g, '').slice(0, 5); });
    function validate() {
      var f = form.elements, errs = [];
      [].forEach.call(form.querySelectorAll('input'), function (i) { i.classList.remove('bad'); });
      function bad(e, msg) { e.classList.add('bad'); errs.push(msg); }
      var name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.replace(/\D/g, ''), zip = f.zip.value.trim();
      if (name.length < 2) bad(f.name, 'Enter your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad(f.email, 'Enter a valid email address.');
      if ((cfg.requirePhone || phone) && phone.length !== 10) bad(f.phone, 'Enter a 10-digit phone number.');
      if ((cfg.requireZip || zip) && !/^\d{5}$/.test(zip)) bad(f.zip, 'Enter a 5-digit ZIP code.');
      if (!f.terms.checked) errs.push('Please agree to the terms to play.');
      errBox.textContent = errs[0] || '';
      if (errs.length) { var first = form.querySelector('.bad'); if (first) first.focus(); return null; }
      return { name: name, email: email, phone: phone ? '(' + phone.slice(0, 3) + ') ' + phone.slice(3, 6) + '-' + phone.slice(6) : '', zip: zip, optIn: !!(f.optin && f.optin.checked) };
    }
    function send(lead) { try { window.dispatchEvent(new CustomEvent('spinwin:lead', { detail: lead })); } catch (e) {} if (preview || !cfg.webhookUrl) return; try { fetch(cfg.webhookUrl, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(lead) }); } catch (e) {} }

    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (busy) return;
      var info = validate(); if (!info) return;
      busy = true; var sbtn = form.querySelector('.btn'); sbtn.disabled = true; sbtn.textContent = 'One moment…'; errBox.textContent = '';
      var idx = pick(), prize = cfg.prizes[idx], exp = new Date(); exp.setDate(exp.getDate() + Number(cfg.codeExpiryDays || 30));
      var title = prize.title || prize.label.replace(/\|/g, ' ');
      var win = { campaign: cfg.id, game: cfg.game, store: cfg.store.name, name: info.name, first: info.name.split(' ')[0], email: info.email, phone: info.phone, zip: info.zip, optIn: info.optIn,
        prizeIndex: idx, prize: title, title: title, detail: prize.detail || '', kind: prize.kind || 'other', amount: Number(prize.amount) || 0, min: Number(prize.min) || 0,
        code: makeCode(prize.code), expires: fmtDate(exp), expiresISO: exp.getFullYear() + '-' + String(exp.getMonth() + 1).padStart(2, '0') + '-' + String(exp.getDate()).padStart(2, '0'),
        wonAt: new Date().toISOString(), page: (opts.page || location.href), terms: termsText(), answers: isQuiz ? answers : null };
      var saving = opts.onLead && !preview ? Promise.race([Promise.resolve().then(function () { return opts.onLead(win); }), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 15000); })]) : Promise.resolve();
      saving.then(function () {
        $('.spinmsg').textContent = 'Good luck, ' + win.first + '!'; $('.pmsg').textContent = GAME_COPY[cfg.game].play; show('spin');
        if (game.interactive) { cap.hidden = false; cap.textContent = GAME_COPY[cfg.game].play; }
        if (!preview) store(K + 'played', win);
        send(win);
        game.play(idx, function () {
          busy = false; cap.hidden = !game.interactive; if (game.interactive) cap.textContent = 'You won!';
          renderWin(win, false); confetti();
          var cb = views.win.querySelector('.cp'); if (cb) cb.focus({ preventScroll: true });
          if (tab) tab.querySelector('span').textContent = 'View your prize';
          if (opts.onWin) try { opts.onWin(win); } catch (e) {}
        }, answers);
      }, function () { busy = false; sbtn.disabled = false; sbtn.textContent = cfg.buttonText; errBox.textContent = 'We couldn’t connect just now. Check your internet connection and try again.'; });
    });

    root.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-act]'); if (!a) return; var act = a.getAttribute('data-act'); if (act === 'terms') openTerms(); else if (act === 'back') show(beforeTerms); else if (act === 'close') close(); });

    function onKey(e) {
      if (e.key === 'Escape' && !busy) close();
      if (e.key === 'Tab') { var f = [].filter.call(root.querySelectorAll('.ov button,.ov input'), function (x) { return !x.disabled && x.offsetParent !== null; }); if (!f.length) return; var a = root.activeElement, i = f.indexOf(a); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    }
    function open() {
      if (inline || opened) return; opened = true; lastFocus = document.activeElement;
      var played = !preview && store(K + 'played'); if (played) renderWin(played, true);
      ov.hidden = false; if (tab) tab.hidden = true;
      requestAnimationFrame(function () { ov.classList.add('on'); game.draw(); var first = root.querySelector(played ? '.cp' : isQuiz ? '.qo' : '#sw-name'); if (first) first.focus({ preventScroll: true }); });
      document.addEventListener('keydown', onKey, true); self._prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    }
    function close() {
      if (inline || !opened || busy) return; opened = false; ov.classList.remove('on');
      setTimeout(function () { ov.hidden = true; }, reduceMotion ? 0 : 250);
      document.removeEventListener('keydown', onKey, true); document.documentElement.style.overflow = self._prevOverflow || '';
      if (!preview && !store(K + 'played')) store(K + 'dismissed', Date.now());
      if (tab) tab.hidden = false; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
      if (opts.onClose) try { opts.onClose(); } catch (e) {}
    }
    if (ov) { $('.x').addEventListener('click', close); ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); }); }
    if (tab) { tab.querySelector('span').textContent = cfg.trigger.tabText || 'Spin & Win'; if (cfg.trigger.tabSide === 'right') tab.classList.add('right'); tab.addEventListener('click', open); }

    (inline ? opts.container : document.body).appendChild(host);
    quizStep(0);
    var ro; if (window.ResizeObserver) { ro = new ResizeObserver(function () { if ((inline || opened) && !busy) game.draw(); }); ro.observe(side); }
    if (inline) { requestAnimationFrame(function () { game.draw(); }); var playedI = !preview && store(K + 'played'); if (playedI) renderWin(playedI, true); }

    this.open = open; this.close = close;
    this.destroy = function () { try { timers.forEach(clearTimeout); if (ro) ro.disconnect(); document.removeEventListener('keydown', onKey, true); if (opened) document.documentElement.style.overflow = self._prevOverflow || ''; host.remove(); } catch (e) {} };
    this.reset = function () { store(K + 'played', null); store(K + 'dismissed', null); };
    this.redraw = function () { game.draw(); };
    this.showTab = function () { if (tab) tab.hidden = false; };

    if (!inline && !opts.manual) {
      var played0 = store(K + 'played'), dismissed = store(K + 'dismissed'), cool = dismissed && (Date.now() - dismissed) < Number(cfg.trigger.repeatDays || 0) * 864e5;
      if (played0) { if (tab) { tab.querySelector('span').textContent = 'View your prize'; tab.hidden = false; } }
      else if (cool) { if (tab) tab.hidden = false; }
      else { var fired = false, go = function () { if (fired) return; fired = true; open(); }; if (Number(cfg.trigger.delaySeconds) >= 0) setTimeout(go, Number(cfg.trigger.delaySeconds) * 1000); if (cfg.trigger.exitIntent) document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) go(); }); if (tab) tab.hidden = false; }
    }
  }

  function init(cfg, opts) { cfg = cfg || window.SpinWinConfig; if (!cfg) return null; var full = merge(DEFAULTS, cfg); if (!(opts && opts.preview) && (!full.enabled || !inWindow(full))) return null; return new Widget(cfg, opts); }
  window.SpinWin = { __loaded: true, version: '2.0', init: init, defaults: DEFAULTS, games: Object.keys(GAMES), copy: GAME_COPY, quiz: QUIZ };
  if (window.SpinWinConfig && !window.SpinWinConfig.manual) {
    var boot = function () { var c = window.SpinWinConfig, e = c.mountTo ? document.querySelector(c.mountTo) : null; window.SpinWin.instance = init(c, e ? { container: e } : undefined); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
})();
