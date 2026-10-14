// v49: ranked online play – Elo ratings + tiers Bronze → Galaxy (stored in profile.stats → Supabase profiles)
(function(){
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const TIERS=[[0,'Bronze','🥉'],[1100,'Silver','🥈'],[1250,'Gold','🥇'],[1400,'Platinum','💠'],[1550,'Diamond','💎'],[1700,'Nebula','🌌'],[1850,'Galaxy','🌠']];
const tier=r=>{let t=TIERS[0];for(const x of TIERS)if(r>=x[0])t=x;return {name:t[1],icon:t[2],min:t[0],next:(TIERS[TIERS.indexOf(t)+1]||[null])[0]};};
const R=()=>{if(!profile.rk)profile.rk={rating:1000,games:0,wins:0,peak:1000,ranked:true};return profile.rk;};
function elo(me,opp,res,games){const K=games<10?40:24,E=1/(1+Math.pow(10,(opp-me)/400));return Math.round(K*(res-E));}
window.StRank={tier,R,elo,TIERS};
const opps=()=>LS('startiles.rk.opp',{}),rated=()=>LS('startiles.rk.done',{});
function announce(){if(!isOn()||!R().ranked)return;const id='rk'+Online.st.id;Online.send({t:'chat',id,sys:'rk',r:R().rating,txt:'',name:profile.name,ts:Date.now()});}
// receive opponent rating (rides on the chat channel, never shown as a message)
const _in=chatIn;window.chatIn=chatIn=function(d){if(d&&d.sys==='rk'){if(isOn()&&+d.r>0){const o=opps();o[Online.st.code]=+d.r;SS('startiles.rk.opp',o);}return;}return _in.apply(this,arguments);};
const _b=beginOnline;window.beginOnline=beginOnline=function(){const r=_b.apply(this,arguments);setTimeout(announce,1200);setTimeout(announce,8000);return r;};
const _f=finish;window.finish=finish=function(){const G=g,on=G&&G.mode==='online',code=on&&Online.st.code;const r=_f.apply(this,arguments);
 try{if(on&&code&&R().ranked){const o=opps()[code],done=rated();if(o&&!done[code]){const me=meIdx(),res=G.winner<0?.5:G.winner===me?1:0,k=R(),before=k.rating,t0=tier(before).name;
   const d=elo(before,o,res,k.games);k.rating=Math.max(100,before+d);k.games++;if(res===1)k.wins++;k.peak=Math.max(k.peak,k.rating);done[code]=Date.now();SS('startiles.rk.done',done);saveProfile();
   const t=tier(k.rating),line='<br><span class="rkline">'+t.icon+' Ranked '+(d>=0?'+':'')+d+' → '+k.rating.toLocaleString()+' '+t.name+'</span>';$('result').innerHTML+=line;$('endres').innerHTML+=line;
   if(t.name!==t0)setTimeout(()=>bannerSay((d>0?'⬆ Promoted to ':'⬇ ')+t.icon+' '+t.name+'!'),1200);rkBtn();}
  else if(!o){const l='<br><span class="rkline">Unranked (opponent rating unknown)</span>';$('endres').innerHTML+=l;}}}catch(e){console.warn(e);}return r;};
function rkBtn(){let b=$('rkBtn');if(!b){b=document.createElement('button');b.className='btn mute rk';b.id='rkBtn';($('chatOffBtn')||$('muteBtn')).after(b);
  b.onclick=()=>{const k=R();k.ranked=!k.ranked;saveProfile();rkBtn();say(k.ranked?'Ranked online: ON':'Ranked online: OFF (casual)');};}
 const k=R(),t=tier(k.rating);b.innerHTML=t.icon+' '+t.name+' · '+k.rating.toLocaleString()+(t.next?' <small>('+(t.next-k.rating)+' to next)</small>':'')+' · Ranked '+(k.ranked?'ON':'OFF');}
rkBtn();
})();
