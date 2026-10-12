const L=Logic,$=id=>document.getElementById(id);let g,placed=[],sel=null,boost=false,busy=false;
const toast=document.createElement('div');toast.id='toast';document.body.appendChild(toast);
function say(t){toast.textContent=t;toast.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>toast.style.opacity=0,1300);}
function beep(f){try{const a=beep.c||(beep.c=new AudioContext()),o=a.createOscillator(),v=a.createGain();o.frequency.value=f;v.gain.value=.05;o.connect(v);v.connect(a.destination);o.start();o.stop(a.currentTime+.08);}catch(e){}}
function tileHTML(c){return c==='star'?'<div class="tile star"><span>⭐</span></div>':'<div class="tile '+c+'"></div>';}
const NAMES=()=>['DHAVAL P',g.mode==='ai'?'COMPUTER':'PLAYER 2'];
function cur(){const b=g.board.map(r=>r.slice());placed.forEach(p=>b[p.r][p.c]=p.color==='star'?{star:true,fresh:true,mult:L.mult(p.r,p.c)}:{color:p.color,fresh:true});return b;}
const usedSlot=i=>placed.some(p=>p.slot===i);
function human(){return !g.over&&(g.mode==='pvp'||g.turn===0);}
function firstFree(){const r=g.racks[g.turn];for(let i=0;i<9;i++)if(r[i]&&!usedSlot(i))return i;return null;}
function render(){setTimeout(fit,0);const b=cur(),bd=$('board');bd.innerHTML='';
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const d=document.createElement('div'),m=L.mult(r,c);d.className='cell'+(m>1?' m'+m:'');d.dataset.r=r;d.dataset.c=c;const t=b[r][c];
  if(t){const e=document.createElement('div');if(t.star){e.className='tile star '+(t.fresh?'fresh':t.owner===0?'mine':'theirs');e.innerHTML='<span>⭐</span>'+(t.mult>1&&!t.fresh?'<em>x'+t.mult+'</em>':'');}
   else e.className='tile '+t.color+(t.fresh?' fresh':'');d.appendChild(e);d.className='cell';}
  else if(pops.some(q=>q.r===r&&q.c===c)){const q=pops.find(q=>q.r===r&&q.c===c),e=document.createElement('div');e.className='tile pop '+q.color;d.appendChild(e);}
  else if(sel!==null&&human()&&L.validNext(g.board,placed,r,c))d.classList.add('ok');bd.appendChild(d);}
 const rk=$('rack');rk.innerHTML='';const who=g.mode==='pvp'?g.turn:0,rack=g.racks[who];
 for(let s=0;s<3;s++){const set=document.createElement('div');set.className='set';
  for(let j=0;j<3;j++){const i=s*3+j,col=rack[i],d=document.createElement('div');d.className='rt'+(sel===i&&g.turn===who?' sel':'');d.dataset.i=i;
   if(col&&!(g.turn===who&&usedSlot(i)))d.innerHTML=tileHTML(col);set.appendChild(d);}rk.appendChild(set);}
 $('s0').textContent=g.scores[0];$('s1').textContent=g.scores[1];$('pot').textContent=g.pot;
 $('n1').textContent=NAMES()[1];$('n0').className=g.turn===0?'on':'';$('n1').className=g.turn===1?'on':'';
 const mv=Math.min(g.moves[g.turn]+1,10),fin=L.isFinal(g)&&!g.over;$('banner').textContent=g.over?'GAME OVER':(fin?'FINAL MOVE!':'MOVE '+mv+' / 10');$('banner').className=fin?'final':'';
 $('badge').textContent=g.power[g.turn];$('power').className='btn'+(boost?' on':'');$('coinN').textContent=g.coins[0];
 const h=human()&&!busy;$('play').disabled=!h;$('recall').disabled=!h||!placed.length;$('swap').disabled=!h||placed.length>0;$('power').disabled=!h||g.power[g.turn]<1;}
function place(r,c){if(sel===null||!human()||busy)return;const col=g.racks[g.turn][sel];if(!col||usedSlot(sel))return;
 if(!L.validNext(g.board,placed,r,c)){say(L.inLine(placed,r,c)?'Must touch a tile':'One row or column only!');beep(200);return;}
 placed.push({r,c,color:col,slot:sel});sel=firstFree();beep(600);render();}
