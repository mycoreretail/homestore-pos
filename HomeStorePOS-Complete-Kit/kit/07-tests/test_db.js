// simulate the shared store: slow writes, consent delay, intermittent rate limiting
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync('/mnt/user-data/outputs/furniture-pos.html','utf8'); const js=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));
const els={}; const mkEl=id=>({id,innerHTML:"",value:"",checked:false,dataset:{},style:{},disabled:false,textContent:"",className:"",classList:{toggle(){},add(){},remove(){}},querySelector:()=>null,querySelectorAll:()=>[],focus(){},setAttribute(){},remove(){},appendChild(){}});
const store={}; const mkStorage=()=>({getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)},removeItem(k){delete store[k]}});
const deepFreeze=o=>{if(o&&typeof o==='object'){Object.freeze(o);Object.values(o).forEach(deepFreeze)}return o};
const remote={}; let writes=0, rateHits=0, inflightMax=0, inflight=0;
const segs=p=>p.split("/").length;
const mkDoc=(path)=>({id:path.split("/").pop(),get:async()=>{await new Promise(r=>setTimeout(r,60)); const v=remote[path]; return v?{id:path.split("/").pop(),exists:true,data:()=>deepFreeze(JSON.parse(JSON.stringify(v)))}:{id:path.split("/").pop(),exists:false,data:()=>undefined}},set:async d=>{inflight++;inflightMax=Math.max(inflightMax,inflight);await new Promise(r=>setTimeout(r,60));inflight--; if(Math.random()<0.25){rateHits++;throw {code:"resource_exhausted",message:"rate"}} remote[path]=d;writes++;},delete:async()=>{delete remote[path]}});
const fakeDb={doc:p=>{ if(segs(p)%2!==0) throw new TypeError("bad doc path "+p); return mkDoc(p); },collection:c=>{ if(segs(c)%2!==1) throw new TypeError("bad collection path "+c); return {get:async()=>{await new Promise(r=>setTimeout(r,120)); return {docs:Object.entries(remote).filter(([k])=>k.startsWith(c+"/")&&segs(k)===segs(c)+1).map(([k,v])=>({id:k.split("/").pop(),exists:true,data:()=>deepFreeze(JSON.parse(JSON.stringify(v)))}))}},doc:id=>mkDoc(c+"/"+id)}; }};
Object.assign(global,{document:{getElementById:id=>{if(!els[id])els[id]=mkEl(id);return els[id]},querySelector:()=>null,querySelectorAll:()=>[],createElement:t=>mkEl(t),body:{appendChild(){}},addEventListener(){},activeElement:{tagName:"BODY"},documentElement:{dataset:{}}},window:{innerWidth:1200,scrollTo(){},print(){},addEventListener(){},claude:{use:async n=>{await new Promise(r=>setTimeout(r,300)); return n==="db"?fakeDb:null}}},localStorage:mkStorage(),sessionStorage:mkStorage(),confirm:()=>true,requestAnimationFrame:()=>0,cancelAnimationFrame(){}});
global.claude=global.window.claude;
vm.runInThisContext(js); const g=n=>vm.runInThisContext(n);
(async()=>{ for(let i=0;i<100&&g('persistMode')!=='shared'&&!g('loadWarning');i++) await new Promise(r=>setTimeout(r,100)); console.log("mode after connect:",g('persistMode'),g('loadWarning'));
  document.getElementById("su_name").value="Owner"; document.getElementById("su_pin").value="1234"; document.getElementById("su_soft").value="My POS";
  const t0=Date.now(); await g('setupPlatform')(); console.log("setup ms:",Date.now()-t0,"admin:",g('session')&&g('session').kind==="admin");
  g('editDealer')(); const se=(id,v,c)=>{const e=document.getElementById(id); if(v!==undefined)e.value=v; if(c!==undefined)e.checked=c;}; se('td_name','Dealer One'); se('td_code','DO01'); se('td_plan','Pro'); se('td_status','active'); se('td_exp',''); se('td_contact',''); se('td_email',''); se('td_phone',''); se('td_addr','1 St'); se('td_tax','8'); se('td_mname','Sam'); se('td_mpin','4321'); se('td_sample',undefined,true); se('td_notes','');
  const t1=Date.now(); await g('saveDealer')(''); console.log("dealer with sample created in ms:",Date.now()-t1);
  await g('openDealer')(g('platform').tenants[0].id); console.log("opened dealer: products",g('S').products.length);
  let waited=0; while((g('wq').size||g('wqInflight'))&&waited<60000){ await new Promise(r=>setTimeout(r,200)); waited+=200; }
  const total=Object.values(g('S')).filter(Array.isArray).reduce((a,c)=>a+c.length,0)+3; /* +config +tenant +tenantCodes index */ console.log("queue drained in ms:",waited,"remote docs:",Object.keys(remote).length,"local docs:",total,"rate hits handled:",rateHits,"max concurrent:",inflightMax);
  console.log(Object.keys(remote).length===total?"DB SYNC OK":"DB SYNC MISMATCH");
  /*FINAL_EXIT*/ setTimeout(()=>process.exit(0),50);
})();
