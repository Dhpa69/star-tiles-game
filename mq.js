// Minimal MQTT 3.1.1 client over WebSocket (no account; public brokers). QoS0 publish/subscribe + retained.
// Used as the main realtime transport since v27: one persistent socket per broker, no per-request rate limits.
const MQ=(function(){
 const BROKERS=[{name:'shiftr',url:'wss://public.cloud.shiftr.io',user:'public',pass:'public'},{name:'emqx',url:'wss://broker.emqx.io:8084/mqtt'},{name:'hivemq',url:'wss://broker.hivemq.com:8884/mqtt'}];
 const enc=new TextEncoder(),dec=new TextDecoder();const subs=new Set();let onMsg=null,logf=()=>{};const conns=[];
 function vlen(n){const o=[];do{let b=n%128;n=Math.floor(n/128);if(n>0)b|=128;o.push(b);}while(n>0);return o;}
 function str(s){const b=enc.encode(s);return [b.length>>8,b.length&255,...b];}
 function pkt(type,flags,body){return new Uint8Array([(type<<4)|flags,...vlen(body.length),...body]);}
 let pid=1;
 function connect(c){if(c.ws&&(c.ws.readyState===0||c.ws.readyState===1))return;let ws;try{ws=new WebSocket(c.url,'mqtt');}catch(e){c.err=String(e);return;}
  ws.binaryType='arraybuffer';c.ws=ws;c.ok=false;c.buf=new Uint8Array(0);
  ws.onopen=()=>{const cid='stl'+Math.random().toString(36).slice(2,12);const fl=2|(c.user?0xC0:0);ws.send(pkt(1,0,[...str('MQTT'),4,fl,0,60,...str(cid),...(c.user?[...str(c.user),...str(c.pass)]:[])]));};
  ws.onmessage=e=>{const a=new Uint8Array(e.data),b=new Uint8Array(c.buf.length+a.length);b.set(c.buf);b.set(a,c.buf.length);c.buf=b;parse(c);};
  ws.onclose=()=>{const was=c.ok;c.ok=false;c.ws=null;if(was)logf(c.name+' disconnected');clearTimeout(c.rt);c.rt=setTimeout(()=>connect(c),c.back=Math.min((c.back||1000)*2,30000));};
  ws.onerror=()=>{c.err='socket error';};}
 function parse(c){while(c.buf.length>=2){let mul=1,len=0,i=1,b;do{if(i>=c.buf.length)return;b=c.buf[i++];len+=(b&127)*mul;mul*=128;}while(b&128);if(c.buf.length<i+len)return;
  const h=c.buf[0],body=c.buf.slice(i,i+len);c.buf=c.buf.slice(i+len);const type=h>>4;
  if(type===2){if(body[1]===0){c.ok=true;c.back=1000;c.since=Date.now();logf(c.name+' connected');if(subs.size)subscribe(c,[...subs]);}else logf(c.name+' refused '+body[1]);}
  else if(type===3){const tl=(body[0]<<8)|body[1],topic=dec.decode(body.slice(2,2+tl));let p=2+tl;if((h>>1)&3)p+=2;const payload=dec.decode(body.slice(p));const retained=!!(h&1);
   c.rx=Date.now();if(payload&&onMsg)onMsg(topic,payload,retained,c.name);}}}
 function subscribe(c,topics){if(!c.ok||!topics.length)return;const body=[(pid>>8)&255,pid&255];pid=pid%65000+1;topics.forEach(t=>body.push(...str(t),0));c.ws.send(pkt(8,2,body));}
 function unsubscribe(c,topics){if(!c.ok||!topics.length)return;const body=[(pid>>8)&255,pid&255];pid=pid%65000+1;topics.forEach(t=>body.push(...str(t)));c.ws.send(pkt(10,2,body));}
 setInterval(()=>conns.forEach(c=>{if(c.ok)try{c.ws.send(new Uint8Array([0xC0,0]));}catch(e){}}),45000);
 return {start(h,lg){onMsg=h;logf=lg||logf;if(!conns.length)BROKERS.forEach(b=>conns.push({...b}));conns.forEach(connect);},
  wake(){conns.forEach(c=>{if(!c.ok){clearTimeout(c.rt);c.back=1000;if(c.ws&&c.ws.readyState!==1){try{c.ws.close();}catch(e){}c.ws=null;}connect(c);}});},
  sub(t){if(subs.has(t))return;subs.add(t);conns.forEach(c=>subscribe(c,[t]));},
  unsub(t){if(!subs.delete(t))return;conns.forEach(c=>unsubscribe(c,[t]));},
  pub(topic,payload,retain){let n=0;const body=[...str(topic),...enc.encode(payload)];const p=pkt(3,retain?1:0,body);conns.forEach(c=>{if(c.ok){try{c.ws.send(p);n++;}catch(e){}}});return n;},
  get up(){return conns.filter(c=>c.ok).map(c=>c.name);},conns};
})();
