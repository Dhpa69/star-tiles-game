const L=require('./logic.js'),a=require('assert');
let s=1;const rng=()=>(s=(s*16807)%2147483647)/2147483647;
const g=L.newGame('ai',rng);a.equal(L.canPlace(g.board,0,0),false);a.ok(L.canPlace(g.board,2,3));
const b=g.board.map(r=>r.map(()=>null));b[3][3]={color:'red'};b[3][4]={color:'red'};
const e=L.evaluate(b,[{r:3,c:5,color:'red'}]);a.ok(e.board[3][3].star&&e.cleared==3&&e.score==60);
a.equal(L.evaluate(b,[{r:0,c:0,color:'red'}]).score,0); // no points for plain placement
const b3=b.map(r=>r.map(()=>null));b3[4][7]={star:true,mult:1};b3[6][7]={star:true,mult:1};
const w=L.evaluate(b3,[{r:5,c:7,color:'blue'}]);a.ok(w.score==60&&w.cleared==1&&w.board[5][7].star); // stars as wildcards
const b4=b.map(r=>r.map(()=>null));b4[0][1]={color:'red'};b4[1][0]={color:'red'};a.equal(L.evaluate(b4,[{r:0,c:0,color:'red'}]).score,180); // x3 corner
// star tile placement as wildcard
const b5=b.map(r=>r.map(()=>null));b5[3][3]={color:'red'};b5[3][4]={color:'red'};
const st=L.evaluate(b5,[{r:3,c:5,color:'star'}]);a.ok(st.score==60&&st.board[3][5].star&&st.board[3][3].star);
const lone=L.evaluate(b5,[{r:5,c:5,color:'star'}]);a.ok(lone.score==0&&lone.board[5][5].star&&!lone.board[3][3].star);
// ~20% star deal
let k=0;for(let i=0;i<5000;i++)if(L.rnd(Math.random)==='star')k++;a.ok(k>800&&k<1200);
// zero-tile move
const z=L.newGame('ai',rng),pot=z.pot,rk=z.racks[0].slice();L.commit(z,[]);a.ok(z.pot==pot+100&&z.moves[0]==1&&z.turn==1);a.deepEqual(z.racks[0],rk);
// bot passes when no scoring move
const q=L.newGame('ai',rng);q.board=q.board.map(r=>r.map(()=>null));q.board[3][3]={color:'red'};q.board[3][4]={color:'green'};q.racks[0]=['yellow','blue','pink'];
a.deepEqual(L.aiMove(q).pl,[]);
let n=0;while(!g.over){const m=L.aiMove(g);L.commit(g,m.pl,m.boost);n++;}
a.equal(n,20);a.deepEqual(g.moves,[10,10]);console.log('ok',g.scores,g.winner);
