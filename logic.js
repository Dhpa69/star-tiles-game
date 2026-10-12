(function(root){
const COLORS=['yellow','green','blue','pink','red','orange'];
const N=8, MOVES=10, RACK=9, START_COINS=100, WIN_COINS=10, EXTRA_COST=50; // economy: 1 free swap + 2 free power-ups per game, extras cost 50 coins, +10 coins per win only
function mult(r,c){ if((r==0||r==N-1)&&(c==0||c==N-1)) return 3; if((r==2||r==5)&&(c==2||c==5)) return 2; return 1;}
function rnd(rng){return rng()<0.08?'star':COLORS[Math.floor(rng()*COLORS.length)];}
function rndColor(rng){return COLORS[Math.floor(rng()*COLORS.length)];}
function piece(rng){let st=false;return [0,1,2].map(()=>{let t=rnd(rng);if(t==='star'){if(st)t=rndColor(rng);st=true;}return t;});} // max 1 star per piece
function deal(rng){return [].concat(piece(rng),piece(rng),piece(rng));}
function newGame(mode,rng){rng=rng||Math.random;
 const b=[];for(let r=0;r<N;r++){b.push([]);for(let c=0;c<N;c++)b[r].push(null);}
 [[3,3],[3,4],[4,3],[4,4]].forEach(([r,c])=>b[r][c]={color:rndColor(rng)});
 return {orient:[[0,0,0],[0,0,0]],board:b,mode,turn:0,moves:[0,0],scores:[0,0],pot:1000,racks:[deal(rng),deal(rng)],power:[2,2],swaps:[1,1],coins:[START_COINS,mode==='ai'?0:START_COINS],over:false,rng};}
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
// pieces: set s = rack slots 3s..3s+2, straight line of 3, orient 'h' or 'v', anchored at first tile
// orientation o: 0=0° horizontal, 1=90° vertical, 2=180° horizontal reversed, 3=270° vertical reversed ('h'/'v' = 0/1)
function normO(o){return o==='h'?0:o==='v'?1:((o%4)+4)%4;}
function rotateO(o){return (normO(o)+1)%4;}
function pieceTiles(rack,s,o,r,c){o=normO(o);const vert=o%2===1,rev=o>=2;
 return [0,1,2].map(j=>{const k=rev?2-j:j;return {r:vert?r+j:r,c:vert?c:c+j,color:rack[3*s+k],slot:3*s+k};});}
// only rule: the straight 3-tile piece fits inside the board on 3 empty cells (anywhere, no touching / collinear rules)
function validPiece(b,placed,tiles){const nb=withPlaced(b,placed);return tiles.every(t=>inb(t.r,t.c)&&!nb[t.r][t.c]&&t.color);}
// uncommitted piece helpers: move / rotate in place against the other pieces placed this move
function movePiece(b,rack,others,s,o,r,c){const t=pieceTiles(rack,s,o,r,c);return validPiece(b,others,t)?t:null;}
// rotate with auto-fit: try next rotation pivoting on the middle tile; if blocked, every position for that rotation,
// nearest to the original piece first (pivot distance, then overlap with original cells); then the following rotations.
function rotateInPlace(b,rack,others,s,o,r,c){const old=pieceTiles(rack,s,o,r,c),mid=old[1],oldSet=new Set(old.map(t=>t.r*N+t.c));
 for(let k=1;k<=3;k++){const no=(normO(o)+k)%4,cands=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const t=pieceTiles(rack,s,no,y,x);if(!validPiece(b,others,t))continue;
   const d=Math.abs(t[1].r-mid.r)+Math.abs(t[1].c-mid.c),ov=t.filter(q=>oldSet.has(q.r*N+q.c)).length;const ax=(no%2===1)?(t[1].c!==mid.c?1:0):(t[1].r!==mid.r?1:0);cands.push({d,ov,ax,y,x,t});}
  if(cands.length){cands.sort((p,q)=>p.d-q.d||p.ax-q.ax||q.ov-p.ov);const w=cands[0];return {o:no,r:w.y,c:w.x,tiles:w.t};}}
 return null;}
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
// exact preview of what PLAY would score now (same evaluate() as commit)
function previewMove(g,pl,boost){return evaluate(g.board,pl,!!boost&&canPower(g));}
function commit(g,pl,boost){const p=g.turn;
 if(boost){if(!canPower(g))boost=false;else usePower(g);}
 const res=evaluate(g.board,pl,boost);g.board=res.board;g.scores[p]+=res.score;g.pot+=Math.round(res.score/2)+100;
 const rack=g.racks[p];pl.forEach(x=>{let i=(x.slot!=null&&rack[x.slot]===x.color)?x.slot:rack.indexOf(x.color);if(i>=0)rack[i]=null;});
 endTurn(g);return res;}
function refill(g){const r=g.racks[g.turn];for(let s=0;s<3;s++)if(!r[3*s]){piece(g.rng).forEach((t,j)=>r[3*s+j]=t);g.orient[g.turn][s]=0;}}
function canSwap(g){return g.swaps[g.turn]>0||g.coins[g.turn]>=EXTRA_COST;}
function swap(g){if(!canSwap(g))return false;if(g.swaps[g.turn]>0)g.swaps[g.turn]--;else g.coins[g.turn]-=EXTRA_COST;g.racks[g.turn]=deal(g.rng);g.orient[g.turn]=[0,0,0];endTurn(g);return true;}
function endTurn(g){g.moves[g.turn]++;g.usedPower=false;
 if(g.moves[0]>=MOVES&&g.moves[1]>=MOVES){g.over=true;const w=g.scores[0]===g.scores[1]?-1:(g.scores[0]>g.scores[1]?0:1);g.winner=w;
  if(w>=0)g.scores[w]+=g.pot;if(w>=0)g.coins[w]+=WIN_COINS;return;}
 g.turn=1-g.turn;refill(g);}
function isFinal(g){return g.moves[g.turn]===MOVES-1;}
// bot search over whole pieces (all 4 orientations); beam = how many first pieces to extend; deadline caps time
function aiMove(g,opt){opt=opt||{};const beam=opt.beam||40,maxP=opt.maxPieces||3,t0=Date.now(),dl=opt.ms||600;
 const b=g.board,rack=g.racks[g.turn];let best={score:0,val:0,pl:[]};
 const starCost=pl=>opt.saveStars?pl.filter(t=>t.color==='star').length*15:0;
 function cands(pl,usedSets){const out=[];for(let s=0;s<3;s++){if(usedSets.includes(s)||!rack[3*s])continue;
  for(const o of [0,1,2,3])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t=pieceTiles(rack,s,o,r,c);if(validPiece(b,pl,t))out.push({s,o,t});}}return out;}
 const consider=pl=>{const sc=evaluate(b,pl).score,v=sc-starCost(pl);if(sc>0&&v>best.val)best={score:sc,val:v,pl:pl.slice()};return sc;};
 const first=cands([],[]).map(x=>({x,sc:evaluate(b,x.t).score})).sort((a,b)=>b.sc-a.sc).slice(0,beam);
 for(const {x} of first){if(Date.now()-t0>dl)break;let pl=x.t.slice(),used=[x.s];
  for(let k=1;k<maxP;k++){const sc=consider(pl);let nx=null,ns=0;for(const c of cands(pl,used)){const v=evaluate(b,pl.concat(c.t)).score;if(v>ns){ns=v;nx=c;}}
   if(!nx||ns<=sc)break;pl=pl.concat(nx.t);used.push(nx.s);}
  consider(pl);}
 if(best.score<=0)return {pl:[],boost:false,score:0};
 const boost=canPower(g)&&(best.score>=(opt.boostAt||120)||isFinal(g));return {pl:best.pl,boost,score:best.score};}
