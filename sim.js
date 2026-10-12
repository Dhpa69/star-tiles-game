// head-to-head simulation: node sim.js expert hard 10
const L=require('./logic.js');const [A,B,n]=[process.argv[2]||'expert',process.argv[3]||'hard',+(process.argv[4]||10)];
let winsA=0,ties=0,worst=0,sumA=0,sumB=0;
for(let i=0;i<n;i++){let s=1000+i*7919;const r=()=>(s=(s*16807)%2147483647)/2147483647;const G=L.newGame('pvp',r);G.coins=[0,0];
 const seatA=i%2; // alternate who moves first
 while(!G.over){const lv=G.turn===seatA?A:B;const t=Date.now();const m=L.aiPlan(G,lv);worst=Math.max(worst,Date.now()-t);
  if(m.swap&&L.swap(G))continue;L.commit(G,m.pl,m.boost);}
 if(G.winner===seatA)winsA++;else if(G.winner<0)ties++;sumA+=G.scores[seatA];sumB+=G.scores[1-seatA];
 console.log(`game ${i+1}: ${A} ${G.scores[seatA]} vs ${B} ${G.scores[1-seatA]} -> ${G.winner===seatA?A:G.winner<0?'tie':B}`);}
console.log(JSON.stringify({A,B,games:n,winsA,ties,winRate:winsA/n,avgA:sumA/n,avgB:sumB/n,worstMoveMs:worst}));
