(() => {
  "use strict";

  const DB_NAME = "bridge-account";
  const DB_VERSION = 1;
  const STORES = ["secure", "states", "sync", "mutations"];
  const LOCAL_MIGRATION_KEY = "browser-local-v1";
  const MAX_SYNC_BATCH = 100;
  const listeners = new Set();
  let apiBase = "";
  let config = null;
  let session = null;
  let syncTimer = null;
  let syncing = false;
  let stateQueue = Promise.resolve();
  let lastStatus = { state: "local", message: "Saved on this device", pending: 0, conflicts: 0 };

  const accountURL = path => apiBase ? `${apiBase}${path.startsWith("/") ? path : `/${path}`}` : path;
  const recordKey = (type, id) => `${type}:${id}`;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const uid = () => globalThis.crypto?.randomUUID?.() || `bridge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in globalThis)) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        for (const store of STORES) {
          if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getStoreValue(storeName, id) {
    try {
      const database = await openDatabase();
      return await new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly").objectStore(storeName).get(id);
        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  async function setStoreValue(storeName, id, value) {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put({ id, value });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  async function deleteStoreValue(storeName, id) {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
        transaction.objectStore(storeName).delete(id);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {}
  }

  async function allStoreValues(storeName) {
    try {
      const database = await openDatabase();
      return await new Promise((resolve, reject) => {
        const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async function digest(value) {
    const bytes = new TextEncoder().encode(String(value));
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return [...hash].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function userStorageId(userId) {
    return `user:${userId}`;
  }

  function setStatus(next) {
    lastStatus = { ...lastStatus, ...next };
    listeners.forEach(listener => {
      try { listener(clone(lastStatus)); } catch {}
    });
  }

  async function request(path, options = {}, { allowAnonymous = false } = {}) {
    const headers = new Headers(options.headers || {});
    if (!headers.has("content-type") && options.body) headers.set("content-type", "application/json");
    if (!allowAnonymous && session?.token) headers.set("authorization", `Bearer ${session.token}`);
    const response = await fetch(accountURL(path), { ...options, headers, cache: "no-store" });
    let body = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(body?.error?.message || `Bridge request failed (${response.status})`);
      error.code = body?.error?.code || "request_failed";
      error.status = response.status;
      error.details = body?.error?.details;
      if (!allowAnonymous && response.status === 401 && session) {
        const previousUser = session.user;
        await saveSession(null);
        setStatus({
          state: "auth-required",
          message: "Sign in again to sync pending changes",
          pending: await pendingCountForUser(previousUser?.id),
          conflicts: 0,
          authRequired: true
        });
      }
      throw error;
    }
    return body;
  }

  async function readStoredSession() {
    const stored = await getStoreValue("secure", "session");
    if (!stored?.token || !stored?.user?.id) return null;
    if (stored.expiresAt && new Date(stored.expiresAt).getTime() <= Date.now()) {
      await deleteStoreValue("secure", "session");
      return null;
    }
    return stored;
  }

  async function saveSession(next) {
    session = next;
    if (next) await setStoreValue("secure", "session", next);
    else await deleteStoreValue("secure", "session");
  }

  async function fetchConfig() {
    try {
      config = await request("/api/v1/config", {}, { allowAnonymous: true });
      await setStoreValue("secure", "account-config", config);
      return config;
    } catch {
      const cached = await getStoreValue("secure", "account-config");
      config = cached ? { ...cached, offline: true, unavailable: true } : { authEnabled: false, offline: true, unavailable: true };
      return config;
    }
  }

  async function bootstrap(baseURL) {
    apiBase = String(baseURL || "").replace(/\/+$/, "");
    session = await readStoredSession();
    await fetchConfig();
    if (!config.authEnabled) {
      setStatus({ state: "local", message: "Saved on this device", pending: 0, conflicts: 0 });
      return { mode: "local", config };
    }
    if (!session) {
      setStatus({ state: "signed-out", message: "Sign in to sync", pending: 0, conflicts: 0 });
      return { mode: "account", authenticated: false, config };
    }
    try {
      const current = await request("/api/v1/auth/session");
      session = { ...session, user: current.user, expiresAt: current.expiresAt };
      await saveSession(session);
      setStatus({ state: navigator.onLine ? "ready" : "offline", message: navigator.onLine ? "Up to date" : "Offline", pending: await pendingCount(), conflicts: await conflictCount() });
      return { mode: "account", authenticated: true, user: session.user, config };
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        await saveSession(null);
        setStatus({ state: "signed-out", message: "Sign in to sync", pending: 0, conflicts: 0 });
        return { mode: "account", authenticated: false, config };
      }
      setStatus({ state: "offline", message: "Offline changes will sync later", pending: await pendingCount(), conflicts: await conflictCount() });
      return { mode: "account", authenticated: true, offline: true, user: session.user, config };
    }
  }

  async function login(values) {
    const result = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(values)
    }, { allowAnonymous: true });
    await saveSession({ token: result.sessionToken, expiresAt: result.expiresAt, user: result.user });
    return result.user;
  }

  async function signup(values) {
    return request("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify(values)
    }, { allowAnonymous: true });
  }

  async function verifyEmail(token) {
    return request("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token })
    }, { allowAnonymous: true });
  }

  async function resendVerification(email, turnstileToken) {
    return request("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email, turnstileToken })
    }, { allowAnonymous: true });
  }

  async function forgotPassword(email, turnstileToken) {
    return request("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, turnstileToken })
    }, { allowAnonymous: true });
  }

  async function resetPassword(token, password) {
    return request("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password })
    }, { allowAnonymous: true });
  }

  async function logout() {
    const previousUserId = session?.user?.id || "";
    try { await request("/api/v1/auth/logout", { method: "POST" }); } catch {}
    await saveSession(null);
    setStatus({
      state: "signed-out",
      message: "Signed out",
      pending: await pendingCountForUser(previousUserId),
      conflicts: 0
    });
  }

  function flattenState(state) {
    const records = new Map();
    for (const contact of Array.isArray(state?.contacts) ? state.contacts : []) {
      if (contact?.id) records.set(recordKey("contact", contact.id), { type: "contact", id: String(contact.id), payload: clone(contact) });
    }
    for (const place of Array.isArray(state?.places) ? state.places : []) {
      if (place?.id) records.set(recordKey("place", place.id), { type: "place", id: String(place.id), payload: clone(place) });
    }
    records.set(recordKey("settings", "primary"), { type: "settings", id: "primary", payload: clone(state?.settings || {}) });
    records.set(recordKey("meta", "primary"), { type: "meta", id: "primary", payload: clone(state?.meta || { version: 1 }) });
    return records;
  }

  function applyRecords(state, records) {
    const next = clone(state || { contacts: [], places: [], settings: {}, meta: { version: 1 } });
    const contacts = new Map((next.contacts || []).map(item => [String(item.id), item]));
    const places = new Map((next.places || []).map(item => [String(item.id), item]));
    for (const record of records || []) {
      if (record.type === "contact") {
        if (record.deletedAt) contacts.delete(String(record.id));
        else if (record.payload) contacts.set(String(record.id), clone(record.payload));
      } else if (record.type === "place") {
        if (record.deletedAt) places.delete(String(record.id));
        else if (record.payload) places.set(String(record.id), clone(record.payload));
      } else if (record.type === "settings" && !record.deletedAt && record.payload) {
        next.settings = clone(record.payload);
      } else if (record.type === "meta" && !record.deletedAt && record.payload) {
        next.meta = clone(record.payload);
      }
    }
    next.contacts = [...contacts.values()];
    next.places = [...places.values()];
    return next;
  }

  async function syncMetadata() {
    if (!session?.user?.id) return { cursor: 0, records: {}, conflicts: {} };
    return (await getStoreValue("sync", userStorageId(session.user.id))) || { cursor: 0, records: {}, conflicts: {} };
  }

  async function saveSyncMetadata(value) {
    if (!session?.user?.id) return;
    await setStoreValue("sync", userStorageId(session.user.id), value);
  }

  async function pendingMutations() {
    if (!session?.user?.id) return [];
    const prefix = `${session.user.id}:`;
    return (await allStoreValues("mutations"))
      .filter(entry => entry.id.startsWith(prefix))
      .map(entry => entry.value)
      .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
  }

  async function pendingMutationsForUser(userId) {
    if (!userId) return [];
    const prefix = `${userId}:`;
    return (await allStoreValues("mutations"))
      .filter(entry => entry.id.startsWith(prefix))
      .map(entry => entry.value);
  }

  async function pendingCountForUser(userId) {
    return (await pendingMutationsForUser(userId)).length;
  }

  async function pendingCount() {
    return (await pendingMutations()).length;
  }

  async function conflictCount() {
    const metadata = await syncMetadata();
    return Object.keys(metadata.conflicts || {}).length;
  }

  async function queueMutation(record, expectedRevision) {
    const mutation = {
      mutationId: uid(),
      createdAt: new Date().toISOString(),
      record: {
        type: record.type,
        id: record.id,
        payload: record.payload,
        deleted: Boolean(record.deleted),
        expectedRevision: Math.max(0, Number(expectedRevision) || 0)
      }
    };
    await setStoreValue("mutations", `${session.user.id}:${mutation.mutationId}`, mutation);
    return mutation;
  }

  async function waitForActiveSync() {
    while (syncing) {
      await new Promise(resolve => setTimeout(resolve, 25));
    }
  }

  function queueState(nextState) {
    const snapshot = clone(nextState);
    stateQueue = stateQueue.catch(() => {}).then(() => queueStateInternal(snapshot));
    return stateQueue;
  }

  async function queueStateInternal(nextState) {
    if (!config?.authEnabled || !session?.user?.id) return;
    await setStoreValue("states", userStorageId(session.user.id), clone(nextState));
    await waitForActiveSync();
    const metadata = await syncMetadata();
    const current = flattenState(nextState);
    const existingPending = await pendingMutations();
    const pendingByKey = new Map(existingPending.map(item => [recordKey(item.record.type, item.record.id), item]));

    for (const [key, record] of current) {
      const hash = await digest(JSON.stringify(record.payload));
      const known = metadata.records?.[key];
      if (known?.hash === hash) continue;
      const pending = pendingByKey.get(key);
      if (pending) {
        pending.createdAt = new Date().toISOString();
        pending.record = {
          ...pending.record,
          type: record.type,
          id: record.id,
          payload: clone(record.payload),
          deleted: false
        };
        await setStoreValue("mutations", `${session.user.id}:${pending.mutationId}`, pending);
      } else {
        const mutation = await queueMutation(record, known?.revision || 0);
        pendingByKey.set(key, mutation);
      }
      metadata.records = { ...(metadata.records || {}), [key]: { ...(known || {}), hash } };
    }
    for (const [key, known] of Object.entries(metadata.records || {})) {
      if (current.has(key) || known.deleted) continue;
      const [type, ...idParts] = key.split(":");
      const pending = pendingByKey.get(key);
      if (pending) {
        pending.createdAt = new Date().toISOString();
        pending.record = {
          ...pending.record,
          type,
          id: idParts.join(":"),
          payload: null,
          deleted: true
        };
        await setStoreValue("mutations", `${session.user.id}:${pending.mutationId}`, pending);
      } else {
        const mutation = await queueMutation({ type, id: idParts.join(":"), deleted: true }, known.revision || 0);
        pendingByKey.set(key, mutation);
      }
      metadata.records[key] = { ...known, deleted: true, hash: "" };
    }
    await saveSyncMetadata(metadata);
    const pending = await pendingCount();
    setStatus({ state: navigator.onLine ? "pending" : "offline", message: navigator.onLine ? `Saving ${pending} change${pending === 1 ? "" : "s"}…` : "Offline changes will sync later", pending, conflicts: await conflictCount() });
    scheduleSync();
  }

  async function loadState() {
    if (!config?.authEnabled || !session?.user?.id) return null;
    const cached = await getStoreValue("states", userStorageId(session.user.id));
    if (navigator.onLine) {
      try {
        const synced = await syncNow({ state: cached, pullOnly: true });
        return synced?.state || cached;
      } catch {}
    }
    return cached;
  }

  async function syncNow({ state: suppliedState = null, pullOnly = false } = {}) {
    if (syncing || !config?.authEnabled || !session?.user?.id || !navigator.onLine) return { state: suppliedState };
    syncing = true;
    try {
      const metadata = await syncMetadata();
      const pending = pullOnly ? [] : (await pendingMutations()).slice(0, MAX_SYNC_BATCH);
      setStatus({ state: "syncing", message: "Syncing…", pending: await pendingCount(), conflicts: Object.keys(metadata.conflicts || {}).length });
      const response = pending.length
        ? await request("/api/v1/sync/push", {
            method: "POST",
            body: JSON.stringify({
              clientId: await clientId(),
              cursor: metadata.cursor || 0,
              mutations: pending
            })
          })
        : await request(`/api/v1/sync/pull?cursor=${encodeURIComponent(metadata.cursor || 0)}`);

      for (const result of response.results || []) {
        const mutation = pending.find(item => item.mutationId === result.mutationId);
        if (!mutation) continue;
        const key = recordKey(mutation.record.type, mutation.record.id);
        if (result.status === "applied" || result.idempotent) {
          await deleteStoreValue("mutations", `${session.user.id}:${mutation.mutationId}`);
          metadata.records = {
            ...(metadata.records || {}),
            [key]: {
              ...(metadata.records?.[key] || {}),
              revision: result.record?.revision || metadata.records?.[key]?.revision || 0,
              deleted: Boolean(result.record?.deletedAt)
            }
          };
          if (metadata.conflicts) delete metadata.conflicts[key];
        } else if (result.status === "conflict") {
          metadata.conflicts = {
            ...(metadata.conflicts || {}),
            [key]: {
              detectedAt: new Date().toISOString(),
              localMutation: mutation,
              serverRecord: result.serverRecord
            }
          };
        }
      }

      let nextState = suppliedState || await getStoreValue("states", userStorageId(session.user.id)) || { contacts: [], places: [], settings: {}, meta: { version: 1 } };
      const unresolved = new Set((await pendingMutations()).map(item => recordKey(item.record.type, item.record.id)));
      const safeRemoteRecords = [];
      for (const record of response.records || []) {
        const key = recordKey(record.type, record.id);
        if (unresolved.has(key)) {
          metadata.conflicts = {
            ...(metadata.conflicts || {}),
            [key]: {
              detectedAt: new Date().toISOString(),
              localMutation: (await pendingMutations()).find(item => recordKey(item.record.type, item.record.id) === key),
              serverRecord: record
            }
          };
          continue;
        }
        safeRemoteRecords.push(record);
        metadata.records = {
          ...(metadata.records || {}),
          [key]: {
            hash: record.deletedAt ? "" : await digest(JSON.stringify(record.payload)),
            revision: record.revision,
            deleted: Boolean(record.deletedAt)
          }
        };
      }
      nextState = applyRecords(nextState, safeRemoteRecords);
      metadata.cursor = Math.max(Number(metadata.cursor || 0), Number(response.cursor || 0));
      await setStoreValue("states", userStorageId(session.user.id), nextState);
      await saveSyncMetadata(metadata);
      const remaining = await pendingCount();
      const conflicts = Object.keys(metadata.conflicts || {}).length;
      setStatus({
        state: conflicts ? "conflict" : remaining ? "pending" : "synced",
        message: conflicts ? `${conflicts} sync conflict${conflicts === 1 ? "" : "s"} need review` : remaining ? `${remaining} change${remaining === 1 ? "" : "s"} waiting` : "Up to date",
        pending: remaining,
        conflicts,
        lastSyncedAt: new Date().toISOString()
      });
      if (safeRemoteRecords.length) listeners.forEach(listener => {
        try { listener({ ...clone(lastStatus), stateData: clone(nextState) }); } catch {}
      });
      if (remaining && !conflicts) scheduleSync(300);
      return { state: nextState, conflicts };
    } catch (error) {
      setStatus({ state: "offline", message: "Offline changes will sync later", pending: await pendingCount(), conflicts: await conflictCount(), error: error.message });
      throw error;
    } finally {
      syncing = false;
    }
  }

  function scheduleSync(delay = 800) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { syncNow().catch(() => {}); }, delay);
  }

  async function clientId() {
    let value = await getStoreValue("secure", "client-id");
    if (!value) {
      value = uid();
      await setStoreValue("secure", "client-id", value);
    }
    return value;
  }

  async function migrationStatus() {
    if (!session?.user?.id) return { completed: false };
    try { return await request(`/api/v1/migrations/local?key=${encodeURIComponent(LOCAL_MIGRATION_KEY)}`); }
    catch { return { completed: false, unavailable: true }; }
  }

  async function markMigrationComplete(sourceState) {
    const fingerprint = await digest(JSON.stringify(sourceState || {}));
    await request("/api/v1/migrations/local", {
      method: "POST",
      body: JSON.stringify({ key: LOCAL_MIGRATION_KEY, sourceFingerprint: fingerprint })
    });
  }

  async function importLocalState(sourceState) {
    if (!session?.user?.id) throw new Error("Sign in before importing local data.");
    const cloudState = (await syncNow({
      state: await getStoreValue("states", userStorageId(session.user.id)),
      pullOnly: true
    }))?.state || { contacts: [], places: [], settings: {}, meta: { version: 1 } };
    const metadata = await syncMetadata();
    const localRecords = flattenState(sourceState);
    const cloudRecords = flattenState(cloudState);
    const recordsToMerge = [];
    for (const [key, localRecord] of localRecords) {
      const cloudRecord = cloudRecords.get(key);
      if (!cloudRecord) {
        recordsToMerge.push(localRecord);
        continue;
      }
      const localHash = await digest(JSON.stringify(localRecord.payload));
      const cloudHash = await digest(JSON.stringify(cloudRecord.payload));
      if (localHash === cloudHash) continue;
      metadata.conflicts = {
        ...(metadata.conflicts || {}),
        [key]: {
          detectedAt: new Date().toISOString(),
          reason: "local-migration",
          localRecord: clone(localRecord),
          serverRecord: clone(cloudRecord)
        }
      };
    }
    const merged = applyRecords(cloudState, recordsToMerge.map(record => ({
      type: record.type,
      id: record.id,
      payload: record.payload,
      deletedAt: null
    })));
    await saveSyncMetadata(metadata);
    await setStoreValue("states", userStorageId(session.user.id), merged);
    await queueState(merged);
    await syncNow({ state: merged });
    await markMigrationComplete(sourceState);
    const conflicts = await conflictCount();
    return { state: merged, conflicts };
  }

  async function skipLocalMigration(sourceState) {
    if (!session?.user?.id) throw new Error("Sign in before continuing.");
    await markMigrationComplete({ skipped: true, sourceStateFingerprint: await digest(JSON.stringify(sourceState || {})) });
    return { ok: true };
  }

  async function accountDetails() {
    return request("/api/v1/account");
  }

  async function updateAccount(values) {
    const result = await request("/api/v1/account", {
      method: "PATCH",
      body: JSON.stringify({
        firstName: values?.firstName || "",
        lastName: values?.lastName || ""
      })
    });
    if (result?.user && session) {
      await saveSession({ ...session, user: result.user });
    }
    return result;
  }

  async function listSessions() {
    return request("/api/v1/auth/sessions");
  }

  async function revokeSession(id) {
    const result = await request(`/api/v1/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (result?.currentSessionRevoked) {
      await saveSession(null);
      setStatus({ state: "signed-out", message: "Signed out", authRequired: true });
    }
    return result;
  }

  async function changePassword(currentPassword, newPassword) {
    return request("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  async function createBackup() {
    return request("/api/v1/backups", { method: "POST" });
  }

  async function listBackups() {
    return request("/api/v1/backups");
  }

  async function previewBackup(id) {
    return request(`/api/v1/backups/${encodeURIComponent(id)}/preview`);
  }

  async function restoreBackup(id, password, confirmation = "RESTORE") {
    const result = await request(`/api/v1/backups/${encodeURIComponent(id)}/restore`, {
      method: "POST",
      body: JSON.stringify({ password, confirmation })
    });
    if (result?.state && session?.user?.id) {
      const cleanState = clone(result.state);
      await setStoreValue("states", userStorageId(session.user.id), cleanState);
      await setStoreValue("sync", userStorageId(session.user.id), { cursor: 0, records: {}, conflicts: {} });
      listeners.forEach(listener => {
        try { listener({ ...clone(lastStatus), stateData: cleanState, restored: true }); } catch {}
      });
    }
    return result;
  }

  async function deleteAccount(password, confirmation = "DELETE") {
    const result = await request("/api/v1/account", {
      method: "DELETE",
      body: JSON.stringify({ password, confirmation })
    });
    await saveSession(null);
    setStatus({ state: "signed-out", message: "Account deleted", pending: 0, conflicts: 0 });
    return result;
  }

  async function conflicts() {
    const metadata = await syncMetadata();
    return clone(metadata.conflicts || {});
  }

  async function downloadAccountExport() {
    const headers = new Headers();
    headers.set("authorization", `Bearer ${session.token}`);
    const response = await fetch(accountURL("/api/v1/account/export"), { headers, cache: "no-store" });
    if (!response.ok) throw new Error("Bridge could not export this account.");
    return response.blob();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function renderAuthScreen({ mode = "login", message = "", error = "" } = {}) {
    const app = document.getElementById("app");
    if (!app) return;
    const resetToken = new URLSearchParams(location.search).get("resetPassword") || "";
    const activeMode = resetToken ? "reset" : mode;
    const turnstile = config?.turnstileSiteKey ? `<div class="auth-turnstile" data-turnstile></div>` : "";
    const status = error
      ? `<p class="auth-message auth-error" role="alert">${escapeText(error)}</p>`
      : message ? `<p class="auth-message" role="status">${escapeText(message)}</p>` : "";
    app.innerHTML = `<main class="auth-shell">
      <section class="auth-card" aria-labelledby="authTitle">
        <img class="auth-logo" src="./bridge-icon-192.png" alt="" />
        <div class="auth-heading">
          <p class="eyebrow">Bridge CRM</p>
          <h1 id="authTitle">${activeMode === "signup" ? "Create your account" : activeMode === "forgot" ? "Reset your password" : activeMode === "reset" ? "Choose a new password" : "Welcome back"}</h1>
          <p>${activeMode === "signup" ? "Securely sync Bridge across your devices." : activeMode === "forgot" ? "We will send a secure reset link if the account exists." : activeMode === "reset" ? "Use at least 12 characters." : "Sign in to open your private CRM."}</p>
        </div>
        ${status}
        <form class="auth-form" data-auth-form="${activeMode}">
          ${activeMode === "signup" ? `<div class="auth-name-grid"><label>First name<input name="firstName" autocomplete="given-name" maxlength="80" /></label><label>Last name<input name="lastName" autocomplete="family-name" maxlength="80" /></label></div>` : ""}
          ${activeMode !== "reset" ? `<label>Email<input name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" /></label>` : ""}
          ${["login", "signup", "reset"].includes(activeMode) ? `<label>${activeMode === "reset" ? "New password" : "Password"}<input name="password" type="password" autocomplete="${activeMode === "login" ? "current-password" : "new-password"}" minlength="12" maxlength="256" required /></label>` : ""}
          ${activeMode === "login" ? `<label class="auth-check"><input name="rememberMe" type="checkbox" /> Keep me signed in on this device</label>` : ""}
          ${turnstile}
          <button class="primary auth-submit" type="submit">${activeMode === "signup" ? "Create account" : activeMode === "forgot" ? "Send reset link" : activeMode === "reset" ? "Save new password" : "Sign in"}</button>
        </form>
        <div class="auth-links">
          ${activeMode === "login" ? `<button type="button" data-auth-mode="forgot">Forgot password?</button><button type="button" data-auth-mode="signup">Create account</button>` : `<button type="button" data-auth-mode="login">Back to sign in</button>`}
        </div>
        <p class="auth-storage-note">Your account data is private. Offline changes stay on this device and sync when you reconnect.</p>
      </section>
    </main>`;
    bindAuthScreen(activeMode, resetToken);
  }

  function escapeText(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  async function turnstileToken(form) {
    if (!config?.turnstileSiteKey) return "";
    const container = form.querySelector("[data-turnstile]");
    return String(container?.dataset.token || "");
  }

  function loadTurnstile(form) {
    if (!config?.turnstileSiteKey) return;
    const container = form.querySelector("[data-turnstile]");
    if (!container) return;
    const render = () => {
      if (!globalThis.turnstile || container.dataset.widgetId) return;
      container.dataset.widgetId = globalThis.turnstile.render(container, {
        sitekey: config.turnstileSiteKey,
        theme: "auto",
        size: "flexible",
        callback: token => { container.dataset.token = token; },
        "expired-callback": () => { container.dataset.token = ""; }
      });
    };
    if (globalThis.turnstile) return render();
    let script = document.querySelector('script[data-bridge-turnstile]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.bridgeTurnstile = "true";
      document.head.append(script);
    }
    script.addEventListener("load", render, { once: true });
  }

  function bindAuthScreen(mode, resetToken) {
    const form = document.querySelector("[data-auth-form]");
    loadTurnstile(form);
    document.querySelectorAll("[data-auth-mode]").forEach(button => {
      button.addEventListener("click", () => renderAuthScreen({ mode: button.dataset.authMode }));
    });
    form?.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector(".auth-submit");
      submit.disabled = true;
      const values = Object.fromEntries(new FormData(form));
      try {
        const securityToken = await turnstileToken(form);
        if (mode === "login") {
          await login({ email: values.email, password: values.password, rememberMe: values.rememberMe === "on", turnstileToken: securityToken });
          location.reload();
          return;
        }
        if (mode === "signup") {
          await signup({ email: values.email, password: values.password, firstName: values.firstName, lastName: values.lastName, turnstileToken: securityToken });
          renderAuthScreen({ mode: "login", message: "Check your email to verify your Bridge account." });
          return;
        }
        if (mode === "forgot") {
          await forgotPassword(values.email, securityToken);
          renderAuthScreen({ mode: "login", message: "If that account exists, a reset link is on its way." });
          return;
        }
        if (mode === "reset") {
          await resetPassword(resetToken, values.password);
          const next = new URL(location.href);
          next.searchParams.delete("resetPassword");
          history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
          renderAuthScreen({ mode: "login", message: "Password updated. Sign in with your new password." });
        }
      } catch (error) {
        renderAuthScreen({ mode, error: error.message });
      }
    });
  }

  globalThis.BridgeAccount = Object.freeze({
    bootstrap,
    config: () => clone(config),
    session: () => clone(session),
    status: () => clone(lastStatus),
    renderAuthScreen,
    login,
    signup,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    logout,
    request,
    loadState,
    queueState,
    syncNow,
    migrationStatus,
    importLocalState,
    skipLocalMigration,
    accountDetails,
    updateAccount,
    listSessions,
    revokeSession,
    changePassword,
    createBackup,
    listBackups,
    previewBackup,
    restoreBackup,
    deleteAccount,
    conflicts,
    downloadAccountExport,
    subscribe
  });

  addEventListener("online", () => {
    if (session?.user?.id) {
      setStatus({ state: "pending", message: "Back online. Syncing…" });
      scheduleSync(50);
    }
  });
  addEventListener("offline", () => {
    if (session?.user?.id) setStatus({ state: "offline", message: "Offline changes will sync later" });
  });
})();
