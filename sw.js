const V='v69',C='star-tiles-'+V,F=['./','index.html','style.css?v=69','app.js?v=69','stability.js?v=69','ai-worker.js?v=69','logic.js?v=69','missions.js?v=69','mq.js?v=69','online.js?v=69','account.js?v=69','config.js?v=69','native.js?v=69','daily.js?v=69','board.js?v=69','rank.js?v=69','streak.js?v=69','cosmetics.js?v=69','tutorial.js?v=69','invite.js?v=69','team.js?v=69','share.js?v=69','home.js?v=69','support.html','vendor/supabase.js?v=69','privacy.html','manifest.json','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)).catch(()=>{}));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// network-first for pages/code; cache only as offline fallback
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==location.origin)return;
 const code=req.mode==='navigate'||/\.(html|js|css|json)$/.test(u.pathname)||u.pathname.endsWith('/');
 if(code){e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(req,cp));}return r;})
  .catch(()=>caches.match(req).then(r=>r||caches.match(req,{ignoreSearch:true})).then(r=>r||caches.match('index.html'))));return;}
 e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(req,cp));return res;})));});

// v45 Web Push: turn notifications
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{};}catch(_){d={body:e.data&&e.data.text()};}
 e.waitUntil(self.registration.showNotification(d.title||'Star Tiles',{body:d.body||'Your turn!',icon:'icon-192.png',badge:'icon-192.png',tag:'turn-'+(d.room||''),data:{room:d.room}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const room=e.notification.data&&e.notification.data.room;const url=self.registration.scope+(room?'?room='+encodeURIComponent(room):'');
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus'in c){c.navigate(url).catch(()=>{});return c.focus();}}return clients.openWindow(url);}));});
