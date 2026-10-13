const L=Logic,$=id=>document.getElementById(id);let g,pieces=[],sel=null,boost=false,busy=false,ghost=null,pops=[];
const toast=document.createElement('div');toast.id='toast';document.body.appendChild(toast);
function say(t){toast.textContent=t;toast.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>toast.style.opacity=0,1300);}
// ---- Web Audio synth SFX (no files); unlocked on first tap for iOS ----
const SFX=(()=>{let ctx=null;const get=()=>{if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{ctx=new C();}catch(e){return null;}}if(ctx.state!=='running')try{ctx.resume();}catch(e){}return ctx;};window._audioCtx=()=>ctx;window._audioGet=get;
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
function render(){setTimeout(fit,0);clearTimeout(render.sv);render.sv=setTimeout(autosave,50);const b=show?show.board:cur(),bd=$('board');bd.innerHTML='';
 const pvTiles=placed().concat(ghost&&ghost.ok?ghost.tiles:[]),pv=L.previewMove(g,pvTiles,boost),willSet=new Set(pv.pops.map(q=>q.r*8+q.c));
 const pe=$('prev');const fx=pv.factor||1;pe.textContent='This move: +'+pv.score+(fx>1?' (⚡x'+fx+')':'');const showPv=human()&&!aim&&(pvTiles.length||boost);pe.className='';const pp=$('potprev');pp.textContent=showPv?'+'+pv.score+(fx>1?' x'+fx:''):'—';pp.className=showPv?(pv.score?'hot':'zero'):'';
 const aimSet=new Set(aim&&aim.r!=null?L.blastCells(aim.type,aim.r,aim.c).map(([y,x])=>y*8+x):[]),fxSet=new Set(blastFx.map(([y,x])=>y*8+x));
 const gk=ghost?new Set(ghost.tiles.map(t=>t.r*8+t.c)):new Set();
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const d=document.createElement('div'),m=L.mult(r,c);d.className='cell'+(m>1?' m'+m:'');d.dataset.r=r;d.dataset.c=c;const t=b[r][c];
  if(t){const e=document.createElement('div');if(t.star){e.className='tile star '+(t.fresh?'fresh':t.owner===0?'mine':'theirs');e.innerHTML='<span>⭐</span>'+(t.mult>1&&!t.fresh?'<em>x'+t.mult+'</em>':'');}
   else e.className='tile '+t.color+(t.fresh?' fresh':'');d.appendChild(e);d.className='cell';}
  else if(pops.some(q=>q.r===r&&q.c===c)){const q=pops.find(q=>q.r===r&&q.c===c),e=document.createElement('div');e.className='tile pop '+q.color;d.appendChild(e);}
  const pi=pieceAt(r,c);if(pi>=0){const P=pieces[pi];if(P===spinP)d.classList.add('pspin');if(P===shakeP)d.classList.add('pshake');if(P.tiles[1].r===r&&P.tiles[1].c===c&&false){}}
  if(willSet.has(r*8+c))d.classList.add('will');if(aimSet.has(r*8+c))d.classList.add('aimp');if(fxSet.has(r*8+c))d.classList.add('boom');
  if(gk.has(r*8+c))d.classList.add(ghost.ok?'gok':'gbad');if(show){if(show.hl.has(r*8+c))d.classList.add('ohl');if(show.drop.has(r*8+c))d.classList.add('odrop');}bd.appendChild(d);}
 const rk=$('rack');rk.innerHTML='';const who=g.mode==='pvp'?g.turn:meIdx(),rack=g.racks[who];
 for(let s=0;s<3;s++){const set=document.createElement('div'),o=L.normO(g.orient[who][s]);set.className='set '+(o%2?'v':'h')+(spin===s?' spin':'')+(sel===s&&g.turn===who?' sel':'');set.dataset.s=s;
  const hidden=!rack[3*s]||(g.turn===who&&usedSet(s));
  const disp=L.pieceTiles(rack,s,o,0,0);for(let j=0;j<3;j++){const d=document.createElement('div');d.className='rt';if(!hidden)d.innerHTML=tileHTML(disp[j].color);set.appendChild(d);}
  if(!hidden){const rb=document.createElement('button');rb.className='rot';rb.textContent='↻';rb.dataset.s=s;set.appendChild(rb);}else set.classList.add('empty');
  rk.appendChild(set);}
 $('s0').textContent=g.scores[0];$('s1').textContent=g.scores[1];if(g.pot!==undefined)delete g.pot; // old saves
 $('n0').textContent=NAMES()[0];$('n1').textContent=NAMES()[1];$('n0').className=g.turn===0?'on':'';$('n1').className=g.turn===1?'on':'';
 const mv=Math.min(g.moves[g.turn]+1,10),fin=L.isFinal(g)&&!g.over;$('banner').textContent=g.over?'GAME OVER':(fin?'FINAL MOVE!':'MOVE '+mv+' / 10');$('banner').className=fin?'final':'';setTimeout(updReplay,0);
 const fr=g.power[g.turn];const bf=bx();$('badge').textContent=bf>1?'x'+bf:(fr>0?fr:'50🪙');$('power').className='btn'+(boost?' on':'');const cw=g.mode==='pvp'?g.turn:meIdx();$('coinN').textContent=g.coins[cw];
 $('swapc').textContent=g.swaps[g.turn]>0?'FREE':'50🪙';if(!isOn()&&profile.coins!==g.coins[meIdx()]){profile.coins=g.coins[meIdx()];saveProfile();}
 const h=human();$('play').disabled=!h;$('recall').disabled=!h||!pieces.length;$('swap').disabled=!h||firstFree()==null||!L.canSwap(g);$('power').disabled=!h||(!boost&&!L.canPower(g)&&L.charges(g)<1);}
