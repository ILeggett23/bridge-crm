const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const { archiveInactiveContacts, hasConversationInRange, latestConversationTime, restoreContact, setFilteredOut, sortContacts } = globalThis.BridgeLogic;
const { dayKey, definitions: ACHIEVEMENTS, dueReminderEvents, evaluateAchievements } = globalThis.BridgeEngagement;
const { analyticsRange, inAnalyticsRange, uniquePhoneCaptures } = globalThis.BridgeAnalytics;
const { canonicalPhone, phoneIdentity, telHref, smsHref } = globalThis.BridgeCommunication;
const bridgeStyles = $$('link[data-bridge-styles]');
if (bridgeStyles.length > 1) {
  const styleVersion = link => Number(new URL(link.href).searchParams.get("v")) || 0;
  const currentStyle = bridgeStyles.reduce((latest, link) => styleVersion(link) > styleVersion(latest) ? link : latest);
  bridgeStyles.forEach(link => { if (link !== currentStyle) link.remove(); });
}
const uid = () => globalThis.crypto?.randomUUID?.() || `bridge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nowISO = () => new Date().toISOString();
const todayInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const initials = name => (name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
const localCache = {
  get() { try { return window.localStorage.getItem("bridge-crm-cache"); } catch { return null; } },
  set(value) { try { window.localStorage.setItem("bridge-crm-cache", value); } catch {} }
};
const durableCache = {
  open() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open("bridge-crm", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async get() {
    try {
      const database = await this.open();
      return await new Promise((resolve, reject) => {
        const request = database.transaction("state", "readonly").objectStore("state").get("primary");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch { return null; }
  },
  async set(value) {
    try {
      const database = await this.open();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction("state", "readwrite");
        transaction.objectStore("state").put(value, "primary");
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch {}
  }
};

const PIPELINES = {
  Prospect: ["PQI", "QI/P", "FUP", "LA"],
  Customer: ["CNA", "Recommendation", "Decision / Follow-Up", "Order Placed", "Customer Onboarding", "Active Customer", "Reorder / Retention"]
};
const PIPELINE_STAGES = [...new Set([...PIPELINES.Prospect, ...PIPELINES.Customer])];
const ALL_STAGES = ["MSA", "DTM", ...PIPELINE_STAGES];
const CONVERSATION_TYPES = ["Prospecting", "Product Discussion", "Sampling", "Team-Check In", "Follow-Up", "Other"];
const INTERESTS = ["Unsure", "Low", "Medium", "High"];
const CALL_OUTCOMES = ["Connected", "No answer", "Left voicemail", "Busy", "Wrong number", "Follow-up needed"];
const TEXT_OUTCOMES = ["Text sent", "Response received", "No response", "Follow-up needed", "Other"];
const COMMUNICATION_DIRECTIONS = ["Outgoing", "Incoming"];
const ACCENTS = {
  Teal: ["#17a6a4", "23, 166, 164"],
  Blue: ["#2477d8", "36, 119, 216"],
  Indigo: ["#5559d9", "85, 89, 217"],
  Green: ["#24895d", "36, 137, 93"],
  Orange: ["#d67423", "214, 116, 35"],
  Red: ["#cf4452", "207, 68, 82"],
  Pink: ["#c14684", "193, 70, 132"],
  Purple: ["#9b36d4", "155, 54, 212"]
};

const icon = (content, options = "") => `<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${options}>${content}</svg>`;
const icons = {
  home: icon('<path d="m3 10.5 9-7.5 9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>'),
  people: icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  bell: icon('<path d="M10.27 21a2 2 0 0 0 3.46 0"/><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.86 18 12.28 18 8a6 6 0 0 0-12 0c0 4.28-1.41 5.86-2.74 7.33"/>'),
  chart: icon('<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V7M17 16v-3"/>'),
  gear: icon('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>'),
  search: icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>'),
  calendar: icon('<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'),
  calendarCheck: icon('<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M9 16l2 2 4-4"/>'),
  check: icon('<path d="m5 12 4 4L19 6"/>'),
  circleCheck: icon('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  userPlus: icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/>'),
  contactCard: icon('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2.5"/><path d="M5.5 16a3.5 3.5 0 0 1 7 0M15 8h3M15 12h3M15 16h2"/>'),
  flag: icon('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
  fire: icon('<path d="M12 22c4.4 0 8-3.6 8-8 0-3-1.5-5.4-4.5-7.5.2 3-1.5 4.5-3 5-1-4-3.5-7-6-8.5.5 4-2.5 6-2.5 10.5C4 18.2 7.6 22 12 22Z"/>'),
  warning: icon('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
  download: icon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
  close: icon('<path d="M18 6 6 18M6 6l12 12"/>'),
  trash: icon('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>'),
  pencil: icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>'),
  location: icon('<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  star: icon('<path d="m12 2.7 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.51l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94Z"/>', 'fill="currentColor"'),
  award: icon('<circle cx="12" cy="8" r="6"/><path d="M15.48 12.64 17 22l-5-3-5 3 1.52-9.36"/>'),
  target: icon('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  chat: icon('<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>'),
  phone: icon('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/>'),
  phoneCall: icon('<path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/>'),
  bridge: icon('<path d="M3 18c2-7 5-10 9-10s7 3 9 10M3 18h18M6 18v3M18 18v3M8.5 10.5V18M15.5 10.5V18"/>'),
  sort: icon('<path d="m3 8 4-4 4 4M7 4v16M21 16l-4 4-4-4M17 20V4"/>'),
  tags: icon('<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414L10 20l10-10Z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/><path d="m13.5 6.5 4 4"/>'),
  archive: icon('<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>'),
  link: icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  network: icon('<rect x="9" y="2" width="6" height="6" rx="2"/><rect x="2" y="16" width="6" height="6" rx="2"/><rect x="16" y="16" width="6" height="6" rx="2"/><path d="M12 8v4M5 16v-2h14v2"/>'),
  trophy: icon('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>'),
  sparkles: icon('<path d="m12 3-1.5 3.5L7 8l3.5 1.5L12 13l1.5-3.5L17 8l-3.5-1.5ZM5 15l-.75 1.75L2.5 17.5l1.75.75L5 20l.75-1.75 1.75-.75-1.75-.75ZM19 14l-1 2.5-2.5 1 2.5 1L19 21l1-2.5 2.5-1-2.5-1Z"/>'),
  rocket: icon('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.7 12.7 0 0 1 22 2c0 2.72-.78 7.5-6.05 11a22 22 0 0 1-3.95 2Z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><circle cx="16" cy="8" r="1"/>'),
  handshake: icon('<path d="m11 17 2 2a2 2 0 1 0 3-3M14 14l2.5 2.5a2 2 0 1 0 3-3L16 10"/><path d="m4 14 6.5-6.5a2 2 0 0 1 3 0L15 9h3.5L22 5.5M2 5l5 5M7 10l-3 3a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l1 1a2 2 0 0 0 3 0l1-1"/>'),
  chevronDown: icon('<path d="m6 9 6 6 6-6"/>')
};

const defaultState = () => ({
  contacts: [],
  places: [],
  settings: {
    name: "",
    businessName: "",
    dailyGoal: 5,
    weeklyGoal: 25,
    monthlyGoal: 100,
    defaultFollowUpDays: 2,
    weekStart: 0,
    theme: "system",
    accent: "Teal",
    compact: false,
    showConversionPercentages: true,
    autoArchiveInactive: false,
    notificationsEnabled: false,
    followUpNotifications: true,
    dailyReminderEnabled: true,
    dailyReminderTime: "09:00"
  },
  meta: { version: 5, updatedAt: nowISO(), achievements: {}, dailyReminderSentDate: null }
});

let state = defaultState();
let ui = { page: "dashboard", contactMode: "list", search: "", roleFilter: "All Roles", archiveFilter: "Active", conversationFrom: "", conversationTo: "", sort: "recentContact", analyticsRange: "week", analyticsAnchor: todayInput(), analyticsCustomStart: todayInput(), analyticsCustomEnd: todayInput(), detailId: null, contactEditing: false, contactEditDirty: false, communicationContactId: null, communicationType: "Call", communicationStartedAt: null, communicationLogId: null, activityHistoryContactId: null, activityFilter: "All", expandedLogIds: new Set(), settingsOpen: false, settingsAccentDraft: null, achievementsOpen: false, saveTimer: null };
const launchParams = new URLSearchParams(location.search);
if (["dashboard", "contacts", "add", "followups", "analytics"].includes(launchParams.get("page"))) ui.page = launchParams.get("page");
if (launchParams.get("contact")) ui.detailId = launchParams.get("contact");
const cloudStateAvailable = location.protocol === "https:" && !location.hostname.endsWith("github.io");

function normalizeState(raw) {
  const base = defaultState();
  const next = { ...base, ...(raw || {}), settings: { ...base.settings, ...(raw?.settings || {}) }, meta: { ...base.meta, ...(raw?.meta || {}) } };
  next.contacts = Array.isArray(next.contacts) ? next.contacts.map(contact => {
    const filteredOutAt = contact.filteredOutAt || contact.explicitFilteredOutAt || null;
    const stageDates = contact.stageDates || {};
    const stageEvents = Array.isArray(contact.stageEvents) ? contact.stageEvents.map(event => ({ ...event, id: event.id || uid(), occurredAt: event.occurredAt || event.date || contact.updatedAt || contact.createdAt || nowISO() })) : ALL_STAGES.filter(stage => Boolean(contact.stages?.[stage]?.isComplete ?? contact.stages?.[stage])).map(stage => ({ id: uid(), stage, occurredAt: stageDates[stage] || contact.updatedAt || contact.createdAt || nowISO() }));
    const conversations = Array.isArray(contact.conversations) ? contact.conversations.map(log => {
      const communicationType = log.communicationType || (log.type === "Call" ? "Call" : ["Text", "Text Message"].includes(log.type) ? "Text" : null);
      return { ...log, id: log.id || uid(), createdAt: log.createdAt || log.conversationDate || contact.updatedAt || contact.createdAt || nowISO(), conversationDate: log.conversationDate || log.createdAt || contact.updatedAt || contact.createdAt || nowISO(), isCountedConversation: Boolean(log.isCountedConversation), communicationType, direction: communicationType ? (log.direction || "Outgoing") : null, followUpCreated: Boolean(log.followUpCreated) };
    }) : [];
    const firstCountedConversation = conversations.filter(log => log.isCountedConversation).sort((a, b) => dateOnly(a.conversationDate || a.createdAt) - dateOnly(b.conversationDate || b.createdAt))[0];
    const inferredCapturedPhone = String(contact.capturedPhoneNumber || contact.phoneNumber || "").trim();
    const phoneCapturedAt = contact.phoneCapturedAt || (inferredCapturedPhone && firstCountedConversation ? (firstCountedConversation.conversationDate || firstCountedConversation.createdAt) : null);
    const role = contact.role === "Customer" ? "Customer" : "Prospect";
    const validCurrentStages = new Set(["MSA", "DTM", ...(PIPELINES[role] || [])]);
    const stages = Object.fromEntries(ALL_STAGES.map(stage => [stage, validCurrentStages.has(stage) && Boolean(contact.stages?.[stage]?.isComplete ?? contact.stages?.[stage])]));
    if (role === "Customer") {
      const selected = [...PIPELINES.Customer].reverse().find(stage => stages[stage]);
      PIPELINES.Customer.forEach(stage => { stages[stage] = stage === selected; });
    }
    const currentStageDates = Object.fromEntries(Object.entries(stageDates).filter(([stage]) => stages[stage]));
    return {
      id: contact.id || uid(), fullName: contact.fullName || "Unnamed Contact", phoneNumber: contact.phoneNumber || "", role,
      capturedPhoneNumber: phoneCapturedAt ? inferredCapturedPhone : "", phoneCapturedAt,
      judgement: ["Good Fit", "Not Good Fit"].includes(contact.judgement || contact.category) ? (contact.judgement || contact.category) : "Good Fit",
      interestLevel: INTERESTS.includes(contact.interestLevel) ? contact.interestLevel : "Unsure", conversationType: CONVERSATION_TYPES.includes(contact.conversationType) ? contact.conversationType : "Prospecting",
      placeId: contact.placeId || contact.placeID || null, placeName: contact.placeName || "", dateFirstMet: contact.dateFirstMet || contact.createdAt || nowISO(), personalInfo: contact.personalInfo || "",
      isFilteredOut: Boolean(contact.isFilteredOut && filteredOutAt), filteredOutAt, checkBackDate: contact.checkBackDate || null,
      archivedAt: contact.archivedAt || null, archiveReason: contact.archiveReason || null,
      stages, stageDates: currentStageDates, stageEvents, followUps: Array.isArray(contact.followUps) ? contact.followUps.map(item => ({ ...item, id: item.id || uid(), createdAt: item.createdAt || contact.updatedAt || contact.createdAt || nowISO() })) : [], notes: Array.isArray(contact.notes) ? contact.notes : [], conversations,
      createdAt: contact.createdAt || nowISO(), updatedAt: contact.updatedAt || contact.createdAt || nowISO()
    };
  }) : [];
  archiveInactiveContacts(next.contacts, next.settings.autoArchiveInactive);
  next.places = Array.isArray(next.places) ? next.places.map(place => ({ id: place.id || uid(), name: place.name || "Unnamed Place", isFavorite: Boolean(place.isFavorite), createdAt: place.createdAt || nowISO() })) : [];
  next.meta.achievements = next.meta.achievements && typeof next.meta.achievements === "object" ? next.meta.achievements : {};
  return next;
}

function syncAchievements(announce = true) {
  const result = evaluateAchievements(state, state.meta.achievements || {});
  if (!result.newlyUnlocked.length) return result;
  const newlyUnlocked = [...result.newlyUnlocked];
  const unlockedAt = nowISO();
  newlyUnlocked.forEach(id => { state.meta.achievements[id] = unlockedAt; });
  if (announce) {
    const achievement = ACHIEVEMENTS.find(item => item.id === newlyUnlocked[0]);
    if (achievement) showToast(`Achievement unlocked: ${achievement.name}`);
  }
  return { ...evaluateAchievements(state, state.meta.achievements), newlyUnlocked };
}

async function loadState() {
  if (!cloudStateAvailable) {
    const cached = localCache.get() || await durableCache.get();
    try { state = normalizeState(cached ? JSON.parse(cached) : null); }
    catch { state = defaultState(); }
    const snapshot = JSON.stringify(state);
    localCache.set(snapshot);
    durableCache.set(snapshot);
    syncAchievements(false);
    applyAppearance();
    render();
    startReminderChecks();
    return;
  }
  try {
    const response = await fetch("/api/state", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Cloud state unavailable");
    state = normalizeState(await response.json());
    const snapshot = JSON.stringify(state);
    localCache.set(snapshot);
    durableCache.set(snapshot);
  } catch {
    const cached = localCache.get() || await durableCache.get();
    try { state = normalizeState(cached ? JSON.parse(cached) : null); }
    catch { state = defaultState(); }
    $(".sync-status")?.replaceChildren(document.createTextNode("Local mode"));
  }
  syncAchievements(false);
  applyAppearance();
  render();
  startReminderChecks();
}

function queueSave(message = "Saved") {
  const achievementResult = syncAchievements(false);
  if (achievementResult.newlyUnlocked.length) {
    const achievement = ACHIEVEMENTS.find(item => item.id === achievementResult.newlyUnlocked[0]);
    if (achievement) message = `Achievement unlocked: ${achievement.name}`;
  }
  state.meta.updatedAt = nowISO();
  const snapshot = JSON.stringify(state);
  localCache.set(snapshot);
  durableCache.set(snapshot);
  clearTimeout(ui.saveTimer);
  ui.saveTimer = setTimeout(async () => {
    if (!cloudStateAvailable) {
      showToast(message);
      return;
    }
    try {
      const response = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
      if (!response.ok) throw new Error();
      showToast(message);
    } catch { showToast("Saved on this device; cloud sync will retry later"); }
  }, 220);
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persisted && await navigator.storage.persisted()) return;
    await navigator.storage?.persist?.();
  } catch {}
}

const notificationsSupported = () => "Notification" in window && "serviceWorker" in navigator;
const notificationPermission = () => notificationsSupported() ? Notification.permission : "unsupported";
let reminderTimer = null;

async function persistStateSilently() {
  state.meta.updatedAt = nowISO();
  const snapshot = JSON.stringify(state);
  localCache.set(snapshot);
  durableCache.set(snapshot);
  if (!cloudStateAvailable) return;
  try { await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: snapshot }); } catch {}
}

async function sendBridgeNotification(title, options) {
  if (notificationPermission() !== "granted") return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, { icon: "./bridge-icon-192.png", badge: "./bridge-icon-192.png", ...options });
    return true;
  } catch { return false; }
}

async function checkReminders() {
  if (document.visibilityState === "hidden" || notificationPermission() !== "granted") return;
  const events = dueReminderEvents(state, new Date());
  if (!events.length) return;
  let changed = false;
  for (const event of events) {
    if (event.type === "followup") {
      const sent = await sendBridgeNotification(`Follow up with ${event.contact.fullName}`, {
        body: `${event.followUp.note || "Your scheduled follow-up"} is ready now.`,
        tag: `bridge-followup-${event.followUp.id}`,
        data: { url: `./?page=followups&contact=${encodeURIComponent(event.contact.id)}` }
      });
      if (sent) { event.followUp.notificationSentAt = nowISO(); changed = true; }
    } else {
      const sent = await sendBridgeNotification("Ready to build your pipeline?", {
        body: `${event.remaining} conversation${event.remaining === 1 ? "" : "s"} left to reach today’s goal.`,
        tag: `bridge-daily-${event.date}`,
        data: { url: "./?page=add" }
      });
      if (sent) { state.meta.dailyReminderSentDate = event.date; changed = true; }
    }
  }
  if (changed) persistStateSilently();
}

function startReminderChecks() {
  clearInterval(reminderTimer);
  checkReminders();
  reminderTimer = setInterval(checkReminders, 60_000);
}

window.addEventListener("pointerdown", requestPersistentStorage, { once: true, passive: true });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { checkReminders(); offerPendingCommunication(); } });
window.addEventListener("focus", () => setTimeout(offerPendingCommunication, 120));
window.addEventListener("pagehide", () => {
  const snapshot = JSON.stringify(state);
  localCache.set(snapshot);
  durableCache.set(snapshot);
});

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function applyAppearance() {
  const accent = ACCENTS[state.settings.accent] || ACCENTS.Teal;
  const usesDarkTheme = state.settings.theme === "dark" || (state.settings.theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.style.setProperty("--accent", accent[0]);
  document.documentElement.style.setProperty("--accent-rgb", accent[1]);
  document.documentElement.dataset.theme = state.settings.theme === "system" ? "" : state.settings.theme;
  document.documentElement.style.setProperty("--radius", state.settings.compact ? "18px" : "24px");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", usesDarkTheme ? "#0d1014" : "#f3f5f7");
}

function dateOnly(value) { return new Date(String(value).length === 10 ? `${value}T12:00:00` : value); }
function fmtDate(value, options = { month: "short", day: "numeric" }) { return value ? new Intl.DateTimeFormat(undefined, options).format(dateOnly(value)) : ""; }
function fmtDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : ""; }
function startOfDay(date) { const copy = new Date(date); copy.setHours(0,0,0,0); return copy; }
function addDays(date, amount) { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; }
function rangeForAnalytics() { return analyticsRange({ mode: ui.analyticsRange, anchor: ui.analyticsAnchor, customStart: ui.analyticsCustomStart, customEnd: ui.analyticsCustomEnd, weekStart: state.settings.weekStart }); }
function inRange(value, range) { return inAnalyticsRange(value, range); }
function countedConversations(range = null) { return state.contacts.flatMap(contact => contact.conversations.map(log => ({ ...log, contact }))).filter(log => log.isCountedConversation && (!range || inRange(log.conversationDate || log.createdAt, range))); }
function activeFollowUps() { return state.contacts.filter(contact=>!contact.archivedAt).flatMap(contact => contact.followUps.filter(item => !item.completedAt).map(item => ({ ...item, contact }))).sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate)); }
function stageFor(contact) { return [...(PIPELINES[contact.role] || [])].reverse().find(stage => contact.stages?.[stage]) || "No stage"; }
function stageInputName(stage) { return `stage_${stage.replaceAll(/[^a-zA-Z0-9]/g, "")}`; }
function stageTitle(stage) { return ({ PQI:"Pre-Qualifying Interview", "QI/P":"Quality Interview / Plan", FUP:"Follow-Up", LA:"Launch", CNA:"Customer Needs Assessment", Recommendation:"Personalized recommendation", "Decision / Follow-Up":"Decision and follow-up", "Order Placed":"Order placed", "Customer Onboarding":"Customer onboarding", "Active Customer":"Active customer", "Reorder / Retention":"Reorder and retention" })[stage] || stage; }
function stageLabel(stage) { return stage === "CNA" ? "CNA — Customer Needs Assessment" : stage; }
function normalizedPhone(value) { return phoneIdentity(value); }
function isCallablePhone(value) { return Boolean(canonicalPhone(value)); }
function phoneHref(value) { return telHref(value) || "#"; }
function messageHref(value) { return smsHref(value) || "#"; }
function dateTimeLocalValue(value = new Date()) { const date = value instanceof Date ? value : new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
function currentPipelineStage(contact) { return stageFor(contact) === "No stage" ? "" : stageFor(contact); }
function setPipelineStage(contact, nextStage, occurredAt = nowISO()) {
  const valid = PIPELINES[contact.role] || [];
  if (nextStage && !valid.includes(nextStage)) return false;
  const previous = currentPipelineStage(contact);
  valid.forEach(stage => { contact.stages[stage] = stage === nextStage; if (stage !== nextStage) delete contact.stageDates[stage]; });
  if (!nextStage) return previous !== "";
  contact.stageDates[nextStage] = occurredAt;
  if (previous !== nextStage) {
    contact.stageEvents = Array.isArray(contact.stageEvents) ? contact.stageEvents : [];
    contact.stageEvents.push({ id: uid(), stage: nextStage, occurredAt });
  }
  return previous !== nextStage;
}
const pendingCommunicationKey = "bridge-pending-communication";
function readPendingCommunication() { try { return JSON.parse(sessionStorage.getItem(pendingCommunicationKey) || "null"); } catch { return null; } }
function clearPendingCommunication() { try { sessionStorage.removeItem(pendingCommunicationKey); sessionStorage.removeItem("bridge-pending-call"); } catch {} }
function startCommunication(contactId, type) {
  const pending=readPendingCommunication();
  if(pending&&pending.contactId===contactId&&pending.type===type&&Date.now()-new Date(pending.startedAt).getTime()<2000)return false;
  try { sessionStorage.setItem(pendingCommunicationKey, JSON.stringify({ id:uid(), contactId, type, startedAt:nowISO(), offered:false })); } catch {}
  return true;
}
function openCommunicationLog(contactId, type = "Call", startedAt = nowISO(), logId = null) { ui.communicationContactId=contactId; ui.communicationType=type; ui.communicationStartedAt=startedAt; ui.communicationLogId=logId; render(); }
function offerPendingCommunication() {
  const pending=readPendingCommunication();
  if(!pending||pending.offered||ui.communicationContactId||!state.contacts.some(contact=>contact.id===pending.contactId))return;
  pending.offered=true;
  try { sessionStorage.setItem(pendingCommunicationKey,JSON.stringify(pending)); } catch {}
  openCommunicationLog(pending.contactId,pending.type||"Call",pending.startedAt);
}

function render() {
  const app = $("#app");
  document.body.classList.toggle("modal-open", Boolean(ui.settingsOpen || ui.achievementsOpen || ui.detailId || ui.activityHistoryContactId || ui.communicationContactId));
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar glass">
      <div class="brand"><img class="brand-mark" src="./bridge-icon-192.png" alt="" /><span>Bridge</span></div>
      <nav class="nav" aria-label="Primary navigation">
        ${navButton("dashboard", "Dashboard", "home")}
        ${navButton("contacts", "Contacts", "people")}
        ${navButton("add", "Add New", "plus")}
        ${navButton("followups", "Follow-Ups", "bell")}
        ${navButton("analytics", "Analytics", "chart")}
      </nav>
      <div class="nav-spacer"></div><div class="sync-status">${cloudStateAvailable ? "Cloud synced" : "Saved on this device"}</div>
    </aside>
    <main class="main"><section class="page">${renderPage()}</section></main>
  </div>${ui.settingsOpen ? settingsModal() : ""}${ui.achievementsOpen ? achievementsModal() : ""}${ui.detailId ? contactModal(ui.detailId) : ""}${ui.activityHistoryContactId ? activityHistoryModal(ui.activityHistoryContactId) : ""}${ui.communicationContactId ? communicationLogModal(ui.communicationContactId) : ""}`;
  bindCommonEvents();
  bindPageEvents();
  if (ui.settingsOpen) bindSettingsEvents();
  if (ui.achievementsOpen) bindAchievementEvents();
  if (ui.detailId) bindContactModalEvents();
  if (ui.activityHistoryContactId) bindActivityHistoryEvents();
  if (ui.communicationContactId) bindCommunicationLogEvents();
}

