const {chromium}=require('playwright');const {spawn}=require('child_process');const {makeDB,attach}=require('./fake-supabase.js');
const srv=spawn('python3',['-m','http.server','8770','--directory',__dirname+'/../build/site'],{stdio:'ignore'});
(async()=>{await new Promise(r=>setTimeout(r,800));const b=await chromium.launch();const db=makeDB();const errs=[];const W=ms=>new Promise(r=>setTimeout(r,ms));
const open=async(name)=>{const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(name+': '+e.message));await attach(ctx,db,p);await p.goto('http://localhost:8770/index.html');await W(800);return p};
const signin=async(p,email,name,role)=>{await p.fill('#g-name0',name);await p.fill('#g-email',email);await p.fill('#g-pw','password123');await p.click('[data-g=signup]');await W(500);await p.fill('#g-name',name);await p.click(`[data-g=role][data-v=${role}]`);await W(150);};
const log=console.log;
const B=await open('bride');await B.screenshot({path:__dirname+'/../build/sharing-1-email.png'});
await B.fill('#g-name0','Claire Morgan');await B.fill('#g-email','claire@x.com');await B.fill('#g-pw','short');await B.click('[data-g=signup]');await W(200);console.log('short pw err',await B.textContent('.gerr'));await B.fill('#g-pw','password123');await B.screenshot({path:__dirname+'/../build/sharing-2-code.png'});await B.click('[data-g=signup]');await W(500);
console.log('profile name prefilled',await B.inputValue('#g-name'));await B.click('[data-g=role][data-v=bride]');await W(150);await B.screenshot({path:__dirname+'/../build/sharing-3-profile.png'});
await B.click('[data-g=start]');await W(1500);
log('bride gate gone',await B.locator('#gate').count()===0,'state v',db.state[0].version,'tasks in db',db.state[0].data.tasks?.length);
// bride adds details + a task + vendor password
await B.evaluate(()=>{S.details.couple='Claire & Daniel';S.tasks.push({Task:'Book florist',Owner:'Bride',Status:'Not Started','Due Date':'2026-12-01'});S.vendors.push({Company:'Bloom Co',Category:'Florist',Login:'claire',Password:'s3cret','Vendor Status':'Researching'});save();render()});await W(1800);
log('db v',db.state[0].version,'task',db.state[0].data.tasks.map(t=>t.Task),'vendor creds in db',JSON.stringify(db.state[0].data.vendors[0]));
// invites
await B.evaluate(()=>settingsSheet());await W(300);await B.screenshot({path:__dirname+'/../build/sharing-4-settings.png'});await B.evaluate(()=>{document.querySelector('[data-act=invite]').scrollIntoView()});await B.screenshot({path:__dirname+'/../build/sharing-4b-party.png'});
await B.click('[data-act=invite]');await W(200);await B.click('[data-act=invacc][data-v=owner]');await W(100);await B.click('[data-act=invmake]');await W(400);const gcode=await B.textContent('.invcode');await B.screenshot({path:__dirname+'/../build/sharing-5-code.png'});
const mk=async acc=>{await B.evaluate(()=>closeSheet());await B.evaluate(()=>inviteSheet());await B.click(`[data-act=invacc][data-v=${acc}]`);await B.click('[data-act=invmake]');await W(300);return B.textContent('.invcode')};
const ecode=await mk('editor'),vcode=await mk('viewer');await B.evaluate(()=>closeSheet());log('codes',gcode,ecode,vcode);
// groom
const G=await open('groom');await signin(G,'daniel@x.com','Daniel Reyes','groom');await G.fill('#g-inv',ecode);await G.click('[data-g=join]');await W(500);log('groom w/ editor code ->',await G.textContent('.gerr').catch(()=>'none'));
await G.fill('#g-inv',gcode);await G.click('[data-g=join]');await W(1200);log('groom in',await G.locator('#gate').count()===0,'sees task',await G.evaluate(()=>S.tasks.some(t=>t.Task==='Book florist')),'couple',await G.evaluate(()=>S.details.couple),'vendor pw on groom phone',await G.evaluate(()=>S.vendors.find(v=>v.Company==='Bloom Co').Password||'(none)'));
// coordinator edits -> bride sees it live
const C=await open('coord');await signin(C,'emily@x.com','Emily Park','coordinator');await C.fill('#g-inv',ecode);await C.click('[data-g=join]');await W(1200);
log('coord can override DND',await C.evaluate(()=>CAN_OVERRIDE()),'bride can',await B.evaluate(()=>CAN_OVERRIDE()));
await C.evaluate(()=>{S.tasks.push({Task:'Confirm DJ timeline',Owner:'Wedding Planner',Status:'Not Started','Due Date':'2026-12-05'});save()});await W(2200);
log('bride sees coord task live',await B.evaluate(()=>S.tasks.some(t=>t.Task==='Confirm DJ timeline')),'bride keeps own pw',await B.evaluate(()=>S.vendors.find(v=>v.Company==='Bloom Co').Password));
await B.screenshot({path:__dirname+'/../build/sharing-6-live.png'});
// simultaneous edits: bride and groom change different things
await B.evaluate(()=>{S.details.venue='Willow Creek';save()});await G.evaluate(()=>{S.people.push({Name:'Aunt May',RSVP:'Invited'});save()});await W(4000);
log('after concurrent edits db has venue',db.state[0].data.details.venue,'and aunt',db.state[0].data.people.some(p=>p.Name==='Aunt May'),'bride sees aunt',await B.evaluate(()=>S.people.some(p=>p.Name==='Aunt May')),'groom sees venue',await G.evaluate(()=>S.details.venue));
// viewer
const M=await open('mom');await signin(M,'linda@x.com','Linda Morgan','brides_parents');await M.fill('#g-inv',vcode);await M.click('[data-g=join]');await W(1200);
const vb=db.state[0].version;await M.evaluate(()=>{S.tasks.push({Task:'HACK'});save()});await W(1500);log('viewer change blocked',db.state[0].version===vb,'reverted locally',!(await M.evaluate(()=>S.tasks.some(t=>t.Task==='HACK'))),'toast',await M.textContent('.toast').catch(()=>''));
// viewer tries bride role
await M.evaluate(()=>myRoleSheet());await W(200);log('viewer role choices include bride?',await M.locator('[data-act=setrole][data-v=bride]').count());
// members list in bride settings
await B.evaluate(()=>settingsSheet());await W(300);await B.evaluate(()=>document.querySelector('[data-act=invite]').scrollIntoView({block:'center'}));await W(200);await B.screenshot({path:__dirname+'/../build/sharing-7-party.png'});
log('members',db.members.map(m=>m.name+':'+m.role+':'+m.access).join(', '));
// sign out
await G.evaluate(()=>cloudSignOut());await W(1000);log('groom signed out shows gate',await G.locator('#g-email').count());
log('errs',errs);await b.close();srv.kill();})();
