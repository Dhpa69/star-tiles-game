// v54: freeze protection – AI in a Web Worker, input-lock watchdog, error recovery
(function(){
let W=null,wid=0;const cbs={};
function worker(){if(W!==null)return W;try{W=new Worker('ai-worker.js?v=70');W.onmessage=e=>{const c=cbs[e.data.id];delete cbs[e.data.id];if(c)c(e.data);};W.onerror=()=>{W=false;Object.keys(cbs).forEach(k=>{const c=cbs[k];delete cbs[k];c({ok:false});});};}catch(e){W=false;}return W;}
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
setInterval(()=>{try{if(!busy||window.aiThinking||window.replayActive||document.hidden||window.adPaused){since=0;return;} // v63: queued replays have their own time caps
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden){since=0;wakeAudio('visible');}});
})();

// v55: never open the keyboard by itself – inputs get focus only right after a real tap/key
(function(){let last=0;const mark=()=>{last=Date.now();};['pointerdown','touchstart','mousedown','keydown'].forEach(t=>addEventListener(t,mark,true));
 document.addEventListener('focusin',e=>{const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&!t.dataset.allowFocus&&Date.now()-last>1200){t.blur();}},true);
 document.querySelectorAll('[autofocus]').forEach(el=>el.removeAttribute('autofocus'));
 addEventListener('input',e=>{if(e.target&&e.target.id==='pname')e.target.classList.remove('needname');});})();

// v56: sound after backgrounding (iOS) – resume, or rebuild the AudioContext if resume fails / it was closed
let waking=false;
// v60: robust audio. Cause of random silence on iOS: the old code, on a touchSTART (where iOS does not allow
// audio to unlock yet), waited 350ms and then threw the context away and built a new one from a timer. That new
// context was born "suspended" outside a tap, and it replaced the context the same tap's touchEND had just
// unlocked -> silence until some later lucky tap. iOS also puts the context into "interrupted"/"suspended" mid-play
// (notifications, Siri, calls, other audio) without any visibility change, and nothing resumed it.
// Now: resume on every gesture (never rebuild from a timer), rebuild only if closed or if it stayed dead across
// 2 real taps, watch statechange and retry, and visibility/pageshow/focus/app-resume all resume.
let deadTaps=0;const hooked=new WeakSet();
function hook(c){if(!c||hooked.has(c))return;hooked.add(c);try{c.addEventListener('statechange',()=>{AST.last=c.state;AST.log.push(c.state);if(AST.log.length>30)AST.log.shift();
  if(c.state!=='running'&&c.state!=='closed'&&!window.adPaused&&document.visibilityState==='visible')[300,1200,3000].forEach(ms=>setTimeout(()=>wakeAudio('statechange'),ms));});}catch(e){}}
const AST={last:null,log:[],rebuilds:0};window._audioState=AST;
function wakeAudio(why){try{if(typeof profile!=='undefined'&&profile.muted)return;if(window.adPaused&&why!=='ad')return;
 const gesture=/^(touchend|pointerup|click|keydown|pointerdown|touchstart)$/.test(why);
 let c=window._audioCtx&&window._audioCtx();
 if(!c||c.state==='closed'){if(!gesture&&c)return;c=window._audioGet&&window._audioGet();hook(c);if(!c)return;}
 hook(c);
 if(c.state==='running'){deadTaps=0;}
 else{try{const p=c.resume();if(p&&p.catch)p.catch(()=>{});}catch(e){}
  if(why==='touchend'||why==='click'||why==='pointerup'||why==='keydown'){ // real unlock gestures on iOS
   try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);}catch(e){}
   if(++deadTaps>=3&&c.state!=='running'){deadTaps=0;AST.rebuilds++;c=window._audioReset&&window._audioReset();hook(c);try{c&&c.resume().catch(()=>{});const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);}catch(e){}}}}
 if(gesture){try{window._unlockAudio&&window._unlockAudio();}catch(e){}}}catch(e){}}
window.wakeAudio=wakeAudio;
['touchstart','pointerdown','touchend','pointerup','click','keydown'].forEach(t=>addEventListener(t,()=>wakeAudio(t),{capture:true,passive:true}));
setInterval(()=>{if(document.visibilityState==='visible')wakeAudio('tick');},4000); // safety: try to resume a context iOS silently suspended
addEventListener('pageshow',()=>wakeAudio('pageshow'));addEventListener('focus',()=>wakeAudio('focus'));
try{const A=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App;if(A&&A.addListener){A.addListener('resume',()=>wakeAudio('resume'));A.addListener('appStateChange',s=>{if(s&&s.isActive)wakeAudio('appState');});}}catch(e){}
document.addEventListener('resume',()=>wakeAudio('cordova-resume'),false);
// v57: pause everything while a full-screen ad is showing (replay, animations, count-ups, sounds, AI turn, watchdog)
(function(){const oST=window.setTimeout.bind(window),oRAF=window.requestAnimationFrame.bind(window),oSI=window.setInterval.bind(window);
 let paused=false,q=[],rq=[],safety=null;
 window.setTimeout=function(fn,ms,...a){if(typeof fn!=='function')return oST(fn,ms,...a);return oST(()=>{if(paused)q.push(()=>fn(...a));else fn(...a);},ms);};
 window.requestAnimationFrame=function(fn){return oRAF(t=>{if(paused)rq.push(fn);else fn(t);});};
 window.setInterval=function(fn,ms,...a){if(typeof fn!=='function')return oSI(fn,ms,...a);return oSI(()=>{if(!paused)fn(...a);},ms);};
 function pause(why){if(paused)return;paused=true;window.adPaused=true;document.body.classList.add('adpause');
  try{const c=window._audioCtx&&window._audioCtx();if(c&&c.state==='running')c.suspend().catch(()=>{});}catch(e){}
  clearTimeout(safety);safety=oST(()=>resume('safety'),120000);}
 function resume(why){if(!paused)return;paused=false;window.adPaused=false;document.body.classList.remove('adpause');clearTimeout(safety);
  try{window.wakeAudio&&wakeAudio('ad');const c=window._audioCtx&&window._audioCtx();if(c&&c.state!=='running')c.resume().catch(()=>{});}catch(e){}
  const a=q;q=[];a.forEach(f=>{try{f();}catch(e){console.error(e);}});const r=rq;rq=[];r.forEach(f=>oRAF(f));}
 window.StPause={pause,resume,get paused(){return paused;}};
 try{const AD=window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()&&Capacitor.Plugins.AdMob;if(AD&&AD.addListener){
  ['interstitialAdShowed','onRewardedVideoAdShowed','onRewardedInterstitialAdShowed'].forEach(ev=>AD.addListener(ev,()=>pause(ev)));
  ['interstitialAdDismissed','interstitialAdFailedToShow','onRewardedVideoAdDismissed','onRewardedVideoAdFailedToShow','onRewardedInterstitialAdDismissed','onRewardedInterstitialAdFailedToShow'].forEach(ev=>AD.addListener(ev,()=>oST(()=>resume(ev),150)));}}catch(e){}
})();
