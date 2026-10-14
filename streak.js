// v50: win streaks (bonus coins) + daily login bonus (7-day cycle)
(function(){
const X=()=>{profile.ext=profile.ext||{};return profile.ext;};
const day=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const prev=k=>{const d=new Date(+k.slice(0,4),+k.slice(5,7)-1,+k.slice(8,10)-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const LOGIN=[20,25,30,40,50,75,100];
function login(){const x=X(),k=day();const l=x.login||{last:null,n:0};if(l.last===k)return;l.n=l.last===prev(k)?l.n+1:1;l.last=k;x.login=l;const amt=LOGIN[(l.n-1)%7];addCoins(amt);saveProfile();
 const strip=LOGIN.map((v,i)=>'<span class="lgd'+(i<((l.n-1)%7)?' done':i===((l.n-1)%7)?' now':'')+'">D'+(i+1)+'<b>'+v+'</b></span>').join('');
 document.body.insertAdjacentHTML('beforeend','<div id="loginb" class="show"><div class="chcard miscard lgc"><h2>🎁 Daily login bonus</h2><p>Day '+l.n+' in a row</p><div class="lgstrip">'+strip+'</div><p class="lgamt">+'+amt+' 🪙</p><small>Come back tomorrow for '+LOGIN[l.n%7]+'! Missing a day restarts at Day 1.</small><button class="btn big" id="lgOk">Collect</button></div></div>');
 $('lgOk').onclick=()=>{$('loginb').remove();try{SFX.chime&&SFX.chime(400);}catch(e){}};showProfile&&showProfile();}
window.StStreak={login,LOGIN};
const _f=finish;window.finish=finish=function(){const G=g;const r=_f.apply(this,arguments);try{if(G&&!G._ws&&(G.mode==='ai'||G.mode==='online')){G._ws=1;const x=X(),ws=x.ws||{cur:0,best:0},me=G.mode==='online'?meIdx():0;
 if(G.winner===me){ws.cur++;ws.best=Math.max(ws.best,ws.cur);let line='🔥 Win streak '+ws.cur;if(ws.cur>=2){const b=Math.min(50,5*ws.cur);addCoins(b);line+=' · +'+b+' 🪙 bonus';}
   $('endres').innerHTML+='<br><span class="wsline">'+line+'</span>';if(ws.cur>=3)setTimeout(()=>bannerSay('🔥 '+ws.cur+' wins in a row!'),1500);if(window.StAch&&ws.cur>=5)StAch.unlock('streak5');}
 else if(G.winner>=0){if(ws.cur>=2)$('endres').innerHTML+='<br><span class="wsline">Streak ended at '+ws.cur+'</span>';ws.cur=0;}
 x.ws=ws;saveProfile();wsBadge();}}catch(e){console.warn(e);}return r;};
if(window.StAch){const l=StAch.list();if(!l.some(a=>a[0]==='streak5'))l.push(['streak5','🔥','On fire','Win 5 games in a row']);}
function wsBadge(){const ws=X().ws||{cur:0,best:0};let b=$('wsBadge');if(!b){b=document.createElement('p');b.id='wsBadge';b.className='wsb';const st=$('pstat')||$('pname');st.after(b);}
 b.textContent=(ws.cur?'🔥 Win streak '+ws.cur:'🔥 No win streak yet')+' · best '+ws.best+' · login day '+((X().login||{}).n||0);}
wsBadge();setTimeout(login,1500);
})();