function bn(){return boost?L.norm(boost):{d:0,t:0};}function bx(){const b=bn();return Math.pow(2,b.d)*Math.pow(3,b.t);}
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
 if(res){g.orient[g.turn][p.s]=res.o;Object.assign(p,{r:res.r,c:res.c,tiles:res.tiles});spinP=p;beep(700);setTimeout(()=>{spinP=null;},250);}else{say("Doesn't fit");beep(200);shakeP=p;setTimeout(()=>{shakeP=null;render();},400);}render();}
let shakeP=null;
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
 const ng=snapAt(drag.s,ox+cs/2,oy+cs/2);
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
$('power').onclick=()=>{if(!human())return;const b=bn(),used=b.d+b.t,left=L.charges(g)-used,fl=Math.max(0,g.power[g.turn]-used);$('unboost').style.display=used?'':'none';$('pleft').textContent=(used?'now x'+bx()+' · ':'')+(fl>0?'('+fl+' free left)':'(costs 50 🪙 · you have '+(g.coins[g.turn]-Math.max(0,used-g.power[g.turn])*50)+')');document.querySelectorAll('#pmenu [data-p=double]').forEach(el=>{const on=el.dataset.p==='double'?b.d>0:b.t>0;el.classList.toggle('armed',on);const s=el.querySelector('small');if(s){s.dataset.o=s.dataset.o||s.textContent;s.textContent=on?'✓ ACTIVE this move · tap to cancel (refund)':s.dataset.o;}});$('pmenu').classList.add('show');};
$('pmenu').onclick=e=>{const b=e.target.closest('[data-p]');if(!b&&e.target.id!=='pmenu')return;$('pmenu').classList.remove('show');const p=b&&b.dataset.p;
 if(p==='double'||p==='unboost'){const b=bn();if(p==='unboost'){boost=false;say('Boosts cancelled (refunded)');render();return;}const want=p==='double'?'d':'t';if(b[want]){boost=false;say('⚡ '+(p==='double'?'Double':'Triple')+' cancelled (refunded)');render();return;}if(L.charges(g)<1){say('No charges left');return;}boost=want==='d'?{d:1,t:0}:{d:0,t:1};say('⚡ x'+bx()+' this move! (one per move)');render();}
 else if(p==='bomb'||p==='cross'){aim={type:p,r:null,c:null};$('tmsg').textContent=(p==='bomb'?'💣 Bomb':'✚ Cross Blast')+': tap a target';$('tgo').disabled=true;$('tbar').classList.add('show');render();}};
$('tno').onclick=()=>{aim=null;$('tbar').classList.remove('show');render();};
$('tgo').onclick=()=>{if(!aim||aim.r==null)return;if(isOn())Online.act({type:'blast',b:aim.type,r:aim.r,c:aim.c});const res=L.blast(g,aim.type,aim.r,aim.c);aim=null;$('tbar').classList.remove('show');if(!res)return render();
 boom(res);say(res.pops.length?'💥 Cleared '+res.pops.length+' tiles':'💥 Nothing to clear');};
function boom(res){setTimeout(autosave,0);blastFx=res.cells;pops=res.pops;SFX.boom();render();burst(res.pops);setTimeout(()=>{blastFx=[];pops=[];render();},550);}
let blastFx=[];
$('swap').onclick=()=>{const paid=g.swaps[g.turn]<1;if(!L.canSwap(g)){say('Not enough coins');return;}let s=sel;if(s==null||pieces.some(p=>p.s===s))s=firstFree();if(s==null){say('Select a tray piece to swap');return;}if(isOn())Online.act({type:'swap',s});L.swap(g,s);sel=s;say((paid?'Swapped piece (−50 🪙)':'Free swap used')+' — still your turn');render();autosave();};
$('play').onclick=()=>{const np=pieces.length,p=g.turn;boost=L.single(boost);if(isOn())Online.act({type:'commit',pl:placed(),boost});const res=L.commit(g,placed(),boost);pop(res);markOwner(p);pieces=[];boost=false;
 say(res.score?'+'+res.score+' (cleared '+res.cleared+')':(np?'No match – need 3!':'Passed'));next();};
function pop(res){pops=res.pops||[];pops.forEach((q,i)=>SFX.pop(i));if(res.score)setTimeout(()=>SFX.chime(res.score),pops.length*60);else SFX.pass();burst(pops);setTimeout(()=>{pops=[];render();},650);}
function burst(list){const bd=$('board');setTimeout(()=>list.forEach((q,i)=>{const cell=bd.children[q.r*8+q.c];if(!cell)return;for(let k=0;k<7;k++){const p=document.createElement('i');p.className='prt '+q.color;const ang=k/7*Math.PI*2+Math.random()*.5,d=28+Math.random()*26;p.style.setProperty('--dx',Math.cos(ang)*d+'px');p.style.setProperty('--dy',Math.sin(ang)*d+'px');p.style.animationDelay=(i*0.06)+'s';cell.appendChild(p);setTimeout(()=>p.remove(),900);}}),20);}
function markOwner(p){g.board.forEach(r=>r.forEach(t=>{if(t&&t.star&&t.owner===undefined)t.owner=p;}));}
function next(){sel=g.over?null:firstFree();render();if(g.over)return finish();autosave();
 if(g.mode==='pvp'){say(NAMES()[g.turn]+"'s turn");return;}
 if(isOn()){if(g.turn!==meIdx())say('Waiting for '+NAMES()[g.turn]+'…');return;}
 if(g.turn===1){busy=true;render();setTimeout(()=>{const m=L.aiPlan(g,profile.difficulty);if(m.swap&&L.swap(g,0)){busy=false;say('Computer swapped a piece');next();return;}const bl=m.blast?{type:m.blast.type,cells:m.blast.cells,pops:m.blast.pops}:null;pieces=[];
  const pre=g.board.map(r=>r.slice()),res=L.commit(g,m.pl,m.boost);markOwner(1); // state is final now; the rest is only a show
  showMove({who:1,pre,pl:m.pl,boost:m.boost,blast:bl,res},()=>{busy=false;next();});},500);}}
