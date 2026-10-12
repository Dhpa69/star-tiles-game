const L=Logic,$=id=>document.getElementById(id);let g,pieces=[],sel=null,boost=false,busy=false,ghost=null,pops=[];
const toast=document.createElement('div');toast.id='toast';document.body.appendChild(toast);
function say(t){toast.textContent=t;toast.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>toast.style.opacity=0,1300);}
// ---- Web Audio synth SFX (no files); unlocked on first tap for iOS ----
const SFX=(()=>{let ctx=null;const get=()=>{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();}if(ctx.state==='suspended')ctx.resume();return ctx;};
 const muted=()=>typeof profile!=='undefined'&&profile.muted;
 function tone(f,dur,type,vol,t0,f2){const a=get();if(!a||muted())return;const t=a.currentTime+(t0||0),o=a.createOscillator(),v=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  v.gain.setValueAtTime(0.0001,t);v.gain.exponentialRampToValueAtTime(vol||0.15,t+0.008);v.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(v);v.connect(a.destination);o.start(t);o.stop(t+dur+0.02);}
 function noise(dur,vol,t0,lp){const a=get();if(!a||muted())return;const t=a.currentTime+(t0||0),n=a.sampleRate*dur,buf=a.createBuffer(1,n,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
  const s=a.createBufferSource(),f=a.createBiquadFilter(),v=a.createGain();f.type='lowpass';f.frequency.value=lp||1200;v.gain.value=vol||0.4;s.buffer=buf;s.connect(f);f.connect(v);v.connect(a.destination);s.start(t);}
 return {unlock:()=>{const a=get();if(a){const b=a.createBuffer(1,1,22050),s=a.createBufferSource();s.buffer=b;s.connect(a.destination);s.start(0);}},
  click:()=>tone(900,0.05,'square',0.06,0,500),rot:()=>tone(650,0.06,'triangle',0.08,0,900),bad:()=>tone(180,0.15,'sawtooth',0.07,0,120),
  pop:i=>{tone(500+i*70,0.09,'sine',0.18,i*0.06,1400+i*90);noise(0.04,0.15,i*0.06,3000);},
  chime:sc=>{const notes=sc>=300?[523,659,784,1047,1319]:sc>=120?[523,659,784,1047]:[659,784,988];notes.forEach((f,i)=>tone(f,0.25,'triangle',0.12,0.12+i*0.08));},
  boom:()=>{noise(0.6,0.7,0,700);tone(120,0.5,'sine',0.35,0,40);},pass:()=>tone(330,0.12,'triangle',0.08)};})();
function beep(f){if(f<=250)SFX.bad();else if(f<=650)SFX.click();else SFX.rot();}
addEventListener('pointerdown',()=>SFX.unlock(),{once:true});
function tileHTML(c){return c==='star'?'<div class="tile star"><span>⭐</span></div>':'<div class="tile '+c+'"></div>';}
// ---- local profile (schema ready to sync to an online account later) ----
const PKEY='startiles.profile';
function loadProfile(){let p={};try{p=JSON.parse(localStorage.getItem(PKEY))||{};}catch(e){}
 p=Object.assign({schema:1,id:'local-'+Math.random().toString(36).slice(2,10),name:'',coins:L.START_COINS,wins:0,games:0,difficulty:'medium',synced:false},p);
 if(!p.migratedV11){p.coins=L.START_COINS;p.migratedV11=true;localStorage.removeItem('coins');} // one-time reset to 100 for v11
 return p;}
