const {chromium}=require('playwright');const {spawn}=require('child_process');const {makeDB,attach}=require('./fake-supabase.js');
const srv=spawn('python3',['-m','http.server','8771','--directory',__dirname+'/../build/site'],{stdio:'ignore'});
(async()=>{await new Promise(r=>setTimeout(r,800));const b=await chromium.launch();const db=makeDB();const errs=[];const W=ms=>new Promise(r=>setTimeout(r,ms));const log=console.log;
const open=async(name)=>{const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(name+': '+e.message));await attach(ctx,db,p);await p.goto('http://localhost:8771/index.html');await W(800);return p};
const signin=async(p,email,name,role)=>{await p.fill('#g-name0',name);await p.fill('#g-email',email);await p.fill('#g-pw','password123');await p.click('[data-g=signup]');await W(500);await p.fill('#g-name',name);await p.click(`[data-g=role][data-v=${role}]`);await W(150);};
const B=await open('bride');await signin(B,'claire@x.com','Claire Morgan','bride');await B.click('[data-g=start]');await W(1500);
const mk=async acc=>{await B.evaluate(()=>closeSheet());await B.evaluate(()=>inviteSheet());await B.click(`[data-act=invacc][data-v=${acc}]`);await B.click('[data-act=invmake]');await W(400);return B.textContent('.invcode')};
const e1=await mk('editor'),v1=await mk('viewer');await B.evaluate(()=>closeSheet());
const C=await open('coord');await signin(C,'emily@x.com','Emily Park','coordinator');await C.fill('#g-inv',e1);await C.click('[data-g=join]');await W(1200);
await B.evaluate(()=>settingsSheet());await W(800);
const who=async p=>p.evaluate(()=>[...document.querySelectorAll('.sheet .who > div')].map(d=>d.innerText.replace(/\s+/g,' ')));
log('bride sees',await who(B));log('header',await B.evaluate(()=>[...document.querySelectorAll('.sheet .sect')].find(s=>/Who Can/.test(s.textContent)).textContent));
await B.evaluate(()=>document.querySelector('.who').scrollIntoView({block:'start'}));await W(200);await B.screenshot({path:__dirname+'/../build/w1.png'});
await B.click(`[data-act=invdel][data-c="${v1}"]`);await W(200);await B.click('[data-cfm="1"]');await W(800);log('after cancel',await who(B),'db invites unused',db.invites.filter(i=>!i.used_by).length);
await C.evaluate(()=>settingsSheet());await W(500);log('coord sees',await who(C),'coord invite btn',await C.locator('.sheet [data-act=invite]').count());
log('errs',errs);await b.close();srv.kill()})()
