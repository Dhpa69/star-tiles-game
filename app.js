const L=Logic,$=id=>document.getElementById(id);let g,pieces=[],sel=null,boost=false,busy=false,ghost=null,pops=[];
const toast=document.createElement('div');toast.id='toast';document.body.appendChild(toast);
function say(t){toast.textContent=t;toast.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>toast.style.opacity=0,1300);}
function beep(f){try{const a=beep.c||(beep.c=new AudioContext()),o=a.createOscillator(),v=a.createGain();o.frequency.value=f;v.gain.value=.05;o.connect(v);v.connect(a.destination);o.start();o.stop(a.currentTime+.08);}catch(e){}}
function tileHTML(c){return c==='star'?'<div class="tile star"><span>⭐</span></div>':'<div class="tile '+c+'"></div>';}
const NAMES=()=>['DHAVAL P',g.mode==='ai'?'COMPUTER':'PLAYER 2'];
const placed=()=>pieces.flatMap(p=>p.tiles);
function cur(){const b=g.board.map(r=>r.slice());placed().forEach(p=>b[p.r][p.c]=p.color==='star'?{star:true,fresh:true,mult:L.mult(p.r,p.c)}:{color:p.color,fresh:true});return b;}
const usedSet=s=>pieces.some(p=>p.s===s);
function human(){return !g.over&&(g.mode==='pvp'||g.turn===0)&&!busy;}
function firstFree(){const r=g.racks[g.turn];for(let s=0;s<3;s++)if(r[3*s]&&!usedSet(s))return s;return null;}
function tilesAt(s,r,c){return L.pieceTiles(g.racks[g.turn],s,g.orient[g.turn][s],r,c);}
function render(){setTimeout(fit,0);const b=cur(),bd=$('board');bd.innerHTML='';
 const gk=ghost?new Set(ghost.tiles.map(t=>t.r*8+t.c)):new Set();
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const d=document.createElement('div'),m=L.mult(r,c);d.className='cell'+(m>1?' m'+m:'');d.dataset.r=r;d.dataset.c=c;const t=b[r][c];
  if(t){const e=document.createElement('div');if(t.star){e.className='tile star '+(t.fresh?'fresh':t.owner===0?'mine':'theirs');e.innerHTML='<span>⭐</span>'+(t.mult>1&&!t.fresh?'<em>x'+t.mult+'</em>':'');}
   else e.className='tile '+t.color+(t.fresh?' fresh':'');d.appendChild(e);d.className='cell';}
  else if(pops.some(q=>q.r===r&&q.c===c)){const q=pops.find(q=>q.r===r&&q.c===c),e=document.createElement('div');e.className='tile pop '+q.color;d.appendChild(e);}
  if(gk.has(r*8+c))d.classList.add(ghost.ok?'gok':'gbad');bd.appendChild(d);}
 const rk=$('rack');rk.innerHTML='';const who=g.mode==='pvp'?g.turn:0,rack=g.racks[who];
 for(let s=0;s<3;s++){const set=document.createElement('div'),o=L.normO(g.orient[who][s]);set.className='set '+(o%2?'v':'h')+(spin===s?' spin':'')+(sel===s&&g.turn===who?' sel':'');set.dataset.s=s;
  const hidden=!rack[3*s]||(g.turn===who&&usedSet(s));
  const disp=L.pieceTiles(rack,s,o,0,0);for(let j=0;j<3;j++){const d=document.createElement('div');d.className='rt';if(!hidden)d.innerHTML=tileHTML(disp[j].color);set.appendChild(d);}
  if(!hidden){const rb=document.createElement('button');rb.className='rot';rb.textContent='↻';rb.dataset.s=s;set.appendChild(rb);}else set.classList.add('empty');
  rk.appendChild(set);}
 $('s0').textContent=g.scores[0];$('s1').textContent=g.scores[1];$('pot').textContent=g.pot;
 $('n1').textContent=NAMES()[1];$('n0').className=g.turn===0?'on':'';$('n1').className=g.turn===1?'on':'';
 const mv=Math.min(g.moves[g.turn]+1,10),fin=L.isFinal(g)&&!g.over;$('banner').textContent=g.over?'GAME OVER':(fin?'FINAL MOVE!':'MOVE '+mv+' / 10');$('banner').className=fin?'final':'';
 $('badge').textContent=g.power[g.turn];$('power').className='btn'+(boost?' on':'');$('coinN').textContent=g.coins[0];
 const h=human();$('play').disabled=!h;$('recall').disabled=!h||!pieces.length;$('swap').disabled=!h||pieces.length>0;$('power').disabled=!h||g.power[g.turn]<1;}
function tryPlace(s,r,c){if(s===null||!human()||usedSet(s)||!g.racks[g.turn][3*s])return false;const t=tilesAt(s,r,c);
 if(!L.validPiece(g.board,placed(),t)){say('Doesn\'t fit there');beep(200);return false;}
 pieces.push({s,tiles:t});sel=firstFree();beep(600);render();return true;}
let spin=null,lastRot=0;function rotate(s){if(!human()||usedSet(s))return;const now=performance.now();if(now-lastRot<120)return;lastRot=now; // guard only against same-event double-fire
 g.orient[g.turn][s]=L.rotateO(g.orient[g.turn][s]);sel=s;spin=s;render();clearTimeout(rotate.t);rotate.t=setTimeout(()=>{spin=null;},220);}