function navButton(page, label, icon) { return `<button class="nav-button ${ui.page === page ? "active" : ""}" data-page="${page}" aria-label="${label}">${icons[icon]}<span>${label}</span></button>`; }
function pageHead(title, subtitle, actions = "") { return `<header class="page-head"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="head-actions">${actions}</div></header>`; }
function renderPage() {
  if (ui.page === "contacts") return renderContacts();
  if (ui.page === "add") return renderAdd();
  if (ui.page === "followups") return renderFollowUps();
  if (ui.page === "analytics") return renderAnalytics();
  return renderDashboard();
}

function renderDashboard() {
  const today = todayInput();
  const todayCount = countedConversations().filter(log => dayKey(log.conversationDate || log.createdAt) === today).length;
  const overdue = activeFollowUps().filter(item => new Date(item.dueDate) < new Date()).length;
  const launches = state.contacts.filter(contact => contact.stages.LA).length;
  const activeContacts = state.contacts.filter(contact => !contact.archivedAt);
  const streak = calculateStreak();
  const upcoming = activeFollowUps();
  const savedName = String(state.settings.name || "").trim();
  const dashboardTitle = savedName ? `Hi, ${escapeHTML(savedName)}` : "Dashboard";
  const achievementState = evaluateAchievements(state, state.meta.achievements || {});
  const unlockedCount = achievementState.progress.filter(item => item.unlockedAt).length;
  const nextAchievement = achievementState.progress.find(item => !item.unlockedAt);
  return `${pageHead(dashboardTitle, "Your relationship-building work at a glance.", `<button class="icon-button" id="settingsButton" aria-label="Settings">${icons.gear}</button>`)}
    <div class="card glass"><div class="goal-row"><div class="goal-copy"><span class="eyebrow">Daily conversation goal</span><div class="goal-count">${todayCount} of ${state.settings.dailyGoal}</div></div><button class="button primary" data-page="add" aria-label="Add conversation">${icons.plus}<span>Add conversation</span></button></div><div class="progress"><span style="width:${Math.min(100,todayCount/Math.max(1,state.settings.dailyGoal)*100)}%"></span></div><span class="muted">${streak} day prospecting streak</span></div>
    <div class="grid stats-grid section-gap">
      ${statCard("userPlus", activeContacts.length, "Contacts")}${statCard("warning", overdue, "Overdue")}${statCard("flag", launches, "Launches")}${statCard("fire", `${streak}d`, "Streak")}
    </div>
    <div class="grid dashboard-grid">
      <div class="card glass dashboard-followups"><h2>Upcoming Follow-Ups</h2>${upcoming.length ? `<div class="list-stack followup-wheel" role="region" aria-label="Upcoming follow-ups" tabindex="0">${upcoming.map(item => miniFollowUp(item)).join("")}</div>` : emptyInline("No follow-ups scheduled", "Set one from a contact to keep momentum moving.")}</div>
      <div class="card glass"><h2>Smart Suggestions</h2><div class="list-stack">${suggestions(todayCount, overdue).map(text => `<div class="mini-row"><div class="stat-icon">${icons.check}</div><span>${escapeHTML(text)}</span></div>`).join("")}</div></div>
    </div>
    <div class="card glass achievement-preview section-gap"><div class="achievement-preview-icon">${icons.award}</div><div><span class="eyebrow">Achievements</span><h2>${unlockedCount} of ${ACHIEVEMENTS.length} unlocked</h2>${nextAchievement ? `<p class="muted">Next: ${escapeHTML(nextAchievement.name)} · ${Math.min(nextAchievement.current, nextAchievement.target)} of ${nextAchievement.target}</p>` : '<p class="muted">Every Bridge achievement is unlocked.</p>'}</div><button class="button subtle" id="viewAchievements">View all</button></div>`;
}
function statCard(icon, value, label) { return `<div class="card stat glass"><div class="stat-icon">${icons[icon]}</div><div><div class="stat-value">${value}</div><div class="muted">${label}</div></div></div>`; }
function calculateStreak() { const days = new Set(countedConversations().map(log => dayKey(log.conversationDate || log.createdAt))); let count=0, cursor=startOfDay(new Date()); while(days.has(dayKey(cursor))){count++;cursor=addDays(cursor,-1);} return count; }
function suggestions(todayCount, overdue) { const list=[]; if(todayCount<state.settings.dailyGoal) list.push(`Log ${state.settings.dailyGoal-todayCount} more conversation${state.settings.dailyGoal-todayCount===1?"":"s"} to reach today's goal.`); if(overdue) list.push(`Reconnect with ${overdue} overdue follow-up${overdue===1?"":"s"}.`); const high=state.contacts.filter(c=>c.interestLevel==="High"&&!c.isFilteredOut).length; if(high) list.push(`${high} high-interest contact${high===1?" is":"s are"} ready for attention.`); if(!list.length) list.push("You're caught up. Review your pipeline for the next best conversation."); return list.slice(0,3); }
function miniFollowUp(item) { const overdue = new Date(item.dueDate)<new Date(); return `<button class="mini-row" data-contact-id="${item.contact.id}"><div class="avatar">${initials(item.contact.fullName)}</div><div><strong>${escapeHTML(item.contact.fullName)}</strong><span class="muted">${escapeHTML(item.note||"Follow up")}</span></div><div class="row-end"><span class="pill ${overdue?"danger":"accent"}">${overdue?"Overdue · ":""}${fmtDateTime(item.dueDate)}</span></div></button>`; }
function emptyInline(title, text) { return `<div class="empty"><div><strong>${title}</strong>${text}</div></div>`; }

