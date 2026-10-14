// v51: cosmetics shop for coins – tile skins, board themes, star effects
(function(){
const ITEMS={tile:[['gem','💎 Gem',0],['neon','⚡ Neon',300],['pastel','🍬 Pastel',300],['glass','🔮 Glass',500],['retro','👾 Retro',700]],
 board:[['night','🌃 Night Sky',0],['aurora','🌌 Aurora',400],['nebula','🪐 Nebula',400],['ocean','🌊 Deep Ocean',600],['sunset','🌅 Sunset',800]],
 star:[['classic','⭐ Classic',0],['pulse','💓 Pulse',250],['rainbow','🌈 Rainbow',400],['comet','☄️ Comet',600]]};
const NAMES={tile:'Tile skins',board:'Board themes',star:'Star effects'};
const C=()=>{const x=(profile.ext=profile.ext||{});if(!x.cos)x.cos={owned:['tile:gem','board:night','star:classic'],tile:'gem',board:'night',star:'classic'};return x.cos;};
function apply(){const c=C(),cl=document.body.classList;[...cl].filter(k=>/^(sk|th|sf)-/.test(k)).forEach(k=>cl.remove(k));cl.add('sk-'+c.tile,'th-'+c.board,'sf-'+c.star);}
function render(){const c=C();$('cosCoins').textContent='🪙 '+profile.coins.toLocaleString();
 $('cosList').innerHTML=Object.keys(ITEMS).map(cat=>'<h3>'+NAMES[cat]+'</h3><div class="cosg">'+ITEMS[cat].map(([id,nm,pr])=>{const own=c.owned.includes(cat+':'+id),on=c[cat]===id;
  return '<button class="cosi'+(on?' on':'')+'" data-c="'+cat+'" data-i="'+id+'" data-p="'+pr+'"><span class="cprev '+cat+'-'+id+'"><i></i><i></i><i></i></span><b>'+nm+'</b><small>'+(on?'✓ Using':own?'Tap to use':'🪙 '+pr)+'</small></button>';}).join('')+'</div>').join('');}
function tap(b){const c=C(),cat=b.dataset.c,id=b.dataset.i,pr=+b.dataset.p,key=cat+':'+id;
 if(!c.owned.includes(key)){if(profile.coins<pr){say('Not enough coins');if(window.openShop&&confirm('Not enough coins. Open the coin shop?'))openShop();return;}
  if(!confirm('Buy '+b.querySelector('b').textContent+' for '+pr+' coins?'))return;profile.coins-=pr;c.owned.push(key);if(typeof g!=='undefined'&&g&&!g.over&&g.mode!=='online'&&g.coins)g.coins[0]=profile.coins;say('🎨 Unlocked!');}
 c[cat]=id;saveProfile();apply();render();try{showProfile();}catch(e){}}
document.body.insertAdjacentHTML('beforeend','<div id="cos"><div class="chcard miscard"><div class="chhead"><b>🎨 Cosmetics</b><span id="cosCoins"></span><button class="btn" id="cosClose">✕</button></div><div id="cosList"></div></div></div>');
$('cosClose').onclick=()=>$('cos').classList.remove('show');$('cos').addEventListener('click',e=>{if(e.target.id==='cos')return $('cos').classList.remove('show');const b=e.target.closest('.cosi');if(b)tap(b);});
const ob=document.createElement('button');ob.className='btn big cos-open';ob.id='cosBtn';ob.innerHTML='🎨 Cosmetics <small>tile skins · board themes · star effects</small>';($('lbBtn')||$('misBtn')).after(ob);ob.onclick=()=>{$('cos').classList.add('show');render();};
window.StCos={apply,ITEMS};apply();
})();
