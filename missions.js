// v37 daily missions: 3 per local day, picked deterministically by date; pure logic (node-testable), storage injected
(function(root){
const POOL=[
 {id:'win1',txt:'Win 1 game',goal:1,coins:30,k:'wins'},
 {id:'move2k',txt:'Score 2,000+ in one move',goal:1,coins:20,k:'bigMove'},
 {id:'pop30',txt:'Pop 30 tiles',goal:30,coins:20,k:'pops'},
 {id:'grp6',txt:'Make a group of 6+ tiles',goal:1,coins:25,k:'big6'},
 {id:'play3',txt:'Play 3 games',goal:3,coins:20,k:'games'},
 {id:'star5',txt:'Use a star in 5 groups',goal:5,coins:15,k:'starGroups'},
 {id:'winOn',txt:'Win an online game',goal:1,coins:40,k:'onlineWins'},
 {id:'pop60',txt:'Pop 60 tiles',goal:60,coins:30,k:'pops'},
 {id:'move1k3',txt:'Score 1,000+ in a move 3 times',goal:3,coins:25,k:'kMoves'},
 {id:'grp10',txt:'Score 10 groups',goal:10,coins:20,k:'groups'}];
const ALLBONUS=25,STREAK_STEP=10,STREAK_CAP=50;
function dayKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function pick(day){let h=hash('startiles:'+day);const idx=POOL.map((_,i)=>i),out=[];
 while(out.length<3){const i=h%idx.length;const m=POOL[idx.splice(i,1)[0]];if(!out.some(o=>o.k===m.k))out.push(m);h=Math.imul(h^(h>>>13),2246822519)>>>0;if(!idx.length)break;}return out;}
function prevDay(day){const [y,m,d]=day.split('-').map(Number);return dayKey(new Date(y,m-1,d-1));}
function fresh(day,old){const s={day,c:{},claimed:{},allClaimed:false,streak:1,streakClaimed:false,lastDay:day};
 if(old&&old.lastDay){s.streak=old.lastDay===prevDay(day)?Math.min((old.streak||1)+1,99):(old.lastDay===day?old.streak||1:1);}return s;}
function ensure(s,now){const day=dayKey(now);if(!s||s.day!==day)return fresh(day,s);return s;}
function list(s){return pick(s.day).map(m=>({...m,have:Math.min(m.goal,s.c[m.k]||0),done:(s.c[m.k]||0)>=m.goal,claimed:!!s.claimed[m.id]}));}
function streakBonus(s){return Math.min(STREAK_CAP,STREAK_STEP*(s.streak||1));}
// events: {type:'move',score,cleared,sizes:[n..],starGroups} | {type:'game',won,online}
function track(s,ev){const before=list(s).filter(m=>m.done).map(m=>m.id),c=s.c,add=(k,n)=>{if(n>0)c[k]=(c[k]||0)+n;};
 if(ev.type==='move'){add('pops',ev.cleared|0);add('groups',(ev.sizes||[]).length);add('starGroups',ev.starGroups|0);if(ev.score>=2000)add('bigMove',1);if(ev.score>=1000)add('kMoves',1);if((ev.sizes||[]).some(n=>n>=6))add('big6',1);}
 if(ev.type==='game'){add('games',1);if(ev.won){add('wins',1);if(ev.online)add('onlineWins',1);}}
 return list(s).filter(m=>m.done&&!before.includes(m.id));}
function claim(s,id){let n=0;const L=list(s);
 if(id==='streak'){if(!s.streakClaimed){s.streakClaimed=true;n=streakBonus(s);}return n;}
 if(id==='all'){if(!s.allClaimed&&L.every(m=>m.claimed)){s.allClaimed=true;n=ALLBONUS;}return n;}
 const m=L.find(x=>x.id===id);if(m&&m.done&&!m.claimed){s.claimed[id]=true;n=m.coins;}return n;}
const api={POOL,ALLBONUS,STREAK_STEP,STREAK_CAP,dayKey,pick,ensure,list,track,claim,streakBonus,prevDay};
if(typeof module!=='undefined')module.exports=api;else root.Missions=api;})(this);