// ---- power-ups: 2 uses per player per game, shared across DOUBLE / BOMB / CROSS, max 1 per move ----
function canPower(g){return !g.usedPower&&(g.power[g.turn]>0||g.coins[g.turn]>=EXTRA_COST);}
function powerCost(g){return g.power[g.turn]>0?0:EXTRA_COST;}
function usePower(g){if(g.power[g.turn]>0)g.power[g.turn]--;else g.coins[g.turn]-=EXTRA_COST;g.usedPower=true;}
function blastCells(type,r,c){const out=[];
 if(type==='bomb'){for(let y=r-1;y<=r+1;y++)for(let x=c-1;x<=c+1;x++)if(inb(y,x))out.push([y,x]);}
 else if(type==='cross'){for(let i=0;i<N;i++){out.push([r,i]);if(i!==r)out.push([i,c]);}}
 return out;}
// clears EVERY committed tile in the area, stars included (the one way stars are removed); scores nothing
function blast(g,type,r,c){if(!canPower(g))return null;const pops=[];
 for(const [y,x] of blastCells(type,r,c)){const t=g.board[y][x];if(t){pops.push({r:y,c:x,color:t.star?'star':t.color});g.board[y][x]=null;}}
 usePower(g);return {pops,cells:blastCells(type,r,c)};}
