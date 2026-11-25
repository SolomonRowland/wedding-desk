// Big plans, damaged saves, odd screen sizes.
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const errs=[];
const page=async(vp)=>{const p=await b.newPage({viewport:vp});p.on('pageerror',e=>errs.push(JSON.stringify(vp)+' '+e.message.slice(0,200)));await p.route('**/xlsx.full.min.js',r=>r.fulfill({path:__dirname+'/../lib/xlsx.full.min.js'}));return p};
const URL0='file://'+__dirname+'/../build/preview.html';
// 1. huge plan
let p=await page({width:390,height:844});await p.goto(URL0);await p.waitForTimeout(400);
const t=await p.evaluate(async()=>{S=freshState();S.seenWelcome=true;const g=S.people;for(let i=0;i<600;i++)S.people.push({...g[i%g.length],Name:'Guest '+i,Table:String(1+i%40)});for(let i=0;i<400;i++)S.tasks.push({...S.tasks[i%S.tasks.length],Task:'Task '+i});for(let i=0;i<200;i++)S.payments.push({...S.payments[i%S.payments.length]});save();
  const out={};for(const [tab,sub] of [['home'],['plan','tasks'],['guests','list'],['guests','seating'],['money','payments'],['vendors','vendors']]){const t0=performance.now();go(tab,sub);out[tab+'/'+(sub||'')]=Math.round(performance.now()-t0)}
  let t0=performance.now();searchSheet();const inp=document.querySelector('.sheet input');inp.value='Guest 5';inp.dispatchEvent(new Event('input',{bubbles:true}));out.search=Math.round(performance.now()-t0);closeSheet();
  t0=performance.now();save();out.save=Math.round(performance.now()-t0);out.bytes=localStorage.getItem(KEY).length;return out});
console.log('big plan ms',JSON.stringify(t));
// excel round trip on big plan
const xr=await p.evaluate(async()=>{try{const wb=typeof buildWorkbook==='function'?await buildWorkbook():null;return wb?'built':'no buildWorkbook fn'}catch(e){return 'ERR '+e.message}});console.log('excel',xr);
await p.close();
// 2. damaged saves
for(const bad of ['{not json','null','{}','{"details":null,"tasks":"x"}','{"tasks":[null,1,"a"],"people":[{}],"details":{}}','[]']){p=await page({width:390,height:844});await p.goto(URL0);await p.evaluate(v=>localStorage.setItem('wedding-desk-app-v2',v),bad);await p.reload();await p.waitForTimeout(400);
  const r=await p.evaluate(async()=>{const o=[];for(const [t,s] of [['home'],['plan','tasks'],['plan','questions'],['guests','list'],['guests','seating'],['money','budget'],['money','payments'],['vendors','vendors']]){try{go(t,s)}catch(e){o.push(t+': '+e.message)}}try{settingsSheet();closeSheet();taskForm();closeSheet()}catch(e){o.push('sheet: '+e.message)}return o.concat([document.querySelectorAll('.tabs .tab').length+' tabs'])}).catch(e=>['eval '+e.message]);
  console.log('damaged',JSON.stringify(bad).slice(0,40),'->',r.join(' | '));await p.close();}
// 3. screen sizes
for(const vp of [{width:320,height:568},{width:375,height:667},{width:430,height:932},{width:768,height:1024},{width:1024,height:768},{width:844,height:390}]){p=await page(vp);await p.goto(URL0);await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.evaluate(()=>{S.seenWelcome=true;render()});
  const r=await p.evaluate(async()=>{const o=[];for(const [t,s] of [['home'],['plan','tasks'],['plan','dayof'],['plan','questions'],['plan','lists'],['guests','list'],['guests','seating'],['guests','stay'],['money','budget'],['money','payments'],['vendors','vendors'],['vendors','places'],['vendors','rentals']]){go(t,s);await new Promise(r=>setTimeout(r,30));if(document.documentElement.scrollWidth>innerWidth+1)o.push(t+'/'+s+' hscroll');const over=[...document.querySelectorAll('#view *, #top *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)&&getComputedStyle(e).position!=='fixed'&&!e.closest('.seg,.opts,.chips,[style*="overflow"]')}).slice(0,2).map(e=>e.className||e.tagName);if(over.length)o.push(t+'/'+s+' overflow '+over.join(','))}
    for(const f of ['settingsSheet()','taskForm(0)','guestSheet(0)','vendorSheet(0)','helpSheet()']){closeSheet();eval(f);await new Promise(r=>setTimeout(r,30));const sh=document.querySelector('#layer .sheet');if(sh.scrollWidth>sh.clientWidth+1)o.push(f+' sheet hscroll')}return o});
  await p.screenshot({path:__dirname+`/../build/vp-${vp.width}x${vp.height}.png`});console.log('viewport',vp.width+'x'+vp.height,r.length?r.join(' | '):'ok');await p.close();}
console.log('errs',errs);await b.close()})();
