/* ============================================================
   OFFLINE — persistent write queue, reconnect, banner
   ============================================================ */
let _offlineTimer=null;
function persistQueue(){ try{ localStorage.setItem("ht_wq",JSON.stringify([...wq.values()])); }catch(e){} }
function restoreQueue(){ try{ const raw=localStorage.getItem("ht_wq"); if(!raw) return 0; const jobs=JSON.parse(raw); let n=0; for(const j of jobs){ if(j&&j.collPath&&j.id){ wq.set(j.collPath+"/"+j.id,j); n++; } } return n; }catch(e){ return 0; } }
function goOffline(){ if(!offlineFlag){ offlineFlag=true; offlineSince=Date.now(); } syncStatus(); offlineBanner(); if(!_offlineTimer) _offlineTimer=setInterval(()=>{ if(navigator.onLine!==false) tryReconnect(); },30000); }
function tryReconnect(){ if(!db) return; offlineFlag=false; syncStatus(); offlineBanner(); pumpQueue(); }
function offlineBanner(){ let b=document.getElementById("offline-banner"); const pending=wq.size+wqInflight; const show=(offlineFlag||navigator.onLine===false)&&db; if(!show){ if(b) b.remove(); return; } if(!b){ b=document.createElement("div"); b.id="offline-banner"; b.style.cssText="position:fixed;top:0;left:0;right:0;z-index:2500;background:#B9564A;color:#fff;padding:8px 14px;font-size:13px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.2)"; document.body.appendChild(b); } b.innerHTML=`<b>Offline</b> — keep working; ${pending?pending+" change"+(pending===1?"":"s")+" will sync":"changes will sync"} when the connection is back. <a href="#" style="color:#fff;text-decoration:underline" onclick="tryReconnect();return false">Retry now</a>`; }
window.addEventListener("online",()=>{ setTimeout(tryReconnect,500); });
window.addEventListener("offline",()=>{ goOffline(); });
