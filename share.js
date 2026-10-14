// v58: App Store-safe social sharing – native share sheet / web intents. NO coin reward for sharing itself;
// coins only come from the existing invite reward (friend joins through your link and plays).
(function(){
const SITE='https://dhpa69.github.io/star-tiles-game/';
const DEV=()=>(window.StNative&&StNative.DEV)||(()=>{try{return JSON.parse(localStorage.getItem('startiles.device'))||'x';}catch(e){return 'x';}})();
function link(kind){const q=new URLSearchParams();if(kind==='daily')q.set('daily','1');q.set('inv',DEV());q.set('from',(profile&&profile.name)||'A friend');return SITE+'?'+q.toString();}
const NOTE='Friends who join with your link get you both '+((window.StInvite&&StInvite.BONUS)||50)+' coins';
const isNative=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
async function open(text,title){title=title||'Star Tiles';
 const P=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Share;
 if(isNative()&&P){try{await P.share({title,text,dialogTitle:'Share Star Tiles'});return;}catch(e){if(/cancel/i.test(String(e&&e.message||e)))return;}}
 if(isNative()&&navigator.share){try{await navigator.share({title,text});return;}catch(e){if(e&&e.name==='AbortError')return;}}
 sheet(text,title);}
function sheet(text,title){let p=document.getElementById('shareP');if(!p){p=document.createElement('div');p.id='shareP';document.body.appendChild(p);
  p.addEventListener('click',e=>{if(e.target===p)p.classList.remove('show');});}
 const u=(text.match(/https?:\/\/\S+/)||[SITE])[0],t=encodeURIComponent(text),uu=encodeURIComponent(u),tNo=encodeURIComponent(text.replace(u,'').trim());
 p.innerHTML='<div class="shc"><h3>📣 Share</h3><pre class="shtxt"></pre><p class="shnote">🎁 '+NOTE+'</p><div class="shrow">'+
  (navigator.share?'<button class="btn big" data-a="sys">📱 Share…</button>':'')+
  '<a class="btn big shx" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text='+t+'">𝕏 Post on X</a>'+
  '<a class="btn big shfb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+uu+'&quote='+tNo+'">f Facebook</a>'+
  '<a class="btn big shwa" target="_blank" rel="noopener" href="https://wa.me/?text='+t+'">🟢 WhatsApp</a>'+
  '<button class="btn big" data-a="copy">🔗 Copy link</button><button class="btn" data-a="close">Close</button></div></div>';
 p.querySelector('.shtxt').textContent=text;
 p.querySelector('.shrow').onclick=async e=>{const a=e.target.closest('[data-a]');if(!a)return;const k=a.dataset.a;
  if(k==='close')p.classList.remove('show');
  if(k==='sys'){try{await navigator.share({title,text});}catch(_){}}
  if(k==='copy'){try{await navigator.clipboard.writeText(text);say('📋 Copied!');}catch(_){window.prompt('Copy:',text);}}};
 p.classList.add('show');}
function gameText(){const n=NAMES(),me=g&&g.mode!=='pvp'?meIdx():0,op=1-me,s=g?g.scores:[0,0];
 const w=g&&g.over?(g.winner===me?'🏆 Won':g.winner===op?'💪 Lost':'🤝 Draw'):'🎮 Playing';
 const vs=g&&g.mode==='ai'?'the computer ('+(profile.difficulty||'medium')+')':(n[op]||'a friend');
 const stars='⭐'.repeat(Math.max(1,Math.min(5,Math.round((s[me]||0)/1500))));
 return '✦ Star Tiles — '+w+' '+(s[me]||0).toLocaleString()+' – '+(s[op]||0).toLocaleString()+' vs '+vs+'\n'+stars+'\nPlay me: '+link();}
function homeText(){return '✦ Star Tiles — connect 3+ tiles, use stars & power-ups, 10 moves to win.\n'+(profile.games?'I\'ve played '+profile.games+' games — ':'')+'Come play me!\n'+link();}
window.StShare={open,link,note:NOTE,game:()=>open(gameText()),home:()=>open(homeText())};
// end-of-game Share button (daily screen already has its own, which now uses StShare)
const _se=showEnd;window.showEnd=showEnd=function(){_se.apply(this,arguments);let b=document.getElementById('endShareG');
 if(!b){b=document.createElement('button');b.className='btn big';b.id='endShareG';b.onclick=()=>StShare.game();const r=$('endRe');r.after(b);
  const n=document.createElement('small');n.className='shnote';n.id='endShareN';n.textContent='🎁 '+NOTE;b.after(n);}
 const d=g&&g.mode==='daily';b.style.display=d?'none':'';b.textContent='📣 Share result';document.getElementById('endShareN').style.display='';};
})();
