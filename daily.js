// v47: Daily puzzle – same seeded board + pieces for everyone each day, solo 10 moves, shareable emoji result.
(function(){
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const day=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const EPOCH=Date.UTC(2026,9,1);const num=k=>Math.round((Date.UTC(+k.slice(0,4),+k.slice(5,7)-1,+k.slice(8,10))-EPOCH)/864e5)+1;
const seedOf=k=>{let h=2166136261;for(const ch of 'startiles-daily-'+k){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const res=()=>LS('startiles.daily',{}),today=()=>res()[day()];
const sq=s=>s<=0?'⬛':s<200?'🟦':s<600?'🟩':s<1500?'🟨':s<3000?'🟧':'🟥';
function shareText(r){const k=r.day,m=r.moves||[];return '⭐ Star Tiles Daily #'+num(k)+' — '+r.score.toLocaleString()+'\n'+m.slice(0,5).map(sq).join('')+'\n'+m.slice(5,10).map(sq).join('')+'\nBest move '+Math.max(0,...m).toLocaleString()+' · https://dhpa69.github.io/star-tiles-game/?daily';}
async function share(r){const t=shareText(r);try{if(navigator.share){await navigator.share({text:t});return;}}catch(e){if(e&&e.name==='AbortError')return;}
 try{await navigator.clipboard.writeText(t);say('📋 Result copied!');}catch(e){window.prompt('Copy your result:',t);}}
window.StDaily={day,num,shareText,share,today};
function startDaily(){const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name first');return;}profile.name=nm;saveProfile();
 hideEnd();$('result').innerHTML='';clearSave();const k=day();g=L.newGame('daily',Online.mulberry(seedOf(k)),0);g.solo=true;g.daily=k;g.dailyN=num(k);g.moves[1]=L.MOVES;g.dmoves=[];
 g.practice=!!today();g.coins[0]=profile.coins;pieces=[];boost=false;busy=false;sel=firstFree();g._live=true;$('overlay').classList.remove('show');render();
 bannerSay(g.practice?'🗓 Daily #'+g.dailyN+' · practice replay':'🗓 Daily #'+g.dailyN+' · same board for everyone today!');}
window.startDaily=startDaily;
const _c=L.commit;L.commit=function(G,pl,b){const r=_c.apply(this,arguments);if(G&&G.solo&&G.dmoves)G.dmoves.push(r.score|0);return r;};
const _sw=L.swap;L.swap=function(G,s){const r=_sw.apply(this,arguments);if(r&&G&&G.solo&&G.dmoves&&(s===undefined||s===null))G.dmoves.push(0);return r;};
const _f=finish;window.finish=finish=function(){if(!g||g.mode!=='daily')return _f.apply(this,arguments);
 const sc=g.scores[0],k=g.daily;let r=today();const first=!r||r.day!==k;
 if(!g.practice&&first){r={day:k,score:sc,moves:g.dmoves.slice()};const all=res();all[k]=r;SS('startiles.daily',all);addCoins(15);}
 profile.coins=Math.max(profile.coins,g.coins[0]);saveProfile();endCtx={mode:'daily',on:null};clearSave();
 const show=r||{day:k,score:sc,moves:g.dmoves};
 $('result').innerHTML='🗓 Daily #'+num(k)+(g.practice?' (practice)':'')+'<br><b class="dscore">'+sc.toLocaleString()+'</b><br><span class="dgrid">'+shareText(show).split('\n').slice(1,3).join('<br>')+'</span>'+(g.practice?'<br>Today\'s official: '+r.score.toLocaleString():'<br>+15 🪙 daily reward');
 showEnd();$('endRe').style.display='none';let sb=$('endShare');if(!sb){sb=document.createElement('button');sb.className='btn big';sb.id='endShare';$('endRe').after(sb);}
 sb.style.display='';sb.textContent='📤 Share result';sb.onclick=()=>share(show);dBtn();if(window.StBoard)StBoard.submit('daily',sc,k);};
const _se=showEnd;window.showEnd=showEnd=function(){_se.apply(this,arguments);if(!g||g.mode!=='daily'){$('endRe').style.display='';const sb=$('endShare');if(sb)sb.style.display='none';}};
// autosave/resume: daily is not resumable (keeps the seed honest)
const _as=autosave;window.autosave=autosave=function(){if(g&&g.mode==='daily')return;return _as.apply(this,arguments);};
function dBtn(){let b=$('dailyBtn');if(!b){b=document.createElement('button');b.className='btn big daily-open';b.id='dailyBtn';$('misBtn').after(b);b.onclick=()=>window.startDaily();}
 const r=today();b.innerHTML=r?'🗓 Daily #'+num(day())+' · '+r.score.toLocaleString()+' ✓ <small>tap to share / replay</small>':'🗓 Daily puzzle #'+num(day())+' <small>same board for everyone</small>';
 if(r){b.onclick=()=>{if(confirm('Share today\'s result? (Cancel = practice replay)'))share(r);else window.startDaily();};}else b.onclick=()=>window.startDaily();}
dBtn();setInterval(dBtn,60000);
if(/[?&]daily\b/.test(location.search))setTimeout(()=>{if($('pname').value.trim())window.startDaily();else say('Enter your name, then tap Daily puzzle');},600);
})();
