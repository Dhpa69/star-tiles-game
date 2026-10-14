// v45: chat safety, haptics, coin shop (StoreKit via @capgo/native-purchases), AdMob ads + ATT, turn notifications (APNs / Web Push).
(function(){
const C=window.ST_CONFIG||{},CAP=window.Capacitor,native=!!(CAP&&CAP.isNativePlatform&&CAP.isNativePlatform()),P=n=>native&&CAP.Plugins&&CAP.Plugins[n];
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
document.documentElement.classList.toggle('native',native);
const DEV=LS('startiles.device',null)||(()=>{const id=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36));SS('startiles.device',id);return id;})();
const rpc=async(fn,args)=>{const sb=window.Account&&Account._sb&&Account._sb();if(!sb)throw new Error('offline');const {data,error}=await sb.rpc(fn,args);if(error)throw error;return data;};

// ---------- A1 chat safety ----------
const BAD=['fuck','shit','bitch','cunt','dick','pussy','asshole','bastard','slut','whore','fag','nigger','nigga','retard','cock','wank','twat','bollocks','motherfucker','kys'];
const badRe=new RegExp('('+BAD.map(w=>w.split('').join('[\\W_]*')).join('|')+')','gi');
const clean=s=>String(s||'').replace(badRe,m=>m[0]+'*'.repeat(Math.max(1,m.length-1)));
const blocked=()=>LS('startiles.blocked',[]),isBlocked=n=>!!n&&blocked().includes(String(n).toLowerCase());
const opp=()=>{try{return isOn()?NAMES()[1-meIdx()]:'';}catch(e){return '';}};
window.StSafety={clean,isBlocked};
if(typeof chatIn==='function'){const _in=chatIn;window.chatIn=chatIn=function(d){if(profile.chatOff)return;if(isBlocked(d&&d.name)||isBlocked(opp()))return;if(d&&typeof d.txt==='string')d.txt=clean(d.txt);return _in(d);};}
if(typeof chatSend==='function'){const _s=chatSend;window.chatSend=chatSend=function(t){if(profile.chatOff){say('Chat is off (Settings)');return;}return _s(clean(t));};}
if(typeof endPoll==='function'){const _ep=endPoll;window.endPoll=endPoll=function(){const c=endCtx&&endCtx.on;if(c&&c.names&&isBlocked(c.names[1-c.me]))return;return _ep();};}
function chatTools(){const h=document.querySelector('#chat .chhead');if(!h||$('chRep'))return;
 const r=document.createElement('button');r.className='btn chtool';r.id='chRep';r.textContent='🚩';r.title='Report';const b=document.createElement('button');b.className='btn chtool';b.id='chBlk';b.textContent='⛔';b.title='Block';
 h.insertBefore(b,$('chClose'));h.insertBefore(r,b);r.onclick=report;b.onclick=block;}
async function report(){const who=opp()||'player',code=isOn()?Online.st.code:'',msgs=(typeof chatStore==='function'?chatStore():[]).slice(-15).map(m=>(m.me?'me':m.name)+': '+m.txt);
 if(!confirm('Report '+who+' for abusive chat? The last messages are sent to the developer.'))return;
 try{const sb=Account._sb();if(sb){const {error}=await sb.from('reports').insert({reporter_device:DEV,room:code,reported_name:who,reason:'chat',messages:msgs});if(error)throw error;}say('Report sent – thank you');}catch(e){say('Saved – opening email');}
 location.href='mailto:'+C.supportEmail+'?subject='+encodeURIComponent('Star Tiles report: '+who+' (room '+code+')')+'&body='+encodeURIComponent(msgs.join('\n'));}
function block(){const who=opp();if(!who)return;if(!confirm('Block '+who+'? You won\'t see their chat or rematch invites.'))return;const l=blocked();l.push(who.toLowerCase());SS('startiles.blocked',[...new Set(l)]);say('⛔ '+who+' blocked');if(typeof chatRender==='function')chatRender();}
if(typeof chatRender==='function'){const _r=chatRender;window.chatRender=chatRender=function(){chatTools();if(isBlocked(opp())){$('chlist').innerHTML='<p class="chempty">You blocked this player. <button class="btn" id="unblk">Unblock</button></p>';$('unblk').onclick=()=>{SS('startiles.blocked',blocked().filter(x=>x!==opp().toLowerCase()));_r();};return;}return _r();};}