function renderContacts() {
  const filtered = getFilteredContacts();
  const modeControls = ["list","pipeline","places"].map(mode => `<button data-contact-mode="${mode}" class="${ui.contactMode===mode?"active":""}">${mode[0].toUpperCase()+mode.slice(1)}</button>`).join("");
  return `${pageHead("Contacts", "Search, segment, and move relationships forward.", `<button class="button primary" data-page="add">${icons.plus}<span>Add contact</span></button>`)}
    <div class="toolbar glass"><label class="search">${icons.search}<input id="contactSearch" type="search" value="${escapeHTML(ui.search)}" placeholder="Search contacts" autocomplete="off"></label><div class="segmented">${modeControls}</div><div class="select-wrap">${icons.sort}<select id="sortContacts" aria-label="Sort contacts"><option value="recentContact" ${ui.sort==="recentContact"?"selected":""}>Most recent contact added</option><option value="recentConversation" ${ui.sort==="recentConversation"?"selected":""}>Most recent conversation</option><option value="oldestConversation" ${ui.sort==="oldestConversation"?"selected":""}>Oldest conversation</option><option value="followup" ${ui.sort==="followup"?"selected":""}>Next follow-up date</option><option value="interest" ${ui.sort==="interest"?"selected":""}>Interest level</option></select><span class="select-chevron">${icons.chevronDown}</span></div></div>
    ${ui.contactMode!=="places"?`<div class="filter-row contact-filter-row"><label class="select-wrap role-filter">${icons.people}<select id="roleFilter"><option>All Roles</option><option ${ui.roleFilter==="Prospect"?"selected":""}>Prospect</option><option ${ui.roleFilter==="Customer"?"selected":""}>Customer</option></select><span class="select-chevron">${icons.chevronDown}</span></label><label class="select-wrap archive-filter">${icons.archive}<select id="archiveFilter" aria-label="Contact visibility"><option ${ui.archiveFilter==="Active"?"selected":""}>Active</option><option ${ui.archiveFilter==="Archived"?"selected":""}>Archived</option><option ${ui.archiveFilter==="All"?"selected":""}>All</option></select><span class="select-chevron">${icons.chevronDown}</span></label></div><div class="conversation-date-filter card glass"><div><span class="eyebrow">Conversation date</span><p class="muted">Show contacts with activity in this range.</p></div>${field("From",`<input id="conversationFrom" type="date" value="${ui.conversationFrom}">`)}${field("To",`<input id="conversationTo" type="date" value="${ui.conversationTo}">`)}${ui.conversationFrom||ui.conversationTo?'<button class="button subtle" id="clearConversationDates" type="button">Clear dates</button>':''}</div>`:""}
    ${ui.contactMode === "pipeline" ? renderPipeline(filtered) : ui.contactMode === "places" ? renderPlaces() : renderContactList(filtered)}`;
}
function getFilteredContacts() {
  const query=ui.search.trim().toLowerCase();
  const rank={High:0,Medium:1,Low:2,Unsure:3};
  const contacts=state.contacts.filter(c=>(ui.archiveFilter==="All"||(ui.archiveFilter==="Archived"?Boolean(c.archivedAt):!c.archivedAt))&&(ui.roleFilter==="All Roles"||c.role===ui.roleFilter)&&hasConversationInRange(c,ui.conversationFrom,ui.conversationTo)&&(!query||[c.fullName,c.phoneNumber,c.placeName,c.personalInfo].join(" ").toLowerCase().includes(query)));
  return sortContacts(contacts,ui.sort,rank,nextFollowUpDate);
}
function nextFollowUpDate(contact){const active=contact.followUps.filter(f=>!f.completedAt).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];return active?new Date(active.dueDate).getTime():Number.MAX_SAFE_INTEGER;}
function renderContactList(contacts) { return contacts.length?`<div class="contact-list">${contacts.map(contactCard).join("")}</div>`:emptyInline("No contacts found","Try a different filter or add a new conversation."); }
function contactCard(contact) { const follow=contact.followUps.filter(f=>!f.completedAt).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];const latest=latestConversationTime(contact); return `<article class="contact-card glass"><button class="contact-card-open" data-contact-id="${contact.id}" aria-label="Open ${escapeHTML(contact.fullName)}"><div class="avatar">${initials(contact.fullName)}</div><div class="contact-body"><h3>${escapeHTML(contact.fullName)}</h3><div class="contact-meta"><span>${escapeHTML(contact.role)}</span><span>${escapeHTML(contact.interestLevel)} interest</span><span>${escapeHTML(stageFor(contact))}</span>${contact.placeName?`<span>${escapeHTML(contact.placeName)}</span>`:""}${latest?`<span>Last conversation ${fmtDate(new Date(latest).toISOString())}</span>`:""}</div></div><div class="contact-status">${contact.archivedAt?'<span class="pill">Archived</span>':contact.isFilteredOut?'<span class="pill danger">Filtered out</span>':follow?`<span class="pill ${new Date(follow.dueDate)<new Date()?"danger":"accent"}">${fmtDate(follow.dueDate)}</span>`:`<span class="pill">${escapeHTML(contact.judgement)}</span>`}</div></button>${isCallablePhone(contact.phoneNumber)?`<div class="contact-quick-actions"><a class="icon-button contact-call" href="${phoneHref(contact.phoneNumber)}" data-communication-contact-id="${contact.id}" data-communication-type="Call" aria-label="Call ${escapeHTML(contact.fullName)}">${icons.phone}</a><a class="icon-button contact-text" href="${messageHref(contact.phoneNumber)}" data-communication-contact-id="${contact.id}" data-communication-type="Text" aria-label="Text ${escapeHTML(contact.fullName)}">${icons.chat}</a></div>`:""}</article>`; }
function renderPipelineGroup(role, contacts) { const stages=PIPELINES[role]; return `<section class="pipeline-role-group"><div class="pipeline-role-head"><span class="eyebrow">${role === "Customer" ? "Customer sales pipeline" : "Prospect pipeline"}</span></div><div class="pipeline-board ${role === "Customer" ? "customer-pipeline" : ""}">${stages.map(stage=>{const group=contacts.filter(c=>c.role===role&&stageFor(c)===stage);return `<div class="pipeline-column glass"><div class="column-head"><div><strong>${escapeHTML(stageLabel(stage))}</strong>${stageTitle(stage)!==stage&&stage!=="CNA"?`<small class="muted">${escapeHTML(stageTitle(stage))}</small>`:""}</div><span class="pill">${group.length}</span></div>${group.map(c=>`<button class="pipeline-person" data-contact-id="${c.id}"><strong>${escapeHTML(c.fullName)}</strong><div class="muted">${escapeHTML(c.interestLevel)} interest</div></button>`).join("")||'<span class="muted">No contacts</span>'}</div>`}).join("")}</div></section>`; }
function renderPipeline(contacts) { const roles=ui.roleFilter==="Prospect"?["Prospect"]:ui.roleFilter==="Customer"?["Customer"]:["Prospect","Customer"]; return `<div class="pipeline-groups">${roles.map(role=>renderPipelineGroup(role,contacts)).join("")}</div>`; }
function renderPlaces() { const places=state.places.map(place=>({...place,count:state.contacts.filter(c=>c.placeId===place.id||(!c.placeId&&c.placeName===place.name)).length})).sort((a,b)=>Number(b.isFavorite)-Number(a.isFavorite)||b.count-a.count); return places.length?`<div class="grid places-grid">${places.map(place=>`<div class="card place-card glass"><div class="place-title-row"><h2>${escapeHTML(place.name)}</h2>${place.isFavorite?`<span class="favorite-star" role="img" aria-label="Favorite place" title="Favorite place">${icons.star}</span>`:""}</div><div class="place-count">${place.count}<span class="muted place-count-label"> contacts</span></div></div>`).join("")}</div>`:emptyInline("No saved places","Add a place while creating your next contact."); }

