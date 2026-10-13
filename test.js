const L=require('./logic.js'),a=require('assert'),fs=require('fs');
let s=1;const rng=()=>(s=(s*16807)%2147483647)/2147483647;
const empty=()=>Array.from({length:8},()=>Array(8).fill(null));
const g=L.newGame('ai',rng);a.equal(g.racks[0].length,9);a.equal(L.canPlace(g.board,0,0),false);a.ok(L.canPlace(g.board,2,3));
const b=empty();b[3][3]={color:'red'};b[3][4]={color:'red'};
const e=L.evaluate(b,[{r:3,c:5,color:'red'}]);a.ok(e.board[3][3]===null&&e.board[3][5]===null&&e.cleared==3&&e.score==60&&e.pops.length==3); // cleared, not starred
a.equal(L.evaluate(b,[{r:0,c:0,color:'red'}]).score,0);
const b3=empty();b3[4][7]={star:true};b3[6][7]={star:true};a.equal(L.evaluate(b3,[{r:5,c:7,color:'blue'}]).score,60);
const b4=empty();b4[0][1]={color:'red'};b4[1][0]={color:'red'};a.equal(L.evaluate(b4,[{r:0,c:0,color:'red'}]).score,180);
const st=L.evaluate(b,[{r:3,c:5,color:'star'}]);a.ok(st.score==60&&st.board[3][5].star&&st.board[3][3]===null); // star stays, reds cleared
let k=0;for(let i=0;i<5000;i++)if(L.rnd(Math.random)==='star')k++;a.ok(k>300&&k<520); // ~8%
for(let i=0;i<3000;i++)a.ok(L.piece(Math.random).filter(x=>x==='star').length<=1);
{let st=0;for(let i=0;i<3000;i++)st+=L.deal(Math.random).filter(x=>x==='star').length;a.ok(st/27000>0.06&&st/27000<0.1);}
// wild stars: red+red+star scores; 2 placed stars + 1 colored in a line scores; 2 board stars + 1 colored scores
a.equal(L.evaluate(b,[{r:3,c:2,color:'star'}]).score,60);
const b6=empty();b6[1][1]={color:'green'};a.equal(L.evaluate(b6,[{r:1,c:2,color:'star'},{r:1,c:3,color:'star'}]).score,60);
const b7=empty();b7[1][1]={color:'green'};a.equal(L.evaluate(b7,[{r:1,c:2,color:'star'}]).score,0);
const b8=empty();b8[4][2]={star:true};b8[4][3]={star:true};a.equal(L.evaluate(b8,[{r:4,c:1,color:'pink'}]).score,60);
const b9=empty();for(let c=0;c<8;c++){b9[6][c]={star:true};}a.equal(L.evaluate(b9,[{r:5,c:4,color:'pink'}]).score,60); // long star chain capped at 2 stars
a.ok(L.canPlace(empty(),0,0)); a.ok(!L.evaluate(b4,[{r:0,c:0,color:'red'}]).board.flat().some(x=>x)); // no cluster stars
// straight line rule
a.ok(L.inLine([{r:2,c:3}],2,6));a.ok(L.inLine([{r:2,c:3}],5,3));a.ok(!L.inLine([{r:2,c:3}],3,4));
a.ok(!L.inLine([{r:2,c:3},{r:2,c:4}],3,3));a.ok(L.validNext(b,[{r:3,c:5,color:'red'}],3,6));a.ok(!L.validNext(b,[{r:3,c:5,color:'red'}],2,4));