function finish(){clearSave();const n=NAMES(),w=g.winner,me=meIdx();
 $('result').innerHTML=(g.resigned!=null?n[g.resigned]+' resigned. ':'')+(w<0?'Tie game!':n[w]+' wins!')+'<br>'+g.scores[0]+' – '+g.scores[1]+'<br>'+(g.mode!=='pvp'&&w===me?'+10 coins! ':'')+'Coins: '+g.coins[me];if(!isOn())profile.coins=g.coins[me];profile.games++;if(w===me)profile.wins++;if(isOn()){const S=Online.st,o=Online.saved(S.code);if(o&&o.counted){profile.games--;if(w===me)profile.wins--;}else profile.coins=Math.max(0,profile.coins+g.coins[me]-(g.coinsStart||g.coins)[me]);$('result').innerHTML=$('result').innerHTML.replace(/Coins: \d+/,'Coins: '+profile.coins);Online.persist({over:true,counted:true,winner:w,scores:g.scores.slice()});Online.leave();renderGames();}saveProfile();showProfile();$('overlay').classList.add('show');}
function start(mode){$('result').innerHTML='';const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name first');return;}profile.name=nm;saveProfile();clearSave();g=L.newGame(mode,null,Math.random()<.5?1:0);g.coins[0]=profile.coins;pieces=[];boost=false;busy=false;sel=firstFree();g._live=true;$('overlay').classList.remove('show');render();autosave();firstBanner();}
// ---- online rooms ----
function applySilent(a){if(a.type==='commit'){const p=g.turn;L.commit(g,a.pl,a.boost);markOwner(p);}else if(a.type==='swap')L.swap(g,a.s);else if(a.type==='blast')L.blast(g,a.b,a.r,a.c);else if(a.type==='resign')L.resign(g,a.p);}
function remoteAct(a){const p=g.turn;
 if(a.type==='commit'){const pre=g.board.map(r=>r.slice()),res=L.commit(g,a.pl,a.boost);markOwner(p);const bl=lastBlast&&lastBlast.p===p&&lastBlast.k===g.moves[p]-1?lastBlast:null;lastBlast=null;busy=true;render();showMove({who:p,pre,pl:a.pl,boost:a.boost,blast:bl,res},()=>{busy=false;next();});return;}
 else if(a.type==='swap'){L.swap(g,a.s);say(NAMES()[p]+' swapped');}
 else if(a.type==='resign'){L.resign(g,a.p);say(NAMES()[a.p]+' resigned – you win!');}
 else if(a.type==='blast'){const res=L.blast(g,a.b,a.r,a.c);if(res){lastBlast={p,k:g.moves[p],type:a.b,cells:res.cells,pops:res.pops};boom(res);say(NAMES()[p]+' used '+(a.b==='bomb'?'💣 Bomb':'✚ Cross Blast'));}render();return;}
 next();}
const pending=[];
function onMsg(d){const S=Online.st;if(d.t==='chat'){chatIn(d);return;}
 if(d.t==='hello'&&S.host&&S.seed!=null&&S.names){Online.start(S.seed,S.names,S.coins);} // v24: joiner didn't get start yet -> resend
 else if(d.t==='hello'&&S.host&&S.seed==null){const seed=newSeed();const names=[profile.name,d.name],coins=[profile.coins,+d.coins||100];Online.start(seed,names,coins);beginOnline(seed,names,coins);}
 else if(d.t==='start'&&!S.host&&S.seed==null)beginOnline(d.seed,d.names,d.coins);
 else if(d.t==='act'){if(d.n<S.applied||!isOn())return;if(!pending.some(x=>x.n===d.n))pending.push(d);pending.sort((x,y)=>x.n-y.n);
  while(pending.length&&pending[0].n<S.applied)pending.shift();
  while(pending.length&&pending[0].n===S.applied){const x=pending.shift();Online.record(x.a);remoteAct(x.a);}
  if(pending.length&&pending[0].n>S.applied)Online.send({t:'need',from:S.applied});}
 else if(d._old&&d.t!=='act'&&d.t!=='start'&&d.t!=='hello')return;
 else if(d.t==='need'){Online.resend(d.from);}
 else if(d.t==='back'||d.t==='ping'){if(d.t==='back')say(NAMES()[1-meIdx()]+' is back');if(typeof d.have==='number'&&d.have<S.applied)Online.resend(d.have);if(typeof d.have==='number'&&d.have>S.applied)Online.send({t:'need',from:S.applied});updOnl();}
 else if(d.t==='away'){S.lastSeen=0;updOnl();}
 else if(d.t==='rematch'&&d.code){Online.persist({rematch:d.code});say('Rematch offered! See My online games');}
 renderGames();}
function updOnl(){const el=$('ostat');if(!isOn()||g.over){el.className='';return;}const away=Date.now()-Online.st.lastSeen>200000;const live=Online.netInfo().startsWith('live ✓');el.textContent=(away?'⚠ '+NAMES()[1-meIdx()]+' away':'🌐 Room '+Online.st.code)+' · '+(live?'Live ✓':'Fallback relay')+'  ⓘ';el.className=away?'show away':'show';}
setInterval(()=>{if(isOn()&&!g.over){if(document.visibilityState==='visible')Online.ping();updOnl();}},90000); // v25: keepalive 90s
setInterval(()=>{if(isOn())updOnl();},5000);
document.addEventListener('visibilitychange',()=>{if(!isOn())return;if(document.visibilityState==='visible'){Online.ping('back');}else Online.ping('away');});
function beginOnline(seed,names,coins,log){pending.length=0;stopWait();lastMove=null;g=L.newGame('pvp',Online.mulberry(seed),firstOf(seed));g.mode='online';g.names=names;g.coins=coins.slice();g.coinsStart=coins.slice();g.started=true;Online.setGame(seed,names,coins);(log||[]).forEach(applySilent);setTimeout(()=>catchUpShow(seed,coins,log||[]),400);if(!(log||[]).length)setTimeout(firstBanner,300);
 pieces=[];boost=false;busy=false;sel=firstFree();$('overlay').classList.remove('show');$('onl').classList.remove('show');render();updOnl();say(g.turn===meIdx()?'Your turn!':'Waiting for '+NAMES()[g.turn]+'…');}
const onlStatus=t=>{if(waitT){onlErr(t);return;}$('onlmsg').textContent=t;if(isOn()&&t){$('ostat').textContent='⚠ '+t;$('ostat').className='show away';}else if(isOn())updOnl();};
$('hostBtn').onclick=()=>{const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name first');return;}profile.name=nm;saveProfile();
 const code=Online.host(nm,profile.coins,{msg:onMsg,status:onlStatus,p2p:onP2P,net:netUpd});$('onl').classList.add('show');$('onlcode').textContent=code;onlStatus('Share this code. Waiting for a friend to join…');};
$('joinBtn').onclick=()=>{const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name first');return;}profile.name=nm;saveProfile();
 const code=Online.clean($('joinCode').value);if(code.length!==6){say('Room codes have 6 letters/numbers');onlErr('Room codes have 6 letters/numbers (you typed '+code.length+').');return;}
 joinRoom(code);};
function joinRoom(code){const nm=profile.name;if(Online.saved(code)&&!Online.saved(code).over){openGame(code);return;}Online.join(code,nm,profile.coins,{msg:onMsg,status:onlStatus,p2p:onP2P,net:netUpd});$('overlay').classList.remove('show');$('onl').classList.add('show');$('onlcode').textContent=code;onlStatus('Joining room…');renderGames();}
$('onlCancel').onclick=()=>{stopWait();Online.leave();$('onl').classList.remove('show');renderGames();say('Room kept in My online games');};
// ---- autosave / resume (local games only) ----
const SKEY='startiles.save';
function autosave(){if(!g||!g.started&&g.mode!=='online'&&!g._live)return;if(g.mode==='online'||g.over)return;
 try{const {rng,...rest}=g;localStorage.setItem(SKEY,JSON.stringify({v:1,savedAt:Date.now(),g:rest,pieces,difficulty:profile.difficulty}));}catch(e){}}
function clearSave(){localStorage.removeItem(SKEY);showResume();}
function loadSave(){try{return JSON.parse(localStorage.getItem(SKEY));}catch(e){return null;}}
function showResume(){const ob=$('onlResume');if(ob)ob.style.display='none';const qb=$('quitBtn');if(qb)qb.style.display=g&&!g.over&&(g._live||(isOn()&&g.started))?'block':'none';renderGames();const s=loadSave(),b=$('resumeBtn');if(!b)return;b.style.display=s&&s.g&&!s.g.over?'block':'none';
 if(s&&s.g)b.textContent=(g&&g._live&&!g.over?'▶ Continue game (':'▶ Resume game (')+(s.g.mode==='ai'?'vs COMPUTER':'Pass & Play')+', move '+Math.min(10,s.g.moves[0]+1)+'/10)';}
$('onlResume').onclick=()=>openGame((Online.saved()||{}).code);
function openGame(code){const s=Online.saved(code);if(!s)return;if(s.rematch&&s.over){joinRoom(s.rematch);return;}
 if(s.seed==null){Online.resume(s,{msg:onMsg,status:onlStatus,p2p:onP2P,net:netUpd});$('onl').classList.add('show');$('onlcode').textContent=s.code;onlStatus(s.host?'Share this code. Waiting for a friend to join…':'Joining room…');return;}$('overlay').classList.remove('show');
 if(isOn()&&Online.st.on&&Online.st.code===s.code){render();return;} // still connected: just close the menu
 Online.resume(s,{msg:onMsg,status:onlStatus,p2p:onP2P,net:netUpd});beginOnline(s.seed,s.names,s.coins,s.log);updOnl();say((s.over?'Finished game ':'Rejoined room ')+s.code+(s.over?'':' – catching up…'));if(g.over){$('result').innerHTML=(g.winner<0?'Tie game!':NAMES()[g.winner]+' wins!')+'<br>'+g.scores[0]+' – '+g.scores[1];Online.leave();$('overlay').classList.add('show');renderGames();}}
$('resumeBtn').onclick=()=>{const s=loadSave();if(!s)return;g=Object.assign(s.g,{rng:Math.random,_live:true});if(s.difficulty)profile.difficulty=s.difficulty;
 pieces=(s.pieces||[]).filter(p=>p&&p.tiles);boost=false;busy=false;aim=null;$('overlay').classList.remove('show');sel=firstFree();
 if(g.mode==='ai'&&g.turn===1){pieces=[];next();}else render();say('Game resumed');};
addEventListener('pagehide',autosave);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')autosave();});
$('vsAI').onclick=()=>start('ai');$('vsP').onclick=()=>start('pvp');$('menuBtn').onclick=()=>{autosave();showResume();$('overlay').classList.add('show');};

function fit(){const bd=$('board'),app=$('app');let used=0;[...app.children].forEach(c=>{if(c!==bd&&c.id!=='overlay')used+=c.getBoundingClientRect().height;});
 const st=getComputedStyle(app),avail=app.clientHeight-parseFloat(st.paddingTop)-used-4;bd.style.width=Math.max(120,Math.min(app.clientWidth,avail))+'px';}
addEventListener('resize',fit);
function showProfile(){$('muteBtn').textContent=profile.muted?'🔇 Sound: OFF':'🔊 Sound: ON';$('pname').value=profile.name;$('pstat').textContent='🪙 '+profile.coins+' coins · '+profile.wins+' wins / '+profile.games+' games';
 document.querySelectorAll('#diff button').forEach(b=>b.classList.toggle('on',b.dataset.d===profile.difficulty));}
$('muteBtn').onclick=()=>{profile.muted=!profile.muted;saveProfile();showProfile();if(!profile.muted)SFX.chime(60);};
$('diff').onclick=e=>{const b=e.target.closest('[data-d]');if(!b)return;profile.difficulty=b.dataset.d;saveProfile();showProfile();if(g)render();};
$('pname').onchange=()=>{profile.name=$('pname').value.trim();saveProfile();if(g)render();};
g=L.newGame('ai');g.coins[0]=profile.coins;render();showProfile();showResume();$('overlay').classList.add('show');if(!profile.name)setTimeout(()=>$('pname').focus(),300);

// ---- v22: My online games (many rooms at once, Words-With-Friends style) ----
var gcache;
function replayGame(o){gcache=gcache||{};if(o.seed==null)return null;const k=o.code+':'+o.seed+':'+(o.log||[]).length;if(gcache[o.code]&&gcache[o.code].k===k)return gcache[o.code].G;
 const G=L.newGame('pvp',Online.mulberry(o.seed),firstOf(o.seed));G.coins=(o.coins||[100,100]).slice();for(const a of o.log||[]){try{if(a.type==='commit')L.commit(G,a.pl,a.boost);else if(a.type==='swap')L.swap(G,a.s);else if(a.type==='blast')L.blast(G,a.b,a.r,a.c);else if(a.type==='resign')L.resign(G,a.p);}catch(e){}}
 gcache[o.code]={k,G};return G;}
function ago(t){if(!t)return '';const s=(Date.now()-t)/1000;return s<60?'just now':s<3600?Math.floor(s/60)+'m ago':s<86400?Math.floor(s/3600)+'h ago':Math.floor(s/86400)+'d ago';}
function gameRows(){const m=Online.all(),rows=[];for(const code in m){const o=m[code],G=replayGame(o),me=o.me|0;
 let st,rank;if(!G){st=o.host?'Waiting for friend':'Joining…';rank=2;}else if(G.over||o.over){st=G.winner<0?'Tie':(G.winner===me?'You won':'You lost');rank=3;}else if(G.turn===me){st='Your turn';rank=0;}else{st='Their turn';rank=1;}
 rows.push({o,G,me,st,rank,opp:o.names?o.names[1-me]:'—',score:G?G.scores[me]+' – '+G.scores[1-me]:''});}
 rows.sort((a,b)=>a.rank-b.rank||(b.o.lastAct||0)-(a.o.lastAct||0));return rows;}
function renderGames(){const el=$('mygames');if(!el)return;const rows=gameRows();const yours=rows.filter(r=>r.rank===0).length;
 $('menuBtn').dataset.n=yours||'';document.title=(yours?'('+yours+') ':'')+'Star Tiles';
 if(!rows.length){el.innerHTML='';el.style.display='none';return;}el.style.display='block';
 el.innerHTML='<div class="mgh">🌐 My online games'+(yours?' <b class="mgn">'+yours+'</b>':'')+'</div>'+rows.map(r=>{const cls=['yt','tt','wt','ov'][r.rank];
  return '<div class="mg '+cls+'" data-code="'+r.o.code+'"><div class="mgm"><b>vs '+esc(r.opp)+'</b><span class="mgb">'+r.st+'</span><br><small>Room '+r.o.code+(r.score?' · '+r.score:'')+' · '+ago(r.o.lastAct)+'</small></div>'+
  (r.rank===3?(r.o.rematch?'<button class="mga" data-a="join">Join rematch</button>':'<button class="mga" data-a="rematch">Rematch</button>')+'<button class="mga x" data-a="rm">✕</button>':'<button class="mga x" data-a="rm">✕</button>')+'</div>';}).join('');}
function esc(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
document.addEventListener('click',e=>{const row=e.target.closest&&e.target.closest('.mg');if(!row)return;const code=row.dataset.code,a=e.target.dataset&&e.target.dataset.a,o=Online.saved(code);if(!o)return;
 if(a==='rm'){const G=replayGame(o);if(G&&!G.over&&!o.over){if(!confirm('Resign this game vs '+(o.names?o.names[1-o.me]:'friend')+'? It counts as a loss and they win.'))return;resignStored(o);}else if(!G&&!confirm('Remove this waiting room?'))return;
  if(isOn()&&Online.st.code===code){Online.leave();g=L.newGame('ai');g.coins[0]=profile.coins;render();}Online.clear(code);renderGames();return;}
 if(a==='rematch'){const nm=profile.name||$('pname').value.trim();if(!nm){say('Enter your name first');return;}const nc=Online.host(nm,profile.coins,{msg:onMsg,status:onlStatus,p2p:onP2P,net:netUpd});Online.sendTo(code,o.id,{t:'rematch',code:nc});
  $('overlay').classList.remove('show');$('onl').classList.add('show');$('onlcode').textContent=nc;onlStatus('Rematch room – waiting for '+(o.names?o.names[1-o.me]:'friend')+'…');return;}
 if(a==='join'){joinRoom(o.rematch);return;}
 openGame(code);});
// background poll: rooms you're not looking at; starts hosted games when a friend joins; turn notification
function onPolled(o){const me=o.me|0;
 if(o.host&&o.seed==null&&o.helloFrom){const seed=newSeed(),names=[profile.name,o.helloFrom.name],coins=[profile.coins,+o.helloFrom.coins||100];
  Online.upd(o.code,x=>{x.seed=seed;x.names=names;x.coins=coins;delete x.helloFrom;x.lastAct=Date.now();});Online.sendTo(o.code,o.id,{t:'start',seed,names,coins});o=Online.saved(o.code);}
 const G=replayGame(o);if(G&&!G.over&&G.turn===me&&o.notified!==o.log.length){Online.upd(o.code,x=>x.notified=x.log.length);if(!profile.muted)SFX.chime(120);say('🔔 Your turn vs '+(o.names?o.names[1-me]:'friend'));}
 if(o.rematch&&o.over&&!o.rmNote){Online.upd(o.code,x=>x.rmNote=1);say('🔁 '+(o.names?o.names[1-me]:'Friend')+' wants a rematch');}
 renderGames();}
Online.pollAll(onPolled);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')Online.pollAll(onPolled);});

// ---- v23: quit / resign ----
function resignStored(o){const me=o.me|0,n=(o.log||[]).length,act={type:'resign',p:me};Online.sendTo(o.code,o.id,{t:'act',n,a:act});
 const G=replayGame(o);if(G){const c0=(o.coins||[100,100])[me];L.resign(G,me);profile.coins=Math.max(0,profile.coins+G.coins[me]-c0);}profile.games++;saveProfile();showProfile();say('You resigned');}
function quitGame(){if(!g||g.over||!(g._live||isOn()))return;
 if(isOn()){const S=Online.st,o=Online.saved(S.code);if(!confirm('Resign this online game? It counts as a loss and '+NAMES()[1-meIdx()]+' wins.'))return;
  const me=meIdx();Online.act({type:'resign',p:me});L.resign(g,me);profile.coins=Math.max(0,profile.coins+g.coins[me]-(g.coinsStart||g.coins)[me]);profile.games++;saveProfile();
  Online.leave();Online.clear(S.code);}
 else{if(!confirm('Quit this game? Progress is lost and no coins are awarded.'))return;g.over=true;clearSave();}
 g=L.newGame('ai');g.coins[0]=profile.coins;pieces=[];boost=false;busy=false;$('result').innerHTML='Game quit.';render();showProfile();showResume();$('overlay').classList.add('show');}
$('quitBtn').onclick=quitGame;

// ---- v24: reliable connect: retries, status, timeout + Retry ----
let waitT=null,waitStart=0;
function stopWait(){clearInterval(waitT);waitT=null;const r=$('onlRetry');if(r)r.style.display='none';}
function onlErr(t){const e=$('onlerr');if(e)e.textContent=t||'';}
function startWait(){stopWait();waitStart=Date.now();onlErr('');
 waitT=setInterval(()=>{const S=Online.st;if(!S.on||S.seed!=null){stopWait();return;}const sec=Math.round((Date.now()-waitStart)/1000),net=Online.netInfo().startsWith('live ✓')||S.sseOk||(S.netOk&&Date.now()-S.netOk<30000);
  const live=Online.netInfo().startsWith('live ✓'),conn=live?'✓ Connected (live)':net?'✓ Connected (fallback relay)':'… connecting';$('onldbg').textContent=Online.netInfo();
  if(!S.host){if(sec%10===0&&sec>0)Online.send({t:'hello',name:profile.name,coins:profile.coins});$('onlmsg').textContent=conn+' · asking host to start ('+sec+'s)';}
  else $('onlmsg').textContent=conn+' · waiting for a friend to join ('+sec+'s). Share the code.';
  const lim=S.host?180:45;if(sec>=lim){$('onlRetry').style.display='block';onlErr(S.host?'No one has joined yet. Check your friend typed the code, then tap Retry.':(net?'The host isn\u2019t answering. Make sure the host has this room open, check the code, then Retry.':'Can\u2019t reach the relay (ntfy.sh). Check your internet, then Retry.'));}},1000);}
$('onlRetry').onclick=()=>{const S=Online.st,o=Online.saved(S.code);if(!o)return;Online.resume(o,{msg:onMsg,status:onlStatus,p2p:onP2P,net:netUpd});if(!o.host)Online.send({t:'hello',name:profile.name,coins:profile.coins});startWait();};
(function(){const H=$('hostBtn').onclick,J=$('joinBtn').onclick;$('hostBtn').onclick=()=>{H();if(Online.st.on&&Online.st.seed==null)startWait();};$('joinBtn').onclick=()=>{J();if(Online.st.on&&Online.st.seed==null)startWait();};})();
const _og=openGame;openGame=function(code){_og(code);const S=Online.st;if(S.on&&S.seed==null){if(!S.host)Online.send({t:'hello',name:profile.name,coins:profile.coins});startWait();}};

function onP2P(on){updOnl();say(on?'⚡ Direct connection':'Direct link lost – using relay');}

// ---- v27: debug line; tap the online status (or the line on the room screen) to copy the connection log ----
function netUpd(){if(isOn())updOnl();const d=$('onldbg');if(d)d.textContent=Online.netInfo();}
function copyLog(){const t='Star Tiles '+(document.getElementById('ver')||{}).textContent+' '+navigator.userAgent+'\n'+Online.netInfo()+'\n'+Online.dump();
 const done=()=>say('Connection log copied – paste it in a message');
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,()=>{window.prompt('Copy this log:',t);});else window.prompt('Copy this log:',t);}
$('ostat').addEventListener('click',copyLog);$('onldbg').addEventListener('click',copyLog);

// ---- v29: slow, watchable opponent moves (visual only: game state is already final before the show starts) ----
var show=null,lastMove=null,showRun=0,lastBlast=null;
function bstr(b){if(!b)return '';const n=L.norm(b);const f=Math.pow(2,n.d)*Math.pow(3,n.t);return f>1?'⚡x'+f:'';}
function showMove(mv,done){const run=++showRun;lastMove=mv;const nm=NAMES()[mv.who],W=(ms,f)=>setTimeout(()=>{if(run===showRun)f();},ms);
 const pieces3=[];for(let i=0;i<(mv.pl||[]).length;i+=3)pieces3.push(mv.pl.slice(i,i+3));
 const board=mv.pre.map(r=>r.slice());show={board,hl:new Set(),drop:new Set()};render();let t=0;
 const ban=[];if(mv.blast)ban.push(mv.blast.type==='bomb'?'💣 Bomb':'✚ Cross Blast');const bs=bstr(mv.boost);if(bs)ban.push(bs);
 if(ban.length){W(0,()=>bannerSay(nm+' used '+ban.join(' + ')));t+=900;}
 pieces3.forEach((pc,i)=>{W(t,()=>{show.drop=new Set();pc.forEach(q=>{board[q.r][q.c]=q.color==='star'?{star:true,fresh:true,mult:L.mult(q.r,q.c)}:{color:q.color,fresh:true};show.hl.add(q.r*8+q.c);show.drop.add(q.r*8+q.c);});SFX.click();render();});t+=700;});
 if(!pieces3.length){W(t,()=>bannerSay(nm+' passed'));t+=900;}
 W(t+450,()=>{show=null;pop(mv.res);bannerSay(mv.res.score?nm+' +'+mv.res.score+(bs?' ('+bs+')':''):(pieces3.length?nm+': no match':nm+' passed'));render();updReplay();});
 W(t+1300,()=>{done&&done();});}
function bannerSay(t){say(t);clearTimeout(say.t);say.t=setTimeout(()=>toast.style.opacity=0,1700);}
function updReplay(){const b=$('replayBtn');if(b)b.style.visibility=lastMove&&!busy&&g&&!g.over?'visible':'hidden';}
$('replayBtn').onclick=()=>{if(!lastMove||busy)return;busy=true;render();const cur=g.board;showMove(lastMove,()=>{busy=false;render();updReplay();});};
function catchUpShow(seed,coins,log){if(!isOn()||!log.length)return;const k=log.length-1,last=log[k];if(last.type!=='commit')return;
 const G=L.newGame('pvp',Online.mulberry(seed),firstOf(seed));G.coins=coins.slice();let who=0;for(let i=0;i<k;i++){const a=log[i];if(a.type==='commit')L.commit(G,a.pl,a.boost);else if(a.type==='swap')L.swap(G,a.s);else if(a.type==='blast')L.blast(G,a.b,a.r,a.c);else if(a.type==='resign')L.resign(G,a.p);}
 who=G.turn;if(who===meIdx())return;const pre=G.board.map(r=>r.slice()),res=L.commit(G,last.pl,last.boost);busy=true;render();showMove({who,pre,pl:last.pl,boost:last.boost,blast:null,res},()=>{busy=false;render();updReplay();});}

// ---- v29: copy / share the room code; ?room=XXXXXX opens straight to join ----
function roomLink(c){return location.origin+location.pathname+'?room='+c;}
function copyText(t){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t);
 return new Promise((ok,no)=>{const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';document.body.appendChild(ta);
  ta.focus();ta.select();ta.setSelectionRange(0,t.length);let r=false;try{r=document.execCommand('copy');}catch(e){}ta.remove();r?ok():no();});}