function countFits(g){const rack=g.racks[g.turn];let n=0;for(let s=0;s<3;s++){if(!rack[3*s])continue;for(const o of [0,1])for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(validPiece(g.board,[],pieceTiles(rack,s,o,r,c)))n++;}return n;}
// bot turn: blast when crowded, then greedy move (may double if no blast used)
// ---- EXPERT: beam search over piece sequences with setup lookahead, time-budgeted ----
function pairsValue(b){let v=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t=b[r][c];if(!t||t.star)continue;
 for(const [dr,dc] of [[0,1],[1,0]]){const y=r+dr,x=c+dc;if(!inb(y,x))continue;const u=b[y][x];if(u&&(u.star||u.color===t.color)){
  // a same-colour (or star) pair with room to grow next turn
  const open=[[r-dr,c-dc],[y+dr,x+dc]].some(([a,bb])=>inb(a,bb)&&!b[a][bb]);if(open)v+=mult(r,c)>1||mult(y,x)>1?2:1;}}}return v;}
function bestOnePiece(b,rack,sets,t0,dl){let best=0;for(const s of sets){for(const o of [0,1,2,3])for(let r=0;r<N;r++)for(let c=0;c<N;c++){
 const t=pieceTiles(rack,s,o,r,c);if(!validPiece(b,[],t))continue;const sc=evaluate(b,t).score;if(sc>best)best=sc;}if(Date.now()-t0>dl)break;}return best;}
function expertMove(g,ms){const t0=Date.now(),dl=ms||1300,b=g.board,rack=g.racks[g.turn],final=isFinal(g),me=g.turn;
 const sets=[0,1,2].filter(s=>rack[3*s]);const W=final?0:1;
 const value=(pl,used)=>{const ev=evaluate(b,pl);const starsUsed=pl.filter(t=>t.color==='star').length;
  return {score:ev.score,board:ev.board,v:ev.score+W*(-3*pairsValue(ev.board)-(ev.score?0:starsUsed*25))};};
 let beam=[{pl:[],used:[],...value([],[])}],all=beam.slice();
 for(let depth=0;depth<3&&Date.now()-t0<dl*0.6;depth++){const next=[];
  for(const node of beam){for(const s of sets){if(node.used.includes(s))continue;
   for(const o of [0,1,2,3])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t=pieceTiles(rack,s,o,r,c);if(!validPiece(b,node.pl,t))continue;
    const pl=node.pl.concat(t),used=node.used.concat([s]);next.push({pl,used,...value(pl,used)});}}
   if(Date.now()-t0>dl*0.6)break;}
  next.sort((x,y)=>y.v-x.v);beam=next.slice(0,depth===0?50:25);all=all.concat(beam);}
 {const h=aiMove(g,{beam:400,maxPieces:3,ms:Math.min(350,dl*0.3),saveStars:true});if(h.pl.length){const ev=evaluate(b,h.pl);all.push({pl:h.pl,used:[...new Set(h.pl.map(t=>Math.floor(t.slot/3)))],score:ev.score,board:ev.board,v:ev.score+1e6});}}
 // rerank top candidates with exact follow-up: best score my remaining pieces could make next turn on that board
 all.sort((x,y)=>y.v-x.v);const top=all.slice(0,30);let best=null;
 for(const n of top){let f=0;if(!final&&Date.now()-t0<dl){const rest=sets.filter(s=>!n.used.includes(s));f=bestOnePiece(n.board,rack,rest,t0,dl);}
  const tv=n.score+W*(0.5*f-4*pairsValue(n.board));if(!best||tv>best.tv)best={...n,tv};}
 return best||{pl:[],score:0,used:[]};}
