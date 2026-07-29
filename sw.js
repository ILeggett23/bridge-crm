const CACHE = "bridge-app-v1.1.66";
const ROOT = new URL("./", self.location.href).href;
const APP_ROOT = new URL(ROOT);
const FOLLOW_UP_FALLBACK = new URL("?page=followups&notification=1", APP_ROOT).href;
importScripts(new URL("config.js?v=1.1.66", ROOT).href);
const API_BASE = String(self.BridgeConfig?.apiBase || "").replace(/\/+$/, "");
const apiURL = path => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
const SHELL = [ROOT, new URL("index.html", ROOT).href, new URL("config.js", ROOT).href, new URL("contact-logic.js", ROOT).href, new URL("engagement-logic.js", ROOT).href, new URL("communication-logic.js", ROOT).href, new URL("analytics-logic.js", ROOT).href, new URL("scorecard-logic.js", ROOT).href, new URL("release-logic.js", ROOT).href, new URL("account-client.js", ROOT).href, new URL("app.js", ROOT).href, new URL("styles.css", ROOT).href, new URL("manifest.webmanifest", ROOT).href, new URL("bridge-icon-192.png", ROOT).href, new URL("bridge-icon-512.png", ROOT).href, new URL("apple-touch-icon.png", ROOT).href];
const SHELL_PATHS = new Set(SHELL.map(value => new URL(value).pathname));

const PUSH_STORE = "bridge-push-settings";
const PUSH_KEY = "reminder-schedule";
const ACCOUNT_STORE = "bridge-account";
const ACCOUNT_SESSION_KEY = "session";

function notificationTarget(value) {
  try {
    const candidate = new URL(value || FOLLOW_UP_FALLBACK, APP_ROOT);
    const rootPath = APP_ROOT.pathname.endsWith("/") ? APP_ROOT.pathname : `${APP_ROOT.pathname}/`;
    const appPath = candidate.pathname === rootPath.slice(0, -1) || candidate.pathname.startsWith(rootPath);
    if (candidate.origin !== APP_ROOT.origin || !appPath) return FOLLOW_UP_FALLBACK;
    candidate.searchParams.set("notification", "1");
    return candidate.href;
  } catch {
    return FOLLOW_UP_FALLBACK;
  }
}

function isBridgeClient(client) {
  try {
    const candidate = new URL(client.url);
    const rootPath = APP_ROOT.pathname.endsWith("/") ? APP_ROOT.pathname : `${APP_ROOT.pathname}/`;
    return candidate.origin === APP_ROOT.origin && (candidate.pathname === rootPath.slice(0, -1) || candidate.pathname.startsWith(rootPath));
  } catch {
    return false;
  }
}
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

async function readAccountSessionToken() {
  try {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(ACCOUNT_STORE, 1);
      request.onupgradeneeded = () => {
        for (const store of ["secure", "states", "sync", "mutations"]) {
          if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Account storage is blocked"));
    });
    if (!database.objectStoreNames.contains("secure")) return "";
    const record = await new Promise((resolve, reject) => {
      const request = database.transaction("secure", "readonly").objectStore("secure").get(ACCOUNT_SESSION_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    const value = record?.value;
    if (!value?.token || !value?.user?.id) return "";
    if (value.expiresAt && new Date(value.expiresAt).getTime() <= Date.now()) return "";
    return String(value.token);
  } catch {
    return "";
  }
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("bridge-app-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const requestURL = new URL(event.request.url);
  if (event.request.method !== "GET") return;

  // Account, backup, scorecard, and push responses belong to the API origin and
  // may contain private data. Let the browser fetch them directly and never put
  // them in Cache Storage.
  if (requestURL.origin !== self.location.origin || requestURL.pathname.includes("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => caches.match(ROOT)));
    return;
  }

  if (!SHELL_PATHS.has(requestURL.pathname)) return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(cached => {
    const network = fetch(event.request).then(response => {
      if (!response.ok || response.type !== "basic") return response;
      const copy = response.clone();
      return caches.open(CACHE).then(cache => cache.put(event.request, copy)).then(() => response);
    });
    return cached || network;
  }));
});

self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data?.json() || {}; }
  catch { payload = { body: event.data?.text() || "You have a Bridge follow-up." }; }
  const title = payload.title || "Bridge follow-up";
  const options = {
    body: payload.body || "A scheduled follow-up is ready.",
    icon: new URL("bridge-icon-192.png?v=1.1.66", ROOT).href,
    badge: new URL("bridge-icon-192.png?v=1.1.66", ROOT).href,
    tag: payload.tag || "bridge-followup",
    renotify: false,
    data: { url: notificationTarget(payload.url) }
  };
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    "setAppBadge" in navigator ? navigator.setAppBadge(Number(payload.badgeCount) || 1) : Promise.resolve()
  ]));
});

self.addEventListener("message", event => {
  if (event.data?.type === "bridge-reminder-schedule" && event.data.schedule) {
    event.waitUntil(saveReminderSchedule(event.data.schedule).catch(() => {}));
    return;
  }
  if (event.data?.type === "bridge-account-logout") {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("bridge-private-")).map(key => caches.delete(key)))));
  }
});

self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil((async () => {
    try {
      const config = await fetch(apiURL("/api/push/config")).then(response => response.json());
      if (!config.publicKey) return;
      const padding = "=".repeat((4 - config.publicKey.length % 4) % 4);
      const key = Uint8Array.from(atob((config.publicKey + padding).replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0));
      const subscription = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const accountToken = await readAccountSessionToken();
      const headers = { "Content-Type": "application/json" };
      if (accountToken) headers.Authorization = `Bearer ${accountToken}`;
      const response = await fetch(apiURL("/api/push/subscribe"), {
        method: "POST",
        headers,
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
  const target = notificationTarget(event.notification.data?.url);
  const clearBadge = "clearAppBadge" in navigator ? navigator.clearAppBadge().catch(() => {}) : Promise.resolve();
  const navigate = self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async windows => {
    const existing = windows.filter(isBridgeClient).sort((left, right) => Number(right.focused) - Number(left.focused))[0];
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: "bridge-notification-navigation", url: target });
      return existing;
    }
    return self.clients.openWindow(target);
  });
  event.waitUntil(Promise.all([clearBadge, navigate]));
});
