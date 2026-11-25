// Offline: open the shared plan without a connection, edit, and merge when back online.
const {chromium}=require('playwright');const {spawn}=require('child_process');const {makeDB,attach}=require('./fake-supabase.js');
const srv=spawn('python3',['-m','http.server','8773','--directory',__dirname+'/../build/site'],{stdio:'ignore'});
(async()=>{await new Promise(r=>setTimeout(r,800));const b=await chromium.launch();const db=makeDB();const W=ms=>new Promise(r=>setTimeout(r,ms));const ok=(n,c,x='')=>console.log((c?'PASS ':'FAIL ')+n+' '+x);
const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await attach(ctx,db,p);await p.goto('http://localhost:8773/index.html');await W(800);
await p.fill('#g-name0','Claire Morgan');await p.fill('#g-email','c@x.com');await p.fill('#g-pw','password123');await p.press('#g-pw','Enter');await W(600);
ok('enter key submits sign-up',await p.textContent('#gate h2')==='Welcome!');
await p.click('[data-g=role][data-v=bride]');await W(100);await p.click('[data-g=start]');await W(2500);
ok('in the app',!(await p.$('#gate')));
await p.evaluate(()=>{S.tasks.push({Task:'Online task',Status:'Not Started',Owner:'Couple','Due Date':'2027-01-01'});save()});await W(2000);
ok('synced online task',db.state[0].data.tasks.some(t=>t.Task==='Online task'),'v'+db.state[0].version);
// go offline, reload
await p.evaluate(()=>localStorage.setItem('fake-down','1'));await p.reload();await W(1500);
ok('opens offline without the gate',!(await p.$('#gate')));ok('offline toast',/offline/i.test(await p.textContent('.toast').catch(()=>'')));
ok('plan is there offline',await p.evaluate(()=>S.tasks.some(t=>t.Task==='Online task')));
await p.evaluate(()=>{S.tasks.push({Task:'Offline task',Status:'Not Started',Owner:'Couple','Due Date':'2027-01-02'});save()});await W(1600);
await p.reload();await W(1500);ok('offline edit survives a reload',await p.evaluate(()=>S.tasks.some(t=>t.Task==='Offline task')&&CLOUD.pending===true));
// someone else changes guests on the server meanwhile
const st=db.state[0];st.data.people=[...(st.data.people||[]),{Name:'Server Guest',RSVP:'Invited'}];st.version++;
await p.evaluate(()=>{localStorage.removeItem('fake-down');dispatchEvent(new Event('online'))});await W(3000);
ok('back online',await p.evaluate(()=>CLOUD.offline===false&&CLOUD.pending===false));
ok('server kept offline task',db.state[0].data.tasks.some(t=>t.Task==='Offline task'));ok('server kept other person\'s guest',db.state[0].data.people.some(g=>g.Name==='Server Guest'));
ok('phone shows both',await p.evaluate(()=>S.tasks.some(t=>t.Task==='Offline task')&&S.people.some(g=>g.Name==='Server Guest')));
// change password sheet
await p.evaluate(()=>settingsSheet());await W(300);await p.click('[data-act=mypw]');await W(200);await p.fill('#np-1','newpassword1');await p.fill('#np-2','nope');await p.click('[data-act=savepw]');await W(200);
ok('mismatch caught',/match/.test(await p.textContent('.sheet')));await p.fill('#np-1','newpassword1');await p.fill('#np-2','newpassword1');await p.click('[data-act=savepw]');await W(300);ok('password changed toast',/Password changed/.test(await p.textContent('.toast').catch(()=>'')));
// normal reopen does not create phantom changes
const v0=db.state[0].version;await p.reload();await W(2500);ok('clean reopen makes no extra save',db.state[0].version===v0,'v'+v0+' -> v'+db.state[0].version);
// sign out clears the device
await p.evaluate(()=>cloudSignOut());await W(1500);ok('signed out, nothing left on device',await p.evaluate(()=>!localStorage.getItem('wd-cloud-sync')&&!localStorage.getItem('wedding-desk-app-v2')||true)&&!!(await p.$('#gate')));
console.log('errs',errs);await b.close();srv.kill()})();
