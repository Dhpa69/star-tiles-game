// v44 cloud profiles (Supabase) with Sign in with Apple. Guest is the default and everything works offline.
// The anon key is public by design; Row Level Security limits each user to their own row.
(function(){
const SB_URL='https://etfhuwopqjderqutlyhk.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Zmh1d29wcWpkZXJxdXRseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODY4NjAsImV4cCI6MjEwNzU2Mjg2MH0.nVq3VqCYn3fRByCUle0u8_4almvp31oafR4LaHrE7TA';
const APP_ID='com.dhavalpatel.startiles',WEB_REDIRECT=location.origin+location.pathname;
const native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
let sb=null,user=null,pushT=null,busyA=false,status='';
try{if(window.supabase&&supabase.createClient)sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:!native,flowType:'pkce',storageKey:'startiles.sb'}});}catch(e){console.warn('supabase init',e);}
const $=id=>document.getElementById(id);
function misState(){try{return JSON.parse(localStorage.getItem('startiles.missions'))||null;}catch(e){return null;}}
function localSnap(){const m=misState();return {display_name:profile.name||'Player',coins:Math.max(0,profile.coins|0),stats:{games:profile.games|0,wins:profile.wins|0},missions:m||{},streak:m?{streak:m.streak||1,lastDay:m.lastDay||m.day}:{}};}
function applyCloud(row){if(!row)return;profile.coins=Math.max(0,row.coins|0);if(row.display_name)profile.name=row.display_name;const st=row.stats||{};profile.games=st.games|0;profile.wins=st.wins|0;
 if(row.missions&&row.missions.day){const cur=misState();if(!cur||cur.day<=row.missions.day)localStorage.setItem('startiles.missions',JSON.stringify(row.missions));}
 profile.cloudAt=row.updated_at;_saveLocal();if(typeof g!=='undefined'&&g&&!g.over&&g.coins&&!(typeof isOn==='function'&&isOn())){if(typeof meIdx==='function')g.coins[meIdx()]=profile.coins;else g.coins[0]=profile.coins;}try{showProfile();misBtn();}catch(e){}}
