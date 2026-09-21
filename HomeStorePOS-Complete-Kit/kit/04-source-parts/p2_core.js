/* ============================================================
   CORE: state, persistence, helpers, auth, router
   ============================================================ */
"use strict";
const COLLS=["settings","staff","vendors","products","customers","invoices","returns","purchaseOrders","deliveries","trucks","followups","claims","promotions","locations","transfers","ups","counts","timeclock","packages","notices","audit","signRequests","damaged"];
const S={}; COLLS.forEach(c=>S[c]=[]);
let db=null, downloadsCap=null, persistMode="loading";
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const money=n=>(n<0?"-":"")+"$"+Math.abs(+n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>(isFinite(n)?(n*100).toFixed(1):"–")+"%";
const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const addDays=(iso,n)=>{const [y,m,d]=iso.split("-").map(Number);const dt=new Date(y,m-1,d+n);return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0")};
const daysBetween=(a,b)=>Math.round((new Date(b)-new Date(a))/86400000);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const byId=(coll,id)=>(S[coll]||(S[coll]=[])).find(x=>x.id===id);
const t2m=t=>{if(!t)return 0;const [h,m]=t.split(":").map(Number);return h*60+(m||0)};
const m2t=m=>{m=Math.round(m);const h=Math.floor(m/60)%24,mm=m%60;return `${((h+11)%12)+1}:${String(mm).padStart(2,"0")} ${h>=12?"PM":"AM"}`};
const dateFmt=d=>{if(!d)return "";const [y,m,dd]=d.split("-");return new Date(y,m-1,dd).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})};
const dateShort=d=>{if(!d)return "";const [y,m,dd]=d.split("-");return new Date(y,m-1,dd).toLocaleDateString("en-US",{month:"short",day:"numeric"})};
const haversine=(a,b)=>{const R=3958.8,d=x=>x*Math.PI/180;const dl=d(b.lat-a.lat),dg=d(b.lng-a.lng);const h=Math.sin(dl/2)**2+Math.cos(d(a.lat))*Math.cos(d(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const round2=n=>Math.round((+n||0)*100)/100;
const MATTRESS_SIZES=["Twin","Twin XL","Full","Queen","King","Cal King","Split King"];
const COMFORTS=["Extra firm","Firm","Medium","Plush","Pillow top","Ultra plush"];
const MAT_TYPES=["Innerspring","Hybrid","Memory foam","Latex","Adjustable air"];
const CATEGORIES=["Sofas & Sectionals","Recliners & Chairs","Living room tables","Dining","Bedroom furniture","Mattresses","Bases & Foundations","Adjustable bases","Protectors","Pillows & Bedding","Rugs & Decor","Storage & Office","Outdoor","Services"];
const ROLES={owner:"Owner",manager:"Manager",sales:"Sales associate",cashier:"Cashier",driver:"Delivery crew"};
const isOwner=()=>role()==="owner"||!!(session&&(session.kind==="admin"||session.support));

const SETTINGS_DEFAULTS={name:"My Store",address:"120 Mill Street",phone:"",lat:40.44,lng:-79.99,taxRate:8.25,taxDelivery:false,
    departTime:"08:00",speedMph:22,serviceMin:25,units:"mi",maxStopsPerTruck:8,deliveryDays:[1,2,3,4,5,6],defaultMarkup:110,lowMargin:35,skuPrefix:"HT",managerPin:"",walkinMax:250,footer:"Special orders are non-refundable once placed with the vendor. Please inspect furniture on delivery and note any damage on the delivery slip.",
    deliveryFee:99,setupFee:49,haulAwayFee:45,trialNights:100,protectorRequired:true,comfortExchangeFee:99,restockPct:15,floorSampleDays:180,floorSampleMarkdown:20,discountLimitPct:15,nextInvoice:1001,nextPO:5001,nextReturn:301,nextClaim:101,financeMonths:[12,24,36,48],financeFee:5,theme:"",commissionOn:"delivered",commissionPaidOnly:false,commissionServices:true,features:{},zones:[],quoteDays:30,logo:"",requireCustomer:true,categoryRules:{},taxBrackets:[],defaultTaxId:"",etaAlertDays:3,idleLockMin:5,pinOnSale:"different",plan:{pct:10,min:149,max:999,rounding:"x99",costPct:35,commissionPct:20,name:"5-year protection plan"},fundingSources:[],referralSources:["Google","Flyer","Facebook","Instagram","TV","Drive by","Referred by a friend","Repeat customer","Other"],requirePaidToRelease:true,labelFormat:"z42",labelDpi:203,labelConn:"driver",labelPrinter:"",labelLogo:true,autoFollowups:{checkin:false,review:false,trial:true,layaway:true,arrived:true,ready:true,pickupReminder:true,quote:true,eta:true,issues:true,unhappy:true},messaging:{provider:"",reviewsExternal:true},specialDepositPct:25,ackDays:3,updateCostOnReceipt:true,scheduleRequiresPaid:false};
function storeSettings(){
  let s=S.settings.find(x=>x.id==="store");
  if(!s){ s=Object.assign({id:"store"},JSON.parse(JSON.stringify(SETTINGS_DEFAULTS))); S.settings.push(s); }
  else { let fill=false; for(const k in SETTINGS_DEFAULTS){ if(s[k]===undefined){ s[k]=JSON.parse(JSON.stringify(SETTINGS_DEFAULTS[k])); fill=true; } } if(s.barcodePrefix&&!s._migrated){ s.skuPrefix=s.barcodePrefix; s._migrated=true; fill=true; } if(fill) saveLocal(); }
  return s;
}
function chipList(key,items,opts){ opts=opts||{}; return `<div class="chips" id="cl_${key}" style="align-items:center;gap:6px">${items.map((it,i)=>`<span class="chip" style="display:inline-flex;align-items:center;gap:6px">${esc(it)}${opts.locked&&opts.locked.includes(it)?"":`<a href="#" onclick="chipRemove('${key}',${i});return false" title="Remove" style="color:var(--ink2);text-decoration:none">✕</a>`}</span>`).join("")}<input type="text" id="cl_${key}_new" placeholder="${esc(opts.placeholder||"Add…")}" style="max-width:220px;padding:6px 10px" onkeydown="if(event.key==='Enter'){event.preventDefault();chipAdd('${key}')}"><button class="btn s" onclick="chipAdd('${key}')">Add</button></div>`; }
const CHIP_LISTS={};
async function chipAdd(key){ const v=(fv("cl_"+key+"_new")||"").trim(); if(!v) return; const def=CHIP_LISTS[key]; if(!def) return; const list=def.get(); if(list.some(x=>x.toLowerCase()===v.toLowerCase())) return toast("Already in the list.",true); await def.set(list.concat([v])); render(); }
async function chipRemove(key,i){ const def=CHIP_LISTS[key]; if(!def) return; const list=def.get(); const it=list[i]; if(def.confirm&&!confirm(def.confirm(it))) return; await def.set(list.filter((x,j)=>j!==i)); render(); }
function referralSources(){ const st=storeSettings(); return st.referralSources&&st.referralSources.length?st.referralSources:["Google","Flyer","Facebook","Instagram","TV","Drive by","Referred by a friend","Repeat customer","Other"]; }
function custDisplay(c){ if(!c) return "Walk-in"; return c.company?`${c.company} — ${c.name}`:c.name; }
function listSetting(key,defaults){ const st=tenantId?S.settings.find(x=>x.id==="store"):null; const v=st&&st.lists&&st.lists[key]; return v&&v.length?v:defaults; }
async function setListSetting(key,list){ const st=storeSettings(); st.lists=Object.assign({},st.lists||{},{[key]:list}); await save("settings",st); }
const mattressSizes=()=>listSetting("sizes",MATTRESS_SIZES), comforts=()=>listSetting("comforts",COMFORTS), matTypes=()=>listSetting("matTypes",MAT_TYPES), colorNames=()=>listSetting("colors",[]), finishNames=()=>listSetting("finishes",[]);
CHIP_LISTS.sizes={get:()=>mattressSizes().slice(),set:l=>setListSetting("sizes",l)}; CHIP_LISTS.comforts={get:()=>comforts().slice(),set:l=>setListSetting("comforts",l)}; CHIP_LISTS.matTypes={get:()=>matTypes().slice(),set:l=>setListSetting("matTypes",l)}; CHIP_LISTS.colors={get:()=>colorNames().slice(),set:l=>setListSetting("colors",l)}; CHIP_LISTS.finishes={get:()=>finishNames().slice(),set:l=>setListSetting("finishes",l)};
const tenderTypes=()=>listSetting("tenders",["Card","Cash","Check","Gift card"]), cardBrands=()=>listSetting("cardBrands",["Visa","Mastercard","Discover","American Express","Debit"]);
CHIP_LISTS.tenders={get:()=>tenderTypes().slice(),set:l=>setListSetting("tenders",l.length?l:["Card","Cash"])}; CHIP_LISTS.cardBrands={get:()=>cardBrands().slice(),set:l=>setListSetting("cardBrands",l.length?l:["Card"])};
CHIP_LISTS.referrals={get:()=>referralSources().slice(),set:async list=>{ const st=storeSettings(); st.referralSources=list.length?list:["Other"]; await save("settings",st); }};
function taxBrackets(){ const st=storeSettings(); if(!st.taxBrackets||!st.taxBrackets.length){ st.taxBrackets=[{id:"tx1",name:"Sales tax",rate:+st.taxRate||0}]; st.defaultTaxId="tx1"; } if(!st.taxBrackets.some(t=>t.id===st.defaultTaxId)) st.defaultTaxId=st.taxBrackets[0].id; return st.taxBrackets; }
function defaultTax(){ const b=taxBrackets(); return b.find(t=>t.id===storeSettings().defaultTaxId)||b[0]; }
function taxById(id){ return taxBrackets().find(t=>t.id===id); }
function nextNumber(key,prefix){ const s=storeSettings(); const n=s[key]||1; s[key]=n+1; save("settings",s); return prefix+"-"+n; }

/* ---------- persistence: per-dealer namespaces, local cache + queued shared-store sync ---------- */
let platformLoaded=false, platformFailed=false, forceSetup=false;
let tenantId="", platform={config:null,tenants:[],integrations:[]}, saveT=null, syncErrors=0, loadWarning="";
const tpath=coll=>`tenants/${tenantId}/${coll}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clone=o=>o?JSON.parse(JSON.stringify(o)):o;
function withTimeout(p,ms){ return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej({code:"timeout",message:"timed out"}),ms))]); }
function saveLocal(){ clearTimeout(saveT); saveT=setTimeout(()=>{ if(!tenantId) return; try{ localStorage.setItem("ht_tenant:"+tenantId,JSON.stringify(S)) }catch(e){ try{ const slim=Object.assign({},S,{deliveries:S.deliveries.map(d=>d.photos&&d.photos.length&&d.deliveredAt&&d.deliveredAt<addDays(todayISO(),-14)?Object.assign({},d,{photos:[],signature:""}):d)}); localStorage.setItem("ht_tenant:"+tenantId,JSON.stringify(slim)); }catch(e2){} } },250); }
function savePlatformLocal(){ try{ localStorage.setItem("ht_platform",JSON.stringify(platform)); }catch(e){} }
function migrateLegacy(){ const bad=S.trucks.filter(t=>!t.id||t.phantom||(t.name==="Unassigned"&&!t.crew&&!t.capacity)); if(bad.length){ S.trucks=S.trucks.filter(t=>!bad.includes(t)); for(const t of bad){ if(t.id&&db&&tenantId) queueWrite(tpath("trucks"),t.id,null); } for(const d of S.deliveries){ if(d.truckId&&!S.trucks.some(t=>t.id===d.truckId)){ d.truckId=""; save("deliveries",d); } } }
  if(!S.settings.find(x=>x.id==="store")?.units){ const st=S.settings.find(x=>x.id==="store"); if(st){ st.units="mi"; if(st.speedKmh&&!st.speedMph) st.speedMph=Math.round(st.speedKmh*0.621); if(st.zones) st.zones=st.zones.map(z=>z.maxMi?z:Object.assign({},z,{maxMi:Math.round((z.maxKm||0)*0.621*10)/10})); } }
  for(const p of S.products){ let ch=false; if(normalizeCategory(p)) ch=true; if(p.landed===undefined){ p.landed=landedCost(p); ch=true; } if(ch) save("products",p); }
  for(const s of S.staff){ if(!s.role){ s.role="sales"; s.active=true; save("staff",s); } } if(S.staff.length&&!S.staff.some(s=>s.role==="manager"||s.role==="owner")){ S.staff[0].role="owner"; save("staff",S.staff[0]); } for(const i of S.invoices){ let ch=false; for(const l of (i.lines||[])){ if(!l.lineId){ l.lineId=uid(); ch=true; } } if(ch) save("invoices",i); } for(const p of S.products){ if(p.pieces===undefined) p.pieces=1; } }
// write queue: coalesces writes per document, limits concurrency, retries transient errors
const wq=new Map(); let wqInflight=0; const WQ_MAX=3; let offlineFlag=false, offlineSince=0;
const SNAP=new Map(); const SNAP_COLLS=new Set(["settings","staff","products","customers","invoices","purchaseOrders","deliveries","trucks","vendors"]);
function snapAll(){ SNAP.clear(); for(const c of SNAP_COLLS){ for(const d of (S[c]||[])){ try{ SNAP.set(c+"/"+d.id,JSON.stringify(d)); }catch(e){} } } }
function fsSafe(v,inArr){ if(Array.isArray(v)){ if(inArr) return {list:v.map(x=>fsSafe(x,true))}; return v.map(x=>fsSafe(x,true)); } if(v&&typeof v==="object"){ const o={}; for(const k in v){ if(v[k]===undefined) continue; o[k]=fsSafe(v[k],false); } return o; } return v; }
function queueWrite(collPath,id,doc){ if(doc&&typeof doc==="object"){ try{ doc=fsSafe(doc,false); }catch(e){} } wq.set(collPath+"/"+id,{collPath,id,doc}); persistQueue(); pumpQueue(); syncStatus(); if(typeof offlineBanner==="function") offlineBanner(); }
function pumpQueue(){ if(!db) return; if(offlineFlag||navigator.onLine===false){ if(typeof offlineBanner==="function") offlineBanner(); return; } while(wqInflight<WQ_MAX&&wq.size){ const [key,job]=wq.entries().next().value; wq.delete(key); wqInflight++; doWrite(job).finally(()=>{ wqInflight--; pumpQueue(); syncStatus(); }); } }
async function doWrite(job,attempt=0){
  try{ const ref=db.collection(job.collPath).doc(job.id); if(job.doc===null) await withTimeout(ref.delete(),12000); else await withTimeout(ref.set(job.doc),12000); persistQueue(); if(offlineFlag){ offlineFlag=false; if(typeof offlineBanner==="function") offlineBanner(); } }
  catch(e){ const code=(e&&e.code)||"unavailable";
    if(["resource_exhausted","unavailable","timeout"].includes(code)&&attempt<3&&navigator.onLine!==false){ await sleep(500*Math.pow(2,attempt)+Math.random()*400); return doWrite(job,attempt+1); }
    if(["unavailable","timeout","resource_exhausted"].includes(code)||navigator.onLine===false){ wq.set(job.collPath+"/"+job.id,job); persistQueue(); goOffline(); return; }
    if(code==="invalid-argument"||/invalid data|Nested arrays|Unsupported field/i.test(String(e&&e.message||""))){ wq.delete(job.collPath+"/"+job.id); persistQueue(); console.warn("dropped unsyncable write",job.collPath,job.id,e&&e.message); toast("One change couldn't be saved to the shared store (data format) — it stays on this device.",true); logAudit("settings",`Unsyncable write dropped: ${job.collPath}/${job.id}`); return; }
    syncErrors++; try{ wq.delete(job.collPath+"/"+job.id); persistQueue(); }catch(x){}
    if(["not_granted","revoked","capability_disabled","capability_removed"].includes(code)){ db=null; persistMode="local"; loadWarning="Shared store access was not granted — data is saved in this browser only."; syncStatus(); }
    else if(code==="quota_exceeded") toast("Shared store is full: "+(e.message||""),true);
    else toast("Couldn't sync one change to the shared store ("+(e.message||code)+"). It's still saved on this device.",true); }
}
function syncStatus(){ const els=document.querySelectorAll(".syncpill"); const pending=wq.size+wqInflight; const txt=persistMode==="shared"?(offlineFlag||navigator.onLine===false?`Offline · ${pending} waiting`:(pending?`Syncing ${pending}…`:"Synced")):persistMode==="loading"?"Connecting…":"On this device"; els.forEach(el=>{ el.className="syncpill"+(pending?" busy":persistMode==="shared"?"":" off"); el.innerHTML=`<span class="dot"></span>${txt}`; el.title=loadWarning||""; }); }
window.addEventListener("beforeunload",e=>{ if(wq.size||wqInflight){ e.preventDefault(); e.returnValue=""; } });
async function readCollection(path){ for(let attempt=0;attempt<3;attempt++){ try{ const snap=await withTimeout(db.collection(path).get(),15000); return snap.docs.filter(x=>x.exists).map(x=>{ const o=clone(x.data())||{}; if(!o.id) o.id=x.id; return o; }); }catch(e){ const code=(e&&e.code)||"unavailable"; if(["not_granted","revoked","capability_disabled","capability_removed"].includes(code)) throw e; if(attempt<2) await sleep(700*(attempt+1)); else throw e; } } }
async function readDoc(path){ try{ const snap=await withTimeout(db.doc(path).get(),15000); return snap.exists?clone(snap.data()):null; }catch(e){ const code=(e&&e.code)||""; if(["not_granted","revoked","capability_disabled","capability_removed"].includes(code)) throw e; return undefined; } }
async function initPersistence(){
  try{ const h=(location.hash||"").replace(/^#/,""); const m=h.match(/^sign\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)$/); if(m){ await renderSignPage(m[1],m[2]); return; } }catch(e){}
  try{ const pl=localStorage.getItem("ht_platform"); if(pl) platform=JSON.parse(pl); }catch(e){}
  try{ const n=restoreQueue(); if(n) loadWarning=`${n} change${n===1?"":"s"} from an earlier session still need to sync.`; }catch(e){}
  persistMode="local";
  if(session&&session.kind==="staff") loadTenantLocal(session.tenantId);
  render();
  try{ await connectShared(); }catch(e){ console.error(e); loadWarning="Shared store error: "+(e.message||e)+" — working from this browser's copy."; persistMode="local"; syncStatus(); }
  platformLoaded=true; platformFailed=!db&&!!((window.claude&&window.claude.use)||(typeof hsConfig==="function"&&hsConfig().firebase)); if(!session) render();
}
async function connectShared(){
  let d=null;
  if(window.claude&&window.claude.use){ try{ d=await withTimeout(claude.use("db"),12000); }catch(e){ d=null; } downloadsCap=await claude.use("downloads").catch(()=>null); }
  else if(typeof initFirebaseDb==="function"&&hsConfig().firebase){ d=await initFirebaseDb(); if(!d){ loadWarning="Couldn't reach the database — check config.js and your Firebase project."; syncStatus(); return; } }
  else return;
  if(!d){ loadWarning="Shared store not available on this view — saved in this browser."; syncStatus(); return; }
  db=d;
  const selfHosted=typeof hsConfig==="function"&&!!hsConfig().firebase&&!(window.claude&&window.claude.use); const ownerSignedIn=(()=>{ try{ return !!(window.firebase&&firebase.auth().currentUser&&firebase.auth().currentUser.email); }catch(e){ return false; } })();
  const storeDevice=selfHosted&&(deviceMode!=="admin"||!ownerSignedIn);
  let cfg, tenants, integ; try{ [cfg,tenants,integ]=await Promise.all([readDoc("platform/config"),storeDevice?Promise.resolve([]):readCollection("tenants"),readCollection("integrations").catch(()=>[])]); }
  catch(e){ db=null; loadWarning="Shared store access was not granted — data is saved in this browser only."; syncStatus(); return; }
  if(cfg===undefined){ db=null; loadWarning="Couldn't reach the shared store — working from this browser's copy. Reload to retry."; syncStatus(); return; }
  if(cfg||tenants.length){ platform={config:cfg||platform.config,tenants:tenants.length?tenants:(storeDevice?(platform.tenants||[]):platform.tenants),integrations:integ&&integ.length?integ:(platform.integrations||[])}; if(platform.config&&/^Hearth & Timber|^MyCoreRetail$/i.test(platform.config.softwareName||"")){ platform.config.softwareName="HomeStore POS"; queueWrite("platform","config",clone(platform.config)); } }
  else if(platform.config||platform.tenants.length){ if(platform.config) queueWrite("platform","config",clone(platform.config)); for(const t of platform.tenants) queueWrite("tenants",t.id,clone(t)); for(const i of (platform.integrations||[])) queueWrite("integrations",i.id,clone(i)); }
  else { if(!selfHosted) await migrateRootData(); }
  savePlatformLocal(); persistMode="shared";
  if(session&&session.kind==="staff"&&isTrainingId(session.tenantId)){ trainingMode=true; const ret=(()=>{ try{ return JSON.parse(localStorage.getItem("ht_training_return")||"null"); }catch(e){ return null; } })(); if(ret) window._trainingReturn=ret; const tr=trainingTenantFor(session.tenantId.replace(/^tr_/,"")); if(!platform.tenants.some(t=>t.id===tr.id)) platform.tenants=platform.tenants.concat([tr]); loadTenantLocal(session.tenantId); }
  else if(session&&session.kind==="staff"){ await loadTenantShared(session.tenantId); }
  const typing=!session&&["su_name","su_pin","su_store","lg_code"].some(id=>document.getElementById(id)&&document.getElementById(id).value);
  if(!typing) render(); else syncStatus();
  pumpQueue();
}
// data left at the root by the single-store version becomes the first dealer
async function migrateRootData(){
  let root={}; try{ for(const c of COLLS) root[c]=await readCollection(c); }catch(e){ return; }
  if(!COLLS.some(c=>root[c].length)) { try{ const ls=localStorage.getItem("ht_pos_v2"); if(ls){ const o=JSON.parse(ls); COLLS.forEach(c=>root[c]=Array.isArray(o[c])?o[c]:[]); } }catch(e){} }
  if(!COLLS.some(c=>root[c].length)) return;
  const st=(root.settings||[]).find(x=>x.id==="store"); const name=st?.name||"Store 1"; const t={id:uid(),code:makeCode(name),name,plan:"Standard",status:"active",contact:"",email:"",phone:"",created:todayISO(),expires:"",notes:"Migrated from the single-store version",stats:{invoices:(root.invoices||[]).length}};
  platform.tenants.push(t); queueWrite("tenants",t.id,clone(t)); if(t.code) queueWrite("tenantCodes",String(t.code).toUpperCase(),{tenantId:t.id,active:true});
  for(const c of COLLS) for(const doc of root[c]) queueWrite(`tenants/${t.id}/${c}`,doc.id,clone(doc));
  try{ localStorage.setItem("ht_tenant:"+t.id,JSON.stringify(root)); localStorage.removeItem("ht_pos_v2"); }catch(e){}
}
function makeCode(name){ const base=(name||"STORE").replace(/[^A-Za-z0-9 ]/g,"").split(/\s+/).filter(Boolean).map(w=>w[0]).join("").toUpperCase().slice(0,4)||"ST"; let n=1, code=base+"01"; while(platform.tenants.some(t=>t.code===code)){ n++; code=base+String(n).padStart(2,"0"); } return code; }
function loadTenantLocal(tid){ tenantId=tid; COLLS.forEach(c=>S[c]=[]); setTimeout(snapAll,0); try{ const ls=localStorage.getItem("ht_tenant:"+tid); if(ls){ const o=JSON.parse(ls); COLLS.forEach(c=>S[c]=Array.isArray(o[c])?o[c]:[]); } }catch(e){} try{ migrateLegacy(); }catch(e){} }
async function waitForQueue(ms=90000){ const t0=Date.now(); while((wq.size||wqInflight)&&Date.now()-t0<ms){ pumpQueue(); syncStatus(); await sleep(150); } return !(wq.size||wqInflight); }
async function loadTenantShared(tid){
  if(!db) return true; tenantId=tid; const results={};
  if(wq.size||wqInflight){ const drained=await waitForQueue(); if(!drained){ loadWarning="Still syncing earlier changes — using this browser's copy for now."; syncStatus(); return false; } }
  try{ for(let i=0;i<COLLS.length;i+=3) await Promise.all(COLLS.slice(i,i+3).map(async c=>{ results[c]=await readCollection(`tenants/${tid}/${c}`); })); }
  catch(e){ loadWarning="Couldn't load this store from the shared store — using this browser's copy."; goOffline(); syncStatus(); return false; }
  if(COLLS.some(c=>results[c].length)){ COLLS.forEach(c=>S[c]=results[c]); try{ migrateLegacy(); }catch(e){} saveLocal(); }
  else { for(const c of COLLS) for(const doc of S[c]) queueWrite(`tenants/${tid}/${c}`,doc.id,clone(doc)); }
  snapAll(); return true;
}
async function save(coll,doc){
  if(!doc.id) doc.id=uid(); if(!S[coll]) S[coll]=[];
  const i=S[coll].findIndex(x=>x.id===doc.id);
  if(coll!=="audit"&&typeof changeLog==="function"&&SNAP_COLLS.has(coll)){ const key=coll+"/"+doc.id; const prevJson=SNAP.get(key); let nowJson=""; try{ nowJson=JSON.stringify(doc); }catch(e){} if(prevJson&&nowJson&&prevJson!==nowJson){ try{ changeLog(coll,JSON.parse(prevJson),doc); }catch(e){} } if(nowJson) SNAP.set(key,nowJson); }
  if(i>=0) S[coll][i]=doc; else S[coll].push(doc);
  saveLocal();
  if(db&&tenantId&&!trainingMode&&!isTrainingId(tenantId)) queueWrite(tpath(coll),doc.id,clone(doc));
  return doc;
}
async function remove(coll,id){ if(coll==="audit") return; if(trainingMode||isTrainingId(tenantId)){ S[coll]=(S[coll]||[]).filter(x=>x.id!==id); saveLocal(); return; }
  S[coll]=S[coll].filter(x=>x.id!==id); saveLocal();
  if(db&&tenantId) queueWrite(tpath(coll),id,null);
}
function saveTenant(t){ const i=platform.tenants.findIndex(x=>x.id===t.id); const prev=i>=0?platform.tenants[i]:null; if(i>=0) platform.tenants[i]=t; else platform.tenants.push(t); savePlatformLocal(); if(db){ queueWrite("tenants",t.id,clone(t)); if(t.code) queueWrite("tenantCodes",String(t.code).toUpperCase(),{tenantId:t.id,active:t.status!=="suspended"}); if(prev&&prev.code&&String(prev.code).toUpperCase()!==String(t.code||"").toUpperCase()) queueWrite("tenantCodes",String(prev.code).toUpperCase(),null); } }
/* MyCoreRetail rename */
function savePlatformConfig(cfg){ platform.config=cfg; savePlatformLocal(); if(db) queueWrite("platform","config",clone(cfg)); }
const currentTenant=()=>platform.tenants.find(t=>t.id===tenantId);

/* ---------- UI helpers ---------- */
let toastT;
function toast(m,err){ try{ if(typeof currentLang==="function"&&currentLang()!=="en"){ const d=DICT[currentLang()]||{}; if(d[m]) m=d[m]; } }catch(e){} let t=document.querySelector(".toast"); if(!t){t=document.createElement("div");document.body.appendChild(t)} t.className="toast"+(err?" err":""); t.textContent=m; clearTimeout(toastT); toastT=setTimeout(()=>t.remove(),err?4200:2600); }
function modal(html,wide){ const r=document.getElementById("modal-root"); r.innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal ${wide?"wide":""}">${html}</div></div>`; try{ if(typeof translateDOM==="function") translateDOM(r); }catch(e){} const f=r.querySelector("input:not([type=hidden]):not([type=checkbox]),select,textarea"); if(f&&window.innerWidth>920) f.focus(); }
function closeModal(){ stopScanner(); document.getElementById("modal-root").innerHTML=""; }
function fv(id){ const e=document.getElementById(id); return e? e.value : ""; }
function fnum(id){ return parseFloat(fv(id))||0; }
function fchk(id){ const e=document.getElementById(id); return !!(e&&e.checked); }
const C128=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];
function code128Svg(text,h,w){ text=String(text||""); h=h||34; w=w||1.3; const codes=[104]; let sum=104; for(let i=0;i<text.length;i++){ const c=text.charCodeAt(i); const v=(c>=32&&c<=126)?c-32:0; codes.push(v); sum+=v*(i+1); } codes.push(sum%103); codes.push(106); let x=10; let bars=""; for(const c of codes){ const pat=C128[c]; for(let i=0;i<pat.length;i++){ const bw=+pat[i]*w; if(i%2===0) bars+=`<rect x="${x.toFixed(2)}" y="0" width="${bw.toFixed(2)}" height="${h}"/>`; x+=bw; } } const W=x+10; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${h+16}" width="${W.toFixed(0)}" height="${h+16}" shape-rendering="crispEdges"><g fill="#000">${bars}</g><text x="${(W/2).toFixed(0)}" y="${h+13}" font-size="11" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" fill="#000">${text.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</text></svg>`; }
function drawBarcodes(root){ (root||document).querySelectorAll("svg.bc").forEach(s=>{ try{ const h=+(s.dataset.h||34); const svg=code128Svg(s.dataset.code,h,1.3); s.outerHTML=svg.replace("<svg ","<svg class=\"bc\" data-code=\""+String(s.dataset.code).replace(/"/g,"&quot;")+"\" "); }catch(e){} }); }
const PRINT_CSS=`body{font-family:Manrope,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#000;background:#fff;margin:0;font-size:13px} h1{font-size:22px;margin:0} h2{font-size:17px;margin:0} h3{font-size:14px} p{margin:0 0 8px} .row{display:flex;gap:10px;align-items:center;justify-content:space-between} .n{text-align:right} .muted{color:#555} @page{margin:12mm} @media screen{.page{max-width:820px;margin:16px auto;box-shadow:0 2px 12px rgba(0,0,0,.15);background:#fff}}
  .page{page-break-after:always;padding:24px;font-size:13px}
  .page:last-child{page-break-after:auto}
  .tagsheet{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:12px}
  .ptag{border:1px solid #000;padding:12px;height:2.3in;display:flex;flex-direction:column;justify-content:space-between}
  .ptag.small{height:1.5in}
  .ptag .nm{font-weight:700;font-size:16px}
  .ptag .pr{font-size:30px;font-weight:800}
  .ptag .msrp{text-decoration:line-through;font-size:13px;color:#555}
  .ptag .mo{font-size:12px;color:#222}
  .labelsheet{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px}
  .plabel{border:2px solid #000;padding:12px;height:3in}
  .plabel .big{font-size:34px;font-weight:800}
  .ptable{width:100%;border-collapse:collapse} .ptable th,.ptable td{border-bottom:1px solid #999;padding:5px 6px;text-align:left;font-size:12.5px;background:none;vertical-align:top} .ptable td.n,.ptable th.n{text-align:right}
  .doc-modern .ptable th{background:var(--acc,#37A598);color:#fff;border-bottom:0;-webkit-print-color-adjust:exact;print-color-adjust:exact} .doc-modern .ptable td{border-bottom:1px solid #e3e3e3} .doc-modern .band{background:var(--acc,#37A598);color:#fff;padding:14px 18px;border-radius:8px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact} .doc-modern .band h1,.doc-modern .band h2{color:#fff;margin:0} .doc-modern .band .muted{color:rgba(255,255,255,.85)} .doc-modern .totals-box{border-left:4px solid var(--acc,#37A598);background:#f6f8f8;padding:6px 10px;margin-top:8px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .doc-classic .rule{border-top:3px solid var(--acc,#37A598);margin:6px 0 12px} .doc-classic .ptable th{border-bottom:2px solid var(--acc,#37A598);color:var(--acc,#37A598)} .doc-classic h1{color:var(--acc,#37A598)}
  .doc-minimal .ptable th{border-bottom:1px solid #000}
  .pgroup{background:#eee;font-weight:700}
  .pgroup-item td{padding-left:22px;color:#333}
  .sigimg{max-height:70px}`;
function docStyle(){ const st=tenantId?storeSettings():null; const d=(st&&st.docStyle)||{}; const pal=(st&&typeof currentPalette==="function")?currentPalette():null; return {accent:d.accent||(pal&&pal.accent)||"#37A598",style:d.style||"modern",showLogo:d.showLogo!==false,footerNote:d.footerNote||""}; }
function printDoc(html,title){ try{ const ds=docStyle(); html=`<div class="doc-${ds.style}" style="--acc:${ds.accent}">${html}</div>`; }catch(e){} if(typeof trainingMode!=="undefined"&&trainingMode) html=`<div style="position:fixed;top:40%;left:0;right:0;text-align:center;font-size:64px;color:rgba(200,60,60,.18);transform:rotate(-20deg);pointer-events:none;font-weight:900">TRAINING — NOT A REAL DOCUMENT</div>`+String(html); html=String(html).replace(/<svg class="bc" data-code="([^"]*)"(?: data-h="(\d+)")?><\/svg>/g,(m,code,h)=>{ const dec=code.replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">"); return code128Svg(dec,+(h||34),1.3); }); return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title||storeSettings().name)}</title><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${PRINT_CSS}</style></head><body>${html}<script>window.addEventListener("load",function(){ setTimeout(function(){try{window.focus();window.print()}catch(e){}},400)});<\/script></body></html>`; }
let lastPrint={html:"",title:""};
function printHTML(html,title){
  lastPrint={html,title:title||""}; const doc=printDoc(html,title);
  const st0=tenantId?storeSettings():null; const mode=(st0&&st0.printMode)||"preview";
  let opened=null; if(mode==="tab"){ try{ const blob=new Blob([doc],{type:"text/html"}); const url=URL.createObjectURL(blob); opened=window.open(url,"_blank"); if(opened) setTimeout(()=>URL.revokeObjectURL(url),60000); }catch(e){ opened=null; } }
  if(opened) return;
  // pop-ups blocked: show an in-app preview with print / open / download choices
  const pv=document.getElementById("print-preview"); pv.setAttribute("data-notr",""); pv.innerHTML=`<div class="pp-bar"><b style="flex:1">${esc(title||"Print preview")}</b><button class="btn s" onclick="printPreviewPrint()">Print</button><button class="btn s" onclick="printOpenTab()">Open in new tab</button><button class="btn s" onclick="printDownload()">Download</button><button class="btn s" onclick="document.getElementById('print-preview').innerHTML=''">Close</button></div><div class="pp-frame"><iframe id="pp_if" sandbox="allow-same-origin allow-modals allow-scripts"></iframe></div>`;
  const f=document.getElementById("pp_if"); f.srcdoc=doc.replace("setTimeout(function(){try{window.focus();window.print()}catch(e){}},400)","");
}
function printPreviewPrint(){ const f=document.getElementById("pp_if"); try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){} try{ const p=document.getElementById("print-area"); p.innerHTML=lastPrint.html; drawBarcodes(p); setTimeout(()=>{ try{ window.print(); }catch(e){} },200); }catch(e){} toast("If nothing printed, use Open in new tab or Download and print from there."); }
function printOpenTab(){ const doc=printDoc(lastPrint.html,lastPrint.title); const blob=new Blob([doc],{type:"text/html"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000); }
function printDownload(){ const name=(lastPrint.title||"document").replace(/[^A-Za-z0-9._-]+/g,"-")+".html"; saveFile(name,printDoc(lastPrint.html,lastPrint.title).replace("setTimeout(function(){try{window.focus();window.print()}catch(e){}},400)","")); }
function confirmDo(msg,fn){ if(confirm(msg)) fn(); }
function opts(list,sel,label=x=>x.name,val=x=>x.id,blank=""){ return (blank!==null?`<option value="">${esc(blank)}</option>`:"")+list.map(x=>`<option value="${esc(val(x))}" ${String(val(x))===String(sel)?"selected":""}>${esc(label(x))}</option>`).join(""); }
function optsList(arr,sel,blank){ return (blank!==undefined?`<option value="">${esc(blank)}</option>`:"")+arr.map(x=>`<option ${x===sel?"selected":""}>${esc(x)}</option>`).join(""); }
function table(rows,cols,empty){ if(!rows.length) return `<div class="empty">${empty}</div>`; return `<div class="tblwrap"><table><thead><tr>${cols.map(c=>`<th class="${c[2]||""}">${c[0]}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td class="${c[2]||""}">${c[1](r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }
function statusTag(s){ const map={paid:"ok",open:"warn",void:"bad",quote:"info",layaway:"info",financed:"ok",delivered:"ok",scheduled:"",loaded:"warn",out:"info",unscheduled:"warn",awaiting:"warn",missed:"bad",ready:"ok",draft:"",sent:"info",partial:"warn",received:"ok",done:"ok",due:"warn",overdue:"bad",approved:"ok",denied:"bad",replaced:"ok","sent to vendor":"info","picked up":"ok",held:"info",fulfilled:"ok",pending:"warn"}; return `<span class="tag ${map[s]||""}">${esc(s)}</span>`; }
const custName=id=>{const c=byId("customers",id);return c?c.name:"Walk-in"};
const vendName=id=>{const v=byId("vendors",id);return v?v.name:"—"};
const staffName=id=>{const s=byId("staff",id);return s?s.name:"—"};
const truckName=id=>{const t=byId("trucks",id);return t?t.name:"Unassigned"};
const isMattress=p=>!!p&&((p.category==="Mattress"&&(!p.subcategory||p.subcategory==="Mattresses"))||p.category==="Mattresses");
function firstName(n){ return String(n||"").split(" ")[0]; }
async function saveFile(name,data){
  if(downloadsCap){ try{ await downloadsCap.save({filename:name,data}); return toast("Saved "+name); }catch(e){ if(e.code==="declined") return; } }
  modal(`<h2>${esc(name)}</h2><p class="muted">Copy this text and save it as ${esc(name)}.</p><textarea rows="14" style="width:100%">${esc(data)}</textarea><div class="actions"><button class="btn p" onclick="closeModal()">Done</button></div>`);
}
function exportCSV(coll){
  const rows=S[coll]; if(!rows.length) return toast("Nothing to export.");
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>rows.every(r=>typeof r[k]!=="object"||r[k]===null));
  const csv=[keys.join(",")].concat(rows.map(r=>keys.map(k=>`"${String(r[k]??"").replace(/"/g,'""')}"`).join(","))).join("\n");
  saveFile(coll+".csv",csv);
}
function parseCSV(text){ const lines=text.trim().split(/\r?\n/); const split=l=>{const o=[];let c="",q=false;for(const ch of l){if(ch==='"'){q=!q}else if(ch===","&&!q){o.push(c);c=""}else c+=ch}o.push(c);return o.map(s=>s.trim())}; const h=split(lines[0]); return lines.slice(1).filter(Boolean).map(l=>{const a=split(l);return Object.fromEntries(h.map((k,i)=>[k,a[i]]))}); }
function mapsSearchUrl(addr){ return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(addr||""); }
function mapsDirUrl(points){ return "https://www.google.com/maps/dir/"+points.map(p=>encodeURIComponent(p)).join("/"); }
function parseCoords(str){ const m=String(str||"").match(/(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/); return m?{lat:+m[1],lng:+m[2]}:null; }

/* ---------- barcode scanner (camera) ---------- */
let scanStream=null, scanRAF=null;
function openScanner(onCode){
  const supported="BarcodeDetector" in window;
  modal(`<h2>Scan barcode</h2>${supported?`<div class="scanbox"><video id="scanvid" playsinline muted></video><div class="frame"></div></div><p class="muted" style="margin-top:8px">Point the camera at the tag. Works with Code 128, EAN and QR.</p>`:`<div class="notice">This browser can't read barcodes from the camera. Use a USB/Bluetooth scanner (it types the SKU and presses Enter) or enter it below.</div>`}
  <div class="row"><input type="text" id="scan_manual" placeholder="Or type the SKU"><button class="btn fx p" onclick="scanDone(document.getElementById('scan_manual').value)">Go</button></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button></div>`);
  window._scanCb=onCode;
  if(!supported) return;
  const video=document.getElementById("scanvid");
  navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(st=>{ scanStream=st; video.srcObject=st; video.play(); let det; try{ det=new BarcodeDetector({formats:["code_128","ean_13","ean_8","upc_a","upc_e","qr_code","code_39"]}); }catch(e){ det=new BarcodeDetector(); } let busy=false;
    const loop=async()=>{ if(!scanStream) return; if(!busy&&video.readyState>=2){ busy=true; try{ const codes=await det.detect(video); if(codes.length){ scanDone(codes[0].rawValue); return; } }catch(e){} busy=false; } scanRAF=requestAnimationFrame(loop); }; loop();
  }).catch(()=>{ const v=document.querySelector(".scanbox"); if(v) v.outerHTML=`<div class="notice">Camera access was refused. Type the SKU instead.</div>`; });
}
function stopScanner(){ if(scanRAF) cancelAnimationFrame(scanRAF); scanRAF=null; if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; } }
function scanDone(code){ const cb=window._scanCb; closeModal(); if(cb&&code) cb(String(code).trim()); }

/* ---------- auth & roles ---------- */
let session=null;
try{ session=JSON.parse(sessionStorage.getItem("ht_session")||"null"); }catch(e){}
const SUPPORT_USER={id:"support",name:"Support (admin)",role:"manager"};
const me=()=>{ if(!session) return null; if(session.kind==="admin") return (platform.config?.admins||[]).find(a=>a.id===session.adminId)||null; if(session.support) return SUPPORT_USER; return byId("staff",session.staffId); };
const role=()=>me()?.role||"";
const isManager=()=>role()==="manager"||role()==="owner"||!!(session&&(session.kind==="admin"||session.support));
const seesCost=()=>has("cost");
const PERMS=[["Screens",[["pos","Ring sales"],["catalog","Catalog"],["orders","Orders board"],["invoices","Invoices"],["customers","Customers"],["service","Service — returns, claims, follow-ups"],["stock","Inventory"],["purchasing","Purchase orders & receiving"],["vendors","Vendors"],["tags","Price tags"],["packages","Packages & promotions"],["deliveries","Deliveries & pickups"],["crew","Crew view"],["warehouse","Warehouse — picking & storage"],["reports","Reports — sales & operations"],["commissions_all","Commissions — everyone"],["commissions_own","Commissions — own only"],["settings","Settings"],["staff","Manage staff & permissions"]]],["On a sale",[["complete","Complete sales & take payments at the register"],["margin","See margin % on sales"],["cost","See costs (secret panel, inventory, reports)"],["editPrice","Change line prices"],["discount","Give discounts (up to their limit)"],["balance","Complete a sale with a balance due"],["quote","Save quotes"]]],["Owner-only settings",[["settingsMoney","Payments & financing — fees, plans, tenders"],["settingsPricing","Pricing rules, cost rules & margin floors"],["settingsTax","Tax setup"],["settingsTerms","Terms & documents, invoice design"],["settingsCommission","Commission rules & rates"],["settingsData","Data & backup — export, import, delete"],["manageManagers","Add or change managers and owners"]]],["Money & stock",[["payments","Record payments on existing invoices"],["returns","Process returns & refunds"],["void","Void invoices"],["editInvoice","Edit items on a completed invoice (reopen in the register)"],["credit","Issue or edit store credit"],["receive","Receive shipments (purchase orders)"],["adjustStock","Adjust stock counts"],["approve","Approve overrides with their PIN"],["audit","See the audit log"]]]];
const PERM_KEYS=PERMS.flatMap(g=>g[1].map(p=>p[0]));
const OWNER_KEYS=["settingsMoney","settingsPricing","settingsTax","settingsTerms","settingsCommission","settingsData","manageManagers"];
const ROLE_PERMS={owner:Object.fromEntries(PERM_KEYS.map(k=>[k,true])),manager:Object.fromEntries(PERM_KEYS.map(k=>[k,!OWNER_KEYS.includes(k)])),sales:{pos:true,complete:true,catalog:true,orders:true,invoices:true,warehouse:true,customers:true,service:true,stock:true,tags:true,deliveries:true,crew:true,commissions_own:true,margin:true,editPrice:true,discount:true,quote:true,payments:true},cashier:{pos:true,complete:true,catalog:true,orders:true,invoices:true,customers:true,deliveries:true,crew:true,discount:true,quote:true,payments:true},driver:{crew:true,deliveries:true,customers:true,catalog:true,warehouse:true}};
function has(key){ if(!session) return false; if(session.kind==="admin"||session.support) return true; const s=me(); if(!s) return false; const o=s.perms||{}; if(o[key]!==undefined) return !!o[key]; return !!(ROLE_PERMS[s.role]||{})[key]; }
function staffLimit(key,fallback){ const s=me(); if(!s||session.support||session.kind==="admin") return fallback; const v=s.limits&&s.limits[key]; return v===undefined||v===""||v===null?fallback:+v; }
function can(what){ const alias={inventory:"stock",sales_reports:"reports",commissions:"commissions_own"}; const k=alias[what]||what; if(k==="commissions_own") return has("commissions_own")||has("commissions_all"); if(k==="reports") return has("reports")||has("commissions_own")||has("commissions_all"); return has(k); }
function setSession(s){ session=s; try{ if(s) sessionStorage.setItem("ht_session",JSON.stringify(s)); else sessionStorage.removeItem("ht_session"); }catch(e){} }
async function ensureOwner(){ try{ if(!S.staff||!S.staff.length) return; if(S.staff.some(s=>s.role==="owner")) return; const m=S.staff.filter(s=>s.role==="manager"&&s.active!==false).sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""))[0]; if(!m) return; m.role="owner"; await save("staff",m); logAudit("staff",`${m.name} set as store owner (first manager) — owners control finance, pricing, tax, terms, commission and data settings`); }catch(e){} }
function login(staffId){ setSession({kind:"staff",tenantId,staffId,at:Date.now()}); lastActivity=Date.now(); setTimeout(()=>{ try{ ensureOwner(); }catch(e){} },1500); setTimeout(()=>{ try{ if(typeof purgeOldPhotos==="function"&&!trainingMode) purgeOldPhotos(); }catch(e){} },4000); try{ localStorage.removeItem("ht_lang"); }catch(e){} const s=byId("staff",staffId); view=s?.role==="driver"?"crew":"dashboard"; if(heldDraft&&heldDraft.lines&&heldDraft.lines.length){ cur=heldDraft; heldDraft=null; view="pos"; setTimeout(()=>toast("Unfinished sale restored — pick the right salesperson before completing"),300); } try{ localStorage.setItem("ht_last_code",currentTenant()?.code||""); }catch(e){} render(); }
function loginAdmin(adminId){ setSession({kind:"admin",adminId,at:Date.now()}); view="admin"; render(); }
let heldDraft=null, idleT=null, lastActivity=Date.now();
function idleLock(){ if(!session||session.kind!=="staff"||session.support) return; if(document.getElementById("modal-root")?.innerHTML.includes("sigpad")) return; heldDraft=cur&&cur.lines&&cur.lines.length?cur:null; logout(); toast("Register locked after inactivity — tap your name to continue"); }
function idleTick(){ const st=tenantId?S.settings.find(x=>x.id==="store"):null; const min=st?(st.idleLockMin===undefined?5:+st.idleLockMin):0; if(!min||!session||session.kind!=="staff") return; if(Date.now()-lastActivity>min*60000) idleLock(); }
["click","keydown","touchstart","pointerdown"].forEach(ev=>document.addEventListener(ev,()=>{ lastActivity=Date.now(); },{passive:true}));
setInterval(idleTick,15000);
function logout(){ const wasAdmin=session&&(session.kind==="admin"||session.support); const t=session&&session.kind==="staff"&&!session.support?currentTenant():null; setSession(null); cur=null; loginPin=""; loginSel="";
  if(wasAdmin){ deviceMode="admin"; try{ localStorage.setItem("ht_mode","admin"); }catch(e){} loginTenant=null; tenantId=""; COLLS.forEach(c=>S[c]=[]); }
  else if(t){ deviceMode="store"; try{ localStorage.setItem("ht_mode","store"); }catch(e){} loginTenant=t; loadTenantLocal(t.id); }
  else { loginTenant=null; tenantId=""; COLLS.forEach(c=>S[c]=[]); }
  render(); }
function verifyPin(staffId,reason,fn){ const s=byId("staff",staffId); if(!s||!s.pin) return fn(); modal(`<h2>Confirm it's you</h2><p class="muted">${esc(reason)}</p><div class="field"><label class="f">${esc(s.name)}'s PIN</label><input type="password" id="vp_pin" inputmode="numeric" maxlength="8" onkeydown="if(event.key==='Enter')document.getElementById('vp_go').click()"></div><div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn p" id="vp_go" onclick="(function(){if(fv('vp_pin')===String(byId('staff','${staffId}').pin)){closeModal();window._vpFn();}else{ toast('Wrong PIN',true); logAudit('login_fail','Wrong salesperson PIN for '+byId('staff','${staffId}').name); }})()">Confirm</button></div>`); window._vpFn=fn; }
function managerOverride(reason,fn){
  if(has("approve")) return fn();
  const managers=S.staff.filter(s=>s.pin&&s.active!==false&&((s.perms&&s.perms.approve!==undefined)?s.perms.approve:(ROLE_PERMS[s.role]||{}).approve));
  if(!managers.length) return fn();
  modal(`<h2>Manager approval</h2><p class="muted">${esc(reason)}</p><div class="field"><label class="f">Manager</label><select id="ov_who">${opts(managers,managers[0].id)}</select></div><div class="field"><label class="f">PIN</label><input type="password" id="ov_pin" inputmode="numeric" maxlength="8" onkeydown="if(event.key==='Enter')document.getElementById('ov_go').click()"></div>
  <div class="actions"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn p" id="ov_go" onclick="(function(){const m=byId('staff',fv('ov_who'));if(m&&String(m.pin)===fv('ov_pin')){closeModal();logAudit('override',window._ovReason||'',{approvedBy:m.id,invoiceId:cur&&cur.number?cur.id:''});window._ovFn();}else{ toast('Wrong PIN',true); logAudit('login_fail','Wrong manager PIN for '+(m?m.name:'?')); }})()">Approve</button></div>`);
  window._ovFn=fn; window._ovReason=reason;
}

/* ---------- sign-in screens: store registers and the administrator have separate entrances ---------- */
let loginCode="", loginTenant=null, loginSel="", loginPin="", loginBusy=false, loginAutoTried=false;
let deviceMode=""; try{ deviceMode=localStorage.getItem("ht_mode")||""; loginCode=localStorage.getItem("ht_last_code")||""; }catch(e){}
let publicSignin=false;
function applyRouteHash(){ try{ const h=(location.hash||"").replace(/^#/,""); if(h==="admin"){ deviceMode="admin"; } else if(h==="signin"){ deviceMode="store"; publicSignin=true; } else if(h.startsWith("store/")){ deviceMode="store"; const code=decodeURIComponent(h.slice(6)).toUpperCase().replace(/[^A-Z0-9-]/g,""); if(code){ loginCode=code; localStorage.setItem("ht_last_code",code); /* a direct store link always wins over whatever this device had before */ try{ sessionStorage.removeItem("ht_session"); localStorage.removeItem("ht_tenant"); localStorage.removeItem("ht_tenant_id"); }catch(e){} session=null; loginTenant=null; loginAutoTried=false; } } if(h) localStorage.setItem("ht_mode",deviceMode); }catch(e){} }
applyRouteHash();
/* the link may be tapped while the app is already open in this tab (a PWA or a pinned tab): re-apply and reload */
window.addEventListener("hashchange",()=>{ const h=(location.hash||"").replace(/^#/,""); if(h==="admin"||h==="signin"||h.startsWith("store/")){ location.reload(); } });
if(!deviceMode) deviceMode="store";
function setMode(m){ deviceMode=m; try{ localStorage.setItem("ht_mode",m); }catch(e){} loginSel=""; loginPin=""; if(m==="admin"){ loginTenant=null; tenantId=""; COLLS.forEach(c=>S[c]=[]); } renderLogin(); }
const loginTab=()=>deviceMode==="admin"?"admin":"dealer";
const pinPad=(who)=>`<div class="pindots">${Array.from({length:Math.max(4,String(who?.pin||"").length)}).map((_,i)=>`<i class="${loginPin.length>i?"on":""}"></i>`).join("")}</div><div class="pinpad">${[1,2,3,4,5,6,7,8,9,"⌫",0,"OK"].map(k=>`<button onclick="pinKey('${k}')">${k}</button>`).join("")}</div><p class="muted" style="text-align:center">${who?.pin?"Enter your PIN":"No PIN set — tap OK"}</p>`;
function renderLoginWrapped(){ renderLoginInner(); try{ if(typeof translateDOM==="function") translateDOM(document.getElementById("root")); }catch(e){} }
function renderLogin(){ if(window._signPageActive) return; return renderLoginWrapped(); }
function renderLoginInner(){
  const root=document.getElementById("root"); const keep={}; ["su_soft","su_name","su_pin","lg_code"].forEach(id=>{const e=document.getElementById(id); if(e&&e.value) keep[id]=e.value;});
  if(platform.config&&/^Hearth & Timber|^MyCoreRetail$/i.test(platform.config.softwareName||"")){ platform.config.softwareName="HomeStore POS"; savePlatformLocal(); }
  const brand=platform.config?.softwareName||"HomeStore POS";
  const hostedDb=!!((window.claude&&window.claude.use)||(typeof hsConfig==="function"&&hsConfig().firebase));
  if(deviceMode==="admin"&&platformLoaded&&typeof adminNeedsAccount==="function"&&adminNeedsAccount()){ root.innerHTML=adminAccountForm(brand); return; }
  if(!platform.config&&hostedDb&&!forceSetup){
    if(!platformLoaded){ if(!window._connTimer) window._connTimer=setTimeout(()=>{ window._connTimer=null; if(!platformLoaded){ platformLoaded=true; if(!platform.config&&deviceMode==="admin") forceSetup=true; renderLogin(); } },12000); root.innerHTML=`<div class="login"><div class="box" style="text-align:center"><div style="padding:0 0 8px">${loginLogoHTML(48)||`<div class="brand" style="color:var(--ink);justify-content:center"><div>${esc(brand)}</div></div>`}</div><p class="muted">Connecting to your store…</p><p class="muted"><span class="syncpill"></span></p><p class="muted small" style="margin-top:14px">Taking long? <a href="#" onclick="platformLoaded=true;if(!platform.config&&deviceMode==='admin')forceSetup=true;renderLogin();return false">continue</a></p></div></div>`; syncStatus(); return; }
    if(deviceMode==="admin"&&!platformFailed){ forceSetup=true; return renderLogin(); }
    if(platformFailed){ root.innerHTML=`<div class="login"><div class="box"><h2>Can't reach the store data</h2><p class="muted">${esc(loadWarning||"The shared store didn't answer.")} Check the connection and reload. If this device belongs to a dealer, nothing needs to be set up here.</p><div class="row"><button class="btn p fx" onclick="location.reload()">Reload</button></div>${deviceMode==="admin"?`<div class="foot" style="margin-top:14px"><a href="#" onclick="forceSetup=true;renderLogin();return false">This is a brand-new installation — set up the software owner</a></div>`:""}</div></div>`; return; }
  }
  if(!platform.config&&deviceMode!=="admin"&&!forceSetup){ platform.tenants=platform.tenants||[]; }
  else if(!platform.config){ root.innerHTML=`<div class="login admin"><div class="box">${loginLogoHTML(56)}<div style="height:10px"></div><span class="adminbadge">SOFTWARE OWNER SETUP</span><h1 style="margin-bottom:4px">Create your administrator login</h1><p class="muted">One-time setup. This account owns the software and assigns dealers. Each dealer then gets its own store code, staff and data.</p>
    <div class="field"><label class="f">Software name (shown to dealers)</label><input type="text" id="su_soft" value="${esc(brand)}"></div><div class="field"><label class="f">Your name</label><input type="text" id="su_name" placeholder="e.g. Jordan"></div><div class="field"><label class="f">Administrator PIN (4–8 digits)</label><input type="password" id="su_pin" inputmode="numeric" maxlength="8" placeholder="e.g. 2468"></div>
    <div class="msg" id="su_msg"></div><button class="btn p w" id="su_go" onclick="setupPlatform()">Create administrator</button><p class="muted" style="margin-top:12px"><span class="syncpill"></span></p></div></div>`; for(const id in keep){ const e=document.getElementById(id); if(e) e.value=keep[id]; } syncStatus(); return; }
  if(deviceMode==="admin"&&typeof adminNeedsAccount==="function"&&adminNeedsAccount()){ root.innerHTML=adminAccountForm(brand); return; }
  if(deviceMode==="admin"){ const admins=platform.config.admins||[]; if(!loginSel&&admins.length===1) loginSel=admins[0].id; root.innerHTML=`<div class="login admin"><div class="box">${loginLogoHTML(56)}<div style="height:10px"></div><span class="adminbadge">ADMINISTRATION</span><div class="muted small" style="margin:6px 0 10px">Software owner console</div>
    <div class="staffgrid">${admins.map(a=>`<button class="${loginSel===a.id?"on":""}" onclick="loginSel='${a.id}';loginPin='';renderLogin()"><span class="avatar">${esc(a.name[0])}</span>${esc(a.name)}<span class="muted small">Administrator</span></button>`).join("")}</div>${loginSel?pinPad(admins.find(a=>a.id===loginSel)):`<p class="muted" style="text-align:center">Tap your name</p>`}<p class="muted" style="margin-top:8px;text-align:center"><span class="syncpill"></span></p></div><div class="foot">This device is set up as the administrator's console · <a href="#" onclick="setMode('store');return false">switch to a store register</a></div></div>`; syncStatus(); return; }
  // store register
  const t=loginTenant; applyPalette(t?currentPalette():PALETTES[0]);
  if(!t&&loginCode&&!loginBusy&&!loginAutoTried){ loginAutoTried=true; setTimeout(()=>openStore(true),0); }
  let body="";
  if(!t){ body=`<div class="field"><label class="f">Store code</label><div class="row"><input type="text" id="lg_code" value="${esc(loginCode)}" placeholder="e.g. NFM01" style="text-transform:uppercase" maxlength="12" autocomplete="off" onkeydown="if(event.key==='Enter')openStore()" autocapitalize="characters"><button class="btn p fx" id="lg_go" onclick="openStore()" ${loginBusy?"disabled":""}>${loginBusy?"Loading…":"Continue"}</button></div></div><div class="msg" id="lg_msg"></div><p class="muted small">Enter the store code your software provider gave you. This device will remember your store.</p>`; }
  else { const staff=S.staff.filter(s=>s.active!==false); if(!loginSel&&staff.length===1) loginSel=staff[0].id; const st=S.settings.find(x=>x.id==="store"); body=`${st?.logo&&st.logoOnLogin!==false?`<img src="${st.logo}" style="height:48px;max-width:220px;object-fit:contain;display:block;margin:0 auto 8px">`:""}<div class="row" style="margin-bottom:6px"><div><b>${esc(t.name)}</b> <span class="muted">· ${esc(t.code)}</span></div><span class="fx"><button class="btn s" onclick="loginTenant=null;loginCode='';loginSel='';loginPin='';tenantId='';loginAutoTried=true;try{localStorage.removeItem('ht_last_code')}catch(e){};renderLogin()">Change store</button></span></div>
    <div class="staffgrid">${staff.map(s=>`<button class="${loginSel===s.id?"on":""}" onclick="loginSel='${s.id}';loginPin='';renderLogin()"><span class="avatar">${esc(s.name[0])}</span>${esc(s.name)}<span class="muted small">${ROLES[s.role]||esc(s.role||"")}</span></button>`).join("")||`<p class="muted">No staff yet for this store — the administrator can add the first manager.</p>`}</div>${loginSel?pinPad(byId("staff",loginSel)):`<p class="muted" style="text-align:center">Tap your name to sign in</p>`}`; }
  root.innerHTML=`<div class="login"><div class="box">${t?`<div class="brand" style="color:var(--ink);padding:0 0 8px">${brandMark(t.name)}<div>${esc(t.name)}<small style="opacity:.7">Store register · ${esc(brand)}</small></div></div>`:`<div style="text-align:center;padding:0 0 12px">${loginLogoHTML(52)||`<div class="brand" style="color:var(--ink);justify-content:center"><div>${esc(brand)}</div></div>`}<div class="muted small" style="margin-top:6px">Store register sign-in</div></div>`}${body}<p class="muted" style="margin-top:12px;text-align:center"><span class="syncpill"></span></p></div><div class="foot"><div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;opacity:.85">${loginLogoHTML(34)||`<span class="small">Powered by <b>${esc(brand)}</b>${platform.config&&platform.config.tagline!==""?" · "+esc(platform.config&&platform.config.tagline||"Sell more. Run smarter."):""}</span>`}</div></div></div>`;
  for(const id in keep){ const e=document.getElementById(id); if(e) e.value=keep[id]; } syncStatus();
}
async function openStore(auto){
  const code=(auto?loginCode:fv("lg_code")).trim().toUpperCase(); const say=t=>{ const msg=document.getElementById("lg_msg"); if(msg) msg.textContent=t; if(!auto) toast(t,true); };
  if(!code) return say("Enter your store code.");
  { const wait=codeLockRemaining(); if(wait) return say(`Too many attempts. Try again in ${wait} second${wait===1?"":"s"}.`); }
  loginBusy=true; renderLogin(); const t=await lookupStoreCode(code); loginBusy=false; if(!t){ codeAttemptFailed(); renderLogin(); return say("No store found with that code."); } codeAttemptOk(); try{ localStorage.setItem("ht_last_code",code); localStorage.setItem("ht_mode","store"); }catch(e){} deviceMode="store"; loginCode=code;
  if(t.status!=="active") return say("This store's access is "+t.status+". Contact the software administrator.");
  if(t.expires&&t.expires<todayISO()) return say("This store's subscription expired on "+dateFmt(t.expires)+". Contact the software administrator.");
  loginBusy=true; loginCode=code; renderLogin();
  loadTenantLocal(t.id); await loadTenantShared(t.id);
  loginBusy=false; loginTenant=t; loginSel=""; loginPin=""; renderLogin();
}
/* keyboard on the sign-in screens: digits type the PIN, Backspace erases, Enter confirms; number keys also pick a store-code field when it has focus */
document.addEventListener("keydown",function(e){ try{ if(session) return; const t=e.target; const tag=t&&t.tagName; if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||(t&&t.isContentEditable)) return; if(document.querySelector("#modal-root .modal")) return; if(!document.querySelector(".pinpad")) return; if(!loginSel) return; if(e.key>="0"&&e.key<="9"&&e.key.length===1){ e.preventDefault(); pinKey(e.key); } else if(e.key==="Backspace"){ e.preventDefault(); pinKey("⌫"); } else if(e.key==="Enter"){ e.preventDefault(); pinKey("OK"); } else if(e.key==="Escape"){ loginPin=""; renderLogin(); } }catch(x){} });
function pinKey(k){ const who=loginTab()==="admin"?(platform.config.admins||[]).find(a=>a.id===loginSel):byId("staff",loginSel); if(!who) return;
  if(k==="⌫"){ loginPin=loginPin.slice(0,-1); renderLogin(); return; }
  if(k!=="OK") loginPin+=k;
  const expected=String(who.pin||"");
  if(k==="OK"||(expected&&loginPin.length>=expected.length)){ if(!expected||loginPin===expected){ loginPin=""; if(loginTab()==="admin") loginAdmin(who.id); else login(who.id); } else { loginPin=""; toast("Wrong PIN",true); renderLogin(); } return; }
  renderLogin(); }
async function setupPlatform(){
  const msg=document.getElementById("su_msg"), btn=document.getElementById("su_go"); const say=(t,ok)=>{ if(msg){ msg.textContent=t; msg.className="msg"+(ok?" ok":""); } if(!ok) toast(t,true); };
  const name=fv("su_name").trim(); if(!name) return say("Enter your name.");
  const pin=fv("su_pin").trim(); if(!/^\d{4,8}$/.test(pin)) return say("The administrator PIN must be 4 to 8 digits.");
  if(btn){ btn.disabled=true; btn.textContent="Creating…"; } say("Creating…",true);
  try{ const cfg={id:"config",softwareName:fv("su_soft").trim()||"HomeStore POS",admins:[{id:uid(),name,pin,created:todayISO()}],created:todayISO()}; savePlatformConfig(cfg); deviceMode="admin"; try{ localStorage.setItem("ht_mode","admin"); }catch(e){} loginAdmin(cfg.admins[0].id); }
  catch(e){ console.error(e); say("Something went wrong: "+(e.message||e)); if(btn){ btn.disabled=false; btn.textContent="Create administrator"; } }
}

/* ---------- router ---------- */
const VIEWS={dashboard:"Home",pos:"New sale",catalog:"Catalog",orders:"To fulfill",invoices:"Invoices",warehouse:"Warehouse",customers:"Customers",deliveries:"Deliveries",crew:"Crew",stock:"Inventory",purchasing:"Purchase orders",service:"Service",reports:"Reports",settings:"Settings",admin:"Administration"};
const SECTIONS=[["Sell",["dashboard","pos","catalog","orders","invoices","customers"]],["Operate",["deliveries","crew","warehouse","stock","purchasing","service"]],["Manage",["reports","settings"]]];
// older names used across the app map onto the new sections and tabs
const VIEW_ALIAS={inventory:["stock","items"],purchasing:["stock","po"],vendors:["stock","vendors"],tags:["stock","tags"],commissions:["reports","commissions"]};
const ICONS={purchasing:'<path d="M3 6h18l-2 9H5z"/><path d="M5 15l-1 4h16"/><circle cx="9" cy="21" r="1"/><circle cx="17" cy="21" r="1"/>',warehouse:'<path d="M3 9l9-5 9 5v11H3z"/><path d="M8 20v-6h8v6M8 14h8"/>',orders:'<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',catalog:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',stock:'<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',dashboard:'<path d="M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',pos:'<path d="M4 4h16v6H4z"/><path d="M4 14h10v6H4zM16 14h4v6h-4z"/>',invoices:'<path d="M6 2h9l5 5v15H6z"/><path d="M9 12h8M9 16h8"/>',inventory:'<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',vendors:'<path d="M3 21V8l4-4h10l4 4v13z"/><path d="M3 8h18M9 21v-8h6v8"/>',tags:'<path d="M20 13L11 22 2 13V4h9z"/><circle cx="6.5" cy="8.5" r="1.5"/>',customers:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M17 11a4 4 0 0 0 0-8M22 21a7 7 0 0 0-5-6.7"/>',deliveries:'<path d="M1 7h13v10H1zM14 10h5l4 4v3h-9z"/><circle cx="5" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',reports:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',commissions:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',service:'<path d="M14 6a4 4 0 0 1 5.7 5.7L9.4 22 2 22l0-7.4L12.3 4.3A4 4 0 0 1 14 6z"/><path d="M15 9l-1-1"/>',purchasing:'<path d="M3 3h2l2 12h11l2-8H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',crew:'<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>',admin:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h3M8 16h6"/>'};
const ico=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]||""}</svg>`;
function initials(n){ return String(n||"").replace(/[^A-Za-z0-9 ]/g,"").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()||"S"; }
function isDarkUI(){ try{ const t=document.documentElement.dataset.theme; if(t==="dark") return true; if(t==="light") return false; return !!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches); }catch(e){ return false; } }
function softwareLogo(dark){ const c=platform&&platform.config&&platform.config.softwareLogo; if(c) return c; if(typeof BRAND_LOGO_DARK==="undefined") return ""; return dark?BRAND_LOGO_DARK:BRAND_LOGO_LIGHT; }
function loginLogoHTML(h){ const src=softwareLogo(isDarkUI()); if(!src) return ""; return `<img src="${src}" alt="HomeStore POS" style="display:block;height:${h||52}px;max-width:100%;width:auto;object-fit:contain;margin:0 auto">`; }
function brandMark(name,admin){ const st=tenantId?S.settings.find(x=>x.id==="store"):null; if(admin&&softwareLogo(true)) return `<img src="${softwareLogo(true)}" alt="${esc(name)}" style="display:block;width:100%;max-width:190px;height:auto;background:transparent;padding:0;margin:2px 0 2px">`; if(!admin&&st&&st.logo){ const tr=st.logoBg==="transparent"; if((st.logoStyle||"wide")==="wide") return `<img class="brandlogo" src="${st.logo}" alt="${esc(name)}"${tr?' style="background:transparent;padding:0;border-radius:0;max-height:52px"':""}>`; return `<div class="logo"${tr?' style="background:transparent"':""}><img src="${st.logo}" alt=""></div>`; } return `<div class="logo ${admin?"admin":""}">${esc(initials(name))}</div>`; }
function userMenu(){ const who=me(); const t=currentTenant(); modal(`<h2>${esc(who.name)}</h2><p class="muted">${session.kind==="admin"?"Administrator":(ROLES[who.role]||who.role)}${t?" · "+esc(t.name)+" ("+esc(t.code)+")":""}${session.support?" · support session":""}<br><span class="syncpill"></span>${loadWarning?`<div class="small" style="margin-top:4px">${esc(loadWarning)}</div>`:""}</p><div class="grid g2" style="gap:8px">${session.kind==="staff"&&feat("timeclock")&&!session.support?`<button class="btn ${clockStatus()?"p":""}" onclick="closeModal();clockToggle()">${clockStatus()?"Clock out":"Clock in"}</button>`:""}${session.support?`<button class="btn" onclick="closeModal();backToAdmin()">Back to admin console</button>`:""}<button class="btn" onclick="closeModal();logout()">${session.kind==="admin"?"Lock console":"Lock register / switch user"}</button><button class="btn" onclick="closeModal();toggleTheme()">Toggle dark mode</button>${session.kind==="staff"&&!session.support&&!trainingMode&&has("pos")?`<button class="btn" style="border-color:#7A3E9D;color:#7A3E9D" onclick="closeModal();openTraining()">🎓 Training mode</button>`:""}${trainingMode?`<button class="btn" style="border-color:#7A3E9D;color:#7A3E9D" onclick="closeModal();exitTraining()">Exit training</button>`:""}<button class="btn" onclick="closeModal();toggleLang()">🌐 ${typeof langMenuLabel==="function"?langMenuLabel():"Language"}</button>${(wq.size||wqInflight)?`<button class="btn" onclick="confirmDo('Discard the changes waiting to sync from this device? Anything already in the shared store is unaffected.',()=>{ wq.clear(); try{ localStorage.removeItem('ht_wq'); }catch(e){} syncStatus(); closeModal(); toast('Waiting changes cleared'); })">Clear ${wq.size+wqInflight} stuck sync change${(wq.size+wqInflight)===1?"":"s"}</button>`:""}<button class="btn" onclick="closeModal();nameThisDevice()">Name this device${(()=>{try{const n=localStorage.getItem("ht_device_name");return n?" · "+esc(n):"";}catch(e){return ""}})()}</button></div><div class="muted small" style="margin-top:10px">Build ${typeof BUILD_VERSION!=="undefined"&&BUILD_VERSION.indexOf("__")!==0?esc(BUILD_VERSION):"preview"}${typeof deviceInfo==="function"?" · device "+esc(deviceInfo().id):""}</div><div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`); syncStatus(); }
function toggleTheme(){ const d=document.documentElement; d.dataset.theme=d.dataset.theme==='dark'?'light':'dark'; try{ localStorage.setItem('ht_theme',d.dataset.theme); }catch(e){} }
let view="dashboard";
let stockTab="items", reportsTab="analytics";
function go(v){ if(typeof showMargin!=="undefined"&&v!=="pos") showMargin=false; if(VIEW_ALIAS[v]){ const [nv,tab]=VIEW_ALIAS[v]; if(!can(v)) return toast("Your role can't open "+VIEWS[nv]); if(nv==="stock") stockTab=tab; else reportsTab=tab; v=nv; } else if(v!=="admin"&&!can(v)&&v!=="dashboard"){ return toast("Your role can't open "+VIEWS[v]); } view=v; render(); window.scrollTo(0,0); }
function dd(label,items,cls){ return `<details class="dd"><summary class="btn ${cls||""}">${label} ▾</summary><div class="dd-menu">${items.map(it=>it===null?"<hr>":`<button class="${it[2]||""}" onclick="this.closest('details').open=false;${it[1]}">${it[0]}</button>`).join("")}</div></details>`; }
document.addEventListener("click",e=>{ document.querySelectorAll("details.dd[open]").forEach(d=>{ if(!d.contains(e.target)) d.open=false; }); });
function fmtName(el){ const s=el.selectionStart; const v=el.value; const out=v.replace(/(^|[\s\-'])([a-z])/g,(m,a,b)=>a+b.toUpperCase()); if(out!==v){ el.value=out; try{ el.setSelectionRange(s,s); }catch(e){} } }
function fmtPhone(el){ const d=el.value.replace(/\D/g,"").replace(/^1(?=\d{10})/,"").slice(0,10); let out=d; if(d.length>6) out=d.slice(0,3)+"-"+d.slice(3,6)+"-"+d.slice(6); else if(d.length>3) out=d.slice(0,3)+"-"+d.slice(3); if(el.value!==out){ el.value=out; } }
function normPhone(v){ const d=String(v||"").replace(/\D/g,"").replace(/^1(?=\d{10})/,""); return d.length===10?d.slice(0,3)+"-"+d.slice(3,6)+"-"+d.slice(6):String(v||"").trim(); }
function normName(v){ return String(v||"").trim().replace(/(^|[\s\-'])([a-z])/g,(m,a,b)=>a+b.toUpperCase()); }
function keepFocus(){ const ae=document.activeElement; if(!ae||!ae.id||!["INPUT","TEXTAREA","SELECT"].includes(ae.tagName)) return null; let s=null,e=null; try{ s=ae.selectionStart; e=ae.selectionEnd; }catch(x){} return {id:ae.id,s,e}; }
function restoreFocus(k){ if(!k) return; const el=document.getElementById(k.id); if(!el||el===document.activeElement) return; try{ el.focus({preventScroll:true}); if(k.s!==null&&k.s!==undefined&&el.setSelectionRange&&/^(text|search|tel|url|password|email)$/.test(el.type||"text")) el.setSelectionRange(k.s,k.e===null||k.e===undefined?k.s:k.e); }catch(x){} }
function render(){ if(window._signPageActive) return; const _fk=keepFocus(); try{ renderInner(); } finally { try{ if(typeof translateDOM==="function") translateDOM(document.getElementById("root")); }catch(e){} restoreFocus(_fk); } }
function renderInner(){
  if(!session||!me()){ setSession(null); renderLogin(); return; }
  if(session.kind==="admin"){ renderAdminShell(); return; }
  const who=me(); const t=currentTenant(); const openDel=S.deliveries.filter(d=>d.kind!=="pickup"&&["unscheduled","awaiting","missed"].includes(d.status)).length+S.deliveries.filter(d=>d.kind==="pickup"&&d.status==="ready"&&!d.notified).length; const dueF=S.followups.filter(f=>f.status==="open"&&f.due<=todayISO()).length;
  const needPO=S.invoices.reduce((a,i)=>a+(i.status!=="void"?i.lines.filter(l=>l.special&&!l.poId).length:0),0)+S.products.filter(p=>!p.isKit&&(p.stock||0)<0).length;
  const remoteNew=S.invoices.filter(i=>i.signedRemote&&!i.remoteReviewed).length; const badge={deliveries:openDel,service:dueF,purchasing:needPO,invoices:remoteNew}; const badgeCls={invoices:"ok"};
  applyPalette(currentPalette());
  const wide=!!(storeSettings().logo&&(storeSettings().logoStyle||"wide")==="wide");
  const nav=`<div class="brand" style="${wide?"flex-direction:column;align-items:flex-start;gap:4px":""}">${brandMark(storeSettings().name)}<div ${wide?'style="font-size:12px;font-weight:600;opacity:.85"':""}>${wide?"":esc(storeSettings().name)}<small>${wide?esc(storeSettings().name)+" · ":""}${trainingMode?"🎓 Training":esc(t?"Store "+t.code:"")}${session.support?" · support":""}</small></div></div>`+
    SECTIONS.map(([sec,keys])=>{const ks=keys.filter(k=>(can(k)||k==="dashboard")&&(k!=="warehouse"||feat("warehouse"))); if(!ks.length) return ""; return `<div class="sec">${sec}</div>`+ks.map(k=>`<button class="${(view===k&&!(k==="stock"&&stockTab==="po"))||(k==="purchasing"&&view==="stock"&&stockTab==="po")?"on":""}" onclick="go('${k}')">${ico(k)}<span class="lbl">${VIEWS[k]}</span>${badge[k]?`<span class="tag ${badgeCls&&badgeCls[k]?badgeCls[k]:""}" title="${k==="invoices"?"signed remotely — review":""}">${badge[k]}</span>`:""}</button>`).join("")}).join("")+
    `<div class="spacer"></div><div class="usercard"><span class="avatar">${esc(who.name[0])}</span><div class="who"><b>${esc(who.name)}</b><span>${ROLES[who.role]||who.role}${feat("timeclock")&&clockStatus()?" · on the clock":""}</span></div><button title="Account" onclick="userMenu()">⋯</button></div><div class="status"><span class="syncpill"></span></div>`;
  const fn=({dashboard:renderDashboard,pos:renderPOS,catalog:renderCatalog,orders:renderOrders,invoices:renderInvoices,warehouse:renderWarehouse,customers:renderCustomers,service:renderService,stock:renderStock,deliveries:renderDeliveries,crew:renderCrew,reports:renderReportsHub,settings:renderSettings})[view]||renderDashboard;
  document.getElementById("root").innerHTML=`<div class="app${trainingMode?" training":""}"><div class="topbar-m"><button class="ham" onclick="document.body.classList.toggle('nav-open')" aria-label="Menu">☰</button><div class="ttl">${esc(VIEWS[view]||"")}<span class="sub">${esc(storeSettings().name)}</span></div></div><div class="nav-scrim" onclick="document.body.classList.remove('nav-open')"></div><nav onclick="if(event.target.closest('button')&&!event.target.closest('.usercard')) document.body.classList.remove('nav-open')">${nav}</nav><main>${typeof trainingBanner==="function"?trainingBanner():""}<div class="content">${fn()}</div></main></div>`;
  syncStatus();
  if(view==="deliveries") drawMaps();
  if(view==="pos") afterPOS();
}