function renderAdd() {
  return `${pageHead("Add New", "Capture a conversation in under a minute.")}
    <form id="addContactForm" class="form-shell">
      <section class="form-section"><h2>Contact</h2><div class="card glass grid form-grid">
        ${field("Full name",'<input name="fullName" required autocomplete="name" placeholder="Full name">')}${field("Phone number",'<input name="phoneNumber" autocomplete="tel" inputmode="tel" placeholder="Optional">')}
        ${field("Conversation date",`<input name="conversationDate" type="date" max="${todayInput()}" value="${todayInput()}" required>`)}${field("Role",`<select name="role" id="newRole"><option>Prospect</option><option>Customer</option></select>`)}
        ${field("Judgement",'<select name="judgement"><option>Good Fit</option><option>Not Good Fit</option></select>')}${field("Interest",`<select name="interestLevel">${INTERESTS.map(x=>`<option ${x==="Unsure"?"selected":""}>${x}</option>`).join("")}</select>`)}
        ${field("Conversation type",`<select name="conversationType">${CONVERSATION_TYPES.map(x=>`<option>${x}</option>`).join("")}</select>`,"full")}
      </div></section>
      <section class="form-section"><h2>Where I Met Them</h2><div class="card glass grid form-grid">
        ${field("Saved place",`<select name="placeId"><option value="">None</option>${[...state.places].sort((a,b)=>Number(b.isFavorite)-Number(a.isFavorite)||a.name.localeCompare(b.name)).map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("")}</select>`)}${field("Create new place",'<input name="newPlaceName" placeholder="Coffee shop, gym, event…">')}
        <label class="check-tile favorite-place-toggle"><input type="checkbox" name="favoritePlace"><span><strong>Favorite place</strong><br><small class="muted">Save this new place as a favorite</small></span></label>
      </div></section>
      <section class="form-section"><h2>Tracking</h2><div class="card glass"><span class="eyebrow">Standalone activity</span><div class="checks tracking-checks">${stageCheck("MSA","Made Aware")}${stageCheck("DTM","Drop The Message")}</div><span class="eyebrow">Pipeline · optional</span><div class="checks pipeline-checks" id="newPipelineChecks">${roleStageChecks("Prospect")}</div></div></section>
      <section class="form-section"><h2>What I Learned</h2><div class="card glass grid form-grid">${field("What I Know",'<textarea name="personalInfo" placeholder="Occupation, goals, family, interests, needs, or helpful background"></textarea>',"full")}${field("Conversation notes",'<textarea name="notes" placeholder="What happened in this conversation?"></textarea>',"full")}${field("Check back later",'<input name="checkBackDate" type="datetime-local">')}${field("Follow-up",'<input name="followUpDate" type="datetime-local">')}</div></section>
      <div class="form-actions"><button class="button primary" type="submit">${icons.check}Save conversation</button></div>
    </form>`;
}
function field(label, control, cls="") { return `<label class="field ${cls}"><span>${label}</span>${control}</label>`; }
function stageCheck(stage,title,{type="checkbox",checked=false}={}) { const name=type==="radio"?"pipelineStage":stageInputName(stage); return `<label class="check-tile"><input type="${type}" name="${name}" value="${escapeHTML(stage)}" ${checked?"checked":""}><span><strong>${escapeHTML(stageLabel(stage))}</strong><br><small class="muted">${escapeHTML(title)}</small></span></label>`; }
function roleStageChecks(role,contact=null) { const type=role==="Customer"?"radio":"checkbox"; return PIPELINES[role].map(stage=>stageCheck(stage,stageTitle(stage),{type,checked:Boolean(contact?.stages?.[stage])})).join(""); }

function renderFollowUps() {
  const items=activeFollowUps(), overdue=items.filter(x=>new Date(x.dueDate)<new Date()), upcoming=items.filter(x=>new Date(x.dueDate)>=new Date());
  return `${pageHead("Follow-Ups", "Stay close to the relationships that need attention.")}${followSection("Overdue",overdue,true)}${followSection("Upcoming",upcoming,false)}`;
}
function followSection(title,items,danger){return `<div class="card glass section-card"><div class="goal-row"><h2>${title}</h2><span class="pill ${danger&&items.length?"danger":""}">${items.length}</span></div>${items.length?`<div class="list-stack">${items.map(miniFollowUp).join("")}</div>`:emptyInline(`No ${title.toLowerCase()} follow-ups`,danger?"You're all caught up.":"Schedule one from a contact.")}</div>`;}

function analyticsDateControls() {
  if (ui.analyticsRange === "month") return `<label class="analytics-date-field"><span>Month</span><input class="date-control" id="analyticsMonth" type="month" value="${ui.analyticsAnchor.slice(0,7)}"></label>`;
  if (ui.analyticsRange === "custom") return `<div class="analytics-custom-dates"><label class="analytics-date-field"><span>From</span><input class="date-control" id="analyticsCustomStart" type="date" value="${ui.analyticsCustomStart}"></label><label class="analytics-date-field"><span>To</span><input class="date-control" id="analyticsCustomEnd" type="date" value="${ui.analyticsCustomEnd}"></label></div>`;
  return `<label class="analytics-date-field"><span>${ui.analyticsRange === "day" ? "Day" : "Week containing"}</span><input class="date-control" id="analyticsAnchor" type="date" value="${ui.analyticsAnchor}"></label>`;
}

function renderAnalytics() {
  const range=rangeForAnalytics(), logs=countedConversations(range), contacts=state.contacts.filter(c=>inRange(c.dateFirstMet,range));
  const capturedContacts=uniquePhoneCaptures(state.contacts,range);
  const communications=state.contacts.flatMap(contact=>contact.conversations.map(log=>({...log,contact}))).filter(log=>log.communicationType&&inRange(log.conversationDate||log.createdAt,range));
  const communicationMetrics={callsAttempted:communications.filter(log=>log.communicationType==="Call").length,callsConnected:communications.filter(log=>log.communicationType==="Call"&&log.outcome==="Connected").length,textsSent:communications.filter(log=>log.communicationType==="Text"&&log.direction==="Outgoing"&&log.outcome==="Text sent").length,textResponses:communications.filter(log=>log.communicationType==="Text"&&(log.direction==="Incoming"||log.outcome==="Response received")).length,followUps:communications.filter(log=>log.followUpCreated).length};
  const stageCounts=Object.fromEntries(ALL_STAGES.map(stage=>[stage,state.contacts.flatMap(contact=>contact.stageEvents||[]).filter(event=>event.stage===stage&&inRange(event.occurredAt,range)).length]));
  const interest=Object.fromEntries(INTERESTS.map(level=>[level,contacts.filter(c=>c.interestLevel===level).length]));
  const maxInterest=Math.max(1,...Object.values(interest));
  return `${pageHead("Analytics", "See the activity that creates momentum.")}
    <div class="card glass section-card analytics-period-card"><div class="period-controls"><div class="segmented analytics-segmented" aria-label="Analytics period">${["day","week","month","custom"].map(mode=>`<button type="button" data-range="${mode}" class="${ui.analyticsRange===mode?"active":""}" aria-pressed="${ui.analyticsRange===mode}">${mode[0].toUpperCase()+mode.slice(1)}</button>`).join("")}</div><div class="analytics-period-detail">${analyticsDateControls()}<strong class="period-label">${range.label}</strong></div></div></div>
    <div class="grid stats-grid">${statCard("chart",logs.length,"Conversations")}${statCard("contactCard",capturedContacts.length,"Contacts")}${statCard("people",contacts.filter(c=>c.role==="Prospect").length,"Prospects")}${statCard("target",contacts.filter(c=>c.role==="Customer").length,"Prospective Customers")}</div>
    <div class="grid analytics-grid section-gap"><div class="card glass"><h2>Pipeline Activity</h2><div class="metric-bars">${["MSA","DTM","PQI","QI/P","FUP","LA","CNA"].map(stage=>metricBar(stage,stageCounts[stage],Math.max(1,...Object.values(stageCounts)))).join("")}</div></div><div class="card glass"><h2>Communication Activity</h2><div class="metric-bars">${Object.entries({"Calls attempted":communicationMetrics.callsAttempted,"Calls connected":communicationMetrics.callsConnected,"Texts sent":communicationMetrics.textsSent,"Text responses":communicationMetrics.textResponses,"Follow-ups created":communicationMetrics.followUps}).map(([label,value])=>metricBar(label,value,Math.max(1,...Object.values(communicationMetrics)))).join("")}</div></div><div class="card glass"><h2>Interest Breakdown</h2><div class="metric-bars">${INTERESTS.map(level=>metricBar(level,interest[level],maxInterest)).join("")}</div></div><div class="card glass"><h2>Conversation Mix</h2><div class="metric-bars">${CONVERSATION_TYPES.map(type=>metricBar(type,logs.filter(log=>log.type===type).length,Math.max(1,logs.length))).join("")}</div></div><div class="card glass"><h2>Follow-Up Completion</h2>${followUpAnalytics(range)}</div></div>`;
}
function metricBar(label,value,max){return `<div><div class="metric-label"><span>${label}</span><strong>${value}</strong></div><div class="bar"><span style="width:${value/Math.max(1,max)*100}%"></span></div></div>`;}
function followUpAnalytics(range){const all=state.contacts.flatMap(c=>c.followUps).filter(f=>inRange(f.createdAt||f.dueDate,range));const done=all.filter(f=>f.completedAt).length;const pct=all.length?Math.round(done/all.length*100):0;return `<div class="completion-summary"><div><div class="stat-value">${pct}%</div><div class="muted">${done} of ${all.length} completed</div></div></div>`;}

