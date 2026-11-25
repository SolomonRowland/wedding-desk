// Puts hostile and odd text into every field, then renders every view, sheet and share/print preview.
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,200)));
p.on('dialog',d=>{errs.push('DIALOG '+d.message());d.dismiss()});
await p.route('**/xlsx.full.min.js',r=>r.fulfill({path:__dirname+'/../lib/xlsx.full.min.js'}));
await p.goto('file://'+__dirname+'/../build/preview.html');await p.waitForTimeout(500);
const res=await p.evaluate(async()=>{window.__x=0;const PAY=`"><img src=x onerror="window.__x++;(window.__w=window.__w||[]).push((this.closest('section,.sheet,.top,div')||this.parentElement).outerHTML.slice(0,300))">'\`\${1}<b>&amp;`;
  localStorage.clear();S=freshState();S.seenWelcome=true;
  let k=0;for(const [key,v] of Object.entries(S)){if(Array.isArray(v))v.forEach(r=>{if(r&&typeof r==='object')for(const c of Object.keys(r)){if(typeof r[c]==='string'){r[c]=r[c]+PAY;k++}}})}
  for(const c of ['couple','venue','city','street','planner','doc','meals','paddr','daddr'])S.details[c]=(S.details[c]||'')+PAY;
  S.people[0].Name='Zoë Ångström-O\'Brien 李 😀'+PAY;S.people[1].Phone='(312) 555-0000 ext. 4';S.people[2].Email='bad email';S.people[3].Table='';S.vendors[0]['Quoted Cost']='abc';S.payments[0].Amount='-50';S.budget[0]['Estimated Cost']='1e9';
  save();const out=[];const views=[['home'],['plan','tasks'],['plan','dayof'],['plan','questions'],['plan','lists'],['guests','list'],['guests','seating'],['guests','stay'],['money','budget'],['money','payments'],['vendors','vendors'],['vendors','places'],['vendors','rentals']];
  for(const l of ['photos','music','packing','risks']){UI.planList=l;go('plan','lists');await new Promise(r=>setTimeout(r,20))}
  for(const [t,s] of views){go(t,s);UI.qf='all';render();UI.openQ=0;render();await new Promise(r=>setTimeout(r,30));if(/NaN|undefined|\[object/.test(document.body.innerText))out.push('text '+t+'/'+s+': '+(document.body.innerText.match(/.{0,30}(NaN|undefined|\[object).{0,10}/)||[])[0])}
  const sheets=['taskForm(0)','taskForm()','guestSheet(0)','guestForm(0)','vendorSheet(0)','vendorForm(0)','payForm(0)','settingsSheet()','helpSheet()','searchSheet()','repliesSheet()',"contactSheet('k:planner')","composeSheet({mode:'sms',keys:['g:0','g:1']})","composeSheet({mode:'email',keys:['g:0','v:0']})",'legalSheet("privacy")'];
  for(const t of ['planner','budget','locations','risks','photos','music','packing','rides','lodging','equipment','questions'])sheets.push(`rowForm('${t}',0)`);
  for(const f of sheets){try{closeSheet();eval(f);await new Promise(r=>setTimeout(r,30));const tx=document.querySelector('.sheet')?.innerText||'';if(/NaN|\bundefined\b|\[object/.test(tx))out.push('sheet text '+f+': '+(tx.match(/.{0,30}(NaN|undefined|\[object).{0,10}/)||[])[0])}catch(e){out.push('ERR '+f+' '+e.message)}}
  closeSheet();
  for(const kind of ['tasks','dayof','decisions','photos','music','packing','risks','guests','seating','stay','budget','payments','vendors','places','rentals']){try{UI.shareKind=kind;UI.share={scope:kind==='guests'?'all':kind==='vendors'?'contacts':'open',owner:'Everyone'};shareSheet();await new Promise(r=>setTimeout(r,30));const pv=document.querySelector('.sheet');if(/NaN|\bundefined\b|\[object/.test(pv.innerText))out.push('share text '+kind);const spec=buildSpec(kind);const html=typeof specHTML==='function'?specHTML(spec):'';const d=document.createElement('div');d.innerHTML=html;document.body.appendChild(d);await new Promise(r=>setTimeout(r,20));d.parentNode.removeChild(d);closeSheet()}catch(e){out.push('share ERR '+kind+' '+e.message)}}
  return {fields:k,x:window.__x,w:window.__w,out}});
await p.waitForTimeout(500);const x2=await p.evaluate(()=>window.__x);
console.log(JSON.stringify(res,null,1).slice(0,3000),'late x',x2);console.log('errs',errs);await b.close()})();
