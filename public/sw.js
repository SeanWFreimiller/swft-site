// Offline support for the trip page (/usmc) only. Other pages on the site are left alone.
const CACHE="zion-trip-v2";
const CORE=["/usmc","/manifest.webmanifest","/icon-192.png","/icon-512.png"];
const TRIP=new Set(["/usmc","/usmc.html","/manifest.webmanifest","/icon-192.png","/icon-512.png"]);
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  const fonts=u.hostname==="fonts.googleapis.com"||u.hostname==="fonts.gstatic.com";
  if(!(fonts||(u.origin===location.origin&&TRIP.has(u.pathname))))return;
  // Network first so edits show up when online; cached copy when there's no signal.
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("/usmc"))));
});
