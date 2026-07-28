const CACHE = "bridge-app-v63";
const ROOT = new URL("./", self.location.href).href;
importScripts(new URL("config.js?v=63", ROOT).href);
const API_BASE = String(self.BridgeConfig?.apiBase || "").replace(/\/+$/, "");
const apiURL = path => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
const SHELL = [ROOT, new URL("index.html", ROOT).href, new URL("config.js", ROOT).href, new URL("contact-logic.js", ROOT).href, new URL("engagement-logic.js", ROOT).href, new URL("communication-logic.js", ROOT).href, new URL("analytics-logic.js", ROOT).href, new URL("scorecard-logic.js", ROOT).href, new URL("app.js", ROOT).href, new URL("styles.css", ROOT).href, new URL("manifest.webmanifest", ROOT).href, new URL("bridge-icon-192.png", ROOT).href, new URL("bridge-icon-512.png", ROOT).href, new URL("apple-touch-icon.png", ROOT).href];

const PUSH_STORE = "bridge-push-settings";
const PUSH_KEY = "reminder-schedule";
function pushDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PUSH_STORE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveReminderSchedule(schedule) {
  const database = await pushDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("settings", "readwrite");
    transaction.objectStore("settings").put(schedule, PUSH_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}
async function readReminderSchedule() {
  const database = await pushDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction("settings", "readonly").objectStore("settings").get(PUSH_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

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
    icon: new URL("bridge-icon-192.png?v=63", ROOT).href,
    badge: new URL("bridge-icon-192.png?v=63", ROOT).href,
    tag: payload.tag || "bridge-followup",
    renotify: false,
    data: { url: payload.url || "./?page=followups" }
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    "setAppBadge" in navigator ? navigator.setAppBadge(Number(payload.badgeCount) || 1) : Promise.resolve()
  ]));
});

self.addEventListener("message", event => {
  if (event.data?.type !== "bridge-reminder-schedule" || !event.data.schedule) return;
  event.waitUntil(saveReminderSchedule(event.data.schedule).catch(() => {}));
});

self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil((async () => {
    try {
      const config = await fetch(apiURL("/api/push/config")).then(response => response.json());
      if (!config.publicKey) return;
      const padding = "=".repeat((4 - config.publicKey.length % 4) % 4);
      const key = Uint8Array.from(atob((config.publicKey + padding).replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0));
      const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const response = await fetch(apiURL("/api/push/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      });
      const result = await response.json().catch(() => ({}));
      const schedule = await readReminderSchedule();
      if (response.ok && result.deviceToken && schedule) {
        await fetch(apiURL("/api/push/schedule"), {
          method: "PUT",
          headers: { "Authorization": `Bearer ${result.deviceToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint, schedule })
        });
      }
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
