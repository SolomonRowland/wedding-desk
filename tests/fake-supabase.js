// Fake Supabase for testing the sign-in and sync flows. Node side holds the database.
const crypto=require('crypto');
function makeDB(){
  const db={users:{},weddings:[],members:[],invites:[],state:[],subs:[]};
  const acc=(w,u)=>(db.members.find(m=>m.wedding_id===w&&m.user_id===u)||{}).access;
  const notify=(table,row)=>db.subs.forEach(s=>{if(s.table===table&&(!s.w||s.w===row.wedding_id))s.cb(row)});
  db.handle=(uid,op,a)=>{
    if(op==='otp'){db.users[a.email]=db.users[a.email]||{id:crypto.randomUUID(),email:a.email};return {error:null}}
    if(op==='signup'){if(db.users[a.email])return {error:{message:'User already registered'}};const u={id:crypto.randomUUID(),email:a.email,pw:a.password,user_metadata:(a.options||{}).data||{}};db.users[a.email]=u;return {data:{session:{user:{id:u.id,email:u.email,user_metadata:u.user_metadata}}}}}
    if(op==='pwsignin'){const u=db.users[a.email];if(!u||u.pw!==a.password)return {error:{message:'Invalid login credentials'}};return {data:{session:{user:{id:u.id,email:u.email,user_metadata:u.user_metadata}}}}}
    if(op==='verify'){const u=db.users[a.email];if(!u||a.token!=='123456')return {error:{message:'bad'}};return {data:{session:{user:u}}}}
    if(op==='rpc'){const n=a.name,p=a.args;const err=m=>({error:{message:m}});if(!uid)return err('Sign in first');const em=Object.values(db.users).find(u=>u.id===uid).email;
      if(n==='wd_create_wedding'){if(!['bride','groom'].includes(p.p_my_role))return err('Only the Bride or Groom can start a wedding');const w=crypto.randomUUID();db.weddings.push({id:w,name:p.p_name});db.members.push({wedding_id:w,user_id:uid,name:p.p_my_name,email:em,role:p.p_my_role,access:'owner',joined_at:new Date().toISOString()});db.state.push({wedding_id:w,data:{},version:1,updated_by:uid});return {data:w}}
      if(n==='wd_make_invite'){if(acc(p.p_wedding,uid)!=='owner')return err('Only the Bride or Groom can invite people');const c=crypto.randomBytes(5).toString('hex').toUpperCase();db.invites.push({code:c,wedding_id:p.p_wedding,access:p.p_access,used_by:null,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+14*864e5).toISOString()});return {data:c}}
      if(n==='wd_join'){const i=db.invites.find(x=>x.code===p.p_code&&!x.used);if(!i)return err('That invite code is not valid any more');if(['bride','groom'].includes(p.p_my_role)&&i.access!=='owner')return err('Bride and Groom need the partner invite');i.used=uid;i.used_by=uid;db.members.push({wedding_id:i.wedding_id,user_id:uid,name:p.p_my_name,email:em,role:p.p_my_role,access:i.access,joined_at:new Date().toISOString()});notify('members',{wedding_id:i.wedding_id});return {data:i.wedding_id}}
      if(n==='wd_save'){if(!['owner','editor'].includes(acc(p.p_wedding,uid)))return err('You can view this wedding but not change it');const r=db.state.find(x=>x.wedding_id===p.p_wedding);if(r.version!==p.p_version)return err('conflict');r.data=JSON.parse(JSON.stringify(p.p_data));r.version++;r.updated_by=uid;notify('wedding_state',JSON.parse(JSON.stringify(r)));return {data:r.version}}
      return err('unknown rpc')}
    if(op==='query'){const T={members:db.members,wedding_state:db.state,invites:db.invites}[a.table];const mine=w=>a.table==='invites'?acc(w,uid)==='owner':!!acc(w,uid);
      let rows=T.filter(r=>mine(r.wedding_id)&&a.f.every(([c,v])=>r[c]===v));
      if(a.op==='select'){rows=JSON.parse(JSON.stringify(rows));if(a.single)return rows.length===1?{data:rows[0]}:{error:{message:'not single'}};return {data:rows}}
      if(a.op==='update'){for(const r of rows){if(a.table==='members'){const own=acc(r.wedding_id,uid)==='owner';if(!own&&(r.user_id!==uid||a.v.access))return {error:{message:'rls'}}}Object.assign(r,a.v);notify(a.table,r)}return {data:null}}
      if(a.op==='delete'){for(const r of rows){const i=T.indexOf(r);T.splice(i,1);notify(a.table,r)}return {data:null}}}
  };
  return db;
}
const CLIENT=`(()=>{const call=(op,a)=>localStorage.getItem('fake-down')?Promise.resolve({error:{message:'TypeError: Failed to fetch'}}):window.__sb(op,a);let session=JSON.parse(localStorage.getItem('fake-sb-session')||'null');
const q=(table)=>{const st={table,op:'select',f:[],single:false};const b={select(){return b},eq(c,v){st.f.push([c,v]);return b},is(c,v){st.f.push([c,v]);return b},gt(){return b},order(){return b},single(){st.single=true;return b},update(v){st.op='update';st.v=v;return b},delete(){st.op='delete';return b},then(res,rej){return call('query',st).then(res,rej)}};return b};
window.__sbPush={};
window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session}}),signInWithOtp:async a=>call('otp',a),signUp:async a=>{const r=await call('signup',a);if(r.data){session=r.data.session;localStorage.setItem('fake-sb-session',JSON.stringify(session))}return r},signInWithPassword:async a=>{const r=await call('pwsignin',a);if(r.data){session=r.data.session;localStorage.setItem('fake-sb-session',JSON.stringify(session))}return r},resetPasswordForEmail:async()=>({error:null}),updateUser:async()=>({error:null}),verifyOtp:async a=>{const r=await call('verify',a);if(r.data){session=r.data.session;localStorage.setItem('fake-sb-session',JSON.stringify(session))}return r},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>{session=null;localStorage.removeItem('fake-sb-session');return {}}},
 from:q,rpc:(name,args)=>call('rpc',{name,args}),
 channel(n){const ch={on(t,f,cb){window.__sbPush[f.table]=cb;call('sub',{table:f.table,w:(f.filter||'').split('eq.')[1]});return ch},subscribe(){return ch}};return ch},removeChannel(){}}}};})();`;
async function attach(ctx,db,page){
  await ctx.addInitScript(CLIENT);
  await page.exposeFunction('__sb',async(op,a)=>{const s=await page.evaluate(()=>localStorage.getItem('fake-sb-session')).catch(()=>null);const uid=s?JSON.parse(s).user.id:null;
    if(op==='sub'){db.subs.push({table:a.table,w:a.w,cb:row=>page.evaluate(([t,r])=>window.__sbPush[t]&&window.__sbPush[t]({new:r}),[a.table,row]).catch(()=>{})});return {}}
    return db.handle(uid,op,a)});
}
module.exports={makeDB,attach};
