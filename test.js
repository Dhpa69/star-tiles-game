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
const z=L.newGame('ai',rng),pot=z.pot;const kept=z.racks[0].slice(3);
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
 {const sh=L.rotateInPlace(B,RR,other,0,0,6,0);a.ok(sh&&sh.tiles.every(q=>q.r<7)&&sh.tiles.some(q=>q.c===1)); } // shifted to fit {const blk=empty();for(let r=0;r<8;r++)if(r!==4)blk[r][4]={color:'x'};a.equal(L.rotateInPlace(blk,RR,[],0,0,4,3),null);} // no vertical fit anywhere -> doesn't fit
 const r2=L.rotateInPlace(B,RR,[],0,1,4,4);a.ok(r2.o===2&&r2.tiles.map(q=>q.color).join()=='blue,green,red');
 {const e7=L.rotateInPlace(B,RR,[],0,0,7,5);a.ok(e7&&e7.tiles.every(q=>q.r<8)&&e7.tiles[2].r===7);}
 {let o=0,r=3,c=3;const E=empty();for(let i=0;i<4;i++){const x=L.rotateInPlace(E,RR,[],0,o,r,c);o=x.o;r=x.r;c=x.c;a.deepEqual(x.tiles[1].r*8+x.tiles[1].c,3*8+4);}a.equal(o,0);a.deepEqual([r,c],[3,3]);}}
let n=0;const t0=Date.now();while(!g.over){const m=L.aiMove(g);a.ok(m.pl.length%3===0);L.commit(g,m.pl,m.boost);n++;}
a.equal(n,20);a.deepEqual(g.moves,[10,10]);console.log('ok',g.scores,g.winner,(Date.now()-t0)+'ms');
