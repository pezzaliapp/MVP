// sw.js — cache-first PWA (Preventivo PRO v1)
const CACHE='preventivo-pro-v1';
const ASSETS=['./','./index.html','./app.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))) .then(self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url); if(u.origin===location.origin){ e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))) } });
