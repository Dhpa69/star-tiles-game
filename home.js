// v55: compact home screen – primary actions first, secondary items as an icon grid, settings under "More"
(function(){
const card=document.querySelector('#overlay .card');if(!card)return;const $q=id=>document.getElementById(id);
const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
// tiles proxy the original buttons (other scripts keep updating those, so they stay in the DOM, hidden)
const tiles=mk('div','htiles');
const T=[['🎯','Missions','misBtn'],['🏆','Ranks','lbBtn'],['🎨','Style','cosBtn'],['🎁','Invite','invBtn'],['🪙','Shop',null,()=>window.openShop&&openShop()],['👤','Account','acBtn'],['❓','How to','tut',()=>window.StTut&&StTut.open()],['👥','Team 2v2',null,()=>window.StTeam&&StTeam.open()],['📣','Share',null,()=>window.StShare&&StShare.home()],['📣','Share',null,()=>window.StShare&&StShare.home()],['⚙️','More','more']];
for(const [ic,lb,id,fn] of T){const b=mk('button','htile','<i>'+ic+'</i><span>'+lb+'</span>');b.dataset.for=id||'';b.onclick=()=>{if(fn)return fn();if(id==='more')return more.classList.toggle('open');const o=$q(id);if(o)o.click();};tiles.appendChild(b);}
// "More" drawer with settings rows
const more=mk('div','hmore');['muteBtn','chatOffBtn','rkBtn'].forEach(id=>{const e=$q(id);if(e)more.appendChild(e);});
const sup=card.querySelector('.supp');if(sup)more.appendChild(sup);const how=card.querySelector('details.howto');if(how)more.appendChild(how);
// mirror badges / labels
const sync=()=>{const m=$q('misBtn'),t=tiles.querySelector('[data-for=misBtn]');if(m&&t)t.dataset.n=m.dataset.n||'';
 const a=$q('acBtn'),ta=tiles.querySelector('[data-for=acBtn] span');if(a&&ta)ta.textContent=/Guest/.test(a.textContent)?'Account':'Signed in';};
setInterval(sync,1500);
// order: title · resume · name+stats · difficulty · vs computer · daily · online · pass&play · tiles · more · result · version
const order=['onlResume','quitBtn','resumeBtn','mygames'];const h1=card.querySelector('h1');let at=h1;
const put=e=>{if(!e)return;at.after(e);at=e;};
order.forEach(id=>put($q(id)));
const nameL=card.querySelector('label.pname');put(nameL);const row=mk('div','hstat');[$q('pstat'),$q('wsBadge')].forEach(e=>e&&row.appendChild(e));put(row);
put($q('diff'));put($q('vsAI'));put($q('dailyBtn'));put(card.querySelector('.online'));put($q('vsP'));put(tiles);put(more);put($q('result'));
['misBtn','lbBtn','cosBtn','invBtn','acBtn'].forEach(id=>{const e=$q(id);if(e){e.classList.add('hproxy');card.appendChild(e);}});
card.classList.add('compact');sync();
// hide the live board while Home is open (nothing shows through)
const ov=document.getElementById('overlay');const hs=()=>document.body.classList.toggle('homeopen',ov.classList.contains('show'));new MutationObserver(hs).observe(ov,{attributes:true,attributeFilter:['class']});hs();
})();
