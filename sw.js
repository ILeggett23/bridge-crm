const CACHE = "bridge-app-v9";
const ROOT = new URL("./", self.location.href).href;
const SHELL = [ROOT, new URL("index.html", ROOT).href, new URL("app.js", ROOT).href, new URL("styles.css", ROOT).href, new URL("manifest.webmanifest", ROOT).href, new URL("handshake_logo.png", ROOT).href];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);
  if (event.request.method !== "GET" || requestURL.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || caches.match(ROOT))));
});
const CACHE = "bridge-app-v8";
const ROOT = new URL("./", self.location.href).href;
const SHELL = [ROOT, new URL("index.html", ROOT).href, new URL("app.js", ROOT).href, new URL("styles.css", ROOT).href, new URL("manifest.webmanifest", ROOT).href, new URL("handshake_logo.png", ROOT).href];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);
  if (event.request.method !== "GET" || requestURL.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || caches.match(ROOT))));
});
const CACHE = "bridge-app-v7";
const ROOT = new URL("./", self.location.href).href;
const SHELL = [ROOT, new URL("index.html", ROOT).href, new URL("app.js", ROOT).href, new URL("styles.css", ROOT).href, new URL("manifest.webmanifest", ROOT).href, new URL("handshake_logo.png", ROOT).href];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);
  if (event.request.method !== "GET" || requestURL.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || caches.match(ROOT))));
});
const CACHE = "bridge-app-v6";
const ROOT = new URL("./", self.location.href).href;
const SHELL = [ROOT, new URL("index.html", ROOT).href, new URL("app.js", ROOT).href, new URL("styles.css", ROOT).href, new URL("manifest.webmanifest", ROOT).href, new URL("handshake_logo.png", ROOT).href];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);
  if (event.request.method !== "GET" || requestURL.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || caches.match(ROOT))));
});