let profile=loadProfile();
function saveProfile(){profile.updatedAt=new Date().toISOString();localStorage.setItem(PKEY,JSON.stringify(profile));}
saveProfile();
const DL={easy:'EASY',medium:'MEDIUM',hard:'HARD',expert:'EXPERT'};
const isOn=()=>g&&g.mode==='online',meIdx=()=>isOn()?Online.st.me:0;
const NAMES=()=>isOn()?g.names.map(x=>(x||'PLAYER').toUpperCase()):[(profile.name||'PLAYER').toUpperCase(),g.mode==='ai'?'COMPUTER ('+DL[profile.difficulty]+')':'PLAYER 2'];
const placed=()=>pieces.flatMap(p=>p.tiles);
function cur(){const b=g.board.map(r=>r.slice());placed().forEach(p=>b[p.r][p.c]=p.color==='star'?{star:true,fresh:true,mult:L.mult(p.r,p.c)}:{color:p.color,fresh:true});return b;}
const usedSet=s=>pieces.some(p=>p.s===s);
function human(){return !g.over&&(g.mode==='pvp'||g.turn===meIdx())&&!busy;}
function firstFree(){const r=g.racks[g.turn];for(let s=0;s<3;s++)if(r[3*s]&&!usedSet(s))return s;return null;}
function tilesAt(s,r,c){return L.pieceTiles(g.racks[g.turn],s,g.orient[g.turn][s],r,c);}
function render(){setTimeout(fit,0);const b=cur(),bd=$('board');bd.innerHTML='';
 const pvTiles=placed().concat(ghost&&ghost.ok?ghost.tiles:[]),pv=L.previewMove(g,pvTiles,boost),willSet=new Set(pv.pops.map(q=>q.r*8+q.c));
 const pe=$('prev');pe.textContent='This move: +'+pv.score+(boost&&pv.score?' (⚡x2)':'');const showPv=human()&&!aim&&(pvTiles.length||boost);pe.className='';const pp=$('potprev');pp.textContent=showPv?'+'+pv.score+(boost&&pv.score?' ⚡':''):'';pp.className=showPv?(pv.score?'hot':'zero'):'';
 const aimSet=new Set(aim&&aim.r!=null?L.blastCells(aim.type,aim.r,aim.c).map(([y,x])=>y*8+x):[]),fxSet=new Set(blastFx.map(([y,x])=>y*8+x));
 const gk=ghost?new Set(ghost.tiles.map(t=>t.r*8+t.c)):new Set();
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const d=document.createElement('div'),m=L.mult(r,c);d.className='cell'+(m>1?' m'+m:'');d.dataset.r=r;d.dataset.c=c;const t=b[r][c];
  if(t){const e=document.createElement('div');if(t.star){e.className='tile star '+(t.fresh?'fresh':t.owner===0?'mine':'theirs');e.innerHTML='<span>⭐</span>'+(t.mult>1&&!t.fresh?'<em>x'+t.mult+'</em>':'');}
   else e.className='tile '+t.color+(t.fresh?' fresh':'');d.appendChild(e);d.className='cell';}
  else if(pops.some(q=>q.r===r&&q.c===c)){const q=pops.find(q=>q.r===r&&q.c===c),e=document.createElement('div');e.className='tile pop '+q.color;d.appendChild(e);}
  const pi=pieceAt(r,c);if(pi>=0){const P=pieces[pi];if(P===spinP)d.classList.add('pspin');if(P.tiles[1].r===r&&P.tiles[1].c===c&&human()&&!aim){const rb=document.createElement('button');rb.className='rotb';rb.textContent='↻';rb.dataset.i=pi;d.classList.add('hasrot');d.appendChild(rb);}}
  if(willSet.has(r*8+c))d.classList.add('will');if(aimSet.has(r*8+c))d.classList.add('aimp');if(fxSet.has(r*8+c))d.classList.add('boom');
  if(gk.has(r*8+c))d.classList.add(ghost.ok?'gok':'gbad');bd.appendChild(d);}
 const rk=$('rack');rk.innerHTML='';const who=g.mode==='pvp'?g.turn:meIdx(),rack=g.racks[who];
 for(let s=0;s<3;s++){const set=document.createElement('div'),o=L.normO(g.orient[who][s]);set.className='set '+(o%2?'v':'h')+(spin===s?' spin':'')+(sel===s&&g.turn===who?' sel':'');set.dataset.s=s;
  const hidden=!rack[3*s]||(g.turn===who&&usedSet(s));
  const disp=L.pieceTiles(rack,s,o,0,0);for(let j=0;j<3;j++){const d=document.createElement('div');d.className='rt';if(!hidden)d.innerHTML=tileHTML(disp[j].color);set.appendChild(d);}
  if(!hidden){const rb=document.createElement('button');rb.className='rot';rb.textContent='↻';rb.dataset.s=s;set.appendChild(rb);}else set.classList.add('empty');
  rk.appendChild(set);}
 $('s0').textContent=g.scores[0];$('s1').textContent=g.scores[1];$('potn').textContent=g.pot;
 $('n0').textContent=NAMES()[0];$('n1').textContent=NAMES()[1];$('n0').className=g.turn===0?'on':'';$('n1').className=g.turn===1?'on':'';
 const mv=Math.min(g.moves[g.turn]+1,10),fin=L.isFinal(g)&&!g.over;$('banner').textContent=g.over?'GAME OVER':(fin?'FINAL MOVE!':'MOVE '+mv+' / 10');$('banner').className=fin?'final':'';
 const fr=g.power[g.turn];$('badge').textContent=boost?'✓':(fr>0?fr:'50🪙');$('power').className='btn'+(boost?' on':'');const cw=g.mode==='pvp'?g.turn:meIdx();$('coinN').textContent=g.coins[cw];
 $('swapc').textContent=g.swaps[g.turn]>0?'FREE':'50🪙';if(profile.coins!==g.coins[meIdx()]){profile.coins=g.coins[meIdx()];saveProfile();}
 const h=human();$('play').disabled=!h;$('recall').disabled=!h||!pieces.length;$('swap').disabled=!h||pieces.length>0||!L.canSwap(g);$('power').disabled=!h||(!boost&&!L.canPower(g));}