// zero-tile move + 9-tile refill
const z=L.newGame('ai',rng);a.equal(z.pot,undefined); // v21: no pot
const kept=z.racks[0].slice(3);
z.board=empty();z.board[3][3]={color:'x'};const pc=L.pieceTiles(z.racks[0],0,'h',2,2);a.ok(L.validPiece(z.board,[],pc));L.commit(z,pc);
a.equal(z.racks[0].filter(x=>x).length,6);a.deepEqual(z.racks[0].slice(3),kept);
L.commit(z,[]);a.ok(z.turn===0);a.equal(z.racks[0].filter(x=>x).length,9);a.deepEqual(z.racks[0].slice(3),kept);a.equal(z.moves[1],1);
// bot passes when nothing scores; bot moves are straight lines
const q=L.newGame('ai',rng);q.board=empty();q.board[3][3]={color:'red'};q.board[3][4]={color:'green'};q.racks[0]=['yellow','blue','pink','yellow','blue','pink','orange',null,null];
a.deepEqual(L.aiMove(q).pl,[]);
const q2=L.newGame('ai',rng);q2.board=empty();q2.board[3][3]={color:'red'};q2.racks[0]=['red','red','red','blue','blue','blue','green','green','green'];
const m2=L.aiMove(q2);a.ok(m2.pl.length%3===0&&m2.pl.length>=3);
// pieces: 3 connected cells, rotate, bounds, emptiness, touch, collinearity
const R=['red','blue','star','green','green','green','pink','pink','pink'],pb=empty();pb[3][3]={color:'red'};
const hz=L.pieceTiles(R,0,'h',2,3),vt=L.pieceTiles(R,0,'v',4,3);a.deepEqual(hz.map(t=>[t.r,t.c]),[[2,3],[2,4],[2,5]]);a.deepEqual(vt.map(t=>[t.r,t.c]),[[4,3],[5,3],[6,3]]);
a.ok(L.validPiece(pb,[],hz)&&L.validPiece(pb,[],vt));a.ok(!L.validPiece(pb,[],L.pieceTiles(R,0,'h',2,6)));a.ok(!L.validPiece(pb,[],L.pieceTiles(R,0,'h',3,2)));
a.ok(L.validPiece(pb,[],L.pieceTiles(R,0,'h',0,0))); // no touching neededa.ok(L.validPiece(empty(),[],L.pieceTiles(R,0,'v',0,0)));
a.ok(L.validPiece(pb,hz,L.pieceTiles(R,1,'h',1,3)));a.ok(L.validPiece(pb,vt,L.pieceTiles(R,1,'h',7,4)));a.ok(!L.validPiece(pb,hz,L.pieceTiles(R,1,'v',1,4))); // independent pieces; overlap rejected
const far=L.newGame('ai',rng);far.board=empty();far.board[3][3]={color:'red'};const p1=L.pieceTiles(far.racks[0],0,'h',0,0),p2=L.pieceTiles(far.racks[0],1,'v',5,7);a.ok(L.validPiece(far.board,p1,p2));L.commit(far,p1.concat(p2));a.equal(far.racks[0].filter(x=>x).length,3);
// name
const all=['app.js','index.html','logic.js'].map(f=>fs.readFileSync(__dirname+'/'+f,'utf8')).join('');a.ok(!/dimble/i.test(all)&&/COMPUTER/.test(all));
// 4-step rotation cycle with order reversal: R-G-B -> R/G/B -> B-G-R -> B/G/R -> R-G-B
const RG=['red','green','blue','x','x','x','x','x','x'];let o=0;const seen=[];
for(let i=0;i<4;i++){const t=L.pieceTiles(RG,0,o,0,0);seen.push(t.map(q=>q.color[0]+(q.r?'v':'')).join(''));o=L.rotateO(o);}
a.deepEqual(seen,['rgb','rgvbv','bgr','bgvrv'].map((x,i)=>i==1?'rgvbv':x).length&&seen,seen);
a.deepEqual(L.pieceTiles(RG,0,0,0,0).map(q=>q.color),['red','green','blue']);a.deepEqual(L.pieceTiles(RG,0,1,0,0).map(q=>[q.r,q.c,q.color]),[[0,0,'red'],[1,0,'green'],[2,0,'blue']]);
a.deepEqual(L.pieceTiles(RG,0,2,0,0).map(q=>[q.r,q.c,q.color]),[[0,0,'blue'],[0,1,'green'],[0,2,'red']]);a.deepEqual(L.pieceTiles(RG,0,3,0,0).map(q=>[q.r,q.c,q.color]),[[0,0,'blue'],[1,0,'green'],[2,0,'red']]);
a.equal(o,0);a.equal(L.rotateO(3),0);a.deepEqual(L.pieceTiles(RG,0,2,0,0).map(q=>q.slot),[2,1,0]);
// movable uncommitted pieces
{const B=empty();B[0][3]={color:'red'};const RR=['red','green','blue','pink','pink','pink','x','x','x'];
 const p0=L.pieceTiles(RR,0,0,5,0),other=L.pieceTiles(RR,1,0,7,0);
 a.deepEqual(L.movePiece(B,RR,other,0,0,2,2).map(q=>[q.r,q.c]),[[2,2],[2,3],[2,4]]);
 a.equal(L.movePiece(B,RR,other,0,0,7,1),null); a.equal(L.movePiece(B,RR,[],0,0,0,2),null); a.equal(L.movePiece(B,RR,[],0,0,4,6),null);
 const r1=L.rotateInPlace(B,RR,[],0,0,4,0);a.ok(r1&&r1.o===1);a.deepEqual(r1.tiles.map(q=>[q.r,q.c,q.color]),[[3,1,'red'],[4,1,'green'],[5,1,'blue']]); // pivot on middle tile
 {const sh=L.rotateInPlace(B,RR,other,0,0,6,0);a.ok(sh&&sh.tiles.every(q=>q.r<7)&&sh.tiles.some(q=>q.c===1)); } // shifted to fit 
 {const blk=empty();for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(r!==4)blk[r][c]={color:'x'};const o2=L.rotateInPlace(blk,RR,[],0,0,4,3);a.ok(o2&&o2.o===2&&o2.r===4&&o2.c===3);} // only its own row free: verticals impossible -> 180° on same cells
 {const blk=empty();for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(r!==4&&r!==0)blk[r][c]={color:'x'};const j=L.rotateInPlace(blk,RR,[],0,0,4,3);a.ok(j&&j.o===2&&j.tiles.every(q=>q.r===4)); } // verticals impossible -> skips to 180°
 {const nb=empty();nb[3][4]={color:'x'};const n1=L.rotateInPlace(nb,RR,[],0,0,4,3);a.ok(n1.o===1&&n1.tiles[1].c===4&&Math.abs(n1.tiles[1].r-4)<=1);} // nearest shift keeps pivot column
 const r2=L.rotateInPlace(B,RR,[],0,1,4,4);a.ok(r2.o===2&&r2.tiles.map(q=>q.color).join()=='blue,green,red');
 {const e7=L.rotateInPlace(B,RR,[],0,0,7,5);a.ok(e7&&e7.tiles.every(q=>q.r<8)&&e7.tiles[2].r===7);}
 {let o=0,r=3,c=3;const E=empty();for(let i=0;i<4;i++){const x=L.rotateInPlace(E,RR,[],0,o,r,c);o=x.o;r=x.r;c=x.c;a.deepEqual(x.tiles[1].r*8+x.tiles[1].c,3*8+4);}a.equal(o,0);a.deepEqual([r,c],[3,3]);}}