// ---------- A2 haptics ----------
const H=P('Haptics');let lastH=0;const hap=(k)=>{if(!H||profile.muted&&profile.hapticsOff)return;const n=Date.now();if(k==='light'&&n-lastH<70)return;lastH=n;
 try{if(k==='success')H.notification({type:'SUCCESS'});else H.impact({style:k==='heavy'?'HEAVY':k==='medium'?'MEDIUM':'LIGHT'});}catch(e){}};
if(typeof SFX!=='undefined'){const _p=SFX.pop;SFX.pop=function(i,t0){hap('light');return _p.apply(this,arguments);};const _f=SFX.finale;if(_f)SFX.finale=function(sc){hap('success');return _f.apply(this,arguments);};}
if(typeof celebrate==='function'){const _c=celebrate;window.celebrate=celebrate=function(s,d){const r=_c.apply(this,arguments);if(s>=5000)hap('heavy');else if(s>=1000)hap('medium');return r;};}

// ---------- settings row: chat off + support ----------
function settings(){const mb=$('muteBtn');if(!mb||$('chatOffBtn'))return;const b=document.createElement('button');b.className='btn mute';b.id='chatOffBtn';mb.after(b);
 const s=document.createElement('a');s.className='btn mute supp';s.href='support.html';s.textContent='❓ Help & support';b.after(s);
 const upd=()=>b.textContent=profile.chatOff?'💬 Chat: OFF':'💬 Chat: ON';upd();b.onclick=()=>{profile.chatOff=!profile.chatOff;saveProfile();upd();};}
settings();

// ---------- C) coin shop ----------
const NP=P('NativePurchases');const products={};const owned=()=>LS('startiles.iap.owned',{}),txs=()=>LS('startiles.iap.tx',[]);
const noAds=()=>!!(owned().removeads||owned().pro||profile.noAds);
async function loadProducts(){if(!NP)return;try{const r=await NP.getProducts({productIdentifiers:C.iap.map(p=>p.id)});(r.products||[]).forEach(p=>products[p.identifier]=p);}catch(e){console.warn('products',e);}}
function grant(item,tx){const seen=txs();if(tx&&seen.includes(tx))return;if(tx){seen.push(tx);SS('startiles.iap.tx',seen.slice(-200));}
 if(item.coins)addCoins(item.coins);if(item.noAds){const o=owned();o[item.id.split('.').pop()]=true;SS('startiles.iap.owned',o);profile.noAds=true;saveProfile();}
 SFX.chime&&SFX.chime(400);hap('success');say(item.coins?'+'+item.coins.toLocaleString()+' 🪙 added!':'✓ '+(item.title||'Purchase')+' unlocked');}
async function buy(id){const item=C.iap.find(p=>p.id===id);if(!NP){say('Purchases are available in the iPhone app');return;}
 shopMsg('Contacting the App Store…');try{const t=await NP.purchaseProduct({productIdentifier:id,quantity:1});grant(item,t&&t.transactionId);shopMsg('');renderShop();}
 catch(e){shopMsg(/cancel/i.test(e&&e.message||'')?'':'Purchase failed: '+(e.message||e));}}
async function restore(){if(!NP){say('Restore is available in the iPhone app');return;}shopMsg('Restoring…');try{await NP.restorePurchases();const r=await NP.getPurchases();let n=0;
 for(const p of (r.purchases||[])){const it=C.iap.find(x=>x.id===p.productIdentifier);if(it&&it.nonConsumable){const o=owned();o[it.id.split('.').pop()]=true;SS('startiles.iap.owned',o);profile.noAds=true;n++;}}saveProfile();shopMsg(n?'Restored ✓':'Nothing to restore');renderShop();}
 catch(e){shopMsg('Restore failed: '+(e.message||e));}}
