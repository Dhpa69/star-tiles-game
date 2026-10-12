(function(root){
const COLORS=['yellow','green','blue','pink','red','orange'];
const N=8, MOVES=10;
function mult(r,c){ if((r==0||r==N-1)&&(c==0||c==N-1)) return 3; if((r==2||r==5)&&(c==2||c==5)) return 2; return 1;}
function rnd(rng){return rng()<0.2?'star':COLORS[Math.floor(rng()*COLORS.length)];}
function rndColor(rng){return COLORS[Math.floor(rng()*COLORS.length)];}
function newGame(mode,rng){rng=rng||Math.random;
 const b=[];for(let r=0;r<N;r++){b.push([]);for(let c=0;c<N;c++)b[r].push(null);}
 [[3,3],[3,4],[4,3],[4,4]].forEach(([r,c])=>b[r][c]={color:rndColor(rng)});
 return {board:b,mode,turn:0,moves:[0,0],scores:[0,0],pot:1000,racks:[[rnd(rng),rnd(rng),rnd(rng)],[rnd(rng),rnd(rng),rnd(rng)]],power:[2,2],coins:[729,0],over:false,rng};}
function canPlace(b,r,c){ if(r<0||c<0||r>=N||c>=N||b[r][c])return false;
 return [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{const R=r+dr,C=c+dc;return R>=0&&C>=0&&R<N&&C<N&&b[R][C];});}
function group(b,r,c){const col=b[r][c].color,seen=new Set(),st=[[r,c]],out=[];
 while(st.length){const [y,x]=st.pop(),k=y*N+x;if(seen.has(k))continue;seen.add(k);
  if(y<0||x<0||y>=N||x>=N)continue;const t=b[y][x];if(!t)continue;
  if(t.star){out.push([y,x]);continue;} // wildcard: counts, doesn't spread
  if(t.color!==col)continue;out.push([y,x]);
  st.push([y+1,x],[y-1,x],[y,x+1],[y,x-1]);}return out;}
// evaluate placements [{r,c,color}] on a copy; returns {score,board,cleared}
function evaluate(b,pl,boost){const nb=b.map(row=>row.map(t=>t&&{...t}));let score=0;
 const seeds=[];for(const p of pl){if(p.color==='star'){nb[p.r][p.c]={star:true,mult:mult(p.r,p.c)};}else{nb[p.r][p.c]={color:p.color,fresh:true};}}
 for(const p of pl){if(p.color!=='star'){seeds.push(p);continue;}for(const [y,x] of [[p.r+1,p.c],[p.r-1,p.c],[p.r,p.c+1],[p.r,p.c-1]])if(y>=0&&x>=0&&y<N&&x<N&&nb[y][x]&&!nb[y][x].star)seeds.push({r:y,c:x});}
 let cleared=0;const done=new Set();
 for(const p of seeds){if(nb[p.r][p.c].star||done.has(p.r*N+p.c))continue;const g=group(nb,p.r,p.c);g.forEach(([y,x])=>{if(!nb[y][x].star)done.add(y*N+x)});
  if(g.length>=3){let s=0,m=1;g.forEach(([y,x])=>{s+=20;m=Math.max(m,mult(y,x));});s*=m;if(g.length>=5)s*=2;score+=s;g.forEach(([y,x])=>{if(!nb[y][x].star){cleared++;nb[y][x]={star:true,mult:mult(y,x)};}});}}
 nb.forEach(row=>row.forEach(t=>t&&delete t.fresh));
 if(boost)score*=2;return {score,board:nb,cleared};}
function commit(g,pl,boost){const p=g.turn;if(boost){if(g.power[p]<1)boost=false;else g.power[p]--;}
 const res=evaluate(g.board,pl,boost);g.board=res.board;g.scores[p]+=res.score;g.pot+=Math.round(res.score/2)+100;
 const used=pl.map(x=>x.color),rack=g.racks[p].slice();used.forEach(c=>rack.splice(rack.indexOf(c),1));
 while(rack.length<3)rack.push(rnd(g.rng));g.racks[p]=rack;endTurn(g);return res;}
function swap(g){g.racks[g.turn]=[rnd(g.rng),rnd(g.rng),rnd(g.rng)];endTurn(g);}
function endTurn(g){g.moves[g.turn]++;
 if(g.moves[0]>=MOVES&&g.moves[1]>=MOVES){g.over=true;const w=g.scores[0]===g.scores[1]?-1:(g.scores[0]>g.scores[1]?0:1);g.winner=w;
  if(w>=0)g.scores[w]+=g.pot;g.coins[0]+=w===0?50:10;return;}
 g.turn=1-g.turn;}
function isFinal(g){return g.moves[g.turn]===MOVES-1;}
// greedy AI: try all single/double placements
function aiMove(g){const b=g.board,rack=g.racks[g.turn];let best={score:-1,pl:[]};
 const cells=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(canPlace(b,r,c))cells.push([r,c]);
 for(let i=0;i<rack.length;i++)for(const [r,c] of cells){const pl=[{r,c,color:rack[i]}];let e=evaluate(b,pl).score;if(e>best.score)best={score:e,pl};
  const b2=b.map(x=>x.slice());b2[r][c]={color:rack[i]};
  for(let j=0;j<rack.length;j++){if(j===i)continue;for(const [y,x] of [[r+1,c],[r-1,c],[r,c+1],[r,c-1]]){if(!canPlace(b2,y,x))continue;
   const pl2=[pl[0],{r:y,c:x,color:rack[j]}];e=evaluate(b,pl2).score;if(e>best.score)best={score:e,pl:pl2};}}}
 if(best.score<=0)return {pl:[],boost:false};
 const boost=g.power[g.turn]>0&&(best.score>=120||isFinal(g));return {pl:best.pl,boost};}
const api={rnd,COLORS,N,MOVES,mult,newGame,canPlace,evaluate,commit,swap,aiMove,isFinal};
if(typeof module!=='undefined')module.exports=api;else root.Logic=api;
})(this);