function flash(b,t){const o=b.dataset.o||(b.dataset.o=b.textContent);b.textContent=t;clearTimeout(b._t);b._t=setTimeout(()=>b.textContent=o,1500);}
$('copyCode').onclick=()=>{const c=$('onlcode').textContent.trim();if(!/^[A-Z0-9]{6}$/.test(c))return;copyText(c).then(()=>flash($('copyCode'),'✓ Copied!'),()=>{window.prompt('Copy the room code:',c);});};
$('shareCode').onclick=()=>{const c=$('onlcode').textContent.trim();if(!/^[A-Z0-9]{6}$/.test(c))return;const url=roomLink(c),text='Play Star Tiles with me! Room code '+c;
 if(navigator.share)navigator.share({title:'Star Tiles',text,url}).catch(()=>{});else copyText(text+' '+url).then(()=>flash($('shareCode'),'✓ Link copied!'),()=>window.prompt('Share this link:',url));};
(function(){const m=/[?&]room=([A-Za-z0-9 -]{4,14})/.exec(location.search);if(!m)return;const code=Online.clean(decodeURIComponent(m[1]));if(code.length!==6)return;
 try{history.replaceState(null,'',location.pathname);}catch(e){}$('joinCode').value=code;
 const go=()=>{const nm=$('pname').value.trim();if(!nm){$('pname').focus();say('Enter your name, then tap Join');$('joinCode').scrollIntoView({block:'center'});return;}profile.name=nm;saveProfile();joinRoom(code);startWait();};
 setTimeout(go,300);})();

