(function(root){
const COLORS=['yellow','green','blue','pink','red','orange'];
const N=8, MOVES=10, RACK=9;
function mult(r,c){ if((r==0||r==N-1)&&(c==0||c==N-1)) return 3; if((r==2||r==5)&&(c==2||c==5)) return 2; return 1;}
function rnd(rng){return rng()<0.2?'star':COLORS[Math.floor(rng()*COLORS.length)];}
function rndColor(rng){return COLORS[Math.floor(rng()*COLORS.length)];}
function deal(rng){const r=[];for(let i=0;i<RACK;i++)r.push(rnd(rng));return r;}
function newGame(mode,rng){rng=rng||Math.random;
 const b=[];for(let r=0;r<N;r++){b.push([]);for(let c=0;c<N;c++)b[r].push(null);}
 [[3,3],[3,4],[4,3],[4,4]].forEach(([r,c])=>b[r][c]={color:rndColor(rng)});
 return {board:b,mode,turn:0,moves:[0,0],scores:[0,0],pot:1000,racks:[deal(rng),deal(rng)],power:[2,2],coins:[729,0],over:false,rng};}
const inb=(r,c)=>r>=0&&c>=0&&r<N&&c<N;
function canPlace(b,r,c){ if(!inb(r,c)||b[r][c])return false;
 if(b.every(row=>row.every(t=>!t)))return true; // empty board: anywhere
 return [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>inb(r+dr,c+dc)&&b[r+dr][c+dc]);}
// straight-line rule: all tiles placed this move share one row or one column
function inLine(placed,r,c){if(!placed.length)return true;
 const rowOk=placed.every(p=>p.r===r),colOk=placed.every(p=>p.c===c);return rowOk||colOk;}
function withPlaced(b,placed){const nb=b.map(x=>x.slice());placed.forEach(p=>nb[p.r][p.c]={color:p.color});return nb;}
function validNext(b,placed,r,c){return canPlace(withPlaced(b,placed),r,c)&&inLine(placed,r,c);}
function isLine(pl){return pl.every((p,i)=>inLine(pl.slice(0,i),p.r,p.c));}
function group(b,r,c){const col=b[r][c].color,seen=new Set(),st=[[r,c]],out=[];
 while(st.length){const [y,x]=st.pop(),k=y*N+x;if(seen.has(k))continue;seen.add(k);
  if(!inb(y,x))continue;const t=b[y][x];if(!t)continue;
  if(t.star){out.push([y,x]);st.push([y+1,x],[y-1,x],[y,x+1],[y,x-1]);continue;} // stars are wild and chain
  if(t.color!==col)continue;out.push([y,x]);st.push([y+1,x],[y-1,x],[y,x+1],[y,x-1]);}return out;}
function evaluate(b,pl,boost){const nb=b.map(row=>row.map(t=>t&&{...t}));let score=0;const seeds=[];
 for(const p of pl){nb[p.r][p.c]=p.color==='star'?{star:true,fresh:true,mult:mult(p.r,p.c)}:{color:p.color};}
 for(const p of pl){if(p.color!=='star'){seeds.push(p);continue;}for(const [y,x] of [[p.r+1,p.c],[p.r-1,p.c],[p.r,p.c+1],[p.r,p.c-1]])if(inb(y,x)&&nb[y][x]&&!nb[y][x].star)seeds.push({r:y,c:x});}
 let cleared=0;const done=new Set(),pops=[];
 for(const p of seeds){if(nb[p.r][p.c].star||done.has(p.r*N+p.c))continue;const g=group(nb,p.r,p.c);g.forEach(([y,x])=>{if(!nb[y][x].star)done.add(y*N+x)});
  if(g.length>=3){const ns=g.filter(([y,x])=>nb[y][x].star).length,cnt=g.length-ns+Math.min(ns,2);let m=1;g.forEach(([y,x])=>{m=Math.max(m,mult(y,x));});let s=20*cnt*m;if(cnt>=5)s*=2; // at most 2 stars count toward points
   score+=s;
   g.forEach(([y,x])=>{if(!nb[y][x].star){cleared++;pops.push({r:y,c:x,color:nb[y][x].color});}});}}
 for(const p of pops)nb[p.r][p.c]=null; // scored colored tiles are cleared; stars stay
 nb.forEach(r=>r.forEach(t=>t&&delete t.fresh));if(boost)score*=2;return {score,board:nb,cleared,pops};}
function commit(g,pl,boost){const p=g.turn;if(!isLine(pl))throw new Error('tiles must be in one row or column');
 if(boost){if(g.power[p]<1)boost=false;else g.power[p]--;}
 const res=evaluate(g.board,pl,boost);g.board=res.board;g.scores[p]+=res.score;g.pot+=Math.round(res.score/2)+100;
 const rack=g.racks[p];pl.forEach(x=>{let i=(x.slot!=null&&rack[x.slot]===x.color)?x.slot:rack.indexOf(x.color);if(i>=0)rack[i]=null;});
 endTurn(g);return res;}
function refill(g){const r=g.racks[g.turn];for(let i=0;i<RACK;i++)if(!r[i])r[i]=rnd(g.rng);}
function swap(g){g.racks[g.turn]=deal(g.rng);endTurn(g);}
function endTurn(g){g.moves[g.turn]++;
 if(g.moves[0]>=MOVES&&g.moves[1]>=MOVES){g.over=true;const w=g.scores[0]===g.scores[1]?-1:(g.scores[0]>g.scores[1]?0:1);g.winner=w;
  if(w>=0)g.scores[w]+=g.pot;g.coins[0]+=w===0?50:10;return;}
 g.turn=1-g.turn;refill(g);}
function isFinal(g){return g.moves[g.turn]===MOVES-1;}
// greedy bot: from every first placement, greedily extend along a line (up to 5 tiles), keep best scoring prefix
function aiMove(g){const b=g.board,rack=g.racks[g.turn];let best={score:0,pl:[]};
 const sameNb=(nb,r,c,col)=>[[1,0],[-1,0],[0,1],[0,-1]].filter(([dr,dc])=>inb(r+dr,c+dc)&&nb[r+dr][c+dc]&&(nb[r+dr][c+dc].color===col||col==='star'||nb[r+dr][c+dc].star)).length;
 function cands(pl,used){const nb=withPlaced(b,pl),out=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(!canPlace(nb,r,c)||!inLine(pl,r,c))continue;const seen=new Set();
   rack.forEach((col,i)=>{if(!col||used.has(i)||seen.has(col))return;seen.add(col);out.push({r,c,color:col,slot:i,h:sameNb(nb,r,c,col)});});}return out;}
 for(const f of cands([],new Set())){let pl=[f],used=new Set([f.slot]);
  for(let step=0;step<5;step++){const cur=evaluate(b,pl).score;if(cur>best.score)best={score:cur,pl:pl.slice()};
   let nx=null,ns=-1;for(const c of cands(pl,used)){const s=evaluate(b,pl.concat([c])).score*10+c.h;if(s>ns){ns=s;nx=c;}}
   if(!nx||ns<=0)break;pl.push(nx);used.add(nx.slot);}
  const cur=evaluate(b,pl).score;if(cur>best.score)best={score:cur,pl:pl.slice()};}
 if(best.score<=0)return {pl:[],boost:false};
 const boost=g.power[g.turn]>0&&(best.score>=120||isFinal(g));return {pl:best.pl,boost};}
const api={rnd,deal,COLORS,N,MOVES,RACK,mult,newGame,canPlace,inLine,validNext,isLine,evaluate,commit,swap,aiMove,isFinal,refill};
if(typeof module!=='undefined')module.exports=api;else root.Logic=api;
})(this);