function achievementsModal() {
  const result = evaluateAchievements(state, state.meta.achievements || {});
  const groups = [...new Set(result.progress.map(item => item.category))];
  return `<div class="modal-backdrop" id="achievementsBackdrop"><section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="achievementsTitle"><header class="modal-head"><div><span class="eyebrow">Progress</span><h2 id="achievementsTitle">Achievements</h2></div><button class="icon-button close-achievements" aria-label="Close">${icons.close}</button></header><div class="modal-body achievement-groups">${groups.map(group => `<section><h3>${escapeHTML(group)}</h3><div class="achievement-grid">${result.progress.filter(item => item.category === group).map(achievementCard).join("")}</div></section>`).join("")}</div></section></div>`;
}
function achievementCard(item) {
  const unlockedAt = state.meta.achievements?.[item.id];
  const percent = Math.min(100, item.current / Math.max(1, item.target) * 100);
  return `<article class="achievement-card ${unlockedAt ? "unlocked" : "locked"}"><div class="achievement-badge">${icons[item.icon] || icons.award}</div><div><span class="achievement-category">${unlockedAt ? `Unlocked ${fmtDate(unlockedAt, { month: "short", day: "numeric", year: "numeric" })}` : item.category}</span><h4>${escapeHTML(item.name)}</h4><p>${escapeHTML(item.description)}</p><div class="achievement-progress"><span style="width:${percent}%"></span></div><small>${Math.min(item.current, item.target)} of ${item.target}</small></div></article>`;
}
function bindAchievementEvents() {
  $(".close-achievements")?.addEventListener("click", () => { ui.achievementsOpen = false; render(); });
  $("#achievementsBackdrop")?.addEventListener("click", event => { if (event.target.id === "achievementsBackdrop") { ui.achievementsOpen = false; render(); } });
}

function settingsModal() {
  const s=state.settings;
  const selectedAccent=ACCENTS[ui.settingsAccentDraft] ? ui.settingsAccentDraft : s.accent;
  return `<div class="modal-backdrop" id="settingsBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle"><header class="modal-head"><h2 id="settingsTitle">Settings</h2><button class="icon-button close-modal" aria-label="Close">${icons.close}</button></header><div class="modal-body"><form id="settingsForm">
    ${settingsSection("Profile & Goals",`${settingsRow("Your name",`<input name="name" value="${escapeHTML(s.name)}" placeholder="Name">`)}${settingsRow("Business name",`<input name="businessName" value="${escapeHTML(s.businessName)}" placeholder="Business">`)}${settingsRow("Daily goal",`<input name="dailyGoal" type="number" min="1" max="100" value="${s.dailyGoal}">`)}${settingsRow("Weekly goal",`<input name="weeklyGoal" type="number" min="1" max="500" value="${s.weeklyGoal}">`)}${settingsRow("Monthly goal",`<input name="monthlyGoal" type="number" min="1" max="2000" value="${s.monthlyGoal}">`)}`)}
    ${settingsSection("Workflow",`${settingsRow("Default follow-up",`<select name="defaultFollowUpDays"><option value="1" ${s.defaultFollowUpDays==1?"selected":""}>1 day</option><option value="2" ${s.defaultFollowUpDays==2?"selected":""}>2 days</option><option value="7" ${s.defaultFollowUpDays==7?"selected":""}>1 week</option></select>`)}${settingsRow("Week starts",`<select name="weekStart"><option value="0" ${s.weekStart==0?"selected":""}>Sunday</option><option value="1" ${s.weekStart==1?"selected":""}>Monday</option></select>`)}<div class="settings-row settings-row-explained"><span><strong>Automatically archive inactive contacts after 30 days</strong><small>Contacts with no pipeline stage, no MSA activity, no scheduled follow-up, and no pipeline progress leave the active list after 30 days. Historical activity remains in Analytics.</small></span><input type="checkbox" name="autoArchiveInactive" ${s.autoArchiveInactive?"checked":""}></div><p class="settings-note">${state.contacts.filter(contact=>contact.archivedAt).length} archived contact${state.contacts.filter(contact=>contact.archivedAt).length===1?"":"s"}. View and restore them from the Contacts visibility filter.</p>`)}
    ${settingsSection("Notifications",`<div class="notification-status"><span class="status-dot ${notificationPermission()}"></span><div><strong>${notificationPermission()==="granted"?"Notifications allowed":notificationPermission()==="denied"?"Notifications blocked":notificationPermission()==="unsupported"?"Notifications unavailable":"Permission not requested"}</strong><small>${notificationPermission()==="denied"?"Re-enable Bridge notifications in your browser or iPhone settings.":"Bridge asks only when you tap the permission button."}</small></div>${notificationPermission()==="default"?'<button type="button" class="button subtle" id="requestNotifications">Allow notifications</button>':""}</div>${settingsRow("Enable notifications",`<input type="checkbox" name="notificationsEnabled" ${s.notificationsEnabled?"checked":""} ${notificationPermission()!=="granted"?"disabled":""}>`)}${settingsRow("Follow-up reminders",`<input type="checkbox" name="followUpNotifications" ${s.followUpNotifications?"checked":""}>`)}${settingsRow("Daily conversation reminder",`<input type="checkbox" name="dailyReminderEnabled" ${s.dailyReminderEnabled?"checked":""}>`)}${settingsRow("Daily reminder time",`<input class="compact-time-control" type="time" name="dailyReminderTime" value="${escapeHTML(s.dailyReminderTime||"09:00")}">`,"settings-row-time")}<p class="settings-note">On iPhone, install Bridge from Safari and allow notifications. With the current offline-first setup, reminder checks run while Bridge is open or resumed.</p>`)}
    ${settingsSection("Appearance",`${settingsRow("Theme",`<select name="theme"><option value="system" ${s.theme==="system"?"selected":""}>System</option><option value="light" ${s.theme==="light"?"selected":""}>Light</option><option value="dark" ${s.theme==="dark"?"selected":""}>Dark</option></select>`)}${settingsRow("Accent color",`<div class="accent-options"><input type="hidden" name="accent" value="${escapeHTML(selectedAccent)}">${Object.entries(ACCENTS).map(([name,[color]])=>`<button type="button" class="accent-dot ${selectedAccent===name?"active":""}" data-accent="${name}" title="${name}" aria-label="${name}" aria-pressed="${selectedAccent===name}" style="background:${color};color:${color}"></button>`).join("")}</div>`)}${settingsRow("Compact cards",`<input type="checkbox" name="compact" ${s.compact?"checked":""}>`)}`)}
    ${settingsSection("Data & Backup",`${settingsRow("Download all Bridge data",`<button type="button" class="button subtle" id="exportBackup">${icons.download}JSON</button>`)}${settingsRow("Export contacts",`<button type="button" class="button subtle" id="exportCSV">${icons.download}CSV</button>`)}${settingsRow("Restore from backup",`<label class="button subtle">Choose file<input id="importBackup" type="file" accept="application/json" hidden></label>`)}`)}
    ${settingsSection("Support",`${settingsRow("Send feedback",`<a class="button subtle" href="mailto:fountainofyouthxs@gmail.com?subject=Bridge%20Feedback">Email</a>`)}${settingsRow("Report a bug",`<a class="button subtle" href="mailto:fountainofyouthxs@gmail.com?subject=Bridge%20Bug%20Report">Email</a>`)}`)}
    <div class="form-actions"><button class="button primary" type="submit">Save settings</button></div></form></div></section></div>`;
}
function settingsSection(title,content){return `<section class="settings-section card glass"><h2>${title}</h2>${content}</section>`;}
function settingsRow(label,control,className=""){return `<div class="settings-row ${className}"><span>${label}</span>${control}</div>`;}
function detailItem(label,value,cls=""){return `<div class="contact-info-item ${cls}"><span>${label}</span><strong class="${value?"":"muted"}">${value?escapeHTML(value):"Not provided"}</strong></div>`;}

function contactInformation(c) {
  if (ui.contactEditing) return `<section class="card glass contact-information"><div class="card-section-head"><div><span class="eyebrow">Details</span><h2>Contact Information</h2></div></div><form id="contactInfoForm"><div class="grid form-grid">${field("Full name",`<input name="fullName" value="${escapeHTML(c.fullName)}" required autocomplete="name">`)}${field("Phone",`<input name="phoneNumber" value="${escapeHTML(c.phoneNumber)}" autocomplete="tel" inputmode="tel">`)}${field("Role",`<select name="role"><option ${c.role==="Prospect"?"selected":""}>Prospect</option><option ${c.role==="Customer"?"selected":""}>Customer</option></select>`)}${field("Interest",`<select name="interestLevel">${INTERESTS.map(x=>`<option ${c.interestLevel===x?"selected":""}>${x}</option>`).join("")}</select>`)}${field("Judgement",`<select name="judgement"><option ${c.judgement==="Good Fit"?"selected":""}>Good Fit</option><option ${c.judgement==="Not Good Fit"?"selected":""}>Not Good Fit</option></select>`)}${field("Conversation type",`<select name="conversationType">${CONVERSATION_TYPES.map(x=>`<option ${c.conversationType===x?"selected":""}>${x}</option>`).join("")}</select>`)}${field("What I know",`<textarea name="personalInfo">${escapeHTML(c.personalInfo)}</textarea>`,"full")}</div><div class="form-actions contact-edit-actions"><button class="button" id="cancelContactInfoEdit" type="button">Cancel</button><button class="button primary" type="submit">${icons.check}Save details</button></div></form></section>`;
  return `<section class="card glass contact-information"><div class="card-section-head"><div><span class="eyebrow">Details</span><h2>Contact Information</h2></div><button class="button subtle edit-contact-button" id="editContactInfo" type="button">${icons.pencil}<span>Edit</span></button></div><div class="contact-info-grid">${detailItem("Full name",c.fullName)}${detailItem("Phone",c.phoneNumber)}${detailItem("Role",c.role)}${detailItem("Interest",`${c.interestLevel} interest`)}${detailItem("Judgement",c.judgement)}${detailItem("Conversation type",c.conversationType)}${String(c.personalInfo||"").trim()?detailItem("What I know",c.personalInfo,"wide"):""}</div></section>`;
}

