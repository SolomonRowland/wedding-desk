// End-to-end flows through the real UI, checking the data after each step.
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(e.message.slice(0,200)));p.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss()});
await p.route('**/xlsx.full.min.js',r=>r.fulfill({path:__dirname+'/../lib/xlsx.full.min.js'}));await p.route('**/jspdf.umd.min.js',r=>r.fulfill({path:__dirname+'/../lib/jspdf.umd.min.js'}));
await p.route('**/wedding-desk-template.xlsx',r=>r.fulfill({path:__dirname+'/../wedding-desk-template.xlsx'}));
await p.addInitScript(()=>{window.open=()=>null;window.print=()=>{};});
await p.goto('file://'+__dirname+'/../build/preview.html');await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.evaluate(()=>{S.seenWelcome=true;save();render()});
const W=ms=>p.waitForTimeout(ms);const ok=(name,cond,extra='')=>console.log((cond?'PASS ':'FAIL ')+name+(extra?'  '+extra:''));
const q=(f,a)=>p.evaluate(f,a);
// tasks: add, edit, complete, delete
await p.click('[data-go=plan]');await p.click('[data-val=tasks]');await p.click('.addpill');await p.fill('#nt-task','Test task A');await p.fill('#nt-due','2026-12-24');await p.click('[data-act=savetask]');await W(200);
let i=await q(()=>S.tasks.findIndex(t=>t.Task==='Test task A'));ok('add task',i>=0);
await q(i=>taskForm(i),i);await p.fill('#nt-task','Test task B');await p.click('[data-act=savetask]');await W(150);ok('edit task',await q(i=>S.tasks[i].Task==='Test task B',i));
await q(()=>{UI.planFilter='all';render()});const ck=await p.$(`[data-task="${i}"], [data-check="${i}"], [data-done="${i}"]`);if(ck){await ck.click();await W(150);ok('complete task by tapping circle',await q(i=>S.tasks[i].Status==='Completed',i))}else ok('find task circle',false);
await q(i=>taskForm(i),i);await p.click('[data-act=deltask]');await W(100);if(await p.$('[data-cfm="1"]'))await p.click('[data-cfm="1"]');await W(150);ok('delete task',!(await q(()=>S.tasks.some(t=>t.Task==='Test task B'))));
// guests: add, RSVP, table, delete
const n0=await q(()=>S.people.length);await q(()=>go('guests','list'));await p.click('.addpill');await W(150);
const gname=await p.$('.sheet input');await gname.fill('Test Guest');await p.click('.sheet [data-act=saveguest]');await W(200);ok('add guest',await q(n=>S.people.length===n+1&&S.people.some(x=>x.Name==='Test Guest'),n0));
const gi=await q(()=>S.people.findIndex(x=>x.Name==='Test Guest'));const acc0=await q(()=>stats().acc);
await q(gi=>guestSheet(gi),gi);await W(100);const rs=await p.$('.sheet select[data-field="RSVP"]');if(rs){await rs.selectOption('Accepted');await W(150)}ok('RSVP accepted updates count',await q(a=>stats().acc===a+1,acc0));
await q(()=>{closeSheet();go('guests','seating')});const ts=await p.$(`select.tsel[data-edit="${gi}"]`);if(ts){await ts.selectOption('3');await W(150);ok('assign table',await q(gi=>String(S.people[gi].Table)==='3',gi))}else ok('needs-a-table row for new guest',false);
await q(gi=>guestForm(gi),gi);await W(100);const dg=await p.$('.sheet [data-act=delguest]');if(dg){await dg.click();if(await p.$('[data-cfm="1"]'))await p.click('[data-cfm="1"]');await W(150)}ok('delete guest',await q(n=>S.people.length===n,n0));
// vendor: add, contract signed -> deposit task
await q(()=>{closeSheet();go('vendors','vendors')});await p.click('.addpill');await W(150);await p.fill('.sheet input',"Test Florals");await p.click('.sheet [data-act=savevendor]');await W(200);
const vi=await q(()=>S.vendors.findIndex(v=>v.Company==='Test Florals'));ok('add vendor',vi>=0);
const tasksBefore=await q(()=>S.tasks.length);await q(vi=>vendorSheet(vi),vi);await W(100);const st=await p.$('.sheet select[data-vs]');
if(st){await st.selectOption('Contract Signed');await W(250);ok('contract signed adds deposit task',await q(n=>S.tasks.length===n+1&&/deposit/i.test(S.tasks[S.tasks.length-1].Task),tasksBefore))}else ok('vendor status select found',false);
// money: add payment, mark paid, undo
await q(()=>{closeSheet();go('money','payments')});const paid0=await q(()=>stats().paid);await q(()=>payForm());await W(100);
const amt=await p.$('.sheet input[inputmode="decimal"], .sheet input[type="number"]');if(amt){await amt.fill('250')}await p.click('.sheet .btn.plum');await W(200);
const pi=await q(()=>S.payments.length-1);ok('add payment',await q(pi=>+S.payments[pi].Amount===250,pi));
await q(()=>{closeSheet();go('money','payments')});await p.click(`[data-pay="${pi}"]`);await W(200);ok('mark paid raises paid total',await q(a=>stats().paid===a+250,paid0));
const ub=await p.$('.toast button');if(ub){await ub.click();await W(150)}ok('undo mark paid',await q(a=>stats().paid===a,paid0));
// decisions: mark decided -> task
await q(()=>go('plan','questions'));const qi=await q(()=>S.questions.findIndex(x=>x.Status==='Not Started'));const tb=await q(()=>S.tasks.length);
await q(qi=>{UI.openQ=qi;UI.qf='all';render()},qi);const qs=await p.$(`select[data-qstat="${qi}"], select[data-qs="${qi}"]`);if(qs){await qs.selectOption('Decided');await W(200);ok('decided adds next-step task',await q(n=>S.tasks.length===n+1,tb))}else ok('decision status select found',false);
// search
await q(()=>searchSheet());await p.fill('.sheet input','Willow');await W(200);ok('search finds venue',await q(()=>document.querySelectorAll('.sheet .row').length>0));await q(()=>closeSheet());
// Excel export -> import (replace) round trip
await q(()=>{window.__snap=JSON.parse(JSON.stringify(S))});const before=await q(()=>JSON.stringify({t:S.tasks.length,p:S.people.length,v:S.vendors.length,b:S.budget.length,pay:S.payments.length,q:S.questions.length,wd:S.details.wd,c:S.details.couple}));
await q(()=>settingsSheet());await W(200);const [dl]=await Promise.all([p.waitForEvent('download',{timeout:20000}).catch(()=>null),p.click('[data-act=xlexport]')]);
if(dl){const path=__dirname+'/../build/flows-export.xlsx';await dl.saveAs(path);ok('excel download',true,dl.suggestedFilename());
  await q(()=>startFresh());await W(200);await q(()=>settingsSheet());await W(200);await p.setInputFiles('#xlfile',path);await W(1500);
  const rep=await p.$('.sheet [data-act="impmode"][data-v="replace"]');if(rep){await rep.click();await W(150)}
  const go2=await p.$('.sheet [data-act="impgo"]');if(go2){await go2.click();await W(300);const cf=await p.$('[data-cfm="1"]');if(cf){await cf.click();}await W(1000)}
  const after=await q(()=>JSON.stringify({t:S.tasks.length,p:S.people.length,v:S.vendors.length,b:S.budget.length,pay:S.payments.length,q:S.questions.length,wd:S.details.wd,c:S.details.couple}));
  ok('excel round trip keeps everything',before===after,before+' vs '+after);
  const diffs=await q(()=>{const o=[];const A=window.__snap;for(const k of LIST_KEYS){(A[k]||[]).forEach((r,i)=>{const r2=(S[k]||[])[i]||{};for(const c of Object.keys(r)){if(['rsvpAsked','auto','_id'].includes(c))continue;const a=r[c]==null?'':String(r[c]).trim(),b=r2[c]==null?'':String(r2[c]).trim();if(a!==b&&!(+a===+b&&a!==''))o.push(k+'['+i+'].'+c+': '+JSON.stringify(a).slice(0,40)+' -> '+JSON.stringify(b).slice(0,40))}})}for(const c of Object.keys(A.details)){const a=String(A.details[c]??''),b=String(S.details[c]??'');if(a!==b)o.push('details.'+c+': '+a.slice(0,30)+' -> '+b.slice(0,30))}return o});
  console.log('field diffs',diffs.length);diffs.slice(0,25).forEach(d=>console.log('   ',d))}else ok('excel download',false);