function shopMsg(t){const e=$('shopMsg');if(e)e.textContent=t;}
function renderShop(){const el=$('shopList');if(!el)return;$('shopCoins').textContent='🪙 '+profile.coins.toLocaleString();
 if(!native){el.innerHTML='<p class="getapp">Coin packs, <b>Remove Ads</b> and <b>Pro</b> are available in the <b>Star Tiles iPhone app</b>.<br><a class="btn" href="'+C.appStoreUrl+'" target="_blank">Get the app</a></p>';$('shopRestore').style.display='none';return;}
 const o=owned();el.innerHTML=C.iap.map(p=>{const pr=products[p.id],own=p.nonConsumable&&(o[p.id.split('.').pop()]||(p.id.endsWith('removeads')&&o.pro));
  return '<div class="shopi'+(p.tag?' best':'')+'">'+(p.tag?'<em>'+p.tag+'</em>':'')+'<b>'+(p.title||('🪙 '+p.coins.toLocaleString()+' coins'))+'</b><small>'+(p.note||(p.coins&&p.nonConsumable?'':''))+'</small><button class="btn sbuy" data-id="'+p.id+'"'+(own?' disabled':'')+'>'+(own?'Owned ✓':(pr&&pr.priceString)||p.price)+'</button></div>';}).join('')+
  (adsOk()?'<div class="shopi"><b>🎬 Watch an ad</b><small>+'+C.admob.rewardCoins+' coins · '+rewardLeft()+' left today</small><button class="btn sbuy" id="rwBtn"'+(rewardLeft()?'':' disabled')+'>Free</button></div>':'');
 el.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>buy(b.dataset.id));const rw=$('rwBtn');if(rw)rw.onclick=rewarded;$('shopRestore').style.display='';}
function openShop(){$('shop').classList.add('show');renderShop();loadProducts().then(renderShop);}
window.openShop=openShop;
$('shopClose').onclick=()=>$('shop').classList.remove('show');$('shop').addEventListener('click',e=>{if(e.target.id==='shop')$('shopClose').click();});$('shopRestore').onclick=restore;
document.addEventListener('click',e=>{if(e.target.closest&&(e.target.closest('#coinN')||e.target.closest('.coinsbox')||e.target.closest('#pstat')||e.target.closest('[data-shop]'))){e.preventDefault();openShop();}},true);
// shop entry in power-up menu
(function(){const pm=$('pmenu');if(pm&&!$('pmShop')){const b=document.createElement('button');b.className='pbtn';b.id='pmShop';b.dataset.shop='1';b.innerHTML='🪙 GET COINS<small>Coin packs · Remove Ads</small>';const c=pm.querySelector('.card')||pm;c.appendChild(b);}})();

// ---------- D) ads ----------
const AD=P('AdMob');let adReady=false,adInit=false,lastAd=0,npa=true;
const adsOk=()=>!!AD&&adInit&&!noAds();
const rewardLeft=()=>{const r=LS('startiles.rw',{});const d=new Date().toDateString();return Math.max(0,C.admob.rewardPerDay-(r.d===d?r.n:0));};
async function initAds(){if(!AD||noAds())return;try{
 let st=await AD.trackingAuthorizationStatus();if(st&&st.status==='notDetermined'){await new Promise(r=>setTimeout(r,1500));st=await AD.requestTrackingAuthorization().then(()=>AD.trackingAuthorizationStatus());}
 npa=!(st&&st.status==='authorized');await AD.initialize({initializeForTesting:!!C.admob.testing});adInit=true;prepInter();}catch(e){console.warn('admob',e);}}
async function prepInter(){if(!adsOk())return;try{await AD.prepareInterstitial({adId:C.admob.interstitial,isTesting:!!C.admob.testing,npa});adReady=true;}catch(e){adReady=false;}}
async function interstitial(){if(!adsOk()||!adReady||Date.now()-lastAd<C.admob.minGapSec*1000)return;lastAd=Date.now();adReady=false;try{await AD.showInterstitial();}catch(e){}setTimeout(prepInter,3000);}
async function rewarded(){if(!adsOk()||!rewardLeft())return;shopMsg('Loading ad…');try{await AD.prepareRewardVideoAd({adId:C.admob.rewarded,isTesting:!!C.admob.testing,npa});const r=await AD.showRewardVideoAd();
 if(r){const d=new Date().toDateString(),s=LS('startiles.rw',{});SS('startiles.rw',{d,n:(s.d===d?s.n:0)+1});addCoins(C.admob.rewardCoins);say('+'+C.admob.rewardCoins+' 🪙');}shopMsg('');renderShop();}catch(e){shopMsg('No ad available right now');}}