function tryPlace(s,r,c){if(s===null||!human()||usedSet(s)||!g.racks[g.turn][3*s])return false;const t=tilesAt(s,r,c);
 if(!L.validPiece(g.board,placed(),t)){say('Doesn\'t fit there');beep(200);return false;}
 pieces.push({s,r,c,tiles:t});sel=firstFree();beep(600);render();return true;}
let spin=null,lastRot=0;function rotate(s){if(!human()||usedSet(s))return;const now=performance.now();if(now-lastRot<120)return;lastRot=now; // guard only against same-event double-fire
 g.orient[g.turn][s]=L.rotateO(g.orient[g.turn][s]);sel=s;spin=s;render();clearTimeout(rotate.t);rotate.t=setTimeout(()=>{spin=null;},220);}
$('rack').addEventListener('pointerup',e=>{const rb=e.target.closest('.rot');if(rb){e.preventDefault();e.stopPropagation();rotate(+rb.dataset.s);}});
$('rack').addEventListener('dblclick',e=>e.preventDefault());
$('board').onclick=e=>{if(aim){const t=e.target.closest('.cell');if(!t)return;aim.r=+t.dataset.r;aim.c=+t.dataset.c;$('tgo').disabled=false;render();return;}if(Date.now()-noClick<500)return;const t=e.target.closest('.cell');if(!t||!human())return;const r=+t.dataset.r,c=+t.dataset.c;
 if(pieceAt(r,c)>=0)return;tryPlace(sel,r,c);};
function rotPlaced(p){const res=L.rotateInPlace(g.board,g.racks[g.turn],pieces.filter(x=>x!==p).flatMap(x=>x.tiles),p.s,g.orient[g.turn][p.s],p.r,p.c);
 if(res){g.orient[g.turn][p.s]=res.o;Object.assign(p,{r:res.r,c:res.c,tiles:res.tiles});spinP=p;beep(700);setTimeout(()=>{spinP=null;},250);}else{say("Doesn't fit");beep(200);}render();}
let spinP=null;
function pieceAt(r,c){return pieces.findIndex(p=>p.tiles.some(q=>q.r===r&&q.c===c));}
// drag whole piece: pointer events, no page scroll
let drag=null;
$('rack').addEventListener('pointerdown',e=>{if(e.target.closest('.rot'))return;const set=e.target.closest('.set');if(!set||set.classList.contains('empty')||!human())return;
 e.preventDefault();const s=+set.dataset.s,now=Date.now();
 drag={s,x0:e.clientX,y0:e.clientY,moved:false,el:null,tap:now};try{set.setPointerCapture(e.pointerId);}catch(_){}});
let rotTap=null;$('board').addEventListener('pointerdown',e=>{if(aim)return;const rb=e.target.closest('.rotb');if(rb&&human()){e.preventDefault();e.stopPropagation();rotTap={p:pieces[+rb.dataset.i],x:e.clientX,y:e.clientY};return;}const cell=e.target.closest('.cell');if(!cell||!human())return;const i=pieceAt(+cell.dataset.r,+cell.dataset.c);if(i<0)return;
 e.preventDefault();drag={s:pieces[i].s,x0:e.clientX,y0:e.clientY,moved:false,el:null,board:pieces[i]};});
addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();
 if(drag.board&&!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>8){pieces=pieces.filter(p=>p!==drag.board);}
 if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>8){drag.moved=true;sel=drag.s;render();
  const el=document.createElement('div');const oo=L.normO(g.orient[g.turn][drag.s]);el.className='drag set '+(oo%2?'v':'h');const disp=L.pieceTiles(g.racks[g.turn],drag.s,oo,0,0);for(let j=0;j<3;j++){const d=document.createElement('div');d.className='rt big';d.innerHTML=tileHTML(disp[j].color);el.appendChild(d);}document.body.appendChild(el);drag.el=el;}
 if(!drag.moved)return;const cs=$('board').querySelector('.cell').getBoundingClientRect().width;
 drag.el.style.setProperty('--dt',cs+'px');const ox=e.clientX-cs/2,oy=e.clientY-cs*1.6;drag.el.style.left=ox+'px';drag.el.style.top=oy+'px';
 const el=document.elementFromPoint(ox+cs/2,oy+cs/2),cell=el&&el.closest('#board .cell');
 const ng=cell?(()=>{const t=tilesAt(drag.s,+cell.dataset.r,+cell.dataset.c);return {tiles:t.filter(q=>q.r<8&&q.c<8),ok:L.validPiece(g.board,placed(),t),r:+cell.dataset.r,c:+cell.dataset.c};})():null;
 if(JSON.stringify(ng)!==JSON.stringify(ghost)){ghost=ng;render();}},{passive:false});
let noClick=0;addEventListener('pointerup',e=>{if(rotTap){const t=rotTap;rotTap=null;noClick=Date.now();if(Math.hypot(e.clientX-t.x,e.clientY-t.y)<20)rotPlaced(t.p);return;}if(!drag)return;const d=drag;drag=null;if(d.board||d.moved)noClick=Date.now();
 if(d.board&&!d.moved){rotPlaced(d.board);return;}
 if(false){const p=d.board,res=L.rotateInPlace(g.board,g.racks[g.turn],pieces.filter(x=>x!==p).flatMap(x=>x.tiles),p.s,g.orient[g.turn][p.s],p.r,p.c);
  if(res){g.orient[g.turn][p.s]=res.o;p.tiles=res.tiles;p.r=res.r;p.c=res.c;beep(700);}else{say("Doesn't fit");beep(200);}render();return;}
 if(d.moved){d.el&&d.el.remove();const gh=ghost;ghost=null;
  if(gh&&tryPlace(d.s,gh.r,gh.c))return;
  if(d.board){const el=document.elementFromPoint(e.clientX,e.clientY);if(el&&el.closest('#rack')){sel=d.s;say('Returned to tray');render();return;}pieces.push(d.board);}
  render();return;}
 if(sel===d.s)rotate(d.s);else{sel=d.s;render();}});
addEventListener('pointercancel',()=>{rotTap=null;if(drag){drag.el&&drag.el.remove();if(drag.board&&!pieces.includes(drag.board))pieces.push(drag.board);drag=null;ghost=null;render();}});
document.addEventListener('touchmove',e=>{if(drag)e.preventDefault();},{passive:false});
$('recall').onclick=()=>{pieces=[];sel=firstFree();boost=false;render();};
// power-up menu
let aim=null;// {type,r,c}
$('power').onclick=()=>{if(!human())return;if(boost){boost=false;say('Double points cancelled');render();return;}if(!L.canPower(g))return;$('pleft').textContent=g.power[g.turn]>0?'('+g.power[g.turn]+' free left)':'(costs 50 🪙 · you have '+g.coins[g.turn]+')';$('pmenu').classList.add('show');};
$('pmenu').onclick=e=>{const b=e.target.closest('[data-p]');if(!b&&e.target.id!=='pmenu')return;$('pmenu').classList.remove('show');const p=b&&b.dataset.p;
 if(p==='double'){boost=true;say('⚡ Double points this move!');render();}
 else if(p==='bomb'||p==='cross'){aim={type:p,r:null,c:null};$('tmsg').textContent=(p==='bomb'?'💣 Bomb':'✚ Cross Blast')+': tap a target';$('tgo').disabled=true;$('tbar').classList.add('show');render();}};
