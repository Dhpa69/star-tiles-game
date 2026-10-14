// v52: first-game tutorial that explains scoring
(function(){
const T=(c,t)=>'<span class="tt '+c+'">'+(t||'')+'</span>';
const STEPS=[
 ['👋 Welcome to Star Tiles','Each turn you get <b>3 pieces</b> of 3 tiles. Drag them onto empty squares, tap a piece (or ↻) to rotate, then press <b>PLAY</b>.',T('red')+T('red')+T('blue')],
 ['🎯 It takes 3 to score','Connect <b>3 or more tiles of one color</b> (touching up/down/left/right). The group scores and clears from the board.',T('red')+T('red')+T('red')+' = <b>60</b>'],
 ['🧮 20 points per tile','A group scores <b>20 × every tile</b> in it. 5 reds = 100. Bigger groups = bigger scores.',T('ylw')+T('ylw')+T('ylw')+T('ylw')+T('ylw')+' = <b>100</b>'],
 ['⭐ Stars are wild','Stars match <b>any color</b>, count 20 like any tile, and <b>stay on the board</b> – one star can join several groups in one move!',T('red')+T('star','★')+T('ylw')+'<br>'+T('red')+T('red')+' '+T('ylw')+T('ylw')],
 ['✖️ x2 / x3 squares','A group covering a <b>x2</b> or <b>x3</b> square multiplies. Cover several and they stack: x2 × x3 = <b>x6</b>! Corners are x3.',T('blue')+T('blue','x2')+T('blue','x3')+' = 60 ×6 = <b>360</b>'],
 ['➕ Add up your groups','A move scores the <b>sum of all its groups</b>. Power-up <b>⚡ Double</b> makes the whole move x2 (once per move).','<b>360 + 100 = 460</b> → ⚡ <b>920</b>'],
 ['🏁 10 moves each','Bomb 💣 and Cross ✚ blasts clear crowded areas (even stars). After 10 moves each, the <b>higher score wins</b>. Good luck!','🪙 Win = +10 coins']];
let i=0;
function show(){document.querySelector('#tut')||document.body.insertAdjacentHTML('beforeend','<div id="tut"><div class="tutc"><div id="tutSt"></div><h2 id="tutH"></h2><div class="tutv" id="tutV"></div><p id="tutP"></p><div class="tutb"><button class="btn" id="tutSkip">Skip</button><button class="btn big" id="tutNext">Next</button></div></div></div>');
 const s=STEPS[i];$('tutH').innerHTML=s[0];$('tutP').innerHTML=s[1];$('tutV').innerHTML=s[2];$('tutSt').innerHTML=STEPS.map((_,k)=>'<i'+(k===i?' class="on"':'')+'></i>').join('');$('tutNext').textContent=i===STEPS.length-1?"Let's play!":'Next';
 $('tutNext').onclick=()=>{if(++i>=STEPS.length)done();else show();};$('tutSkip').onclick=done;}
function done(){const t=$('tut');if(t)t.remove();profile.ext=profile.ext||{};profile.ext.tut=1;saveProfile();}
function open(){i=0;show();}window.StTut={open,STEPS};
const need=()=>!(profile.ext&&profile.ext.tut);
const _s=start;window.start=start=function(){const r=_s.apply(this,arguments);if(need()&&g&&g._live)setTimeout(open,400);return r;};
if(window.startDaily){const _d=startDaily;window.startDaily=function(){const r=_d.apply(this,arguments);if(need())setTimeout(open,400);return r;};}
const h=document.querySelector('details.howto');if(h&&!$('tutBtn')){const b=document.createElement('button');b.className='btn';b.id='tutBtn';b.textContent='▶ Play the scoring tutorial';h.appendChild(b);b.onclick=e=>{e.preventDefault();open();};}
})();