function expertPlan(g){const ms=1300;let bl=null,swap=false;
 if(false){const fits=countFits(g);
  if(fits<24){let bb=null;for(const type of ['cross','bomb'])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const cells=blastCells(type,r,c);
    const n=cells.filter(([y,x])=>g.board[y][x]&&!g.board[y][x].star).length-cells.filter(([y,x])=>g.board[y][x]&&g.board[y][x].star).length*3;if(!bb||n>bb.n)bb={type,r,c,n};}
   const pre=expertMove(g,500);if(bb&&bb.n>=5&&pre.score<100){bl={type:bb.type,r:bb.r,c:bb.c,...blast(g,bb.type,bb.r,bb.c)};}}}
 if(canPower(g)&&g.power[g.turn]>0&&countFits(g)<20){let bb=null;for(const type of ['cross','bomb'])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const cells=blastCells(type,r,c);const n=cells.filter(([y,x])=>g.board[y][x]&&!g.board[y][x].star).length-cells.filter(([y,x])=>g.board[y][x]&&g.board[y][x].star).length*2;if(!bb||n>bb.n)bb={type,r,c,n};}
  if(bb&&bb.n>=4&&aiMove(g,{beam:60,maxPieces:3,ms:200}).score<120)bl={type:bb.type,r:bb.r,c:bb.c,...blast(g,bb.type,bb.r,bb.c)};}
 const m=expertMove(g,bl?1000:ms);
 if(!m.pl.length&&!m.score&&g.swaps[g.turn]>0&&countFits(g)<6&&!bl)swap=true;
 const boost=!bl&&canPower(g)&&g.power[g.turn]>0&&m.score>0&&(m.score>=200||isFinal(g));
 return {blast:bl,pl:m.score>0||m.pl.length?m.pl:[],boost,swap};}
const LEVELS={easy:{beam:3,maxPieces:1,ms:200},medium:{beam:40,maxPieces:3,ms:600},hard:{beam:400,maxPieces:3,ms:450,saveStars:true,boostAt:200}};
function aiPlan(g,level){level=level||'medium';if(level==='expert')return expertPlan(g);const opt=LEVELS[level]||LEVELS.medium,rng=g.rng||Math.random;
 if(level==='easy'){ // often a random weak move, 1 piece, rarely power-ups
  if(rng()<0.5){const rack=g.racks[g.turn],opts=[];for(let s=0;s<3;s++){if(!rack[3*s])continue;for(const o of [0,1])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t=pieceTiles(rack,s,o,r,c);if(validPiece(g.board,[],t))opts.push(t);}}
   return {blast:null,pl:opts.length&&rng()<0.7?opts[Math.floor(rng()*opts.length)]:[],boost:false};}
  const m=aiMove(g,opt);return {blast:null,pl:m.pl,boost:m.boost&&rng()<0.15};}
 if(level==='hard'&&canPower(g)){ // compare: blast-then-move vs move (with double)
  const plain=aiMove(g,opt);let bestB=null;
  if(countFits(g)<20){for(const type of ['cross','bomb'])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const n=blastCells(type,r,c).filter(([y,x])=>g.board[y][x]&&!g.board[y][x].star).length-blastCells(type,r,c).filter(([y,x])=>g.board[y][x]&&g.board[y][x].star).length*2;if(!bestB||n>bestB.n)bestB={type,r,c,n};}}
  if(bestB&&bestB.n>=4&&plain.score<120){const bl={type:bestB.type,r:bestB.r,c:bestB.c,...blast(g,bestB.type,bestB.r,bestB.c)};const m=aiMove(g,opt);return {blast:bl,pl:m.pl,boost:false};}
  return {blast:null,pl:plain.pl,boost:plain.boost};}
 let bl=null;
 if(canPower(g)&&countFits(g)<12){let best=null;for(const type of ['cross','bomb'])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const n=blastCells(type,r,c).filter(([y,x])=>g.board[y][x]).length;if(!best||n>best.n)best={type,r,c,n};}
  if(best&&best.n>=3){bl={type:best.type,r:best.r,c:best.c,...blast(g,best.type,best.r,best.c)};}}
 const m=aiMove(g,opt);return {blast:bl,pl:m.pl,boost:m.boost};}
const api={expertMove,expertPlan,pairsValue,previewMove,START_COINS,WIN_COINS,EXTRA_COST,canSwap,powerCost,usePower,LEVELS,canPower,blastCells,blast,countFits,aiPlan,movePiece,rotateInPlace,piece,normO,rotateO,pieceTiles,validPiece,rnd,deal,COLORS,N,MOVES,RACK,mult,newGame,canPlace,inLine,validNext,isLine,evaluate,commit,swap,aiMove,isFinal,refill};
if(typeof module!=='undefined')module.exports=api;else root.Logic=api;
})(this);