// interstitial only after a completed game (end panel), never mid-game
if(typeof showEnd==='function'){const _se=showEnd;window.showEnd=showEnd=function(){_se.apply(this,arguments);setTimeout(interstitial,1600);};}
setTimeout(initAds,2500);

// ---------- B) turn notifications ----------
const PN=P('PushNotifications');const activeRooms=()=>{try{return Object.values(JSON.parse(localStorage.getItem('startiles.online.games'))||{}).filter(o=>o&&!o.over).map(o=>o.code).slice(0,30);}catch(e){return [];}};
let pushTok=LS('startiles.push',null);
async function registerPush(tok,platform,sub){pushTok={tok,platform,sub};SS('startiles.push',pushTok);await syncRooms(true);}
let lastRooms='';async function syncRooms(force){if(!pushTok)return;const r=activeRooms(),k=r.join(',');if(!force&&k===lastRooms)return;lastRooms=k;
 try{await rpc('register_push',{p_device:DEV,p_platform:pushTok.platform,p_token:pushTok.tok||null,p_sub:pushTok.sub||null,p_rooms:r,p_name:profile.name||'Player'});}catch(e){console.warn('push reg',e);lastRooms='';}}
async function askPush(){if(LS('startiles.push.asked',false)&&!pushTok)return;SS('startiles.push.asked',true);
 if(PN){try{let p=await PN.checkPermissions();if(p.receive!=='granted')p=await PN.requestPermissions();if(p.receive!=='granted')return;
   PN.addListener('registration',t=>registerPush(t.value,'ios',null));PN.addListener('registrationError',e=>console.warn('apns',e));
   PN.addListener('pushNotificationActionPerformed',a=>{const c=a&&a.notification&&a.notification.data&&a.notification.data.room;if(c&&typeof openGame==='function')openGame(c);});await PN.register();}catch(e){console.warn(e);}return;}
 if('PushManager'in window&&'serviceWorker'in navigator&&(navigator.standalone||matchMedia('(display-mode: standalone)').matches)&&C.vapidPublic){
  const ok=confirm('Get a notification when it\'s your turn in online games?');if(!ok)return;try{if(await Notification.requestPermission()!=='granted')return;
   const reg=await navigator.serviceWorker.ready;const key=Uint8Array.from(atob(C.vapidPublic.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-C.vapidPublic.length%4)%4)),c=>c.charCodeAt(0));
   const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await registerPush(null,'web',sub.toJSON());}catch(e){console.warn('webpush',e);}}}
if(typeof beginOnline==='function'){const _b=beginOnline;window.beginOnline=beginOnline=function(){const r=_b.apply(this,arguments);setTimeout(()=>{if(!pushTok)askPush();else syncRooms(true);},4000);return r;};}
setInterval(()=>syncRooms(false),20000);
// after my online move, ping the other player's device(s)
if(typeof Online!=='undefined'&&Online.act){const _a=Online.act.bind(Online);Online.act=function(a){const r=_a(a);try{if(a&&(a.type==='commit'||a.type==='resign')){const code=Online.st.code,me=meIdx();
  setTimeout(()=>fetch(C.supabaseUrl+'/functions/v1/notify-turn',{method:'POST',headers:{'content-type':'application/json',apikey:C.supabaseAnon,Authorization:'Bearer '+C.supabaseAnon},
   body:JSON.stringify({room:code,from_device:DEV,from_name:profile.name||'Player',scores:[g.scores[me],g.scores[1-me]],over:!!g.over})}).catch(()=>{}),300);}}catch(e){}return r;};}
if(PN&&LS('startiles.push',null))askPush(); // re-register on launch (token can change)
window.StNative={DEV,openShop,noAds,askPush,interstitial};
})();