function contactTracking(c) {
  return `<section class="card glass contact-tracking"><form id="editTrackingForm"><span class="eyebrow">Standalone activity</span><div class="checks tracking-checks">${editStageCheck(c,"MSA","Made Aware")}${editStageCheck(c,"DTM","Drop The Message")}</div><span class="eyebrow">${c.role === "Customer" ? "Customer sales pipeline" : "Pipeline"} · optional</span><div class="checks tracking-checks ${c.role === "Customer" ? "customer-stage-checks" : ""}" id="editPipelineChecks">${roleStageChecks(c.role,c)}</div>${currentPipelineStage(c)?'<button class="button subtle clear-pipeline" id="clearPipelineStage" type="button">Clear pipeline stage</button>':""}<label class="check-tile filtered-out-toggle"><input type="checkbox" name="isFilteredOut" ${c.isFilteredOut?"checked":""}><span><strong>Filtered out / no-go</strong><br><small class="muted">Only enable this when you intentionally remove this person from the opportunity process.</small></span></label><div class="form-actions"><button class="button primary" type="submit">Save tracking</button></div></form></section>`;
}

function contactModal(id) {
  const c=state.contacts.find(x=>x.id===id); if(!c){ui.detailId=null;return "";}
  const active=c.followUps.filter(f=>!f.completedAt).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];
  const communicationActions=isCallablePhone(c.phoneNumber)?`<a class="button primary contact-detail-call" href="${phoneHref(c.phoneNumber)}" data-communication-contact-id="${c.id}" data-communication-type="Call">${icons.phone}<span>Call</span></a><a class="button subtle contact-detail-text" href="${messageHref(c.phoneNumber)}" data-communication-contact-id="${c.id}" data-communication-type="Text">${icons.chat}<span>Text</span></a>`:"";
  return `<div class="modal-backdrop" id="contactBackdrop"><section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="contactTitle"><header class="modal-head"><div><span class="eyebrow">${escapeHTML(c.role)}</span><h2 id="contactTitle">${escapeHTML(c.fullName)}</h2></div><div class="modal-head-actions">${communicationActions}<button class="icon-button close-modal" aria-label="Close">${icons.close}</button></div></header><div class="modal-body"><div class="grid detail-grid">
    <div>${contactInformation(c)}${contactTracking(c)}
    <section class="card glass stack-card"><div class="card-section-head"><div><h2>Conversation History</h2></div><div class="history-actions"><button class="button subtle" data-log-communication-contact-id="${c.id}" data-communication-type="Call" type="button">${icons.phoneCall}<span>Log call</span></button><button class="button subtle" data-log-communication-contact-id="${c.id}" data-communication-type="Text" type="button">${icons.chat}<span>Log text</span></button></div></div><form id="addLogForm" class="stack-card"><div class="grid form-grid">${field("Note or activity",'<textarea name="notes" required placeholder="Log what you learned or discussed"></textarea>',"full")}${field("Type",`<select name="type">${CONVERSATION_TYPES.map(x=>`<option>${x}</option>`).join("")}</select>`)}${field("Date",`<input name="conversationDate" type="date" max="${todayInput()}" value="${todayInput()}">`)}</div><p class="muted">Contact notes and communication logs do not increase the Conversations metric. Only Add New creates a counted conversation.</p><button class="button" type="submit">${icons.plus}Add note</button></form><div class="timeline timeline-list compact-activity-list">${renderLogs(c,{limit:3})}</div>${c.conversations.length?`<button class="button subtle view-all-activity" id="viewAllActivity" type="button">View all activity (${c.conversations.length})</button>`:""}</section></div>
    <aside><section class="card glass"><h2>Follow-Up</h2>${active?`<div class="followup-summary"><span class="pill ${new Date(active.dueDate)<new Date()?"danger":"accent"}">${fmtDateTime(active.dueDate)}</span><p>${escapeHTML(active.note||"Follow up")}</p></div><div class="followup-actions"><button class="button primary" id="completeFollowUp">${icons.check}Complete</button><button class="button danger" id="removeFollowUp">${icons.trash}Remove</button></div>`:`<p class="muted">No follow-up set.</p>`}<form id="setFollowUpForm" class="followup-form">${field(active?"Replace with":"Set follow-up",'<input name="dueDate" type="datetime-local" required>')}<button class="button" type="submit">Set reminder</button></form></section>
    <section class="card glass stack-card"><h2>Place Met</h2><p class="contact-place">${c.placeName?`${escapeHTML(c.placeName)}${state.places.find(place=>place.id===c.placeId)?.isFavorite?`<span class="favorite-star" role="img" aria-label="Favorite place" title="Favorite place">${icons.star}</span>`:""}`:'<span class="muted">No place saved</span>'}</p></section>
    ${c.archivedAt?`<section class="card glass stack-card"><h2>Archived Contact</h2><p class="muted">Archived ${fmtDate(c.archivedAt,{month:"short",day:"numeric",year:"numeric"})}. History remains in Analytics.</p><button class="button" id="restoreContact">Restore to active contacts</button></section>`:""}<div class="danger-zone"><button class="button danger" id="deleteContact">${icons.trash}Delete contact</button></div></aside></div></div></section></div>`;
}
function editStageCheck(c,stage,title){return stageCheck(stage,title,{checked:Boolean(c.stages?.[stage])});}
function sortedLogs(c){return [...c.conversations].sort((a,b)=>new Date(b.conversationDate||b.createdAt)-new Date(a.conversationDate||a.createdAt));}
function logFilterMatches(log,filter){if(filter==="Calls")return log.communicationType==="Call";if(filter==="Texts")return log.communicationType==="Text";if(filter==="Notes")return !log.communicationType;return true;}
function activityDateGroup(log){const date=new Date(log.conversationDate||log.createdAt);const today=new Date();const start=new Date(today.getFullYear(),today.getMonth(),today.getDate());const day=new Date(date.getFullYear(),date.getMonth(),date.getDate());const difference=Math.round((start-day)/86400000);return difference===0?"Today":difference===1?"Yesterday":"Earlier";}
function renderLogEntry(log){const communication=log.communicationType;const label=communication?(communication==="Text"?"Text Message":"Phone Call"):(log.type||"Activity");const title=communication?`${label}${log.direction?` · ${log.direction}`:""}`:label;const meta=[fmtDateTime(log.conversationDate||log.createdAt),communication&&log.outcome,log.durationMinutes?`${Number(log.durationMinutes)} min`:null,log.isCountedConversation?"Counted conversation":!communication?"Note":null].filter(Boolean).join(" · ");const notes=String(log.notes||"");const canExpand=notes.length>110||notes.includes("\n");const expanded=ui.expandedLogIds.has(log.id);return `<article class="log-row ${communication?"communication-log":""}"><div class="log-row-head"><div class="log-title">${communication?`<span class="log-icon">${communication==="Text"?icons.chat:icons.phoneCall}</span>`:""}<div><strong>${escapeHTML(title)}</strong><div class="muted">${meta}</div></div></div><div class="log-actions">${communication?`<button class="icon-button edit-communication-log" data-log-id="${log.id}" aria-label="Edit ${escapeHTML(label)}">${icons.pencil}</button>`:""}<button class="icon-button delete-log" data-log-id="${log.id}" aria-label="Delete log">${icons.trash}</button></div></div>${notes?`<div class="log-note-wrap"><p class="log-note ${expanded?"expanded":""}">${escapeHTML(notes)}</p>${canExpand?`<button class="log-note-toggle" data-expand-log-id="${log.id}" type="button" aria-expanded="${expanded}">${expanded?"Less":"More"}</button>`:""}</div>`:""}</article>`;}
function renderLogs(c,{limit=null,filter="All",grouped=false}={}){let logs=sortedLogs(c).filter(log=>logFilterMatches(log,filter));if(limit)logs=logs.slice(0,limit);if(!logs.length)return emptyInline(filter==="All"?"No conversation history":`No ${filter.toLowerCase()} found`,filter==="All"?"Add a note, call, or text to start the timeline.":"Try another activity filter.");if(!grouped)return logs.map(renderLogEntry).join("");const groups=["Today","Yesterday","Earlier"];return groups.map(group=>{const entries=logs.filter(log=>activityDateGroup(log)===group);return entries.length?`<section class="activity-date-group"><h3>${group}</h3><div class="timeline">${entries.map(renderLogEntry).join("")}</div></section>`:"";}).join("");}

function activityHistoryModal(id){const c=state.contacts.find(contact=>contact.id===id);if(!c){ui.activityHistoryContactId=null;return "";}const filters=["All","Calls","Texts","Notes"];return `<div class="modal-backdrop activity-history-backdrop" id="activityHistoryBackdrop"><section class="modal activity-history-modal" role="dialog" aria-modal="true" aria-labelledby="activityHistoryTitle"><header class="modal-head"><div><span class="eyebrow">${escapeHTML(c.fullName)}</span><h2 id="activityHistoryTitle">All Activity</h2></div><button class="icon-button close-activity-history" aria-label="Close activity history">${icons.close}</button></header><div class="modal-body"><div class="activity-filters" role="group" aria-label="Filter activity">${filters.map(filter=>`<button class="activity-filter ${ui.activityFilter===filter?"active":""}" data-activity-filter="${filter}" type="button" aria-pressed="${ui.activityFilter===filter}">${filter}</button>`).join("")}</div><div class="activity-history-list">${renderLogs(c,{filter:ui.activityFilter,grouped:true})}</div><button class="button subtle show-less-activity" type="button">Show less</button></div></section></div>`;}

