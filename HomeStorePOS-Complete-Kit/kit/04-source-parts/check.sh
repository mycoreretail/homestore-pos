node -e "const fs=require('fs');const h=fs.readFileSync('/mnt/user-data/outputs/furniture-pos.html','utf8');const js=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));try{new Function(js);console.log('syntax ok')}catch(e){console.log('ERR',e.message)}
const defined=new Set([...js.matchAll(/(?:^|\n)(?:async )?function ([A-Za-z_\$][\w\$]*)/g)].map(m=>m[1]).concat([...js.matchAll(/(?:const|let) ([A-Za-z_\$][\w\$]*)=/g)].map(m=>m[1])));
const handlers=[...js.matchAll(/on(?:click|change|input|keydown|mousedown|dblclick)=\"([^\"]*)\"/g)].map(m=>m[1]);
const called=new Set();handlers.forEach(h=>{for(const m of h.matchAll(/(?<![\.\w])([A-Za-z_\$][\w\$]*)\(/g))called.add(m[1])});
const builtin=new Set(['if','for','while','confirm','alert','Object','JSON','String','Number','Math','Array','encodeURIComponent','parseFloat','Date','function','async','await','catch','switch','return','prompt','Set']);
console.log('undefined in handlers:',[...called].filter(c=>!defined.has(c)&&!builtin.has(c)));"