$('rack').onclick=e=>{const t=e.target.closest('.rt');if(!t||!human())return;const i=+t.dataset.i;if(!g.racks[g.turn][i]||usedSlot(i))return;sel=i;render();};
$('board').onclick=e=>{const t=e.target.closest('.cell');if(!t)return;const r=+t.dataset.r,c=+t.dataset.c,i=placed.findIndex(p=>p.r===r&&p.c===c);
 if(i>=0){if(i===placed.length-1){sel=placed.pop().slot;render();}return;}place(r,c);};
let drag=null;$('rack').addEventListener('pointerdown',e=>{const t=e.target.closest('.rt');if(!t||!human())return;const i=+t.dataset.i;if(!g.racks[g.turn][i]||usedSlot(i))return;sel=i;render();
 drag=document.createElement('div');drag.className='drag';drag.innerHTML=tileHTML(g.racks[g.turn][i]);document.body.appendChild(drag);mv(e);});
function mv(e){if(drag){drag.style.left=e.clientX-22+'px';drag.style.top=e.clientY-60+'px';}}
addEventListener('pointermove',mv);addEventListener('pointerup',e=>{if(!drag)return;drag.remove();drag=null;const el=document.elementFromPoint(e.clientX,e.clientY-38),c=el&&el.closest('.cell');if(c)place(+c.dataset.r,+c.dataset.c);});
$('recall').onclick=()=>{placed=[];sel=firstFree();boost=false;render();};
$('power').onclick=()=>{boost=!boost;say(boost?'⚡ Double points this move!':'Power-up off');render();};
$('swap').onclick=()=>{L.swap(g);say('All 9 tiles swapped');next();};
$('play').onclick=()=>{const np=placed.length,p=g.turn,res=L.commit(g,placed,boost);pop(res);markOwner(p);placed=[];boost=false;beep(res.score?900:500);
 say(res.score?'+'+res.score+' ⭐x'+res.cleared:(np?'No match – need 3!':'Passed (pot +100)'));next();};
let pops=[];function pop(res){pops=res.pops||[];setTimeout(()=>{pops=[];render();},450);}
function markOwner(p){g.board.forEach(r=>r.forEach(t=>{if(t&&t.star&&t.owner===undefined)t.owner=p;}));}
function next(){sel=g.over?null:firstFree();render();if(g.over)return finish();
 if(g.mode==='pvp'){say(NAMES()[g.turn]+"'s turn");return;}
 if(g.turn===1){busy=true;render();setTimeout(()=>{const m=L.aiMove(g);placed=m.pl;render();setTimeout(()=>{const res=L.commit(g,placed,m.boost);pop(res);markOwner(1);placed=[];busy=false;
  say(res.score?'Computer +'+res.score:'Computer passes');next();},800);},500);}}
function finish(){const n=NAMES(),w=g.winner;
 $('msg').innerHTML=(w<0?'Tie game!':n[w]+' wins the pot!')+'<br>'+g.scores[0]+' – '+g.scores[1]+'<br>Coins: '+g.coins[0];localStorage.coins=g.coins[0];$('overlay').classList.add('show');}
function start(mode){g=L.newGame(mode);g.coins[0]=+(localStorage.coins||729);placed=[];boost=false;busy=false;sel=firstFree();$('overlay').classList.remove('show');render();}
$('vsAI').onclick=()=>start('ai');$('vsP').onclick=()=>start('pvp');$('menuBtn').onclick=()=>$('overlay').classList.add('show');
$('infoBtn').onclick=()=>say('One row/column per move · 3+ same color scores & clears (⭐ = wild, permanent)');
start('ai');$('overlay').classList.add('show');
// fit the square board into whatever height is left after header/tray/banner/footer
function fit(){const bd=$('board'),app=$('app');let used=0;[...app.children].forEach(c=>{if(c!==bd&&c.id!=='overlay')used+=c.getBoundingClientRect().height;});
 const st=getComputedStyle(app),avail=app.clientHeight-parseFloat(st.paddingTop)-used-4;bd.style.width=Math.max(120,Math.min(app.clientWidth,avail))+'px';}
addEventListener('resize',fit);fit();setTimeout(fit,100);
