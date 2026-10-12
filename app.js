const L=Logic,$=id=>document.getElementById(id);let g,placed=[],sel=null,boost=false,busy=false;
const toast=document.createElement('div');toast.id='toast';document.body.appendChild(toast);
function say(t){toast.textContent=t;toast.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>toast.style.opacity=0,1200);}
function beep(f){try{const a=beep.c||(beep.c=new AudioContext()),o=a.createOscillator(),v=a.createGain();o.frequency.value=f;v.gain.value=.05;o.connect(v);v.connect(a.destination);o.start();o.stop(a.currentTime+.08);}catch(e){}}
function cur(){const b=g.board.map(r=>r.slice());placed.forEach(p=>b[p.r][p.c]={color:p.color,fresh:true});return b;}
function rackLeft(){const r=g.racks[g.turn].slice();placed.forEach(p=>r.splice(r.indexOf(p.color),1));return r;}
function human(){return !g.over&&(g.mode==='pvp'||g.turn===0);}
function tileHTML(c){return c==='star'?'<div class="tile star"><span>⭐</span></div>':'<div class="tile '+c+'"></div>';}
function render(){const b=cur(),bd=$('board');bd.innerHTML='';
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const d=document.createElement('div'),m=L.mult(r,c);d.className='cell'+(m>1?' m'+m:'');d.dataset.r=r;d.dataset.c=c;const t=b[r][c];
  if(t){const e=document.createElement('div');if(t.star){e.className='tile star '+(t.owner===0?'mine':'theirs');e.innerHTML='<span>⭐</span>'+(t.mult>1?'<em>x'+t.mult+'</em>':'');}
   else{if(t.color==='star'){e.className='tile star fresh';e.innerHTML='<span>⭐</span>';}else e.className='tile '+t.color+(t.fresh?' fresh':'');}d.appendChild(e);d.className='cell';}
  else if(sel!==null&&human()&&placed.length<3&&L.canPlace(b,r,c))d.classList.add('ok');bd.appendChild(d);}
 const rk=$('rack');rk.innerHTML='';const showRack=g.mode==='pvp'?g.turn:0;
 (g.turn===showRack?rackLeft():g.racks[showRack]).forEach((col,i)=>{const d=document.createElement('div');d.className='rt'+(sel===i?' sel':'');d.innerHTML=tileHTML(col);d.dataset.i=i;rk.appendChild(d);});
 $('s0').textContent=g.scores[0];$('s1').textContent=g.scores[1];$('pot').textContent=g.pot;
 $('n0').className=g.turn===0?'on':'';$('n1').className=g.turn===1?'on':'';
 const mv=Math.min(g.moves[g.turn]+1,10),fin=L.isFinal(g)&&!g.over;$('banner').textContent=g.over?'GAME OVER':(fin?'FINAL MOVE!':'MOVE '+mv+' / 10');$('banner').className=fin?'final':'';
 $('badge').textContent=g.power[g.turn];$('power').className='btn'+(boost?' on':'');$('coinN').textContent=g.coins[0];
 const h=human()&&!busy;$('play').disabled=!h;$('recall').disabled=!h||!placed.length;$('swap').disabled=!h||placed.length>0;$('power').disabled=!h||g.power[g.turn]<1;}
function place(r,c){if(sel===null||!human()||placed.length>=3)return;const b=cur();if(!L.canPlace(b,r,c))return;
 placed.push({r,c,color:rackLeft()[sel]});sel=rackLeft().length?0:null;beep(600);render();}
$('rack').onclick=e=>{const t=e.target.closest('.rt');if(!t||!human())return;sel=+t.dataset.i;render();};
$('board').onclick=e=>{const t=e.target.closest('.cell');if(!t)return;const r=+t.dataset.r,c=+t.dataset.c,i=placed.findIndex(p=>p.r===r&&p.c===c);
 if(i>=0&&i===placed.length-1){placed.pop();render();return;}place(r,c);};
// drag
let drag=null;$('rack').addEventListener('pointerdown',e=>{const t=e.target.closest('.rt');if(!t||!human())return;sel=+t.dataset.i;render();
 drag=document.createElement('div');drag.className='drag';drag.innerHTML=tileHTML(rackLeft()[sel]);document.body.appendChild(drag);mv(e);});
function mv(e){if(drag){drag.style.left=e.clientX-25+'px';drag.style.top=e.clientY-60+'px';}}
addEventListener('pointermove',mv);addEventListener('pointerup',e=>{if(!drag)return;drag.remove();drag=null;const el=document.elementFromPoint(e.clientX,e.clientY-35),c=el&&el.closest('.cell');if(c)place(+c.dataset.r,+c.dataset.c);});
$('recall').onclick=()=>{placed=[];sel=0;boost=false;render();};
$('power').onclick=()=>{boost=!boost;say(boost?'⚡ Double points this move!':'Power-up off');render();};
$('swap').onclick=()=>{L.swap(g);say('Tiles swapped');after();};
$('play').onclick=()=>{const np=placed.length,p=g.turn,res=L.commit(g,placed,boost);res.placed=np;markOwner(p);placed=[];boost=false;sel=0;beep(res.cleared?900:500);say(res.score?'+'+res.score+' ⭐x'+res.cleared:(res.placed?'No match – need 3!':'Passed (pot +100)'));after();};
function markOwner(p){g.board.forEach(r=>r.forEach(t=>{if(t&&t.star&&t.owner===undefined)t.owner=p;}));}
function after(){render();if(g.over)return finish();if(g.mode==='pvp'){say(['DHAVAL P','PLAYER 2'][g.turn]+"'s turn");return;}
 if(g.turn===1){busy=true;render();setTimeout(()=>{const m=L.aiMove(g);placed=m.pl;render();setTimeout(()=>{const res=L.commit(g,placed,m.boost);markOwner(1);placed=[];busy=false;say(res.score?'Dimble J +'+res.score:'Dimble J passes');after();},700);},600);}}
function finish(){const n=[$('n0').textContent,$('n1').textContent],w=g.winner;
 $('msg').innerHTML=(w<0?'Tie game!':n[w]+' wins the pot!')+'<br>'+g.scores[0]+' – '+g.scores[1]+'<br>Coins: '+g.coins[0];localStorage.coins=g.coins[0];$('overlay').classList.add('show');}
function start(mode){g=L.newGame(mode);g.coins[0]=+(localStorage.coins||729);$('n1').textContent=mode==='ai'?'DIMBLE J':'PLAYER 2';placed=[];sel=0;boost=false;busy=false;$('overlay').classList.remove('show');render();}
$('vsAI').onclick=()=>start('ai');$('vsP').onclick=()=>start('pvp');$('menuBtn').onclick=()=>$('overlay').classList.add('show');
$('infoBtn').onclick=()=>say('Points only for 3+ same color (⭐ = wild) · x2/x3 squares boost');
start('ai');$('overlay').classList.add('show');