function communicationLogModal(id) {
  const c=state.contacts.find(contact=>contact.id===id); if(!c){ui.communicationContactId=null;return "";}
  const current=currentPipelineStage(c);
  const existing=c.conversations.find(log=>log.id===ui.communicationLogId);
  const type=existing?.communicationType||ui.communicationType||"Call";
  const outcomes=type==="Text"?TEXT_OUTCOMES:CALL_OUTCOMES;
  const selectedOutcome=existing?.outcome||outcomes[0];
  const heading=existing?`Edit ${type.toLowerCase()} log`:`Log ${type.toLowerCase()}`;
  return `<div class="modal-backdrop call-log-backdrop" id="communicationLogBackdrop"><section class="modal call-log-modal" role="dialog" aria-modal="true" aria-labelledby="communicationLogTitle"><header class="modal-head"><div><span class="eyebrow">${heading}</span><h2 id="communicationLogTitle">${escapeHTML(c.fullName)}</h2></div><button class="icon-button close-communication-log" aria-label="Close">${icons.close}</button></header><div class="modal-body"><form id="communicationLogForm" class="call-log-form"><input type="hidden" name="communicationType" value="${type}"><div class="grid form-grid">${field("Date and time",`<input name="conversationDate" type="datetime-local" value="${dateTimeLocalValue(existing?.conversationDate||ui.communicationStartedAt||new Date())}" required>`)}${field("Direction",`<select name="direction">${COMMUNICATION_DIRECTIONS.map(direction=>`<option ${existing?.direction===direction?"selected":""}>${direction}</option>`).join("")}</select>`)}${type==="Call"?field("Duration (minutes)",`<input name="durationMinutes" type="number" min="0" step="1" inputmode="numeric" placeholder="Optional" value="${existing?.durationMinutes||""}">`):""}${field("Outcome",`<select name="outcome">${outcomes.map(outcome=>`<option ${selectedOutcome===outcome?"selected":""}>${outcome}</option>`).join("")}</select>`)}${field(type==="Text"?"What did you discuss?":"What did you talk about?",`<textarea name="notes" placeholder="Add ${type.toLowerCase()} notes">${escapeHTML(existing?.notes||"")}</textarea>`,"full")}${field("Follow-up date and time",'<input name="followUpDate" type="datetime-local">')}${field("Standalone activity",'<select name="standaloneActivity"><option value="">No change</option><option>MSA</option><option>DTM</option></select>')}${field("Current pipeline stage",`<div class="read-only-control">${escapeHTML(current?stageLabel(current):"No stage")}</div>`)}${field("Move to stage",`<select name="pipelineStage"><option value="">No change</option><option value="__clear">Clear pipeline stage</option>${PIPELINES[c.role].map(stage=>`<option value="${escapeHTML(stage)}">${escapeHTML(stageLabel(stage))}</option>`).join("")}</select>`)}</div><p class="muted">Opening Messages does not confirm that a text was sent. Record the actual outcome here after you return. Communication logs never increase the Conversations metric.</p><div class="form-actions"><button class="button close-communication-log" type="button">Cancel</button><button class="button primary" type="submit">${icons.check}${existing?"Save changes":`Save ${type.toLowerCase()}`}</button></div></form></div></section></div>`;
}

function discardContactEdit() {
  if (ui.contactEditing && ui.contactEditDirty && !confirm("Discard your unsaved contact changes?")) return false;
  ui.contactEditing=false;
  ui.contactEditDirty=false;
  return true;
}
function closeContactDetail() { if (!discardContactEdit()) return false; ui.detailId=null;ui.activityHistoryContactId=null;ui.activityFilter="All";ui.expandedLogIds.clear();return true; }

function bindCommonEvents(){
  $$('[data-page]').forEach(button=>button.addEventListener('click',()=>{if(ui.detailId&&!closeContactDetail())return;ui.page=button.dataset.page;window.scrollTo({top:0,left:0,behavior:'auto'});render();requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));}));
  $$('[data-contact-id]').forEach(button=>button.addEventListener('click',()=>{ui.detailId=button.dataset.contactId;ui.contactEditing=false;ui.contactEditDirty=false;render();}));
  $$('[data-communication-contact-id]').forEach(link=>link.addEventListener('click',event=>{const contact=state.contacts.find(item=>item.id===link.dataset.communicationContactId);const type=link.dataset.communicationType||"Call";if(!contact||!canonicalPhone(contact.phoneNumber)){event.preventDefault();showToast('Add a valid phone number before using this action');return;}if(!startCommunication(contact.id,type))event.preventDefault();}));
  $$('[data-log-communication-contact-id]').forEach(button=>button.addEventListener('click',()=>openCommunicationLog(button.dataset.logCommunicationContactId,button.dataset.communicationType||"Call")));
  $('.close-modal')?.addEventListener('click',()=>{if(ui.detailId&&!closeContactDetail())return;ui.settingsOpen=false;ui.settingsAccentDraft=null;render();});
  $('#viewAchievements')?.addEventListener('click',()=>{ui.achievementsOpen=true;render();});
  $('#settingsBackdrop')?.addEventListener('click',event=>{if(event.target.id==='settingsBackdrop'){ui.settingsOpen=false;ui.settingsAccentDraft=null;render();}});
  $('#contactBackdrop')?.addEventListener('click',event=>{if(event.target.id==='contactBackdrop'&&closeContactDetail())render();});
  document.onkeydown=event=>{if(event.key!=='Escape'||!(ui.settingsOpen||ui.achievementsOpen||ui.detailId||ui.activityHistoryContactId||ui.communicationContactId))return;if(ui.communicationContactId){ui.communicationContactId=null;ui.communicationStartedAt=null;ui.communicationLogId=null;clearPendingCommunication();render();return;}if(ui.activityHistoryContactId){ui.activityHistoryContactId=null;ui.activityFilter="All";ui.expandedLogIds.clear();render();return;}if(ui.detailId&&!closeContactDetail())return;ui.settingsOpen=false;ui.settingsAccentDraft=null;ui.achievementsOpen=false;render();};
}

function bindPageEvents(){
  $('#settingsButton')?.addEventListener('click',()=>{ui.settingsAccentDraft=state.settings.accent;ui.settingsOpen=true;render();});
  $$('[data-contact-mode]').forEach(button=>button.addEventListener('click',()=>{ui.contactMode=button.dataset.contactMode;render();}));
  $('#contactSearch')?.addEventListener('input',event=>{ui.search=event.target.value;const cursor=event.target.selectionStart;render();const input=$('#contactSearch');input?.focus();input?.setSelectionRange(cursor,cursor);});
  $('#roleFilter')?.addEventListener('change',event=>{ui.roleFilter=event.target.value;render();});
  $('#archiveFilter')?.addEventListener('change',event=>{ui.archiveFilter=event.target.value;render();});
  $('#conversationFrom')?.addEventListener('change',event=>{ui.conversationFrom=event.target.value;if(ui.conversationTo&&ui.conversationFrom>ui.conversationTo)ui.conversationTo=ui.conversationFrom;render();});
  $('#conversationTo')?.addEventListener('change',event=>{ui.conversationTo=event.target.value;if(ui.conversationFrom&&ui.conversationTo<ui.conversationFrom)ui.conversationFrom=ui.conversationTo;render();});
  $('#clearConversationDates')?.addEventListener('click',()=>{ui.conversationFrom='';ui.conversationTo='';render();});
  $('#sortContacts')?.addEventListener('change',event=>{ui.sort=event.target.value;render();});
  $('#newRole')?.addEventListener('change',event=>{const container=$('#newPipelineChecks');container.innerHTML=roleStageChecks(event.target.value);});
  $('#addContactForm')?.addEventListener('submit',handleAddContact);
  $$('[data-range]').forEach(button=>button.addEventListener('click',()=>{ui.analyticsRange=button.dataset.range;if(ui.analyticsRange==='custom'&&!ui.analyticsCustomStart){ui.analyticsCustomStart=ui.analyticsAnchor;ui.analyticsCustomEnd=ui.analyticsAnchor;}render();}));
  $('#analyticsAnchor')?.addEventListener('change',event=>{ui.analyticsAnchor=event.target.value;render();});
  $('#analyticsMonth')?.addEventListener('change',event=>{if(event.target.value)ui.analyticsAnchor=`${event.target.value}-01`;render();});
  $('#analyticsCustomStart')?.addEventListener('change',event=>{ui.analyticsCustomStart=event.target.value||ui.analyticsAnchor;if(ui.analyticsCustomEnd<ui.analyticsCustomStart)ui.analyticsCustomEnd=ui.analyticsCustomStart;render();});
  $('#analyticsCustomEnd')?.addEventListener('change',event=>{ui.analyticsCustomEnd=event.target.value||ui.analyticsCustomStart;if(ui.analyticsCustomEnd<ui.analyticsCustomStart)ui.analyticsCustomStart=ui.analyticsCustomEnd;render();});
}

function handleAddContact(event){
  event.preventDefault(); const form=new FormData(event.currentTarget); const fullName=String(form.get('fullName')||'').trim(); if(!fullName)return;
  let placeId=String(form.get('placeId')||'')||null, placeName=''; const newPlaceName=String(form.get('newPlaceName')||'').trim();
  if(newPlaceName){let place=state.places.find(p=>p.name.toLowerCase()===newPlaceName.toLowerCase());if(!place){place={id:uid(),name:newPlaceName,isFavorite:form.has('favoritePlace'),createdAt:nowISO()};state.places.push(place);}else if(form.has('favoritePlace'))place.isFavorite=true;placeId=place.id;placeName=place.name;} else if(placeId){placeName=state.places.find(p=>p.id===placeId)?.name||'';}
  const role=String(form.get('role')); const conversationDate=`${form.get('conversationDate')}T12:00:00`; const stages=Object.fromEntries(ALL_STAGES.map(stage=>[stage,false])); const stageDates={};
  for(const stage of ['MSA','DTM']){if(form.has(stageInputName(stage))){stages[stage]=true;stageDates[stage]=conversationDate;}}
  if(role==='Customer'){const selected=String(form.get('pipelineStage')||'');if(PIPELINES.Customer.includes(selected)){stages[selected]=true;stageDates[selected]=conversationDate;}}
  else for(const stage of PIPELINES.Prospect){if(form.has(stageInputName(stage))){stages[stage]=true;stageDates[stage]=conversationDate;}}
  const notes=String(form.get('notes')||'').trim(); const personalInfo=String(form.get('personalInfo')||'').trim(); const phoneNumber=String(form.get('phoneNumber')||'').trim();
  const duplicate=isCallablePhone(phoneNumber)&&state.contacts.find(existing=>normalizedPhone(existing.phoneNumber)===normalizedPhone(phoneNumber));
  if(duplicate){if(!confirm(`${duplicate.fullName} already uses this phone number. Add this as a new conversation on their existing record instead?`))return;duplicate.conversations.push({id:uid(),type:String(form.get('conversationType')),interestLevel:duplicate.interestLevel,notes,createdAt:nowISO(),conversationDate,isCountedConversation:true});if(personalInfo&&!duplicate.personalInfo)duplicate.personalInfo=personalInfo;duplicate.updatedAt=nowISO();queueSave('Conversation added to existing contact');ui.page='contacts';ui.detailId=duplicate.id;render();return;}
  const contact={id:uid(),fullName,phoneNumber,capturedPhoneNumber:phoneNumber,phoneCapturedAt:phoneNumber?conversationDate:null,role,judgement:String(form.get('judgement')),interestLevel:String(form.get('interestLevel')),conversationType:String(form.get('conversationType')),placeId,placeName,dateFirstMet:conversationDate,personalInfo,isFilteredOut:false,filteredOutAt:null,checkBackDate:form.get('checkBackDate')?new Date(String(form.get('checkBackDate'))).toISOString():null,archivedAt:null,archiveReason:null,stages,stageDates,stageEvents:Object.entries(stageDates).map(([stage,occurredAt])=>({id:uid(),stage,occurredAt})),followUps:[],notes:[],conversations:[{id:uid(),type:String(form.get('conversationType')),interestLevel:String(form.get('interestLevel')),notes,createdAt:nowISO(),conversationDate,isCountedConversation:true}],createdAt:nowISO(),updatedAt:nowISO()};
  if(form.get('followUpDate'))contact.followUps.push({id:uid(),dueDate:new Date(String(form.get('followUpDate'))).toISOString(),completedAt:null,note:'Follow up',createdAt:nowISO()});
  if(form.get('checkBackDate'))contact.followUps.push({id:uid(),dueDate:new Date(String(form.get('checkBackDate'))).toISOString(),completedAt:null,note:'Check back down the line',createdAt:nowISO()});
  state.contacts.unshift(contact); queueSave('Conversation saved'); ui.page='contacts'; render();
}