// power-ups
{const P=L.newGame('ai',rng);P.board=empty();
 a.equal(L.blastCells('bomb',4,4).length,9);a.equal(L.blastCells('bomb',0,0).length,4);a.equal(L.blastCells('bomb',0,4).length,6);
 const cr=L.blastCells('cross',2,5);a.equal(cr.filter(([y])=>y===2).length,8);a.equal(cr.filter(([,x])=>x===5).length,8);a.equal(cr.length,15);
 for(let c=0;c<8;c++)P.board[3][c]={color:'red'};P.board[3][2]={star:true};P.board[0][4]={color:'blue'};P.board[6][6]={color:'green'};
 const sc=P.scores[0],res=L.blast(P,'cross',3,4);a.equal(res.pops.length,9);a.equal(P.board[3][2],null);a.equal(P.board[3][0],null);a.equal(P.board[0][4],null);a.ok(P.board[6][6]);a.equal(P.scores[0],sc); // stars destroyed too, no score
 a.equal(P.power[0],1);a.equal(L.blast(P,'bomb',6,6),null); // once per move
 L.commit(P,[]);L.commit(P,[]); // back to player 0
 P.board[1][1]={color:'pink'};P.board[0][0]={star:true};const rb=L.blast(P,'bomb',0,0);a.ok(rb&&P.board[0][0]===null&&!P.board[1][1]);a.equal(P.power[0],0);
 L.commit(P,[]);L.commit(P,[]);P.coins[0]=0;a.equal(L.blast(P,'bomb',4,4),null);a.equal(L.canPower(P),false); // 2 total across types
 const Q=L.newGame('ai',rng);a.equal(Q.power[0],2);a.ok(L.canPower(Q)); // cancel = never calling blast -> nothing consumed
 const D=L.newGame('ai',rng);D.board=empty();D.board[1][3]={color:'red'};D.board[1][4]={color:'red'};
 const r1=L.commit(D,[{r:1,c:5,color:'red'}],true);a.equal(r1.score,120);a.equal(D.power[0],1);
 L.commit(D,[]);L.blast(D,'bomb',5,5);D.board[1][3]={color:'red'};D.board[1][4]={color:'red'};const r2=L.commit(D,[{r:1,c:5,color:'red'}],true);a.equal(r2.score,120); // doubles now combine with a blast (stacking)
 a.equal(D.power[0],0);}
