// v53: friend invite links – open straight into a game, +50 coins for both (once per friend)
(function(){
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const BONUS=50,MAXINV=10,DEV=()=>(window.StNative&&StNative.DEV)||LS('startiles.device','x');
const q=new URLSearchParams(window.ST_LAUNCH||'');const inv=q.get('inv'),from=(q.get('from')||'').slice(0,20);
if(inv&&q.get('room')&&inv!==DEV()){sessionStorage.setItem('startiles.inv',JSON.stringify({inv,from,room:Online.clean(q.get('room'))}));if(from)setTimeout(()=>bannerSay('🎁 '+from+' invited you! Enter your name and join for +'+BONUS+' 🪙'),900);}
// every shared room link becomes an invite link
const _rl=roomLink;window.roomLink=roomLink=function(c){return _rl(c)+'&inv='+encodeURIComponent(DEV())+'&from='+encodeURIComponent(profile.name||'A friend');};
// joiner: credit after the game actually starts, tell the host
const _b=beginOnline;window.beginOnline=beginOnline=function(){const r=_b.apply(this,arguments);try{const p=JSON.parse(sessionStorage.getItem('startiles.inv')||'null');
 if(p&&p.room===Online.st.code){sessionStorage.removeItem('startiles.inv');const got=LS('startiles.inv.got',{});
  setTimeout(()=>Online.send({t:'chat',id:'inv'+Online.st.id,sys:'inv',dev:DEV(),txt:'',name:profile.name,ts:Date.now()}),1500);
  if(!got[p.inv]){got[p.inv]=Date.now();SS('startiles.inv.got',got);addCoins(BONUS);saveProfile();setTimeout(()=>bannerSay('🎁 Invite bonus +'+BONUS+' 🪙'+(p.from?' – thanks to '+p.from:'')),2500);}}}catch(e){}return r;};
// host: friend joined through my link
const _in=chatIn;window.chatIn=chatIn=function(d){if(d&&d.sys==='inv'){const pay=LS('startiles.inv.paid',{});if(d.dev&&!pay[d.dev]&&Object.keys(pay).length<MAXINV&&Online.st.host){pay[d.dev]=Date.now();SS('startiles.inv.paid',pay);addCoins(BONUS);saveProfile();bannerSay('🎁 '+(d.name||'Your friend')+' joined from your invite! +'+BONUS+' 🪙');}return;}return _in.apply(this,arguments);};
// home button: host a room and open the share sheet
const b=document.createElement('button');b.className='btn big inv-open';b.id='invBtn';b.innerHTML='🎁 Invite a friend <small>you both get +'+BONUS+' coins</small>';($('cosBtn')||$('misBtn')).after(b);
b.onclick=()=>{if(!$('pname').value.trim()){$('pname').focus();say('Enter your name first');return;}$('hostBtn').click();
 let n=0;const t=setInterval(()=>{const c=$('onlcode').textContent.trim();if(/^[A-Z0-9]{6}$/.test(c)){clearInterval(t);$('shareCode').click();}else if(++n>40)clearInterval(t);},250);};
window.StInvite={BONUS};
})();