// calendar file
const [ics]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),q(()=>{document.querySelectorAll('.cfm').forEach(x=>x.parentNode.removeChild(x));closeSheet();settingsSheet()}).then(()=>W(400)).then(()=>p.click('[data-act=ics]',{force:true}))]);ok('calendar .ics download',!!ics,ics?ics.suggestedFilename():'');
// share -> PDF for every list
for(const kind of ['tasks','dayof','decisions','photos','music','packing','risks','guests','seating','stay','budget','payments','vendors','places','rentals']){
  await q(k=>{closeSheet();UI.shareKind=k;UI.share={scope:k==='guests'?'all':k==='vendors'?'contacts':'open',owner:'Everyone'};shareSheet()},kind);await W(100);
  const pdfb=await p.$('.sheet [data-act="pdf"], .sheet [data-act="sharepdf"], .sheet [data-fmt="pdf"]');
  if(!pdfb){ok('pdf button for '+kind,false);continue}
  const [d]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),pdfb.click()]);await W(150);
  ok('pdf '+kind,!!d||await q(()=>!!window.__lastPdf),d?d.suggestedFilename():'(shared instead of downloaded)');}
// start fresh then reload example
await q(()=>startFresh());ok('start fresh empties plan',await q(()=>S.tasks.length===0&&S.people.length===0));
await q(()=>{closeSheet();settingsSheet()});await W(150);await p.click('[data-act=reset]');await W(150);if(await p.$('[data-cfm="1"]'))await p.click('[data-cfm="1"]');await W(300);ok('reload example',await q(()=>S.tasks.length>50));
console.log('errs',errs);await b.close()})();