$('rack').addEventListener('pointerup',e=>{const rb=e.target.closest('.rot');if(rb){e.preventDefault();e.stopPropagation();rotate(+rb.dataset.s);}});
$('rack').addEventListener('dblclick',e=>e.preventDefault());
$('board').onclick=e=>{const t=e.target.closest('.cell');if(!t||!human())return;const r=+t.dataset.r,c=+t.dataset.c;
 const last=pieces[pieces.length-1];if(last&&last.tiles.some(q=>q.r===r&&q.c===c)){pieces.pop();sel=last.s;render();return;}tryPlace(sel,r,c);};
// drag whole piece: pointer events, no page scroll
let drag=null;
$('rack').addEventListener('pointerdown',e=>{if(e.target.closest('.rot'))return;const set=e.target.closest('.set');if(!set||set.classList.contains('empty')||!human())return;
 e.preventDefault();const s=+set.dataset.s,now=Date.now();
 drag={s,x0:e.clientX,y0:e.clientY,moved:false,el:null,tap:now};try{set.setPointerCapture(e.pointerId);}catch(_){}});
addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();
 if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>8){drag.moved=true;sel=drag.s;render();
  const el=document.createElement('div');const oo=L.normO(g.orient[g.turn][drag.s]);el.className='drag set '+(oo%2?'v':'h');const disp=L.pieceTiles(g.racks[g.turn],drag.s,oo,0,0);for(let j=0;j<3;j++){const d=document.createElement('div');d.className='rt big';d.innerHTML=tileHTML(disp[j].color);el.appendChild(d);}document.body.appendChild(el);drag.el=el;}
 if(!drag.moved)return;const cs=$('board').querySelector('.cell').getBoundingClientRect().width;
 drag.el.style.setProperty('--dt',cs+'px');const ox=e.clientX-cs/2,oy=e.clientY-cs*1.6;drag.el.style.left=ox+'px';drag.el.style.top=oy+'px';
 const el=document.elementFromPoint(ox+cs/2,oy+cs/2),cell=el&&el.closest('#board .cell');
 const ng=cell?(()=>{const t=tilesAt(drag.s,+cell.dataset.r,+cell.dataset.c);return {tiles:t.filter(q=>q.r<8&&q.c<8),ok:L.validPiece(g.board,placed(),t),r:+cell.dataset.r,c:+cell.dataset.c};})():null;
 if(JSON.stringify(ng)!==JSON.stringify(ghost)){ghost=ng;render();}},{passive:false});
addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;
 if(d.moved){d.el&&d.el.remove();const gh=ghost;ghost=null;if(gh)tryPlace(d.s,gh.r,gh.c);else render();return;}
 if(sel===d.s)rotate(d.s);else{sel=d.s;render();}});
addEventListener('pointercancel',()=>{if(drag){drag.el&&drag.el.remove();drag=null;ghost=null;render();}});
document.addEventListener('touchmove',e=>{if(drag)e.preventDefault();},{passive:false});
$('recall').onclick=()=>{pieces=[];sel=firstFree();boost=false;render();};
$('power').onclick=()=>{boost=!boost;say(boost?'⚡ Double points this move!':'Power-up off');render();};
$('swap').onclick=()=>{L.swap(g);say('All pieces swapped');next();};
$('play').onclick=()=>{const np=pieces.length,p=g.turn,res=L.commit(g,placed(),boost);pop(res);markOwner(p);pieces=[];boost=false;beep(res.score?900:500);
 say(res.score?'+'+res.score+' (cleared '+res.cleared+')':(np?'No match – need 3!':'Passed (pot +100)'));next();};
function pop(res){pops=res.pops||[];setTimeout(()=>{pops=[];render();},450);}
function markOwner(p){g.board.forEach(r=>r.forEach(t=>{if(t&&t.star&&t.owner===undefined)t.owner=p;}));}
function next(){sel=g.over?null:firstFree();render();if(g.over)return finish();
 if(g.mode==='pvp'){say(NAMES()[g.turn]+"'s turn");return;}
 if(g.turn===1){busy=true;render();setTimeout(()=>{const m=L.aiMove(g);pieces=[];for(let i=0;i<m.pl.length;i+=3)pieces.push({s:Math.floor(m.pl[i].slot/3),tiles:m.pl.slice(i,i+3)});render();
  setTimeout(()=>{const res=L.commit(g,placed(),m.boost);pop(res);markOwner(1);pieces=[];busy=false;say(res.score?'Computer +'+res.score:'Computer passes');next();},800);},500);}}
function finish(){const n=NAMES(),w=g.winner;
 $('msg').innerHTML=(w<0?'Tie game!':n[w]+' wins the pot!')+'<br>'+g.scores[0]+' – '+g.scores[1]+'<br>Coins: '+g.coins[0];localStorage.coins=g.coins[0];$('overlay').classList.add('show');}
function start(mode){g=L.newGame(mode);g.coins[0]=+(localStorage.coins||729);pieces=[];boost=false;busy=false;sel=firstFree();$('overlay').classList.remove('show');render();}
$('vsAI').onclick=()=>start('ai');$('vsP').onclick=()=>start('pvp');$('menuBtn').onclick=()=>$('overlay').classList.add('show');
$('infoBtn').onclick=()=>say('Drag a 3-tile piece · tap it again or ↻ to rotate · place anywhere it fits');
function fit(){const bd=$('board'),app=$('app');let used=0;[...app.children].forEach(c=>{if(c!==bd&&c.id!=='overlay')used+=c.getBoundingClientRect().height;});
 const st=getComputedStyle(app),avail=app.clientHeight-parseFloat(st.paddingTop)-used-4;bd.style.width=Math.max(120,Math.min(app.clientWidth,avail))+'px';}
addEventListener('resize',fit);
start('ai');$('overlay').classList.add('show');