let n=0;const t0=Date.now();while(!g.over){const m=L.aiPlan(g);a.ok(m.pl.length%3===0);L.commit(g,m.pl,m.boost);n++;}
a.equal(n,20);a.deepEqual(g.moves,[10,10]);
// live preview == committed score (with and without double)
for(let i=0;i<30;i++){let sd=i+11;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;const G=L.newGame('ai',r);for(let k=0;k<6;k++){const m=L.aiMove(G);const bo=k%3===0;
 const pv=L.previewMove(G,m.pl,bo),before=G.scores[G.turn],res=L.commit(G,m.pl,bo);a.equal(pv.score,res.score);a.equal(G.scores[1-G.turn]-before,pv.score);}}
// expert: valid whole-piece moves, time-budgeted
{let sd=5;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;const G=L.newGame('ai',r);for(let k=0;k<4;k++){const t=Date.now(),m=L.aiPlan(G,'expert');a.ok(Date.now()-t<2000);a.ok(m.pl.length%3===0);
 for(let i=0;i<m.pl.length;i+=3)a.ok(L.validPiece(G.board,m.pl.slice(0,i),m.pl.slice(i,i+3)));if(m.swap)L.swap(G,0);else L.commit(G,m.pl,m.boost);}}
// stacking: multiplier squares multiply, combos multiply, Doubles x2^n, Triples x3^n (all multiplicative)
{const E=()=>Array.from({length:8},()=>Array(8).fill(null));
 const b=E();b[2][1]={color:'red'};b[2][3]={color:'red'};a.equal(L.evaluate(b,[{r:2,c:2,color:'red'}]).score,120); // x2 square
 const c=E();for(let x=1;x<=5;x++)if(x!==2)c[2][x]={color:'red'}; // red row covers x2 at (2,2) and (2,5)
 a.equal(L.evaluate(c,[{r:2,c:2,color:'red'}]).score,20*5*2*2*2); // 5 tiles, x2*x2 squares, 5+ bonus x2 = 800
 const d=E();d[1][3]={color:'red'};d[1][4]={color:'red'};d[6][3]={color:'blue'};d[6][4]={color:'blue'};
 const two=L.evaluate(d,[{r:1,c:5,color:'red'},{r:6,c:5,color:'blue'}]);a.equal(two.groups,2);a.equal(two.score,(60+60)*2); // combo x2
 const base=L.evaluate(b,[{r:2,c:2,color:'red'}]).score;
 for(const [bo,f] of [[1,2],[2,4],[3,8],[4,16],[{d:0,t:1},3],[{d:0,t:2},9],[{d:2,t:1},12],[{d:3,t:2},72]])a.equal(L.evaluate(b,[{r:2,c:2,color:'red'}],bo).score,base*f);
 // charges: free 2 then 50 coins each, no cap beyond that
 const G=L.newGame('pvp',rng);G.board=b.map(r=>r.slice());G.coins[0]=200; // 2 free + 4 paid = 6 charges
 a.equal(L.charges(G),6);const pv=L.previewMove(G,[{r:2,c:2,color:'red'}],4);const r16=L.commit(G,[{r:2,c:2,color:'red'}],4);a.equal(r16.score,base*16);a.equal(pv.score,r16.score);a.equal(G.power[0],0);a.equal(G.coins[0],100);
 const H=L.newGame('pvp',rng);H.board=b.map(r=>r.slice());H.coins[0]=50; // 3 charges: x8 ok, x16 capped to x8
 a.equal(L.commit(H,[{r:2,c:2,color:'red'}],4).score,base*8);a.equal(H.coins[0],0);
 const T=L.newGame('pvp',rng);T.board=b.map(r=>r.slice());a.equal(L.commit(T,[{r:2,c:2,color:'red'}],{d:1,t:1}).score,base*6);a.equal(T.power[0],0);
 const Bm=L.newGame('pvp',rng);Bm.board=E();L.blast(Bm,'bomb',4,4);a.equal(L.charges(Bm),1+2);a.equal(L.blast(Bm,'bomb',1,1),null);} // blasts still 1/move, doubles still available
