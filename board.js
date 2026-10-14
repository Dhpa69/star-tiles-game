// v48: weekly leaderboards (Supabase) + local achievements
(function(){
const LS=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const sb=()=>window.Account&&Account._sb&&Account._sb(),DEV=()=>(window.StNative&&StNative.DEV)||LS('startiles.device','');
const isoWeek=d=>{d=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const n=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-n);const y=d.getUTCFullYear(),w=Math.ceil(((d-Date.UTC(y,0,1))/864e5+1)/7);return y+'-W'+String(w).padStart(2,'0');};
const queue=()=>LS('startiles.lbq',[]);
async function flush(){const c=sb();if(!c||!navigator.onLine)return;let q=queue();while(q.length){const s=q[0];const {error}=await c.rpc('submit_score',s);if(error){console.warn('lb',error.message);return;}q.shift();SS('startiles.lbq',q);}}
function submit(mode,score,day){if(!(score>0))return;const q=queue();q.push({p_mode:mode,p_level:mode==='ai'?profile.difficulty:null,p_score:score|0,p_name:profile.name||'Player',p_device:DEV(),p_day:mode==='daily'?day:null});SS('startiles.lbq',q.slice(-20));flush();
 const best=LS('startiles.best',{});const k=mode+':'+isoWeek(new Date());if(!(best[k]>=score)){best[k]=score;SS('startiles.best',best);}}
window.StBoard={submit,flush};
// ---- achievements ----
const ACH=[
 ['first','🌱','First game','Finish a game'],['win1','🏅','First win','Beat the computer'],['win10','🎖','Veteran','Win 10 games'],
 ['m1k','✨','Nice move','Score 1,000+ in one move'],['m5k','💥','Epic move','Score 5,000+ in one move'],['m20k','🌌','Big Bang','Score 20,000+ in one move'],
 ['g20k','🚀','High flyer','Score 20,000+ in a game'],['g100k','👑','Legend','Score 100,000+ in a game'],
 ['hard','💪','Hard won','Beat Hard'],['expert','🧠','Expert slayer','Beat Expert'],['master','🏆','Master of Stars','Beat Master'],
 ['daily','🗓','Daily player','Finish a daily puzzle'],['daily7','📅','Regular','Daily puzzle on 7 days'],
 ['online','🌐','Social star','Finish an online game'],['groups3','🎨','Rainbow','Score 3+ groups in one move'],['stars','⭐','Star chain','Use 3+ stars in one scoring move']];
const got=()=>LS('startiles.ach',{});
function unlock(id){const a=got();if(a[id])return;a[id]=Date.now();SS('startiles.ach',a);const d=ACH.find(x=>x[0]===id);if(d){say('🏆 Achievement: '+d[1]+' '+d[2]);try{SFX.chime&&SFX.chime(800);}catch(e){}if(window.StGC)StGC.report(id);}achBtn();}
window.StAch={unlock,list:()=>ACH,got};
const _c=L.commit;L.commit=function(G,pl,b){const mover=G&&G.turn;const r=_c.apply(this,arguments);try{if(G===g){const me=G.mode==='online'?meIdx():0;if(mover===me||G.mode==='pvp'){if(r.score>=1000)unlock('m1k');if(r.score>=5000)unlock('m5k');if(r.score>=20000)unlock('m20k');if((r.groups||0)>=3)unlock('groups3');if(r.score>0&&pl.filter(t=>t.color==='star').length>=3)unlock('stars');}}}catch(e){}return r;};
const _f=finish;window.finish=finish=function(){const G=g;const r=_f.apply(this,arguments);try{const me=G.mode==='online'?meIdx():0,won=G.winner===me,sc=G.scores[me];unlock('first');
 if(G.mode==='ai'&&won){unlock('win1');const lv=profile.difficulty;if(lv==='hard')unlock('hard');if(lv==='expert'||lv==='master')unlock('expert');if(lv==='master')unlock('master');}
 if((profile.wins|0)>=10)unlock('win10');if(sc>=20000)unlock('g20k');if(sc>=100000)unlock('g100k');
 if(G.mode==='daily'){unlock('daily');if(Object.keys(LS('startiles.daily',{})).length>=7)unlock('daily7');}
 if(G.mode==='online')unlock('online');
 if(G.mode==='ai'&&G.resigned==null)submit('ai',sc);if(G.mode==='online')submit('online',sc);}catch(e){console.warn(e);}return r;};
// ---- panel ----
function achBtn(){let b=$('lbBtn');if(!b){b=document.createElement('button');b.className='btn big lb-open';b.id='lbBtn';($('dailyBtn')||$('misBtn')).after(b);b.onclick=open;}
 b.innerHTML='🏆 Leaderboard &amp; achievements <small>'+Object.keys(got()).length+'/'+ACH.length+' unlocked</small>';}
let tab='week';
async function load(){const el=$('lbList');const c=sb();if(tab==='ach'){const a=got();el.innerHTML='<div class="achg">'+ACH.map(x=>'<div class="ach'+(a[x[0]]?' on':'')+'"><i>'+x[1]+'</i><b>'+x[2]+'</b><small>'+x[3]+'</small></div>').join('')+'</div>';return;}
 if(!c){el.innerHTML='<p class="lbm">Offline</p>';return;}el.innerHTML='<p class="lbm">Loading…</p>';
 let q=c.from('scores').select('name,score,level,device_id').order('score',{ascending:false}).limit(25);
 q=tab==='daily'?q.eq('mode','daily').eq('day',window.StDaily?StDaily.day():''):q.eq('week',isoWeek(new Date())).in('mode',['ai','online']);
 const {data,error}=await q;if(error){el.innerHTML='<p class="lbm">Leaderboard is not set up yet.<br><small>'+error.message+'</small></p>';return;}
 const me=DEV();el.innerHTML=data.length?'<ol class="lbo">'+data.map(r=>'<li'+(r.device_id===me?' class="me"':'')+'><span>'+String(r.name).replace(/</g,'&lt;')+(r.level?' <em>'+r.level+'</em>':'')+'</span><b>'+r.score.toLocaleString()+'</b></li>').join('')+'</ol>':'<p class="lbm">No scores yet – be the first!</p>';}
function open(){$('lb').classList.add('show');load();flush();}
document.body.insertAdjacentHTML('beforeend','<div id="lb"><div class="chcard miscard"><div class="chhead"><b>🏆 Leaderboard</b><span></span><button class="btn" id="lbClose">✕</button></div><div class="lbtabs"><button data-t="week" class="on">This week</button><button data-t="daily">Today\'s daily</button><button data-t="ach">Achievements</button></div><div id="lbList"></div></div></div>');
$('lbClose').onclick=()=>$('lb').classList.remove('show');$('lb').addEventListener('click',e=>{if(e.target.id==='lb')$('lb').classList.remove('show');const t=e.target.closest('[data-t]');if(t){tab=t.dataset.t;document.querySelectorAll('.lbtabs button').forEach(b=>b.classList.toggle('on',b===t));load();}});
achBtn();addEventListener('online',flush);setTimeout(flush,4000);
})();
