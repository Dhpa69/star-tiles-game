// v54: freeze protection – AI in a Web Worker, input-lock watchdog, error recovery
(function(){
let W=null,wid=0;const cbs={};
function worker(){if(W!==null)return W;try{W=new Worker('ai-worker.js?v=55');W.onmessage=e=>{const c=cbs[e.data.id];delete cbs[e.data.id];if(c)c(e.data);};W.onerror=()=>{W=false;Object.keys(cbs).forEach(k=>{const c=cbs[k];delete cbs[k];c({ok:false});});};}catch(e){W=false;}return W;}
function snap(G){const {rng,...rest}=G;return JSON.parse(JSON.stringify(rest));}
// cb(plan) gets a plan whose blast (if any) is already applied to G, like L.aiPlan
window.planAI=function(G,level,cb){window.aiThinking=true;const done=m=>{window.aiThinking=false;cb(m);};
 const sync=()=>{let m;try{m=L.aiPlan(G,level);}catch(e){console.error(e);m={pl:[],boost:false,blast:null};}done(m);};
 const w=(level==='expert'||level==='master'||level==='hard')&&worker();if(!w)return sync();
 const id=++wid;let fin=false;const to=setTimeout(()=>{if(fin)return;fin=true;delete cbs[id];sync();},6000);
 cbs[id]=r=>{if(fin)return;fin=true;clearTimeout(to);if(!r.ok)return sync();const m=r.m;
  if(m.blast){const b=L.blast(G,m.blast.type,m.blast.r,m.blast.c);m.blast=b?{type:m.blast.type,r:m.blast.r,c:m.blast.c,cells:b.cells,pops:b.pops}:null;}done(m);};
 try{w.postMessage({id,G:snap(G),level});}catch(e){fin=true;clearTimeout(to);delete cbs[id];sync();}};
// watchdog: input lock stuck >8s (not counting AI thinking / a big celebration on screen / app hidden) → unlock and continue
let since=0;
setInterval(()=>{try{if(!busy||window.aiThinking||document.hidden){since=0;return;}
 const celeb=document.getElementById('celeb');if(celeb&&getComputedStyle(celeb).display!=='none'&&celeb.classList.contains('show')){since=Math.max(since,Date.now()-4000);}
 if(!since){since=Date.now();return;}
 if(Date.now()-since>8000){since=0;console.warn('watchdog: unlocking stuck input');unstick();}}catch(e){}},1000);
function unstick(){try{busy=false;if(typeof showRun!=='undefined')showRun++;if(typeof show!=='undefined')show=null;}catch(e){}
 document.querySelectorAll('.flt,.fxh,#celeb.show').forEach(e=>{if(e.id==='celeb')e.classList.remove('show');else e.remove();});
 try{render();if(g&&!g.over&&!isOn())next();else if(g&&g.over)finish();}catch(e){console.error(e);}}
window.StStable={unstick};
// any uncaught error while locked → recover shortly after
const onErr=()=>{if(typeof busy!=='undefined'&&busy&&!window.aiThinking)setTimeout(()=>{if(busy&&!window.aiThinking)unstick();},1500);};
addEventListener('error',onErr);addEventListener('unhandledrejection',onErr);
// coming back to the app: resume audio and make sure nothing is stuck
document.addEventListener('visibilitychange',()=>{if(!document.hidden){since=0;try{const c=window._audioCtx;if(c&&c.state!=='running')c.resume().catch(()=>{});}catch(e){}}});
})();

// v55: never open the keyboard by itself – inputs get focus only right after a real tap/key
(function(){let last=0;const mark=()=>{last=Date.now();};['pointerdown','touchstart','mousedown','keydown'].forEach(t=>addEventListener(t,mark,true));
 document.addEventListener('focusin',e=>{const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&!t.dataset.allowFocus&&Date.now()-last>1200){t.blur();}},true);
 document.querySelectorAll('[autofocus]').forEach(el=>el.removeAttribute('autofocus'));
 addEventListener('input',e=>{if(e.target&&e.target.id==='pname')e.target.classList.remove('needname');});})();
