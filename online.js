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
 function send(msg,tries){msg.from=st.id;const topic=st.topic;return fetch(RELAY+topic,{method:'POST',body:JSON.stringify(msg)}).then(r=>{if(r.status===429||!r.ok)throw new Error(r.status);}).catch(e=>{st.handlers.status&&st.handlers.status(String(e.message)==='429'?'Relay busy (rate limited) – retrying…':'Connection problem – retrying…');if((tries||0)<5&&topic===st.topic)setTimeout(()=>send(msg,(tries||0)+1),2000*((tries||0)+1));});}
 // v24: two transports. SSE (fast) + fetch polling /json?poll=1&since=<last id> (reliable on iOS, where
 // EventSource dies in the background / home-screen PWA). Same handler + dedupe by ntfy message id.
 function handle(env){let d;if(!env||env.event&&env.event!=='message')return;try{d=JSON.parse(env.message);}catch(_){return;}
  if(env.id){if(st.seen.has(env.id))return;st.seen.add(env.id);st.pollId=env.id;}if(!d||d.from===st.id)return;
  d._old=env.time&&env.time*1000<st.since-5000;if(!d._old)st.lastSeen=Date.now();st.lastAct=Math.max(st.lastAct||0,(env.time||0)*1000);st.handlers.msg&&st.handlers.msg(d);}
 const status=t=>{st.handlers.status&&st.handlers.status(t);};
 function openSSE(){try{if(st.es)st.es.close();}catch(e){}if(typeof EventSource==='undefined')return;st.es=new EventSource(RELAY+st.topic+'/sse?since=all');
  st.es.onopen=()=>{st.sseOk=true;};st.es.onmessage=e=>{let env;try{env=JSON.parse(e.data);}catch(_){return;}handle(env);};
  st.es.onerror=()=>{st.sseOk=false;};}
 async function pollNow(){if(!st.on||!st.topic||st.polling)return;st.polling=true;const topic=st.topic;
  try{const r=await fetch(RELAY+topic+'/json?poll=1&since='+encodeURIComponent(st.pollId||'all'),{cache:'no-store'});
   if(r.status===429){st.backoff=Math.min((st.backoff||4000)*1.5,st.seed==null?12000:30000);status('Relay busy (rate limited) – retrying in '+Math.round(st.backoff/1000)+'s…');return;}
   if(!r.ok){status('Relay error '+r.status+' – retrying…');return;}st.backoff=0;st.netOk=Date.now();
   const txt=await r.text();if(topic!==st.topic)return;for(const line of txt.split('\n')){if(!line.trim())continue;try{handle(JSON.parse(line));}catch(e){}}
   st.handlers.ok&&st.handlers.ok();}
  catch(e){status('No connection to relay – retrying…');}finally{st.polling=false;}}
 function loop(){clearTimeout(st.loopT);if(!st.on)return;const waiting=st.seed==null,vis=typeof document==='undefined'||document.visibilityState==='visible';
  // waiting room: poll every 4s; in game: poll every 6s if SSE is down, else a 20s safety poll
  const gap=st.backoff||(waiting?4000:(st.sseOk?20000:6000));if(vis)pollNow();st.loopT=setTimeout(loop,gap);}
 function listen(){st.since=Date.now();st.sseOk=false;st.pollId=null;openSSE();loop();}
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&st.on){if(!st.es||st.es.readyState===2)openSSE();pollNow();}});
 // v22: many games at once, stored by room code in GKEY (old single-game SKEY migrated on first read)
 const GKEY='startiles.online.games';
 function all(){let m=null;try{m=JSON.parse(localStorage.getItem(GKEY));}catch(e){}if(!m||typeof m!=='object')m={};
  try{const old=JSON.parse(localStorage.getItem(SKEY));if(old&&old.code&&!m[old.code]){old.lastAct=old.savedAt||Date.now();m[old.code]=old;}if(old){localStorage.removeItem(SKEY);localStorage.setItem(GKEY,JSON.stringify(m));}}catch(e){}return m;}
 function putAll(m){try{localStorage.setItem(GKEY,JSON.stringify(m));}catch(e){}}
 function upd(code,f){const m=all();if(!m[code])return;f(m[code]);putAll(m);}
 function persist(extra){if(!st.on||!st.code)return;const m=all(),o=m[st.code]||{};m[st.code]=Object.assign(o,{v:2,code:st.code,me:st.me,host:st.host,id:st.id,seed:st.seed,names:st.names,coins:st.coins,log:st.log,savedAt:Date.now(),lastAct:Math.max(o.lastAct||0,st.lastAct||0)},extra||{});putAll(m);}
 // background polling of the rooms that are NOT open (ntfy /json?poll=1&since=<last id>), staggered, with backoff on 429/errors
 let pollGap=60000,pollT=null,polling=false;
 async function pollOne(s,h){const since=s.pollId||'all';let r;try{r=await fetch(RELAY+'startiles-room-'+s.code+'/json?poll=1&since='+encodeURIComponent(since));}catch(e){return 'err';}
  if(r.status===429)return 'limit';if(!r.ok)return 'err';const txt=await r.text();const msgs=[];
  for(const line of txt.split('\n')){if(!line.trim())continue;let env,d;try{env=JSON.parse(line);if(env.event!=='message')continue;d=JSON.parse(env.message);}catch(e){continue;}msgs.push({env,d});}
  let changed=false;const m=all(),o=m[s.code];if(!o)return 'ok';
  for(const {env,d} of msgs){o.pollId=env.id;if(!d||d.from===o.id)continue;o.lastAct=Math.max(o.lastAct||0,(env.time||0)*1000);
   if(d.t==='act'&&typeof d.n==='number'&&d.n===o.log.length){o.log.push(d.a);changed=true;}
   else if(d.t==='start'&&o.seed==null&&!o.host){o.seed=d.seed;o.names=d.names;o.coins=d.coins;changed=true;}
   else if(d.t==='hello'&&o.host&&o.seed==null){o.helloFrom={name:d.name,coins:d.coins};changed=true;}
   else if(d.t==='rematch'&&d.code){o.rematch=d.code;changed=true;}}
  putAll(m);if(changed&&h)h(o);return 'ok';}
 async function pollAll(h){if(polling)return;polling=true;let bad=false;
  try{const m=all();for(const code in m){if(st.on&&st.code===code)continue;const s=m[code];if(s.removed)continue;
   const r=await pollOne(s,h);if(r==='limit'){bad=true;break;}if(r==='err')bad=true;await new Promise(z=>setTimeout(z,1200));}}finally{polling=false;}
  pollGap=bad?Math.min(pollGap*2,600000):60000;clearTimeout(pollT);pollT=setTimeout(()=>pollAll(h),pollGap);}
 return {st,mulberry,send,persist,all,upd,pollAll,pollNow,clean,
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