// ---- v32: chat (online games only). Rides the same transport, stored per game, never touches game state ----
function chatStore(){const o=isOn()&&Online.saved(Online.st.code);return o&&Array.isArray(o.chat)?o.chat:[];}
function chatSave(list,unread){if(!isOn())return;Online.upd(Online.st.code,o=>{o.chat=list.slice(-100);if(unread!=null)o.unread=unread;});}
function chatUnread(){const o=isOn()&&Online.saved(Online.st.code);return o&&o.unread||0;}
function chatBadge(){const b=$('infoBtn'),n=isOn()?chatUnread():0;b.dataset.n=n?String(n):'';}
function chatIn(d){if(!d.id||typeof d.txt!=='string')return;const list=chatStore();if(list.some(m=>m.id===d.id))return;
 list.push({id:d.id,me:false,name:String(d.name||'').slice(0,20),txt:d.txt.slice(0,200),ts:+d.ts||Date.now()});list.sort((p,q)=>p.ts-q.ts);
 const open=$('chat').classList.contains('show');chatSave(list,open?0:chatUnread()+1);if(open)chatRender();else{chatBadge();if(!d._old){SFX.click();say('💬 '+(d.name||'')+': '+d.txt.slice(0,40));}}}
function chatSend(txt){txt=(txt||'').trim();if(!txt||!isOn())return;const m={t:'chat',id:Math.random().toString(36).slice(2,11),txt:txt.slice(0,200),name:profile.name,ts:Date.now()};
 const list=chatStore();list.push({id:m.id,me:true,name:profile.name,txt:m.txt,ts:m.ts});chatSave(list);Online.send(m);chatRender();}
