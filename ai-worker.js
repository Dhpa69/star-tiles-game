// v54: run the computer's move search off the main thread (Expert/Master can take ~1.4s)
importScripts('logic.js?v=68');
onmessage=e=>{const {id,G,level}=e.data;try{G.rng=Math.random;const m=Logic.aiPlan(G,level);
 postMessage({id,ok:true,m:{blast:m.blast?{type:m.blast.type,r:m.blast.r,c:m.blast.c}:null,pl:m.pl||[],boost:m.boost||false,swap:!!m.swap,swapS:m.swapS}});}
 catch(err){postMessage({id,ok:false,err:String(err&&err.message||err)});}};
