// Clicks every clickable thing on every view, and every button inside each sheet it opens (2 levels), from a clean state each time.
const {chromium}=require('playwright');
const MODE=process.argv[2]||'example', W=+process.argv[3]||390, ONLY=process.argv[4]||'';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:W,height:844},acceptDownloads:true});const p=await ctx.newPage();
const errs=new Map();const add=(k,v)=>{if(!errs.has(k)){errs.set(k,v);console.log("LIVE",k,"  @",v)}};let cur='';
p.on('pageerror',e=>add(e.message.slice(0,160),cur));p.on('console',m=>m.type()==='error'&&!/net::|Failed to load|ERR_/.test(m.text())&&add('console: '+m.text().slice(0,160),cur));
p.on('dialog',d=>{add('native dialog: '+d.message().slice(0,80),cur);d.dismiss()});
await p.route('**/xlsx.full.min.js',r=>r.fulfill({path:__dirname+'/../lib/xlsx.full.min.js'}));await p.route('**/jspdf.umd.min.js',r=>r.fulfill({path:__dirname+'/../lib/jspdf.umd.min.js'}));
const URL0='file://'+__dirname+'/../build/preview.html';
await p.addInitScript(()=>{window.open=()=>null;window.print=()=>{};navigator.share=async()=>{};try{navigator.clipboard.writeText=async()=>{}}catch(e){}
  const _a=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download||/^(tel|sms|mailto|https?):/.test(this.href))return;return _a.call(this)};});
await p.goto(URL0);await p.waitForTimeout(600);
await p.evaluate(m=>{localStorage.clear();S=freshState();S.seenWelcome=true;if(m==='empty'){startFresh();}save();render()},MODE);
const snap=await p.evaluate(()=>localStorage.getItem(KEY));
let views=[['home',null,null],['plan','plan','tasks'],['plan','plan','dayof'],['plan','plan','questions'],['plan','planList','photos'],['plan','planList','music'],['plan','planList','packing'],['plan','planList','risks'],['guests','guests','list'],['guests','guests','seating'],['guests','guests','stay'],['money','money','budget'],['money','money','payments'],['vendors','vend','vendors'],['vendors','vend','places'],['vendors','vend','rentals']];
if(ONLY)views=views.filter(v=>v.join('/').includes(ONLY));
const SEL='#top button, #view button, #view a, #view select, .tabs button, #fab:not([hidden])';
const SSEL='.sheet button, .sheet select, .sheet a';
const reset=async([t,k,v])=>{if(!p.url().startsWith(URL0)){await p.goto(URL0);await p.waitForTimeout(400);}
  await p.evaluate(([s,t,k,v])=>{document.querySelectorAll('.cfm,.toast').forEach(x=>x.parentNode.removeChild(x));closeSheet();document.querySelectorAll('.scrim.leaving').forEach(x=>x.parentNode.removeChild(x));S=JSON.parse(s);UI.selecting=false;UI.sel.clear();UI.openQ=null;UI.q='';if(t==='plan'&&k==='planList'){UI.plan='lists';UI.planList=v}else if(k)UI[k]=v;UI.tab=t;render();scrollTo(0,0)},[snap,t,k,v]);};
const doClick=async(sel,i)=>{const h=(await p.$$(sel))[i];if(!h)return false;const vis=await h.isVisible().catch(()=>false);if(!vis)return false;const tag=await h.evaluate(e=>e.tagName+(e.type?':'+e.type:''));
  if(tag==='SELECT'){const n=await h.evaluate(e=>e.options.length);if(n>1)await h.selectOption({index:n-1}).catch(()=>{});await p.waitForTimeout(40);return true}
  await h.click({timeout:1500,force:true}).catch(()=>{});await p.waitForTimeout(60);return true};
const check=async()=>{const bad=await p.evaluate(()=>{const tx=document.body.innerText;const r=[];const m=tx.match(/.{0,40}(\bNaN\b|\bundefined\b|\bInfinity\b|\[object Object\]|\bnull\b).{0,20}/);if(m)r.push('text: '+m[0].replace(/\n/g,' | '));if(document.documentElement.scrollWidth>innerWidth+1)r.push('hscroll '+document.documentElement.scrollWidth);const sh=document.querySelector('#layer .sheet');if(sh&&sh.scrollWidth>sh.clientWidth+1)r.push('sheet hscroll');return r}).catch(()=>[]);bad.forEach(x=>add(x,cur));};
const label=(sel,i)=>p.evaluate(([sel,i])=>{const e=document.querySelectorAll(sel)[i];return e?((e.dataset.act||e.dataset.go||e.dataset.seg||'')+' '+(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,30)):''},[sel,i]);
let n=0;
for(const v of views){await reset(v);const N=await p.evaluate(sel=>document.querySelectorAll(sel).length,SEL);
  for(let i=0;i<N;i++){await reset(v);const lbl=await label(SEL,i);
    cur=v.join('/')+' #'+i+' '+lbl;if(!await doClick(SEL,i))continue;n++;await check();
    const cf0=await p.$('[data-cfm="1"]');if(cf0){await cf0.click({force:true}).catch(()=>{});await p.waitForTimeout(60);await check();}
    if(await p.$('#layer .sheet')){const M=await p.evaluate(s=>document.querySelectorAll(s).length,SSEL);
      for(let j=0;j<Math.min(M,70);j++){await reset(v);await doClick(SEL,i);if(!await p.$('#layer .sheet'))break;const l2=await label(SSEL,j);
        cur=v.join('/')+' #'+i+' '+lbl+' > '+l2;if(!await doClick(SSEL,j))continue;n++;await check();
        const cf=await p.$('[data-cfm="1"]');if(cf){await cf.click({force:true}).catch(()=>{});await p.waitForTimeout(60);await check();}}}
  }}
console.log(MODE,W,'clicks',n);for(const [k,v] of errs)console.log('ISSUE',k,'  @',v);console.log('done');await b.close()})();