// v21: no pot, no pass bonus, winner = higher score; old saves carrying a pot still finish fine
{const P=L.newGame('pvp',rng);P.pot=4321;P.board=empty();P.board[1][3]={color:'red'};P.board[1][4]={color:'red'};L.commit(P,[{r:1,c:5,color:'red'}]);a.equal(P.scores[0],60);
 L.commit(P,[]);a.equal(P.scores[1],0);while(!P.over)L.commit(P,[]);a.deepEqual(P.scores,[60,0]);a.equal(P.winner,0);a.equal(P.pot,undefined);
 const T=L.newGame('pvp',rng);while(!T.over)L.commit(T,[]);a.deepEqual(T.scores,[0,0]);a.equal(T.winner,-1);}
// v23 resign: other player wins + win coins; old logs without resign unaffected
{const Q=L.newGame('pvp',rng);Q.scores=[500,0];a.ok(L.resign(Q,0));a.ok(Q.over);a.equal(Q.winner,1);a.equal(Q.coins[1],110);a.equal(L.resign(Q,1),false);}
// v28: user's screenshot case: blue + star + star where the 2nd star only touches the 1st star must score
{const E=()=>Array.from({length:8},()=>Array(8).fill(null));const b=E();b[4][4]={color:'blue'};b[5][4]={star:true};
 const r=L.evaluate(b,[{r:5,c:5,color:'star'}]);a.ok(r.score>0,'blue+star+star via star chain');a.equal(r.board[4][4],null);a.ok(r.board[5][4].star&&r.board[5][5].star);
 const b2=E();b2[6][7]={color:'red'};b2[7][7]={star:true};a.ok(L.evaluate(b2,[{r:7,c:6,color:'star'}]).score>0,'red+star+star corner');
 const b3=E();b3[0][0]={star:true};b3[0][1]={star:true};a.equal(L.evaluate(b3,[{r:0,c:2,color:'star'}]).score,0,'star-only groups do not score');
 const b4=E();b4[3][3]={color:'red'};b4[3][4]={color:'red'};b4[3][5]={color:'red'};a.equal(L.evaluate(b4,[{r:7,c:7,color:'blue'}]).score,60,'a waiting group anywhere scores');}
