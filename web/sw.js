const CACHE='mis-cuentas-pro-v2.1.0';
const FILES=['./','index.html','app.js','employees.js','pro-reports.js','pro-formats.js','pro-business.js','tpv-core.js','tpv-ui.js','plans.js','backups.js','sync-codec.js','agenda-core.js','agenda-ui.js','agenda-calendar.js','agenda-week.js','mcp-accounting.js','payments.js','store.js','cloud.js','boot.js','theme.css','manifest.webmanifest','icon-192.png','icon-512.png','vendor/firebase-app-compat.js','vendor/firebase-auth-compat.js','vendor/firebase-firestore-compat.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('control-autonomo-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