$('tno').onclick=()=>{aim=null;$('tbar').classList.remove('show');render();};
$('tgo').onclick=()=>{if(!aim||aim.r==null)return;if(isOn())Online.act({type:'blast',b:aim.type,r:aim.r,c:aim.c});const res=L.blast(g,aim.type,aim.r,aim.c);aim=null;$('tbar').classList.remove('show');if(!res)return render();
 boom(res);say(res.pops.length?'💥 Cleared '+res.pops.length+' tiles':'💥 Nothing to clear');};
function boom(res){blastFx=res.cells;pops=res.pops;SFX.boom();render();burst(res.pops);setTimeout(()=>{blastFx=[];pops=[];render();},550);}
let blastFx=[];
$('swap').onclick=()=>{const paid=g.swaps[g.turn]<1;if(!L.canSwap(g)){say('Not enough coins');return;}if(isOn())Online.act({type:'swap'});L.swap(g);say(paid?'Swapped (−50 🪙)':'Free swap used');next();};
$('play').onclick=()=>{const np=pieces.length,p=g.turn;if(isOn())Online.act({type:'commit',pl:placed(),boost});const res=L.commit(g,placed(),boost);pop(res);markOwner(p);pieces=[];boost=false;
 say(res.score?'+'+res.score+' (cleared '+res.cleared+')':(np?'No match – need 3!':'Passed (pot +100)'));next();};
function pop(res){pops=res.pops||[];pops.forEach((q,i)=>SFX.pop(i));if(res.score)setTimeout(()=>SFX.chime(res.score),pops.length*60);else SFX.pass();burst(pops);setTimeout(()=>{pops=[];render();},650);}
function burst(list){const bd=$('board');setTimeout(()=>list.forEach((q,i)=>{const cell=bd.children[q.r*8+q.c];if(!cell)return;for(let k=0;k<7;k++){const p=document.createElement('i');p.className='prt '+q.color;const ang=k/7*Math.PI*2+Math.random()*.5,d=28+Math.random()*26;p.style.setProperty('--dx',Math.cos(ang)*d+'px');p.style.setProperty('--dy',Math.sin(ang)*d+'px');p.style.animationDelay=(i*0.06)+'s';cell.appendChild(p);setTimeout(()=>p.remove(),900);}}),20);}
function markOwner(p){g.board.forEach(r=>r.forEach(t=>{if(t&&t.star&&t.owner===undefined)t.owner=p;}));}
function next(){sel=g.over?null:firstFree();render();if(g.over)return finish();
 if(g.mode==='pvp'){say(NAMES()[g.turn]+"'s turn");return;}
 if(isOn()){if(g.turn!==meIdx())say('Waiting for '+NAMES()[g.turn]+'…');return;}
 if(g.turn===1){busy=true;render();setTimeout(()=>{const m=L.aiPlan(g,profile.difficulty);if(m.swap&&L.swap(g)){busy=false;say('Computer swapped');next();return;}if(m.blast){boom(m.blast);say('Computer used '+(m.blast.type==='bomb'?'💣 Bomb':'✚ Cross Blast'));}pieces=[];for(let i=0;i<m.pl.length;i+=3)pieces.push({s:Math.floor(m.pl[i].slot/3),tiles:m.pl.slice(i,i+3)});render();
  setTimeout(()=>{const res=L.commit(g,placed(),m.boost);if(m.boost)say('Computer ⚡ x2');pop(res);markOwner(1);pieces=[];busy=false;say(res.score?'Computer +'+res.score:'Computer passes');next();},800);},500);}}
function finish(){const n=NAMES(),w=g.winner,me=meIdx();
 $('msg').innerHTML=(w<0?'Tie game!':n[w]+' wins the pot!')+'<br>'+g.scores[0]+' – '+g.scores[1]+'<br>'+(g.mode!=='pvp'&&w===me?'+10 coins! ':'')+'Coins: '+g.coins[me];profile.coins=g.coins[me];profile.games++;if(w===me)profile.wins++;if(isOn())Online.leave();saveProfile();showProfile();$('overlay').classList.add('show');}
