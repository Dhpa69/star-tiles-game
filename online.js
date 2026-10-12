// Online rooms over a free public relay (ntfy.sh, HTTPS + Server-Sent Events, no account).
// Both phones run the same seeded game and exchange only actions, so state stays identical.
// Swap RELAY for a real backend later (see README-online.md).
const Online=(function(){
 const RELAY='https://ntfy.sh/';
 const st={on:false,host:false,me:0,code:null,topic:null,es:null,id:Math.random().toString(36).slice(2,10),applied:0,handlers:{},seen:new Set()};
 const rnd=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
 function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 function send(msg){msg.from=st.id;return fetch(RELAY+st.topic,{method:'POST',body:JSON.stringify(msg)}).catch(()=>{st.handlers.status&&st.handlers.status('Connection problem – retrying…');setTimeout(()=>send(msg),2000);});}
 function listen(){if(st.es)st.es.close();st.es=new EventSource(RELAY+st.topic+'/sse?since=all');
  st.es.onmessage=e=>{let d;try{d=JSON.parse(JSON.parse(e.data).message);}catch(_){return;}if(!d||d.from===st.id)return;const k=d.from+':'+(d.n??d.t);if(st.seen.has(k))return;st.seen.add(k);st.handlers.msg&&st.handlers.msg(d);};
  st.es.onerror=()=>{st.handlers.status&&st.handlers.status('Reconnecting…');};}
 return {st,mulberry,
  host(name,coins,h){Object.assign(st,{on:true,host:true,me:0,code:rnd(),applied:0,handlers:h});st.topic='startiles-room-'+st.code;st.hostInfo={name,coins};listen();return st.code;},
  join(code,name,coins,h){Object.assign(st,{on:true,host:false,me:1,code:code.toUpperCase().trim(),applied:0,handlers:h});st.topic='startiles-room-'+st.code;listen();send({t:'hello',name,coins});},
  start(seed,names,coins){send({t:'start',seed,names,coins});},
  act(a){const n=st.applied;st.applied++;send({t:'act',n,a});},
  leave(){if(st.es)st.es.close();st.on=false;},
  send};
})();
