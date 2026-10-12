// Online rooms over a free public relay (ntfy.sh, HTTPS + Server-Sent Events, no account).
// Both phones run the same seeded game and exchange only actions (lockstep). ntfy.sh caches
// messages ~12h, so a phone that left can rejoin by replaying the room history (since=all);
// as a fallback it asks the other phone to resend missing actions.
const Online=(function(){
 const RELAY='https://ntfy.sh/',SKEY='startiles.online';
 const st={on:false,host:false,me:0,code:null,topic:null,es:null,id:Math.random().toString(36).slice(2,10),applied:0,log:[],seed:null,names:null,coins:null,handlers:{},seen:new Set(),lastSeen:0};
 const clean=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const rnd=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
 function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function send(msg,tries){msg.from=st.id;const topic=st.topic;return fetch(RELAY+topic,{method:'POST',body:JSON.stringify(msg)}).then(r=>{if(r.status===429||!r.ok)throw new Error(r.status);st.netOk=Date.now();}).catch(e=>{st.handlers.status&&st.handlers.status(String(e.message)==='429'?'Relay busy (rate limited) – retrying…':'Connection problem – retrying…');if((tries||0)<5&&topic===st.topic)setTimeout(()=>send(msg,(tries||0)+1),String(e.message)==='429'?15000*((tries||0)+1):3000*((tries||0)+1));});}
 // v24: two transports. SSE (fast) + fetch polling /json?poll=1&since=<last id> (reliable on iOS, where
 // EventSource dies in the background / home-screen PWA). Same handler + dedupe by ntfy message id.
 function handle(env){let d;if(!env||env.event&&env.event!=='message')return;try{d=JSON.parse(env.message);}catch(_){return;}
  if(env.id){if(st.seen.has(env.id))return;st.seen.add(env.id);st.pollId=env.id;}if(!d||d.from===st.id)return;
  d._old=env.time&&env.time*1000<st.since-5000;if(!d._old)st.lastSeen=Date.now();st.lastAct=Math.max(st.lastAct||0,(env.time||0)*1000);st.handlers.msg&&st.handlers.msg(d);}
 const status=t=>{st.handlers.status&&st.handlers.status(t);};
 function openSSE(){try{if(st.es)st.es.close();}catch(e){}if(typeof EventSource==='undefined')return;st.es=new EventSource(RELAY+st.topic+'/sse?since=all');
  st.es.onopen=()=>{st.sseOk=true;st.netOk=Date.now();};st.es.onmessage=e=>{let env;try{env=JSON.parse(e.data);}catch(_){return;}handle(env);};
  st.es.onerror=()=>{st.sseOk=false;};}
 async function pollNow(){if(!st.on||!st.topic||st.polling)return;st.polling=true;const topic=st.topic;
  try{const r=await fetch(RELAY+topic+'/json?poll=1&since='+encodeURIComponent(st.pollId||'all'),{cache:'no-store'});
   if(r.status===429){st.backoff=Math.max(15000,Math.min((st.backoff||10000)*1.5,90000));status('Relay busy (rate limited) – retrying in '+Math.round(st.backoff/1000)+'s…');return;}
   if(!r.ok){status('Relay error '+r.status+' – retrying…');return;}st.backoff=0;st.netOk=Date.now();
   const txt=await r.text();if(topic!==st.topic)return;for(const line of txt.split('\n')){if(!line.trim())continue;try{handle(JSON.parse(line));}catch(e){}}
   st.handlers.ok&&st.handlers.ok();}
  catch(e){status('No connection to relay – retrying…');}finally{st.polling=false;}}
 function loop(){clearTimeout(st.loopT);if(!st.on)return;const waiting=st.seed==null,vis=typeof document==='undefined'||document.visibilityState==='visible';
  // waiting room: poll every 4s; in game: poll every 6s if SSE is down, else a 20s safety poll
  // v25: the live SSE connection is the transport; poll only while it is down, at most every 10s (15s+ after a 429)
  if(vis&&!st.sseOk&&(st.loopN++>0||!st.es||st.es.readyState===2))pollNow();if(!st.sseOk&&st.es&&st.es.readyState===2)openSSE();
  const gap=st.backoff||(waiting?10000:15000);st.loopT=setTimeout(loop,gap);}
 function listen(){st.since=Date.now();st.sseOk=false;st.pollId=null;st.loopN=0;st.backoff=0;openSSE();clearTimeout(st.loopT);st.loopT=setTimeout(loop,st.es?10000:1000);}
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&st.on){if(!st.es||st.es.readyState===2)openSSE();}});
 // v22: many games at once, stored by room code in GKEY (old single-game SKEY migrated on first read)
 const GKEY='startiles.online.games';
 function all(){let m=null;try{m=JSON.parse(localStorage.getItem(GKEY));}catch(e){}if(!m||typeof m!=='object')m={};
  try{const old=JSON.parse(localStorage.getItem(SKEY));if(old&&old.code&&!m[old.code]){old.lastAct=old.savedAt||Date.now();m[old.code]=old;}if(old){localStorage.removeItem(SKEY);localStorage.setItem(GKEY,JSON.stringify(m));}}catch(e){}return m;}
 function putAll(m){try{localStorage.setItem(GKEY,JSON.stringify(m));}catch(e){}}
 function upd(code,f){const m=all();if(!m[code])return;f(m[code]);putAll(m);}
 function persist(extra){if(!st.on||!st.code)return;const m=all(),o=m[st.code]||{};m[st.code]=Object.assign(o,{v:2,code:st.code,me:st.me,host:st.host,id:st.id,seed:st.seed,names:st.names,coins:st.coins,log:st.log,savedAt:Date.now(),lastAct:Math.max(o.lastAct||0,st.lastAct||0)},extra||{});putAll(m);}
 // v25: other saved rooms are checked with ONE multi-topic request (ntfy "t1,t2,.../json?poll=1&since=<unix>"),
 // at most every 3 min (10 min after a 429), never while connecting to a room. Rooms finished >1 day ago are skipped.
 let pollGap=180000,pollT=null,polling=false,lastPoll=0;
 function applyBg(o,env,d){o.pollTime=Math.max(o.pollTime||0,env.time||0);if(!d||d.from===o.id)return false;o.lastAct=Math.max(o.lastAct||0,(env.time||0)*1000);
  if(d.t==='act'&&typeof d.n==='number'&&d.n===o.log.length){o.log.push(d.a);return true;}
  if(d.t==='start'&&o.seed==null&&!o.host){o.seed=d.seed;o.names=d.names;o.coins=d.coins;return true;}
  if(d.t==='hello'&&o.host&&o.seed==null){o.helloFrom={name:d.name,coins:d.coins};return true;}
  if(d.t==='rematch'&&d.code){o.rematch=d.code;return true;}return false;}
 async function pollAll(h,force){if(polling)return;clearTimeout(pollT);pollT=setTimeout(()=>pollAll(h),pollGap);
  if(st.on&&st.seed==null)return; // connecting: leave the request budget to the room
  if(!force&&Date.now()-lastPoll<Math.min(pollGap,60000))return;
  const m=all(),codes=Object.keys(m).filter(c=>!(st.on&&st.code===c)&&!m[c].removed&&!(m[c].over&&Date.now()-(m[c].lastAct||0)>86400000));
  if(!codes.length)return;polling=true;lastPoll=Date.now();
  try{const since=Math.max(Math.floor(Date.now()/1000)-43200,Math.min(...codes.map(c=>(m[c].pollTime||0)))+0);
   const r=await fetch(RELAY+codes.map(c=>'startiles-room-'+c).join(',')+'/json?poll=1&since='+(since>0?since:'all'),{cache:'no-store'});
   if(r.status===429){pollGap=600000;return;}if(!r.ok)return;pollGap=180000;const txt=await r.text();
   const mm=all(),changed=new Set(),seen=new Set();
   for(const line of txt.split('\n')){if(!line.trim())continue;let env,d;try{env=JSON.parse(line);if(env.event!=='message')continue;d=JSON.parse(env.message);}catch(e){continue;}
    if(seen.has(env.id))continue;seen.add(env.id);const code=(env.topic||'').replace('startiles-room-','');const o=mm[code];if(!o)continue;if(applyBg(o,env,d))changed.add(code);}
   putAll(mm);if(h)changed.forEach(c=>h(mm[c]));}
  catch(e){}finally{polling=false;}}
 let reqs=0;const _f=typeof fetch!=='undefined'?fetch:null;if(_f&&typeof window!=='undefined'){window.fetch=function(u){if(String(u).indexOf('ntfy.sh')>=0)reqs++;return _f.apply(this,arguments);};}
 return {get reqs(){return reqs;},st,mulberry,send,persist,all,upd,pollAll,pollNow,clean,
  get pollGap(){return pollGap;},
  saved(code){const m=all();if(code)return m[code]||null;const c=st.code&&m[st.code]?st.code:Object.keys(m)[0];return c?m[c]:null;},
  clear(code){const m=all();delete m[code||st.code];putAll(m);},
  sendTo(code,id,msg){msg.from=id;return fetch(RELAY+'startiles-room-'+code,{method:'POST',body:JSON.stringify(msg)}).catch(()=>{});},
  host(name,coins,h){Object.assign(st,{on:true,host:true,me:0,code:rnd(),applied:0,log:[],seed:null,handlers:h});st.topic='startiles-room-'+st.code;st.id=Math.random().toString(36).slice(2,10);st.seen=new Set();st.lastAct=Date.now();listen();persist();return st.code;},
  join(code,name,coins,h){Object.assign(st,{on:true,host:false,me:1,code:clean(code),applied:0,log:[],seed:null,handlers:h});st.topic='startiles-room-'+st.code;st.id=Math.random().toString(36).slice(2,10);st.seen=new Set();st.lastAct=Date.now();listen();persist();send({t:'hello',name,coins});},
  resume(s,h){Object.assign(st,{on:true,host:s.host,me:s.me,code:s.code,id:s.id,applied:(s.log||[]).length,log:(s.log||[]).slice(),seed:s.seed,lastAct:s.lastAct||0,names:s.names,coins:s.coins,handlers:h});st.topic='startiles-room-'+st.code;
   st.seen=new Set();listen();send({t:'back',have:st.applied});},
  setGame(seed,names,coins){st.seed=seed;st.names=names;st.coins=coins;persist();},
  start(seed,names,coins){send({t:'start',seed,names,coins});},
  act(a){const n=st.applied;st.applied++;st.log.push(a);st.lastAct=Date.now();persist();send({t:'act',n,a});},
  record(a){st.applied++;st.log.push(a);persist();},
  resend(from){for(let n=from;n<st.log.length;n++)send({t:'act',n,a:st.log[n]});},
  ping(t){if(st.on)send({t:t||'ping',have:st.applied});},
  leave(){if(st.es)st.es.close();st.es=null;st.on=false;clearTimeout(st.loopT);}};
})();
