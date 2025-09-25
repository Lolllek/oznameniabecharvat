/* Service Worker – Web Push */
self.addEventListener('install', (e)=> self.skipWaiting());
self.addEventListener('activate', (e)=> e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event)=>{
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(_) {}
  const title = data.title || 'Nové upozornění';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event)=>{
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async ()=>{
    const all = await clients.matchAll({ type:'window', includeUncontrolled:true });
    const same = all.find(c => c.url === url);
    if(same) same.focus(); else clients.openWindow(url);
  })());
});
