(function(root){
const COLORS=['yellow','green','blue','pink','red','orange'];
const N=8, MOVES=10, RACK=9;
function mult(r,c){ if((r==0||r==N-1)&&(c==0||c==N-1)) return 3; if((r==2||r==5)&&(c==2||c==5)) return 2; return 1;}
function rnd(rng){return rng()<0.08?'star':COLORS[Math.floor(rng()*COLORS.length)];}
function rndColor(rng){return COLORS[Math.floor(rng()*COLORS.length)];}
function piece(rng){let st=false;return [0,1,2].map(()=>{let t=rnd(rng);if(t==='star'){if(st)t=rndColor(rng);st=true;}return t;});} // max 1 star per piece
function deal(rng){return [].concat(piece(rng),piece(rng),piece(rng));}
function newGame(mode,rng){rng=rng||Math.random;
 const b=[];for(let r=0;r<N;r++){b.push([]);for(let c=0;c<N;c++)b[r].push(null);}
 [[3,3],[3,4],[4,3],[4,4]].forEach(([r,c])=>b[r][c]={color:rndColor(rng)});
 return {orient:[[0,0,0],[0,0,0]],board:b,mode,turn:0,moves:[0,0],scores:[0,0],pot:1000,racks:[deal(rng),deal(rng)],power:[2,2],coins:[729,0],over:false,rng};}
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
// rotate 90° around the middle tile; if blocked, try shifting ±1 (then ±2) along the new axis
function rotateInPlace(b,rack,others,s,o,r,c){const no=rotateO(o),mid=pieceTiles(rack,s,o,r,c)[1],vert=no%2===1;
 for(const d of [0,-1,1,-2,2]){const nr=vert?mid.r-1+d:mid.r,nc=vert?mid.c:mid.c-1+d,t=pieceTiles(rack,s,no,nr,nc);if(validPiece(b,others,t))return {o:no,r:nr,c:nc,tiles:t};}
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
function commit(g,pl,boost){const p=g.turn;
 if(boost){if(g.power[p]<1)boost=false;else g.power[p]--;}
 const res=evaluate(g.board,pl,boost);g.board=res.board;g.scores[p]+=res.score;g.pot+=Math.round(res.score/2)+100;
 const rack=g.racks[p];pl.forEach(x=>{let i=(x.slot!=null&&rack[x.slot]===x.color)?x.slot:rack.indexOf(x.color);if(i>=0)rack[i]=null;});
 endTurn(g);return res;}
function refill(g){const r=g.racks[g.turn];for(let s=0;s<3;s++)if(!r[3*s]){piece(g.rng).forEach((t,j)=>r[3*s+j]=t);g.orient[g.turn][s]=0;}}
function swap(g){g.racks[g.turn]=deal(g.rng);g.orient[g.turn]=[0,0,0];endTurn(g);}
function endTurn(g){g.moves[g.turn]++;
 if(g.moves[0]>=MOVES&&g.moves[1]>=MOVES){g.over=true;const w=g.scores[0]===g.scores[1]?-1:(g.scores[0]>g.scores[1]?0:1);g.winner=w;
  if(w>=0)g.scores[w]+=g.pot;g.coins[0]+=w===0?50:10;return;}
 g.turn=1-g.turn;refill(g);}
function isFinal(g){return g.moves[g.turn]===MOVES-1;}
// greedy bot over whole pieces (both orientations), collinear, up to 3 pieces
function aiMove(g){const b=g.board,rack=g.racks[g.turn];let best={score:0,pl:[]};
 function cands(pl,usedSets){const out=[];for(let s=0;s<3;s++){if(usedSets.includes(s)||!rack[3*s])continue;
  for(const o of [0,1,2,3])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t=pieceTiles(rack,s,o,r,c);if(validPiece(b,pl,t))out.push({s,o,t});}}return out;}
 const first=cands([],[]).map(x=>({x,sc:evaluate(b,x.t).score})).sort((a,b)=>b.sc-a.sc).slice(0,40);
 for(const {x} of first){let pl=x.t.slice(),used=[x.s];
  for(let k=0;k<2;k++){const sc=evaluate(b,pl).score;if(sc>best.score)best={score:sc,pl:pl.slice()};
   let nx=null,ns=0;for(const c of cands(pl,used)){const v=evaluate(b,pl.concat(c.t)).score;if(v>ns){ns=v;nx=c;}}
   if(!nx||ns<=sc)break;pl=pl.concat(nx.t);used.push(nx.s);}
  const sc=evaluate(b,pl).score;if(sc>best.score)best={score:sc,pl:pl.slice()};}
 if(best.score<=0)return {pl:[],boost:false};
 const boost=g.power[g.turn]>0&&(best.score>=120||isFinal(g));return {pl:best.pl,boost};}
const api={movePiece,rotateInPlace,piece,normO,rotateO,pieceTiles,validPiece,rnd,deal,COLORS,N,MOVES,RACK,mult,newGame,canPlace,inLine,validNext,isLine,evaluate,commit,swap,aiMove,isFinal,refill};
if(typeof module!=='undefined')module.exports=api;else root.Logic=api;
})(this);
