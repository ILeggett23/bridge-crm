const CACHE = "bridge-app-v34";
const ROOT = new URL("./", self.location.href).href;
const SHELL = [ROOT, new URL("index.html", ROOT).href, new URL("contact-logic.js", ROOT).href, new URL("engagement-logic.js", ROOT).href, new URL("communication-logic.js", ROOT).href, new URL("analytics-logic.js", ROOT).href, new URL("app.js", ROOT).href, new URL("styles.css", ROOT).href, new URL("manifest.webmanifest", ROOT).href, new URL("bridge-icon-192.png", ROOT).href, new URL("bridge-icon-512.png", ROOT).href, new URL("apple-touch-icon.png", ROOT).href];

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

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data?.json() || {}; }
  catch { payload = { body: event.data?.text() || "You have a Bridge follow-up." }; }
  const title = payload.title || "Bridge follow-up";
  const options = {
    body: payload.body || "A scheduled follow-up is ready.",
    icon: new URL("bridge-icon-192.png", ROOT).href,
    badge: new URL("bridge-icon-192.png", ROOT).href,
    tag: payload.tag || "bridge-followup",
    renotify: false,
    data: { url: payload.url || "./?page=followups" }
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    "setAppBadge" in navigator ? navigator.setAppBadge(Number(payload.badgeCount) || 1) : Promise.resolve()
  ]));
});

self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil((async () => {
    try {
      const config = await fetch(new URL("api/push/config", ROOT)).then(response => response.json());
      if (!config.publicKey) return;
      const padding = "=".repeat((4 - config.publicKey.length % 4) % 4);
      const key = Uint8Array.from(atob((config.publicKey + padding).replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0));
      const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await fetch(new URL("api/push/subscribe", ROOT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      });
    } catch {}
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if ("clearAppBadge" in navigator) navigator.clearAppBadge().catch(() => {});
  const target = new URL(event.notification.data?.url || "./", ROOT).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => new URL(client.url).origin === new URL(target).origin);
    if (existing) return existing.navigate(target).then(client => client.focus());
    return clients.openWindow(target);
  }));
});