function chatRender(){const el=$('chlist'),list=chatStore();$('chwho').textContent=isOn()?' with '+(NAMES()[1-meIdx()]||''):'';
 el.innerHTML=list.length?list.map(m=>'<div class="cm '+(m.me?'me':'them')+'"><span>'+esc(m.txt)+'</span><small>'+new Date(m.ts).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})+'</small></div>').join(''):'<p class="chempty">Say hi 👋</p>';el.scrollTop=el.scrollHeight;}
$('infoBtn').onclick=()=>{if(!isOn()){say('Chat is for online games');return;}$('chat').classList.add('show');Online.upd(Online.st.code,o=>o.unread=0);chatBadge();chatRender();};
$('chClose').onclick=()=>{$('chat').classList.remove('show');$('chText').blur();};
$('chSend').onclick=()=>{chatSend($('chText').value);$('chText').value='';};
$('chText').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('chSend').click();}});
document.querySelectorAll('.chemo button').forEach(b=>b.onclick=()=>chatSend(b.dataset.e));
$('chat').addEventListener('click',e=>{if(e.target.id==='chat')$('chClose').click();});
setInterval(chatBadge,2000);

// ---- v34: first player is random; online derives it from the host seed (new seeds >= 2^31; older seeds => host first) ----
function newSeed(){return 2**31+Math.floor(Math.random()*2**31);}
function firstOf(seed){return seed>=2**31?(seed&1):0;}
function firstBanner(){if(!g||g.over)return;const t=g.turn;let m;
 if(g.mode==='ai')m=t===0?'You go first!':'Computer goes first!';else if(isOn())m=t===meIdx()?'You go first!':(NAMES()[t]||'Friend')+' goes first!';else m=(NAMES()[t]||('Player '+(t+1)))+' goes first!';
 bannerSay('🎲 '+m);if(g.mode==='ai'&&t===1){busy=true;render();setTimeout(()=>{busy=false;next();},1400);}}
