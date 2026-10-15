// Online rooms. Transport (v27): MQTT over WebSocket to public no-account brokers (mq.js: shiftr.io on 443,
// EMQX, HiveMQ), with each move stored as a retained message so a returning phone replays the history.
// ntfy.sh (HTTPS/SSE) is a secondary path. Both phones run the same seeded game and exchange only actions
// (lockstep); if anything is missing a phone asks the other to resend.
const Online=(function(){
 const RELAY='https://ntfy.sh/',SKEY='startiles.online';
 const st={on:false,host:false,me:0,code:null,topic:null,es:null,id:Math.random().toString(36).slice(2,10),applied:0,log:[],seed:null,names:null,coins:null,handlers:{},seen:new Set(),lastSeen:0};
 const clean=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 const rnd=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
 function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 // v27: main transport = MQTT over WebSocket (public no-account brokers, see mq.js), retained per-move topics give history.
 // ntfy.sh stays as a secondary path for the few important messages (hello/start/act/rematch) and when MQTT is down.
 const T=c=>'startiles/v1/'+c;const IMPORTANT={act:1,start:1,hello:1,rematch:1};
 const DBG=[];function dlog(m){DBG.push(new Date().toTimeString().slice(0,8)+' '+m);if(DBG.length>200)DBG.shift();st.lastLog=m;}
 function topicFor(code,msg){if(msg.t==='chat')return T(code)+'/c/'+msg.id;return msg.t==='act'?T(code)+'/a/'+msg.n:(msg.t==='start'||msg.t==='hello'||msg.t==='rematch')?T(code)+'/'+msg.t:T(code)+'/x';}
 function publish(code,msg){if(!msg.u)msg.u=Math.random().toString(36).slice(2,11);let n=0;try{n=MQ.pub(topicFor(code,msg),JSON.stringify(msg),!!IMPORTANT[msg.t]||msg.t==='chat');}catch(e){}
  if(!n&&IMPORTANT[msg.t]){PENDQ.push([code,msg]);if(PENDQ.length>50)PENDQ.shift();}
  dlog('tx '+msg.t+(msg.n!=null?'#'+msg.n:'')+' mqtt:'+n);return n;}
 const PENDQ=[];function flushQ(){const q=PENDQ.splice(0);q.forEach(([c,m])=>publish(c,m));}
 function send(msg,tries){msg.from=st.id;if(!tries){const n=publish(st.code,msg);if(n&&!IMPORTANT[msg.t])return Promise.resolve();}if(msg.t!=='rtc'&&st.dc&&st.dc.readyState==='open'){try{st.dc.send(JSON.stringify(msg));st.p2pSent=(st.p2pSent||0)+1;return Promise.resolve();}catch(e){}}const topic=st.topic;return fetch(RELAY+topic,{method:'POST',body:JSON.stringify(msg)}).then(r=>{if(r.status===429||!r.ok)throw new Error(r.status);st.netOk=Date.now();}).catch(e=>{dlog('ntfy send fail '+e.message);if(!MQ.up.length)st.handlers.status&&st.handlers.status(String(e.message)==='429'?'Relay busy (rate limited) – retrying…':'Connection problem – retrying…');if((tries||0)<5&&topic===st.topic)setTimeout(()=>send(msg,(tries||0)+1),String(e.message)==='429'?15000*((tries||0)+1):3000*((tries||0)+1));});}
 // v24: two transports. SSE (fast) + fetch polling /json?poll=1&since=<last id> (reliable on iOS, where
 // EventSource dies in the background / home-screen PWA). Same handler + dedupe by ntfy message id.
 function handle(env){let d;if(!env||env.event&&env.event!=='message')return;try{d=JSON.parse(env.message);}catch(_){return;}
  if(env.id){if(st.seen.has(env.id))return;st.seen.add(env.id);st.pollId=env.id;}if(!d||d.from===st.id)return;if(d.u){if(st.seen.has('u'+d.u))return;st.seen.add('u'+d.u);}dlog('rx ntfy '+d.t+(d.n!=null?'#'+d.n:''));
  d._old=env.time&&env.time*1000<st.since-5000;if(d.t==='rtc'){if(!d._old)rtcMsg(d);return;}
  if(d.t==='back'&&!d._old&&st.dc){rtcClose();if(!st.host)setTimeout(()=>sendSig({k:'req'}),300);} // peer came back via relay: our direct link is stale
  d._old=env.time&&env.time*1000<st.since-5000;if(!d._old)st.lastSeen=Date.now();st.lastAct=Math.max(st.lastAct||0,(env.time||0)*1000);st.handlers.msg&&st.handlers.msg(d);}
 // ---- v25 WiFi mode: WebRTC DataChannel peer-to-peer; ntfy carries only signaling (1 offer + 1 answer, ICE bundled) ----
 const ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
 function gathered(pc){return new Promise(r=>{if(pc.iceGatheringState==='complete')return r();const t=setTimeout(r,2500);pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);r();}});});}
 function rtcClose(){try{st.dc&&st.dc.close();}catch(e){}try{st.pc&&st.pc.close();}catch(e){}st.dc=null;st.pc=null;if(st.p2p){st.p2p=false;st.handlers.p2p&&st.handlers.p2p(false);}}
 function wireDC(dc){st.dc=dc;dc.onopen=()=>{st.p2p=true;st.lastSeen=Date.now();st.handlers.p2p&&st.handlers.p2p(true);try{dc.send(JSON.stringify({t:'ping',have:st.applied,from:st.id}));}catch(e){}};
  dc.onclose=()=>{const was=st.p2p;st.p2p=false;st.dc=null;if(was){st.handlers.p2p&&st.handlers.p2p(false);clearTimeout(st.rtcT);st.rtcT=setTimeout(()=>rtcStart(),30000);}};
  dc.onmessage=e=>{let d;try{d=JSON.parse(e.data);}catch(_){return;}if(!d||d.from===st.id)return;st.lastSeen=Date.now();st.handlers.msg&&st.handlers.msg(d);};}
 function rtcOK(){return typeof RTCPeerConnection!=='undefined'&&st.on&&st.seed!=null&&!st.team;} // v59: 4-phone team rooms stay on the broadcast relay
 // host makes the offer; joiner asks with 'req'. Gives up quietly (relay mode) if no answer within 20s.
 async function rtcStart(force){if(!rtcOK()||(!force&&st.dc&&st.dc.readyState==='open'))return;if(!st.host){sendSig({k:'req'});return;}
  st.offerAt=Date.now();rtcClose();const pc=new RTCPeerConnection(ICE),sid=Math.random().toString(36).slice(2,8);st.pc=pc;st.sid=sid;wireDC(pc.createDataChannel('game',{ordered:true}));
  try{await pc.setLocalDescription(await pc.createOffer());await gathered(pc);if(st.pc!==pc)return;st.offerAt=Date.now();sendSig({k:'offer',sid,sdp:pc.localDescription.sdp});}catch(e){return;}
  clearTimeout(st.rtcGive);st.rtcGive=setTimeout(()=>{if(st.pc===pc&&!st.p2p)rtcClose();},20000);}
 async function rtcAnswer(d){if(typeof RTCPeerConnection==='undefined')return;rtcClose();const pc=new RTCPeerConnection(ICE);st.pc=pc;st.sid=d.sid;pc.ondatachannel=e=>wireDC(e.channel);
  try{await pc.setRemoteDescription({type:'offer',sdp:d.sdp});await pc.setLocalDescription(await pc.createAnswer());await gathered(pc);if(st.pc!==pc)return;sendSig({k:'answer',sid:d.sid,sdp:pc.localDescription.sdp});}catch(e){}}
 function sendSig(o){o.t='rtc';st.rtcSig=(st.rtcSig||0)+1;send(o);}
 function rtcMsg(d){if(d.k==='req'&&st.host&&st.dc&&st.dc.readyState==='open'){rtcClose();}
  if(d.k==='req'&&st.host&&!(st.pc&&st.pc.signalingState==='have-local-offer'&&Date.now()-st.offerAt<8000)){clearTimeout(st.rtcDeb);st.rtcDeb=setTimeout(()=>rtcStart(true),300);} // peer asked = it has no link (e.g. it reloaded)
  else if(d.k==='offer'&&!st.host)rtcAnswer(d);
  else if(d.k==='answer'&&st.host&&st.pc&&d.sid===st.sid&&st.pc.signalingState==='have-local-offer')st.pc.setRemoteDescription({type:'answer',sdp:d.sdp}).catch(()=>{});}
 const status=t=>{dlog('ntfy: '+t);if(!MQ.up.length)st.handlers.status&&st.handlers.status(t);};
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
  if(vis&&!st.sseOk&&!MQ.up.length&&(st.loopN++>0||!st.es||st.es.readyState===2))pollNow();if(!st.sseOk&&st.es&&st.es.readyState===2)openSSE();
  const gap=st.backoff||(waiting?10000:15000);st.loopT=setTimeout(loop,gap);}
 function listen(){MQ.sub(T(st.code)+'/#');st.since=Date.now();st.sseOk=false;st.pollId=null;st.loopN=0;st.backoff=0;openSSE();clearTimeout(st.loopT);st.loopT=setTimeout(loop,st.es?10000:1000);}
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&st.on){if(!st.es||st.es.readyState===2)openSSE();}});
 // v22: many games at once, stored by room code in GKEY (old single-game SKEY migrated on first read)
 const GKEY='startiles.online.games';
 function all(){let m=null;try{m=JSON.parse(localStorage.getItem(GKEY));}catch(e){}if(!m||typeof m!=='object')m={};
  try{const old=JSON.parse(localStorage.getItem(SKEY));if(old&&old.code&&!m[old.code]){old.lastAct=old.savedAt||Date.now();m[old.code]=old;}if(old){localStorage.removeItem(SKEY);localStorage.setItem(GKEY,JSON.stringify(m));}}catch(e){}return m;}
 function putAll(m){try{localStorage.setItem(GKEY,JSON.stringify(m));}catch(e){}}
 function upd(code,f){const m=all();if(!m[code])return;f(m[code]);putAll(m);}
 function persist(extra){if(!st.on||!st.code)return;const m=all(),o=m[st.code]||{};m[st.code]=Object.assign(o,{v:2,team:!!st.team,code:st.code,me:st.me,host:st.host,id:st.id,seed:st.seed,names:st.names,coins:st.coins,log:st.log,savedAt:Date.now(),lastAct:Math.max(o.lastAct||0,st.lastAct||0)},extra||{});putAll(m);}
 // v25: other saved rooms are checked with ONE multi-topic request (ntfy "t1,t2,.../json?poll=1&since=<unix>"),
 // at most every 3 min (10 min after a 429), never while connecting to a room. Rooms finished >1 day ago are skipped.
 let pollGap=180000,pollT=null,polling=false,lastPoll=0;
 function applyBg(o,env,d){o.pollTime=Math.max(o.pollTime||0,env.time||0);if(!d||d.from===o.id)return false;o.lastAct=Math.max(o.lastAct||0,(env.time||0)*1000);
  if(d.t==='act'&&typeof d.n==='number'&&d.n===o.log.length){o.log.push(d.a);return true;}
  if(d.t==='start'&&o.seed==null&&!o.host){o.dv=d.dv===2?2:1;o.seed=d.seed;o.names=d.names;o.coins=d.coins;o.rv=d.rv===2?2:1;return true;}
  if(d.t==='hello'&&o.host&&o.seed==null){o.helloFrom={name:d.name,coins:d.coins};return true;}
  if(d.t==='rematch'&&d.code){o.rematch=d.code;return true;}return false;}
 async function pollAll(h,force){bgH=h;bgSubs();if(MQ.up.length&&!force)return;if(polling)return;clearTimeout(pollT);pollT=setTimeout(()=>pollAll(h),pollGap);
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
 let bgH=null;
 function onMq(topic,payload,retained){const code=topic.split('/')[2];let d;try{d=JSON.parse(payload);}catch(e){return;}if(!d)return;
  if(st.on&&code===st.code){if(d.from===st.id)return;if(d.u){if(st.seen.has('u'+d.u))return;st.seen.add('u'+d.u);}dlog('rx mqtt '+d.t+(d.n!=null?'#'+d.n:'')+(retained?' (stored)':''));
   d._old=retained;if(d.t==='rtc')return;if(!retained)st.lastSeen=Date.now();st.lastAct=Math.max(st.lastAct||0,Date.now()*(retained?0:1));st.netOk=Date.now();st.handlers.msg&&st.handlers.msg(d);return;}
  const m=all(),o=m[code];if(!o)return;if(applyBg(o,{time:retained?0:Date.now()/1000},d)){putAll(m);bgH&&bgH(o);}}
 function bgSubs(){const m=all();for(const c in m){const o=m[c];if(o.removed||(o.over&&Date.now()-(o.lastAct||0)>86400000))continue;MQ.sub(T(c)+'/#');}}
 if(typeof WebSocket!=='undefined'&&typeof MQ!=='undefined'){MQ.start(onMq,m=>{dlog(m);st.handlers.net&&st.handlers.net();if(/connected$/.test(m)){bgSubs();setTimeout(flushQ,300);}});
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')MQ.wake();});}
 let reqs=0;const _f=typeof fetch!=='undefined'?fetch:null;if(_f&&typeof window!=='undefined'){window.fetch=function(u){if(String(u).indexOf('ntfy.sh')>=0)reqs++;return _f.apply(this,arguments);};}
 return {get reqs(){return reqs;},dump(){return DBG.join('\n');},dlog,netInfo(){const up=MQ.up;return (up.length?'live ✓ '+up.join('+'):'live ✗')+' · ntfy '+(st.sseOk?'✓':'✗')+(st.lastLog?' · '+st.lastLog:'');},st,mulberry,send,persist,all,upd,pollAll,pollNow,clean,
  get pollGap(){return pollGap;},
  saved(code){const m=all();if(code)return m[code]||null;const c=st.code&&m[st.code]?st.code:Object.keys(m)[0];return c?m[c]:null;},
  clear(code){const m=all();const c=code||st.code;delete m[c];putAll(m);if(!(st.on&&st.code===c))MQ.unsub(T(c)+'/#');},
  sendTo(code,id,msg){msg.from=id;publish(code,msg);return fetch(RELAY+'startiles-room-'+code,{method:'POST',body:JSON.stringify(msg)}).catch(()=>{});},
  host(name,coins,h){Object.assign(st,{team:false,on:true,host:true,me:0,code:rnd(),applied:0,log:[],seed:null,handlers:h});st.topic='startiles-room-'+st.code;st.id=Math.random().toString(36).slice(2,10);st.seen=new Set();st.lastAct=Date.now();listen();persist();return st.code;},
  join(code,name,coins,h){Object.assign(st,{team:false,on:true,host:false,me:1,code:clean(code),applied:0,log:[],seed:null,handlers:h});st.topic='startiles-room-'+st.code;st.id=Math.random().toString(36).slice(2,10);st.seen=new Set();st.lastAct=Date.now();listen();persist();send({t:'hello',name,coins});},
  resume(s,h){Object.assign(st,{team:!!s.team,on:true,host:s.host,me:s.me,code:s.code,id:s.id,applied:(s.log||[]).length,log:(s.log||[]).slice(),seed:s.seed,lastAct:s.lastAct||0,names:s.names,coins:s.coins,handlers:h});st.topic='startiles-room-'+st.code;
   st.seen=new Set();listen();send({t:'back',have:st.applied});},
  setGame(seed,names,coins){st.seed=seed;st.names=names;st.coins=coins;persist();},
  rtcStart,rtcClose,
  start(seed,names,coins,rv){const m=all();if(m[st.code]&&m[st.code].dv==null&&st.seed==null){m[st.code].dv=2;putAll(m);}const dv=(m[st.code]||{}).dv===2?2:1;send({t:'start',seed,names,coins,rv:rv||1,dv});},
  act(a){const n=st.applied;st.applied++;st.log.push(a);st.lastAct=Date.now();persist();send({t:'act',n,a});},
  record(a){st.applied++;st.log.push(a);persist();},
  resend(from){for(let n=from;n<st.log.length;n++)send({t:'act',n,a:st.log[n]});},
  ping(t){if(st.on)send({t:t||'ping',have:st.applied});},
  leave(){rtcClose();clearTimeout(st.rtcT);if(st.es)st.es.close();st.es=null;st.on=false;clearTimeout(st.loopT);}};
})();
