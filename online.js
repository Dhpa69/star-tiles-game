// Online rooms over a free public relay (ntfy.sh, HTTPS + Server-Sent Events, no account).
// Both phones run the same seeded game and exchange only actions (lockstep). ntfy.sh caches
// messages ~12h, so a phone that left can rejoin by replaying the room history (since=all);
// as a fallback it asks the other phone to resend missing actions.
const Online=(function(){
 const RELAY='https://ntfy.sh/',SKEY='startiles.online';
 const st={on:false,host:false,me:0,code:null,topic:null,es:null,id:Math.random().toString(36).slice(2,10),applied:0,log:[],seed:null,names:null,coins:null,handlers:{},seen:new Set(),lastSeen:0};
 const rnd=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
 function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function send(msg,tries){msg.from=st.id;return fetch(RELAY+st.topic,{method:'POST',body:JSON.stringify(msg)}).catch(()=>{st.handlers.status&&st.handlers.status('Connection problem – retrying…');if((tries||0)<5)setTimeout(()=>send(msg,(tries||0)+1),2000);});}
 function listen(){if(st.es)st.es.close();st.since=Date.now();st.es=new EventSource(RELAY+st.topic+'/sse?since=all');
  st.es.onopen=()=>{st.handlers.status&&st.handlers.status('');};
  st.es.onmessage=e=>{let env,d;try{env=JSON.parse(e.data);d=JSON.parse(env.message);}catch(_){return;}if(!d||d.from===st.id)return;
   if(env.id){if(st.seen.has(env.id))return;st.seen.add(env.id);}d._old=env.time&&env.time*1000<st.since-5000;if(!d._old)st.lastSeen=Date.now();st.handlers.msg&&st.handlers.msg(d);};
  st.es.onerror=()=>{st.handlers.status&&st.handlers.status('Reconnecting…');};}
 function persist(){if(!st.on||st.seed==null)return;try{localStorage.setItem(SKEY,JSON.stringify({v:1,code:st.code,me:st.me,host:st.host,id:st.id,seed:st.seed,names:st.names,coins:st.coins,log:st.log,savedAt:Date.now()}));}catch(e){}}
 return {st,mulberry,send,persist,
  saved(){try{return JSON.parse(localStorage.getItem(SKEY));}catch(e){return null;}},
  clear(){localStorage.removeItem(SKEY);},
  host(name,coins,h){Object.assign(st,{on:true,host:true,me:0,code:rnd(),applied:0,log:[],seed:null,handlers:h});st.topic='startiles-room-'+st.code;listen();return st.code;},
  join(code,name,coins,h){Object.assign(st,{on:true,host:false,me:1,code:code.toUpperCase().trim(),applied:0,log:[],seed:null,handlers:h});st.topic='startiles-room-'+st.code;listen();send({t:'hello',name,coins});},
  resume(s,h){Object.assign(st,{on:true,host:s.host,me:s.me,code:s.code,id:s.id,applied:s.log.length,log:s.log.slice(),seed:s.seed,names:s.names,coins:s.coins,handlers:h});st.topic='startiles-room-'+st.code;
   st.seen=new Set();listen();send({t:'back',have:st.applied});},
  setGame(seed,names,coins){st.seed=seed;st.names=names;st.coins=coins;persist();},
  start(seed,names,coins){send({t:'start',seed,names,coins});},
  act(a){const n=st.applied;st.applied++;st.log.push(a);persist();send({t:'act',n,a});},
  record(a){st.applied++;st.log.push(a);persist();},
  resend(from){for(let n=from;n<st.log.length;n++)send({t:'act',n,a:st.log[n]});},
  ping(t){if(st.on)send({t:t||'ping',have:st.applied});},
  leave(){if(st.es)st.es.close();st.es=null;st.on=false;}};
})();