async function pull(){const {data,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(error)throw error;return data;}
async function push(){if(!sb||!user||!navigator.onLine)return;const s=localSnap();const {data,error}=await sb.from('profiles').upsert({id:user.id,...s},{onConflict:'id'}).select().single();if(error)throw error;profile.cloudAt=data.updated_at;_saveLocal();}
function schedulePush(){if(!user)return;clearTimeout(pushT);pushT=setTimeout(()=>push().catch(e=>setStatus('Sync paused (offline?)')),1500);}
async function syncNow(first){if(!sb||!user||!navigator.onLine)return;setStatus('Syncing…');
 try{const row=await pull();const mk='startiles.cloud.merged.'+user.id,merged=localStorage.getItem(mk);
  if(!row||!merged){ // first sign-in on this device: merge, keep the higher coin count and stats
   const L=localSnap(),R=row||{};const m={display_name:L.display_name!=='Player'?L.display_name:(R.display_name||'Player'),coins:Math.max(L.coins,R.coins|0),
    stats:{games:Math.max(L.stats.games,(R.stats||{}).games|0),wins:Math.max(L.stats.wins,(R.stats||{}).wins|0)},
    missions:((R.missions||{}).day||'')>(L.missions.day||'')?R.missions:L.missions,streak:((R.streak||{}).streak|0)>(L.streak.streak|0)?R.streak:L.streak};
   const {data,error}=await sb.from('profiles').upsert({id:user.id,...m},{onConflict:'id'}).select().single();if(error)throw error;localStorage.setItem(mk,'1');applyCloud(data);}
  else if(!profile.cloudAt||new Date(row.updated_at)>new Date(profile.cloudAt)){applyCloud(row);} // cloud newer (another device)
  else await push();
  setStatus('Synced ✓');}catch(e){console.warn(e);setStatus('Sync failed: '+(e.message||e));}render2();}
function setStatus(s){status=s;const el=$('acStatus');if(el)el.textContent=s;}
// hook local saves -> cloud
const _save=saveProfile;window.saveProfile=saveProfile=function(){_save.apply(this,arguments);schedulePush();};
const _ms=window.misSave;if(typeof misSave==='function'){window.misSave=misSave=function(s){_ms(s);schedulePush();};}
// ---- sign in ----
function rnd(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function sha256hex(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function signInApple(){if(!sb){say('Sign-in unavailable offline');return;}if(!navigator.onLine){say('You are offline – playing as guest');return;}
 busyA=true;render2();setStatus('Opening Apple…');
 try{const P=native&&Capacitor.Plugins&&(Capacitor.Plugins.SignInWithApple);
  if(P){const raw=rnd(16),hashed=await sha256hex(raw);
   const r=await P.authorize({clientId:APP_ID,redirectURI:'https://'+new URL(SB_URL).host+'/auth/v1/callback',scopes:'email name',state:rnd(8),nonce:hashed});
   const tok=r&&r.response&&r.response.identityToken;if(!tok)throw new Error('No Apple token');
   const {error}=await sb.auth.signInWithIdToken({provider:'apple',token:tok,nonce:raw});if(error)throw error;
   const gn=r.response.givenName;if(gn&&(!profile.name||profile.name==='Player')){profile.name=gn;_saveLocal();}}
  else{const {error}=await sb.auth.signInWithOAuth({provider:'apple',options:{redirectTo:WEB_REDIRECT}});if(error)throw error;return;} // browser redirects
 }catch(e){setStatus('Sign-in failed: '+(e.message||e));}busyA=false;render2();}
async function signOut(){if(sb)await sb.auth.signOut().catch(()=>{});user=null;setStatus('Signed out – playing as guest (progress stays on this phone)');render2();}
async function deleteAccount(){if(!user)return;if(!confirm('Delete your Star Tiles account? Your cloud profile and sign-in are permanently removed. Local progress on this phone stays as a guest.'))return;
 setStatus('Deleting…');try{const {error}=await sb.rpc('delete_my_account');if(error)throw error;localStorage.removeItem('startiles.cloud.merged.'+user.id);delete profile.cloudAt;_saveLocal();await sb.auth.signOut().catch(()=>{});user=null;setStatus('Account deleted');}
 catch(e){setStatus('Delete failed: '+(e.message||e));}render2();}
// ---- UI ----
function render2(){const ac=$('acState');if(!ac)return;const name=user?(user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name))||user.email||'Apple ID':'';
 ac.innerHTML=user?'Signed in'+(name?' as <b>'+String(name).replace(/[<&]/g,'')+'</b>':'')+'<br><small>Coins, missions, streak and stats sync to your account.</small>':'Playing as <b>guest</b><br><small>Progress is saved on this phone only. Sign in to keep it across devices.</small>';
 $('acApple').style.display=user?'none':'';$('acGuest').style.display=user?'none':'';$('acOut').style.display=user?'':'none';$('acDel').style.display=user?'':'none';$('acApple').disabled=busyA||!sb;
 const b=$('acBtn');if(b)b.textContent=user?'👤 Account ✓':'👤 Account · Guest';}
if($('acBtn'))$('acBtn').onclick=()=>{$('account').classList.add('show');render2();};
$('acClose').onclick=$('acGuest').onclick=()=>$('account').classList.remove('show');
$('account').addEventListener('click',e=>{if(e.target.id==='account')$('acClose').click();});
$('acApple').onclick=signInApple;$('acOut').onclick=signOut;$('acDel').onclick=deleteAccount;
if(sb){sb.auth.onAuthStateChange((ev,sess)=>{const u=sess&&sess.user||null,was=user&&user.id;user=u;render2();if(u&&u.id!==was)syncNow(true);});
 sb.auth.getSession().then(({data})=>{user=data.session&&data.session.user||null;render2();if(user)syncNow();}).catch(()=>{});}
addEventListener('online',()=>user&&syncNow());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)syncNow();});
render2();window.Account={get user(){return user},syncNow,push,signOut,status:()=>status,_sb:()=>sb};
})();
