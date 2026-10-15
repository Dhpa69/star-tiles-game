// v59: 2v2 TEAM MODE – 10x10 board, 4 players (A1,B1,A2,B2 order), shared team score.
// Modes: vs computer (you + AI teammate vs 2 AIs), pass & play (4 names), online (4 phones, one room code).
(function(){
const AB=s=>s?'B':'A';
const S=()=>Online.st;
// seats online: 0=A1 1=A2 2=B1 3=B2 (side = seat>>1, teammate index = seat&1)
function hook(G,names,coins,meSeat){if(!names||names.length!==4)return;const c=(coins||[]).map(x=>+x||100);while(c.length<4)c.push(100);
 L.teamInit(G,[[names[0],names[1]],[names[2],names[3]]],null,[[c[0],c[1]],[c[2],c[3]]]);G.coins.length=2;G.names=['TEAM A','TEAM B'];
 const my=meSeat!=null?meSeat:(G===g||G.mode==='online')&&S().team?S().me:0;if(G===g||meSeat==null)G.coinsStart=[c[my],c[my]];G.rv=2;}
function cur(G){G=G||g;if(!G||!G.team)return '';return (G.team.n[G.turn][G.team.sub[G.turn]]||'Player')+' (Team '+AB(G.turn)+')';}
function notifyInfo(){const G=g;return {team:true,mover_team:'Team '+AB(G.turn===0?1:0),next_team:'Team '+AB(G.turn),next_player:cur(G),
 title:'Team 2v2: '+cur(G)+' is up'};}
// ---------- online lobby ----------
let lobby=[],tstart=null,myPref=null;
function assign(pref){const n=s=>lobby.filter(x=>x.side===s).length;if(pref===0||pref===1){if(n(pref)<2)return pref;return 1-pref;}return n(0)<=n(1)?0:1;}
function lobbyText(){const by=s=>lobby.filter(x=>x.side===s).map(x=>x.name).join(', ')||'—';return '👥 Team room · '+lobby.length+'/4 joined\nTeam A: '+by(0)+'\nTeam B: '+by(1)+(lobby.length<4?'\nStarts automatically when 4 are in.':'\nStarting…');}
function showLobby(t){const m=$('onlmsg');if(m){m.style.whiteSpace='pre-line';m.textContent=t;}}
function onHello(d){const st=S();
 if(st.seed!=null){if(tstart&&tstart.team.includes(d.from))Online.send(Object.assign({},tstart));return;}
 let e=lobby.find(x=>x.id===d.from);if(!e){if(lobby.length>=4){Online.send({t:'lobby',full:1,to:d.from});return;}e={id:d.from,name:String(d.name||'Player').slice(0,20),coins:+d.coins||100,side:null};lobby.push(e);}
 if(d.name)e.name=String(d.name).slice(0,20);const pref=d.pref===0||d.pref===1?d.pref:null;if(e.side==null||pref!=null&&pref!==e.side){e.side=null;e.side=assign(pref!=null?pref:null);}
 bcast();}
function bcast(){Online.send({t:'lobby',seats:lobby.map(x=>({name:x.name,side:x.side}))});showLobby(lobbyText());
 if(lobby.length===4&&lobby.filter(x=>x.side===0).length===2){clearTimeout(bcast.t);bcast.t=setTimeout(go,900);}}
function go(){const st=S();if(st.seed!=null||lobby.length!==4)return;const A=lobby.filter(x=>x.side===0),B=lobby.filter(x=>x.side===1),order=[A[0],A[1],B[0],B[1]];
 const seed=newSeed(),names=order.map(x=>x.name),coins=order.map(x=>x.coins),ids=order.map(x=>x.id);
 tstart={t:'start',seed,names,coins,rv:2,team:ids,pu1:1};st.me=ids.indexOf(st.id);st.team=true;Online.persist({tstart});Online.send(Object.assign({},tstart));beginOnline(seed,names,coins,[],2);}
function onStart(d){const st=S();if(st.host||st.seed!=null)return;const i=d.team.indexOf(st.id);if(i<0){showLobby('This team room is full.');return;}
 st.me=i;st.team=true;Online.persist({tstart:d});beginOnline(d.seed,d.names,d.coins,[],2);bannerSay('👥 You are '+d.names[i]+' on Team '+AB(i>>1)+' · teammate: '+d.names[i^1]);}
function msg(d){const st=S();
 if(d.t==='lobby'){if(!st.host&&st.seed==null){if(d.full&&d.to===st.id)showLobby('This team room is full.');else if(d.seats){lobby=d.seats;showLobby(lobbyText());}}return true;}
 if(d.t==='hello'&&st.host&&st.team){onHello(d);return true;}
 if(d.t==='start'&&d.team){onStart(d);return true;}
 if(d.t==='start'&&st.team&&st.host)return true;
 return false;}
function need(){const nm=$('pname').value.trim();if(!nm){$('pname').classList.add('needname');say('Enter your name first');return null;}profile.name=nm;saveProfile();return nm;}
function hostTeam(side){const nm=need();if(!nm)return;close();lobby=[];tstart=null;
 const code=Online.host(nm,profile.coins,{msg:onMsg,status:t=>{if(!/Waiting/.test(t))onlStatus(t);},p2p:onP2P,net:netUpd});S().team=true;Online.persist();
 lobby=[{id:S().id,name:nm,coins:profile.coins,side:side===1?1:0}];$('overlay').classList.remove('show');$('onl').classList.add('show');$('onlcode').textContent=code;showLobby(lobbyText()+'\nShare the code or link with 3 friends.');renderGames();}
function joinTeam(code,pref){const nm=need();if(!nm)return;code=Online.clean(code);if(code.length!==6){say('Room codes have 6 letters/numbers');return;}close();myPref=pref;
 joinRoom(code);setTimeout(()=>Online.send({t:'hello',name:nm,coins:profile.coins,team:1,pref}),400);showLobby('Joining team room…');}
// rematch: a host that just finished a team game makes the new room a team room too; joiners keep their side
const _h=Online.host;Online.host=function(){const was=g&&g.team&&g.mode==='online'&&g.over,side=was?meIdx():0,r=_h.apply(this,arguments);
 if(was){S().team=true;lobby=[{id:S().id,name:profile.name,coins:profile.coins,side}];tstart=null;Online.persist();}return r;};
const _j=Online.join;Online.join=function(code,name,coins){const was=g&&g.team&&g.mode==='online'&&g.over,side=was?meIdx():null,r=_j.apply(this,arguments);
 if(was)setTimeout(()=>Online.send({t:'hello',name,coins,team:1,pref:side}),400);return r;};
// ---------- local modes ----------
function startLocal(kind,names){hideEnd();$('result').innerHTML='';clearSave();const first=Math.random()<.5?1:0;
 g=L.newGame(kind==='ai'?'ai':'pvp',null,first,10);const c=kind==='ai'?[[profile.coins,0],[0,0]]:[[100,100],[100,100]];
 L.teamInit(g,names,kind==='ai'?[[0,1],[1,1]]:[[0,0],[0,0]],c);g.names=['TEAM A','TEAM B'];g.rv=2;g._live=true;g.started=true;
 pieces=[];boost=false;busy=false;sel=firstFree();lastMove=null;$('overlay').classList.remove('show');render();autosave();
 bannerSay('👥 Team 2v2 · '+cur()+' goes first');setTimeout(()=>{if(g&&g.team&&!g.over&&!busy)next();},700);}
// finish: load my own seat so coins/stats are mine, not my teammate's; keep team games off the solo leaderboard
const _f=finish;window.finish=finish=function(){if(g&&g.team){const on=isOn();L.seat(g,meIdx(),on?S().me&1:0);g._lb=true;}return _f.apply(this,arguments);};
// ---------- HUD chips ----------
const _r=render;window.render=render=function(){const r=_r.apply(this,arguments);try{chips();}catch(e){}return r;};
function chips(){let el=$('tchips');const on=g&&g.team;if(!on){if(el)el.style.display='none';document.body.classList.remove('team');return;}
 document.body.classList.add('team');if(!el){el=document.createElement('div');el.id='tchips';$('board').before(el);}el.style.display='';
 if(g.mode!=='pvp'){const on=isOn(),c=on?L.teamCoins(g,S().me>>1,S().me&1):L.teamCoins(g,0,0),cn=$('coinN');if(cn)cn.textContent=c;}
 const side=s=>'<div class="tcs t'+AB(s)+'">'+[0,1].map(k=>{const act=!g.over&&g.turn===s&&g.team.sub[s]===k,mine=isOn()?S().me===s*2+k:g.mode==='ai'&&s===0&&k===0;
  return '<span class="tchip'+(act?' act':'')+(mine?' me':'')+'">'+(g.team.ai[s][k]?'🤖 ':'')+esc(g.team.n[s][k]||'P')+' <b>'+g.team.pm[s][k]+'/'+L.MOVES+'</b></span>';}).join('')+'</div>';
 const L0=g.first===1?1:0;const rd=Math.min(10,Math.floor((g.moves[0]+g.moves[1])/4)+1);el.innerHTML=side(L0)+'<span class="tround">'+(g.over?'Final':'Round '+rd+'/10')+'</span>'+side(1-L0);}
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ---------- home panel ----------
let P=null;function close(){if(P)P.classList.remove('show');}
function open(){const nm=$('pname').value.trim()||profile.name||'You';if(!P){P=document.createElement('div');P.id='teamP';document.body.appendChild(P);P.addEventListener('click',e=>{if(e.target===P)close();});}
 const dl=(typeof DL!=='undefined'&&DL[profile.difficulty])||profile.difficulty||'Medium';
 P.innerHTML='<div class="card tcard"><h2>👥 Team 2v2</h2><p class="tsub">10×10 board · A1 → B1 → A2 → B2 · 10 moves each · teammates share one score</p>'+
 '<button class="btn big" id="tAI">🤖 You + AI vs 2 AIs <small>'+esc(dl)+'</small></button>'+
 '<details id="tPP"><summary class="btn big">📱 Pass &amp; Play · 4 names</summary><div class="tnames"><b>Team A</b><input id="tn0" data-allow-focus value="'+esc(nm)+'"><input id="tn1" data-allow-focus placeholder="Player 2"><b>Team B</b><input id="tn2" data-allow-focus placeholder="Player 3"><input id="tn3" data-allow-focus placeholder="Player 4"></div><button class="btn big" id="tPPgo">▶ Start</button></details>'+
 '<details id="tON"><summary class="btn big">🌐 Online · 4 phones</summary><p class="tsub">Host a team room</p><div class="trow"><button class="btn" id="tHA">Host · Team A</button><button class="btn" id="tHB">Host · Team B</button></div>'+
 '<p class="tsub">or join one</p><input id="tcode" data-allow-focus maxlength="6" placeholder="ROOM CODE" autocapitalize="characters"><div class="trow"><button class="btn" data-j="0">Join A</button><button class="btn" data-j="1">Join B</button><button class="btn" data-j="">Auto</button></div></details>'+
 '<button class="btn" id="tX">Close</button></div>';
 P.querySelector('#tAI').onclick=()=>{const n=need();if(!n)return;close();startLocal('ai',[[n,'AI Buddy'],['AI 1','AI 2']]);};
 P.querySelector('#tPPgo').onclick=()=>{const v=i=>(P.querySelector('#tn'+i).value.trim()||'Player '+(i+1)).slice(0,20);const n=v(0);profile.name=profile.name||n;close();startLocal('pvp',[[v(0),v(1)],[v(2),v(3)]]);};
 P.querySelector('#tHA').onclick=()=>hostTeam(0);P.querySelector('#tHB').onclick=()=>hostTeam(1);
 P.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>joinTeam(P.querySelector('#tcode').value,b.dataset.j===''?null:+b.dataset.j));
 P.querySelector('#tX').onclick=close;P.classList.add('show');}
window.StTeam={hook,cur,msg,notifyInfo,open,startLocal,hostTeam,joinTeam,get lobby(){return lobby;}};
// home button sits in the compact icon grid (added by home.js)
})();