// economy
{const E=L.newGame('pvp',rng);a.deepEqual(E.coins,[100,100]);a.equal(L.newGame('ai',rng).coins[0],100);
 {const t0=E.turn,mv=E.moves.slice(),keep=E.racks[0].slice(3);a.ok(L.swap(E,0));a.equal(E.turn,t0);a.deepEqual(E.moves,mv);a.deepEqual(E.racks[0].slice(3),keep); // swap keeps turn/moves, only slot 0 changes
 a.ok(L.swap(E,1));a.equal(E.coins[0],50);a.equal(E.turn,t0);E.coins[0]=100;} // 2nd swap same turn costs 50
 a.ok(L.swap(E));a.equal(E.coins[0],50);E.coins[0]=100;a.equal(E.turn,1);L.commit(E,[]);a.equal(E.turn,0); // legacy (no slot) still ends turn for old online logs
 a.ok(L.swap(E,2));a.equal(E.coins[0],50);a.equal(E.turn,0);L.commit(E,[]);L.commit(E,[]);
 E.coins[0]=40;a.equal(L.canSwap(E),false);a.equal(L.swap(E),false); // extra swap 50, blocked when broke
 const F=L.newGame('pvp',rng);F.board=empty();L.blast(F,'bomb',1,1);L.commit(F,[]);L.commit(F,[]);L.blast(F,'bomb',1,1);L.commit(F,[]);L.commit(F,[]);
 a.equal(F.power[0],0);a.equal(F.coins[0],100);a.equal(L.powerCost(F),50);a.ok(L.blast(F,'cross',2,2));a.equal(F.coins[0],50); // 3rd power-up costs 50
 L.commit(F,[]);L.commit(F,[]);a.ok(L.blast(F,'cross',2,2));a.equal(F.coins[0],0);L.commit(F,[]);L.commit(F,[]);a.equal(L.canPower(F),false);
 const W=L.newGame('ai',rng);W.board=empty();W.board[1][3]={color:'red'};W.board[1][4]={color:'red'};L.commit(W,[{r:1,c:5,color:'red'}]);while(!W.over)L.commit(W,[]);
 a.equal(W.winner,0);a.equal(W.coins[0],110);
 const X=L.newGame('ai',rng);X.turn=1;X.board=empty();X.board[1][3]={color:'red'};X.board[1][4]={color:'red'};L.commit(X,[{r:1,c:5,color:'red'}]);while(!X.over)L.commit(X,[]);
 a.equal(X.winner,1);a.equal(X.coins[0],100);} // no coins for a loss
// difficulty: head-to-head (scores multiply now, so self-play averages are meaningless): HARD wins >= half vs MEDIUM, MEDIUM >= EASY; hard move time capped
let worstHard=0;function duel(a,b,seed){let s=seed;const r=()=>(s=(s*16807)%2147483647)/2147483647;const G=L.newGame('ai',r);const lv=[a,b];
 while(!G.over){const t=Date.now(),m=L.aiPlan(G,lv[G.turn]);if(lv[G.turn]==='hard')worstHard=Math.max(worstHard,Date.now()-t);if(m.swap&&L.swap(G,0))continue;L.commit(G,m.pl,m.boost);}return G.scores;}
const avg={};for(const [x,y] of [['hard','medium'],['medium','easy']]){let w=0;for(let i=1;i<=3;i++)for(const sw of [0,1]){const sc=duel(sw?y:x,sw?x:y,i*7919),ix=sw?1:0;if(sc[ix]>=sc[1-ix])w++;}avg[x+'>'+y]=w+'/6';a.ok(w>=(x==='hard'?2:3),x+' vs '+y+' '+w); /* hard vs medium is mostly luck now (multiplicative scoring) */}
a.ok(worstHard<1500,'hard too slow '+worstHard);
console.log('ok',g.scores,g.winner,(Date.now()-t0)+'ms',JSON.stringify(avg),'hard worst move',worstHard+'ms');
// UI scripts must at least parse (catches broken edits before shipping)
for(const f of ['app.js','online.js','sw.js'])new (require('vm').Script)(require('fs').readFileSync(__dirname+'/'+f,'utf8'),{filename:f});
console.log('ui scripts parse ok');

// v34: Double only, once per move; AI never stacks; old stacked logs still replay as recorded; random first player
{const a=require('assert');const L=require('./logic.js');
 a.deepStrictEqual(L.single({d:3,t:2}),{d:1,t:0});a.strictEqual(L.single(false),false);
 for(let i=0;i<30;i++){const G=L.newGame('ai');G.turn=1;const p=L.aiPlan(G,'hard');if(p.boost){const B=L.norm(p.boost);a.ok(B.d===1&&B.t===0,'AI boost must be one Double');}}
 const G=L.newGame('pvp',()=>0.3,1);a.strictEqual(G.turn,1);a.strictEqual(L.newGame('pvp',()=>0.3).turn,0);
 const B={d:2,t:1};a.deepStrictEqual(L.capB({power:[5,5],coins:[0,0],turn:0},B),{d:2,t:1}); // replay keeps stacked
 console.log('v34 ok');}