// ---- v34: iOS audio unlock: resume on every tap, silent <audio> loop so the ring/silent switch doesn't mute Web Audio ----
(function(){let el=null;
 try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
 function silentWav(){const sr=8000,n=sr/2,b=new ArrayBuffer(44+n*2),v=new DataView(b),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));}
 function unlock(){if(profile&&profile.muted)return;const c=window._audioGet();if(c&&c.state!=='running'){try{c.resume();}catch(e){}
   try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);}catch(e){}}
  if(!el){el=document.createElement('audio');el.src=silentWav();el.loop=true;el.setAttribute('playsinline','');el.setAttribute('x-webkit-airplay','deny');el.preload='auto';el.volume=0.01;}
  if(el.paused){const p=el.play();if(p&&p.catch)p.catch(()=>{});}}
 window._unlockAudio=unlock;
 ['touchend','pointerup','click','keydown'].forEach(ev=>addEventListener(ev,unlock,{capture:true,passive:true}));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){const c=window._audioCtx();if(c&&c.state!=='running')try{c.resume();}catch(e){}}else if(el)el.pause();});
 addEventListener('pageshow',()=>{const c=window._audioCtx();if(c&&c.state!=='running')try{c.resume();}catch(e){}});
 const mb=$('muteBtn');mb.onclick=()=>{profile.muted=!profile.muted;saveProfile();showProfile();if(profile.muted){if(el)el.pause();}else{unlock();SFX.chime(60);}};
})();

// ---- v35: forgiving drop. Cell from board geometry (not elementFromPoint), clamp so the piece stays on the board at edges/corners,
// then snap to the nearest valid spot within 1 cell. Fixes drops onto corner x3 squares landing the anchor off-board.
function snapAt(s,px,py){const bd=$('board').getBoundingClientRect(),cw=bd.width/8,ch=bd.height/8;
 const fx=(px-bd.left)/cw,fy=(py-bd.top)/ch;if(fx<-0.75||fy<-0.75||fx>8.75||fy>8.75)return null;
 const vert=L.normO(g.orient[g.turn][s])%2===1;let c=Math.max(0,Math.min(7,Math.floor(fx))),r=Math.max(0,Math.min(7,Math.floor(fy)));
 if(vert)r=Math.min(r,5);else c=Math.min(c,5);
 const pl=placed(),cand=[[0,0],[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]];
 for(const [dr,dc] of cand){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>7||cc>7)continue;const t=tilesAt(s,rr,cc);if(L.validPiece(g.board,pl,t))return {tiles:t,ok:true,r:rr,c:cc};}
 const t=tilesAt(s,r,c);return {tiles:t.filter(q=>q.r<8&&q.c<8),ok:false,r,c};}
