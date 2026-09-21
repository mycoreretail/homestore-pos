const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync('/mnt/user-data/outputs/furniture-pos.html','utf8'); const js=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));
const els={}; const mkEl=id=>({id,innerHTML:"",value:"",checked:false,dataset:{},style:{},classList:{toggle(){},add(){},remove(){}},querySelector:()=>null,querySelectorAll:()=>[],focus(){},setAttribute(){},remove(){},appendChild(){}});
const store={"ht_pos_v2":JSON.stringify({settings:[{id:"store",name:"Old Store",taxRate:7,barcodePrefix:"OS"}],staff:[{id:"s1",name:"Marisol",commType:"sales",rate:5}],products:[{id:"p1",sku:"OS-1",name:"Sofa",cost:100,price:300,stock:2}],invoices:[{id:"i1",number:"INV-1001",date:"2026-09-01",customerId:"",salesId:"s1",lines:[{productId:"p1",sku:"OS-1",name:"Sofa",qty:1,price:300,cost:100}],groups:[],payments:[{method:"Card",amount:324.75,date:"2026-09-01"}],status:"paid"}]})};
const mkStorage=()=>({getItem(k){return store[k]??null},setItem(k,v){store[k]=String(v)},removeItem(k){delete store[k]}});
Object.assign(global,{document:{getElementById:id=>{if(!els[id])els[id]=mkEl(id);return els[id]},querySelector:()=>null,querySelectorAll:()=>[],createElement:t=>mkEl(t),body:{appendChild(){}},addEventListener(){},activeElement:{tagName:"BODY"},documentElement:{dataset:{}}},window:{innerWidth:1200,scrollTo(){},print(){},addEventListener(){}},localStorage:mkStorage(),sessionStorage:mkStorage(),confirm:()=>true,requestAnimationFrame:()=>0,cancelAnimationFrame(){}});
vm.runInThisContext(js); const g=n=>vm.runInThisContext(n);
(async()=>{ await new Promise(r=>setTimeout(r,80)); const S=g('S');
  const root=document.getElementById("root"); const wizard=root.innerHTML.includes("Create your manager login"); console.log("wizard shown for legacy data:",wizard);
  console.log("settings defaults filled:",g('storeSettings')().trialNights===100&&g('storeSettings')().skuPrefix==="OS");
  console.log("legacy lineIds:",S.invoices[0].lines[0].lineId?true:false);
  document.getElementById("su_name").value="Jordan"; document.getElementById("su_pin").value="1234"; document.getElementById("su_store").value="Old Store";
  await g('setupStore')(); console.log("roles:",S.staff.map(s=>s.name+":"+s.role).join(","), "products kept:",S.products.length===1, "logged in:",!!g('session'));
  for(const v of Object.keys(g('VIEWS'))){ try{ vm.runInThisContext(`view=${JSON.stringify(v)}`); g('render')(); }catch(e){ console.log("RENDER FAIL",v,e.message); } }
  console.log("legacy test done");
  /*FINAL_EXIT*/ setTimeout(()=>process.exit(0),50);
})();
