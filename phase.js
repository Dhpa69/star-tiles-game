// v73: phase transitions – step tracker under the header, a quick tap-to-skip banner when the phase changes,
// and body.ph-* classes that light up the active area (rack / board / PLAY) and dim the rest.
(function(){
const RM=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEPS=[['place','🧩','Place'],['play','▶','Play'],['score','✨','Score'],['wait','⏳','Their turn']];
const INFO={place:['🧩','Place your tiles','Drag pieces from the rack onto the board'],play:['▶','Ready to score','Tap PLAY – or tap a piece to move it'],
 aim:['🎯','Aim your power-up','Tap a target square on the board'],score:['✨','Scoring','Matching groups clear and add up'],wait:['⏳','Their turn','Sit tight – watch their move'],end:['🏁','Game over','']};
let bar=null,ban=null,last='',lastKey='',hideT=0;
const live=()=>typeof g!=='undefined'&&g&&g.started!==false&&!$('overlay').classList.contains('show')&&!document.getElementById('tut')&&!(document.getElementById('loginb')&&getComputedStyle(document.getElementById('loginb')).display!=='none');
function who(){try{if(g.team&&window.StTeam)return StTeam.cur();if(isOn())return (g.names[g.turn]||'Opponent');if(g.mode==='pvp')return NAMES()[g.turn];if(g.mode==='ai')return 'Computer';}catch(e){}return '';}
function phase(){if(!live())return '';if(g.over)return 'end';if(typeof aim!=='undefined'&&aim)return 'aim';
 const mine=w=>g.mode==='pvp'||g.mode==='daily'||g.solo||w===meIdx();
 if(typeof tally!=='undefined'&&tally)return mine(tally.who)?'score':'wait';
 if(typeof show!=='undefined'&&show)return g.mode==='pvp'?'score':'wait';
 if(!human())return g.mode==='pvp'||g.mode==='daily'||g.solo?(last||'place'):'wait';
 return pieces.length&&firstFree()===null?'play':'place';}
function moveNo(){const mv=(g.moves[0]||0)+(g.moves[1]||0);return g.solo||g.mode==='daily'?Math.min(10,(g.moves[0]||0)+1):Math.min(10,Math.floor(mv/(g.team?4:2))+1);}
function ensure(){if(bar)return;bar=document.createElement('div');bar.id='phbar';bar.setAttribute('aria-hidden','true');
 bar.innerHTML=STEPS.map(s=>'<span class="phs" data-p="'+s[0]+'"><i>'+s[1]+'</i>'+s[2]+'</span>').join('<b class="pharr">›</b>');
 const anchor=$('ostat')||$('board');anchor.before(bar);
 ban=document.createElement('div');ban.id='phban';ban.setAttribute('role','status');ban.setAttribute('aria-live','polite');document.body.appendChild(ban);
 ban.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();hide();});}
function hide(){clearTimeout(hideT);ban.classList.remove('show');}
function banner(p){const f=INFO[p];if(!f)return;let t=f[1],s=f[2];
 if(p==='place'){const w=g.mode==='pvp'||g.team?who():'';t=(w?w+' · ':'Your turn · ')+'Place your tiles';}
 if(p==='wait'){const w=who();t=w?w+"'s turn":'Their turn';s=isOn()?'Waiting for their move':'Watch their move';}
 const n=STEPS.findIndex(x=>x[0]===(p==='aim'?'place':p))+1;
 ban.innerHTML='<div class="phin"><span class="phic">'+f[0]+'</span><div><small>'+(n?'Step '+n+' · Move '+moveNo()+'/10':'')+'</small><b>'+esc(t)+'</b>'+(s?'<em>'+esc(s)+'</em>':'')+'</div></div>';
 const bd=$('board').getBoundingClientRect();ban.style.top=Math.max(8,bd.top+bd.height*0.32)+'px';
 ban.classList.remove('show');void ban.offsetWidth;ban.classList.add('show');clearTimeout(hideT);hideT=setTimeout(hide,RM()?1300:1100);}
function tick(){const p=phase();if(!p){if(last){document.body.className=document.body.className.replace(/\bph-\w+/g,'').trim();last='';lastKey='';if(ban)hide();}if(bar)bar.style.display='none';return;}
 ensure();bar.style.display='';const k=p+'|'+g.turn+'|'+(g.team?g.team.sub[g.turn]:'')+'|'+moveNo();
 if(p!==last){document.body.className=document.body.className.replace(/\bph-\w+/g,'').trim();document.body.classList.add('ph-'+p);
  bar.querySelectorAll('.phs').forEach(e=>{const a=e.dataset.p===(p==='aim'?'place':p);e.classList.toggle('on',a);if(e.dataset.p==='place')e.lastChild.textContent=p==='aim'?'Aim':'Place';});
  bar.classList.toggle('over',p==='end');}
 // banner only on a real phase change: not for recall (play→place) or aim→place within the same move, not for game over (end screen handles it)
 const quiet=(last==='play'&&p==='place'||last==='aim'&&p==='place'||last==='place'&&p==='aim'&&false)&&k.split('|').slice(1).join()===lastKey.split('|').slice(1).join();
 if(k!==lastKey&&!quiet&&p!=='end')banner(p);
 last=p;lastKey=k;}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const _r=render;window.render=render=function(){const r=_r.apply(this,arguments);try{tick();}catch(e){}return r;};
setInterval(()=>{try{tick();}catch(e){}},250);
window.StPhase={phase,tick};
})();