function start(mode){const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name first');return;}profile.name=nm;saveProfile();g=L.newGame(mode);g.coins[0]=profile.coins;pieces=[];boost=false;busy=false;sel=firstFree();$('overlay').classList.remove('show');render();}
// ---- online rooms ----
function remoteAct(a){const p=g.turn;
 if(a.type==='commit'){const res=L.commit(g,a.pl,a.boost);pop(res);markOwner(p);say(NAMES()[p]+(res.score?' +'+res.score:' passes'));}
 else if(a.type==='swap'){L.swap(g);say(NAMES()[p]+' swapped');}
 else if(a.type==='blast'){const res=L.blast(g,a.b,a.r,a.c);if(res){boom(res);say(NAMES()[p]+' used '+(a.b==='bomb'?'💣 Bomb':'✚ Cross Blast'));}render();return;}
 next();}
const pending=[];
function onMsg(d){const S=Online.st;
 if(d.t==='hello'&&S.host&&!g.started){const seed=Math.floor(Math.random()*2**31);const names=[profile.name,d.name],coins=[profile.coins,+d.coins||100];Online.start(seed,names,coins);beginOnline(seed,names,coins);}
 else if(d.t==='start'&&!S.host&&!(isOn()&&g.started))beginOnline(d.seed,d.names,d.coins);
 else if(d.t==='act'){pending.push(d);pending.sort((x,y)=>x.n-y.n);while(pending.length&&pending[0].n===S.applied&&isOn()){const x=pending.shift();S.applied++;remoteAct(x.a);}}}
function beginOnline(seed,names,coins){g=L.newGame('pvp',Online.mulberry(seed));g.mode='online';g.names=names;g.coins=coins.slice();g.started=true;
 pieces=[];boost=false;busy=false;sel=firstFree();$('overlay').classList.remove('show');$('onl').classList.remove('show');render();say(g.turn===meIdx()?'Your turn!':'Waiting for '+NAMES()[g.turn]+'…');}
const onlStatus=t=>{$('onlmsg').textContent=t;};
$('hostBtn').onclick=()=>{const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name first');return;}profile.name=nm;saveProfile();
 const code=Online.host(nm,profile.coins,{msg:onMsg,status:onlStatus});$('onl').classList.add('show');$('onlcode').textContent=code;onlStatus('Share this code. Waiting for a friend to join…');};
$('joinBtn').onclick=()=>{const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name first');return;}profile.name=nm;saveProfile();
 const code=$('joinCode').value.trim().toUpperCase();if(code.length<4){say('Enter the room code');return;}
 Online.join(code,nm,profile.coins,{msg:onMsg,status:onlStatus});$('onl').classList.add('show');$('onlcode').textContent=code;onlStatus('Joining room…');};
$('onlCancel').onclick=()=>{Online.leave();$('onl').classList.remove('show');};
$('vsAI').onclick=()=>start('ai');$('vsP').onclick=()=>start('pvp');$('menuBtn').onclick=()=>$('overlay').classList.add('show');
$('infoBtn').onclick=()=>say('Drag a 3-tile piece · tap it again or ↻ to rotate · placed pieces stay movable until PLAY · ⚡ = power-ups · place anywhere it fits');
function fit(){const bd=$('board'),app=$('app');let used=0;[...app.children].forEach(c=>{if(c!==bd&&c.id!=='overlay')used+=c.getBoundingClientRect().height;});
 const st=getComputedStyle(app),avail=app.clientHeight-parseFloat(st.paddingTop)-used-4;bd.style.width=Math.max(120,Math.min(app.clientWidth,avail))+'px';}
addEventListener('resize',fit);
function showProfile(){$('muteBtn').textContent=profile.muted?'🔇 Sound: OFF':'🔊 Sound: ON';$('pname').value=profile.name;$('pstat').textContent='🪙 '+profile.coins+' coins · '+profile.wins+' wins / '+profile.games+' games';
 document.querySelectorAll('#diff button').forEach(b=>b.classList.toggle('on',b.dataset.d===profile.difficulty));}
$('muteBtn').onclick=()=>{profile.muted=!profile.muted;saveProfile();showProfile();if(!profile.muted)SFX.chime(60);};
$('diff').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;profile.difficulty=b.dataset.d;saveProfile();showProfile();if(g)render();};
$('pname').onchange=()=>{profile.name=$('pname').value.trim();saveProfile();if(g)render();};
g=L.newGame('ai');g.coins[0]=profile.coins;render();showProfile();$('overlay').classList.add('show');if(!profile.name)setTimeout(()=>$('pname').focus(),300);