function bindSettingsEvents(){
  $$('.accent-dot').forEach(button=>button.addEventListener('click',()=>{const accent=button.dataset.accent;if(!ACCENTS[accent])return;ui.settingsAccentDraft=accent;const input=$('#settingsForm input[name="accent"]');if(input)input.value=accent;$$('.accent-dot').forEach(dot=>{const selected=dot===button;dot.classList.toggle('active',selected);dot.setAttribute('aria-pressed',String(selected));});}));
  $('#requestNotifications')?.addEventListener('click',async()=>{if(!notificationsSupported())return;const permission=await Notification.requestPermission();if(permission==='granted')state.settings.notificationsEnabled=true;queueSave(permission==='granted'?'Notifications enabled':'Notification permission was not enabled');render();startReminderChecks();});
  $('#settingsForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);const accent=String(f.get('accent')||state.settings.accent);state.settings={...state.settings,name:String(f.get('name')||'').trim(),businessName:String(f.get('businessName')||''),dailyGoal:Number(f.get('dailyGoal'))||5,weeklyGoal:Number(f.get('weeklyGoal'))||25,monthlyGoal:Number(f.get('monthlyGoal'))||100,defaultFollowUpDays:Number(f.get('defaultFollowUpDays'))||2,weekStart:Number(f.get('weekStart'))||0,theme:String(f.get('theme')),accent:ACCENTS[accent]?accent:state.settings.accent,compact:f.has('compact'),autoArchiveInactive:f.has('autoArchiveInactive'),notificationsEnabled:f.has('notificationsEnabled')&&notificationPermission()==='granted',followUpNotifications:f.has('followUpNotifications'),dailyReminderEnabled:f.has('dailyReminderEnabled'),dailyReminderTime:String(f.get('dailyReminderTime')||'09:00')};const archived=archiveInactiveContacts(state.contacts,state.settings.autoArchiveInactive);ui.settingsAccentDraft=null;applyAppearance();queueSave(archived?`${archived} inactive contact${archived===1?'':'s'} archived`:'Settings saved');ui.settingsOpen=false;render();startReminderChecks();});
  $('#exportBackup')?.addEventListener('click',()=>downloadFile(`bridge-backup-${todayInput()}.json`,JSON.stringify(state,null,2),'application/json'));
  $('#exportCSV')?.addEventListener('click',()=>{const rows=[['Name','Phone','Role','Interest','Judgement','Conversation Type','Place','Date First Met','Pipeline'],...state.contacts.map(c=>[c.fullName,c.phoneNumber,c.role,c.interestLevel,c.judgement,c.conversationType,c.placeName,c.dateFirstMet,stageFor(c)])];downloadFile(`bridge-contacts-${todayInput()}.csv`,rows.map(r=>r.map(csvCell).join(',')).join('\n'),'text/csv');});
  $('#importBackup')?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const imported=normalizeState(JSON.parse(await file.text()));if(!confirm(`Restore ${imported.contacts.length} contacts and replace current Bridge data?`))return;state=imported;applyAppearance();queueSave('Backup restored');ui.settingsOpen=false;render();}catch{showToast('That backup file could not be read');}});
}
function csvCell(value){return `"${String(value||'').replaceAll('"','""')}"`;}
function downloadFile(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function bindContactModalEvents(){
  const c=state.contacts.find(x=>x.id===ui.detailId);if(!c)return;
  $('#editContactInfo')?.addEventListener('click',()=>{ui.contactEditing=true;ui.contactEditDirty=false;render();requestAnimationFrame(()=>$('#contactInfoForm input[name="fullName"]')?.focus());});
  $('#contactInfoForm')?.addEventListener('input',()=>{ui.contactEditDirty=true;});
  $('#contactInfoForm')?.addEventListener('change',()=>{ui.contactEditDirty=true;});
  $('#cancelContactInfoEdit')?.addEventListener('click',()=>{if(discardContactEdit())render();});
  $('#contactInfoForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);const nextRole=String(f.get('role'));const nextPhone=String(f.get('phoneNumber')||'').trim();const duplicate=isCallablePhone(nextPhone)&&state.contacts.find(other=>other.id!==c.id&&normalizedPhone(other.phoneNumber)===normalizedPhone(nextPhone));if(duplicate){showToast(`That phone number already belongs to ${duplicate.fullName}`);return;}c.fullName=String(f.get('fullName')).trim()||c.fullName;c.phoneNumber=nextPhone;c.role=nextRole;c.interestLevel=String(f.get('interestLevel'));c.judgement=String(f.get('judgement'));c.conversationType=String(f.get('conversationType'));c.personalInfo=String(f.get('personalInfo')||'').trim();for(const stage of PIPELINE_STAGES){if(!PIPELINES[nextRole].includes(stage)){c.stages[stage]=false;delete c.stageDates[stage];}}c.updatedAt=nowISO();ui.contactEditing=false;ui.contactEditDirty=false;queueSave('Contact details saved');render();});
  $('#editTrackingForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);setFilteredOut(c,f.has('isFilteredOut'),nowISO());c.stageEvents=Array.isArray(c.stageEvents)?c.stageEvents:[];for(const stage of ['MSA','DTM']){const checked=f.has(stageInputName(stage));if(checked&&!c.stages[stage]){const occurredAt=nowISO();c.stageDates[stage]=occurredAt;c.stageEvents.push({id:uid(),stage,occurredAt});}if(!checked)delete c.stageDates[stage];c.stages[stage]=checked;}if(c.role==='Customer'){const selected=String(f.get('pipelineStage')||'');setPipelineStage(c,PIPELINES.Customer.includes(selected)?selected:'');}else{for(const stage of PIPELINES.Prospect){const checked=f.has(stageInputName(stage));if(checked&&!c.stages[stage]){const occurredAt=nowISO();c.stageDates[stage]=occurredAt;c.stageEvents.push({id:uid(),stage,occurredAt});}if(!checked)delete c.stageDates[stage];c.stages[stage]=checked;}}c.updatedAt=nowISO();queueSave('Tracking updated');render();});
  $('#clearPipelineStage')?.addEventListener('click',()=>{if(!confirm('Clear the current pipeline stage? Historical stage activity will remain.'))return;setPipelineStage(c,'');c.updatedAt=nowISO();queueSave('Pipeline stage cleared');render();});
  $('#addLogForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);c.conversations.push({id:uid(),type:String(f.get('type')),interestLevel:c.interestLevel,notes:String(f.get('notes')).trim(),createdAt:nowISO(),conversationDate:`${f.get('conversationDate')}T12:00:00`,isCountedConversation:false});c.updatedAt=nowISO();queueSave('Note added');render();});
  $('#viewAllActivity')?.addEventListener('click',()=>{ui.activityHistoryContactId=c.id;ui.activityFilter="All";ui.expandedLogIds.clear();render();});
  $$('.log-note-toggle').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.expandLogId;if(ui.expandedLogIds.has(id))ui.expandedLogIds.delete(id);else ui.expandedLogIds.add(id);render();}));
  $$('.edit-communication-log').forEach(button=>button.addEventListener('click',()=>{const log=c.conversations.find(item=>item.id===button.dataset.logId);if(log){ui.activityHistoryContactId=null;openCommunicationLog(c.id,log.communicationType||"Call",log.conversationDate||log.createdAt,log.id);}}));
  $$('.delete-log').forEach(button=>button.addEventListener('click',()=>{if(!confirm('Delete this conversation log? The contact will remain.'))return;c.conversations=c.conversations.filter(log=>log.id!==button.dataset.logId);c.updatedAt=nowISO();queueSave('Log deleted');render();}));
  $('#setFollowUpForm')?.addEventListener('submit',event=>{event.preventDefault();const due=new FormData(event.currentTarget).get('dueDate');if(!due)return;c.followUps=c.followUps.filter(f=>f.completedAt);c.followUps.push({id:uid(),dueDate:new Date(String(due)).toISOString(),completedAt:null,note:'Follow up',createdAt:nowISO()});c.updatedAt=nowISO();queueSave('Follow-up set');render();});
  $('#completeFollowUp')?.addEventListener('click',()=>{const active=c.followUps.filter(f=>!f.completedAt).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];if(!active)return;active.completedAt=nowISO();c.updatedAt=nowISO();queueSave('Follow-up completed');render();});
  $('#removeFollowUp')?.addEventListener('click',()=>{if(!confirm('Remove this follow-up?'))return;c.followUps=c.followUps.filter(f=>f.completedAt);c.updatedAt=nowISO();queueSave('Follow-up removed');render();});
  $('#restoreContact')?.addEventListener('click',()=>{restoreContact(c,nowISO());ui.archiveFilter='Active';queueSave('Contact restored');render();});
  $('#deleteContact')?.addEventListener('click',()=>{if(!confirm(`Delete ${c.fullName}? This cannot be undone.`))return;state.contacts=state.contacts.filter(x=>x.id!==c.id);ui.detailId=null;queueSave('Contact deleted');render();});
}

function bindActivityHistoryEvents(){
  const close=()=>{ui.activityHistoryContactId=null;ui.activityFilter="All";ui.expandedLogIds.clear();render();};
  $('.close-activity-history')?.addEventListener('click',close);
  $('.show-less-activity')?.addEventListener('click',close);
  $('#activityHistoryBackdrop')?.addEventListener('click',event=>{if(event.target.id==='activityHistoryBackdrop')close();});
  $$('[data-activity-filter]').forEach(button=>button.addEventListener('click',()=>{ui.activityFilter=button.dataset.activityFilter;ui.expandedLogIds.clear();render();}));
}

function bindCommunicationLogEvents(){
  const c=state.contacts.find(contact=>contact.id===ui.communicationContactId);if(!c)return;
  const close=()=>{ui.communicationContactId=null;ui.communicationStartedAt=null;ui.communicationLogId=null;clearPendingCommunication();render();};
  $$('.close-communication-log').forEach(button=>button.addEventListener('click',close));
  $('#communicationLogBackdrop')?.addEventListener('click',event=>{if(event.target.id==='communicationLogBackdrop')close();});
  $('#communicationLogForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);const occurredAt=new Date(String(f.get('conversationDate'))).toISOString();const communicationType=String(f.get('communicationType'))==='Text'?'Text':'Call';const duration=communicationType==='Call'?(Number(f.get('durationMinutes'))||null):null;const followUp=String(f.get('followUpDate')||'');let log=c.conversations.find(item=>item.id===ui.communicationLogId);const isNew=!log;if(!log){log={id:uid(),createdAt:nowISO(),isCountedConversation:false};c.conversations.push(log);}Object.assign(log,{type:communicationType==='Text'?'Text Message':'Call',communicationType,direction:String(f.get('direction')||'Outgoing'),outcome:String(f.get('outcome')),durationMinutes:duration,interestLevel:c.interestLevel,notes:String(f.get('notes')||'').trim(),conversationDate:occurredAt,isCountedConversation:false,followUpCreated:Boolean(log.followUpCreated||followUp)});if(followUp){c.followUps=c.followUps.filter(item=>item.completedAt);c.followUps.push({id:uid(),dueDate:new Date(followUp).toISOString(),completedAt:null,note:`${communicationType} follow-up`,createdAt:nowISO(),sourceCommunicationId:log.id});}const activity=String(f.get('standaloneActivity')||'');if(['MSA','DTM'].includes(activity)&&!c.stages[activity]){c.stages[activity]=true;c.stageDates[activity]=occurredAt;c.stageEvents.push({id:uid(),stage:activity,occurredAt});}const nextStage=String(f.get('pipelineStage')||'');if(nextStage==='__clear')setPipelineStage(c,'');else if(PIPELINES[c.role].includes(nextStage))setPipelineStage(c,nextStage,occurredAt);c.updatedAt=nowISO();ui.communicationContactId=null;ui.communicationStartedAt=null;ui.communicationLogId=null;clearPendingCommunication();queueSave(isNew?`${communicationType} logged`:'Communication log updated');render();});
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}), { once: true });
}

loadState();
