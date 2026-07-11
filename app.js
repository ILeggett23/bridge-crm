const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => globalThis.crypto?.randomUUID?.() || `bridge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nowISO = () => new Date().toISOString();
const todayInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const initials = name => (name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
const localCache = {
  get() { try { return window.localStorage.getItem("bridge-crm-cache"); } catch { return null; } },
  set(value) { try { window.localStorage.setItem("bridge-crm-cache", value); } catch {} }
};

const PIPELINES = {
  Prospect: ["PQI", "QI/P", "FUP", "LA"],
  Customer: ["CNA"]
};
const ALL_STAGES = ["MSA", "DTM", "PQI", "QI/P", "FUP", "LA", "CNA"];
const CONVERSATION_TYPES = ["Prospecting", "Product Discussion", "Sampling", "Team-Check In", "Follow-Up", "Other"];
const INTERESTS = ["Unsure", "Low", "Medium", "High"];
const ACCENTS = {
  Teal: ["#17a6a4", "23, 166, 164"],
  Blue: ["#2477d8", "36, 119, 216"],
  Green: ["#24895d", "36, 137, 93"],
  Orange: ["#d67423", "214, 116, 35"],
  Purple: ["#9b36d4", "155, 54, 212"]
};

const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 12 4 4L19 6"/></svg>',
  userPlus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 22V4M5 4h11l-1 4 3 4H5"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 0 3-2 4-3 4 1-5-2-8-5-10 0 5-3 7-3 12 0 4 3 8 8 8Z"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 11v6M14 11v6"/></svg>',
  location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>'
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
    showConversionPercentages: true
  },
  meta: { version: 1, updatedAt: nowISO() }
});

let state = defaultState();
let ui = { page: "dashboard", contactMode: "list", search: "", roleFilter: "All Roles", typeFilter: "All Types", sort: "recent", analyticsRange: "week", analyticsAnchor: todayInput(), detailId: null, settingsOpen: false, saveTimer: null };
const cloudStateAvailable = location.protocol === "https:" && !location.hostname.endsWith("github.io");

function normalizeState(raw) {
  const base = defaultState();
  const next = { ...base, ...(raw || {}), settings: { ...base.settings, ...(raw?.settings || {}) }, meta: { ...base.meta, ...(raw?.meta || {}) } };
  next.contacts = Array.isArray(next.contacts) ? next.contacts.map(contact => ({
    id: contact.id || uid(), fullName: contact.fullName || "Unnamed Contact", phoneNumber: contact.phoneNumber || "", role: contact.role === "Customer" ? "Customer" : "Prospect",
    judgement: ["Good Fit", "Not Good Fit"].includes(contact.judgement || contact.category) ? (contact.judgement || contact.category) : "Good Fit",
    interestLevel: INTERESTS.includes(contact.interestLevel) ? contact.interestLevel : "Unsure", conversationType: CONVERSATION_TYPES.includes(contact.conversationType) ? contact.conversationType : "Prospecting",
    placeId: contact.placeId || contact.placeID || null, placeName: contact.placeName || "", dateFirstMet: contact.dateFirstMet || contact.createdAt || nowISO(), personalInfo: contact.personalInfo || "",
    isFilteredOut: Boolean(contact.isFilteredOut), checkBackDate: contact.checkBackDate || null, stages: Object.fromEntries(ALL_STAGES.map(stage => [stage, Boolean(contact.stages?.[stage]?.isComplete ?? contact.stages?.[stage])] )),
    stageDates: contact.stageDates || {}, followUps: Array.isArray(contact.followUps) ? contact.followUps : [], notes: Array.isArray(contact.notes) ? contact.notes : [], conversations: Array.isArray(contact.conversations) ? contact.conversations.map(log => ({ ...log, id: log.id || uid(), createdAt: log.createdAt || nowISO(), conversationDate: log.conversationDate || log.createdAt || nowISO(), isCountedConversation: Boolean(log.isCountedConversation) })) : [],
    createdAt: contact.createdAt || nowISO(), updatedAt: contact.updatedAt || contact.createdAt || nowISO()
  })) : [];
  next.places = Array.isArray(next.places) ? next.places.map(place => ({ id: place.id || uid(), name: place.name || "Unnamed Place", isFavorite: Boolean(place.isFavorite), createdAt: place.createdAt || nowISO() })) : [];
  return next;
}

async function loadState() {
  if (!cloudStateAvailable) {
    const cached = localCache.get();
    try { state = normalizeState(cached ? JSON.parse(cached) : null); }
    catch { state = defaultState(); }
    applyAppearance();
    render();
    return;
  }
  try {
    const response = await fetch("/api/state", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Cloud state unavailable");
    state = normalizeState(await response.json());
    localCache.set(JSON.stringify(state));
  } catch {
    const cached = localCache.get();
    try { state = normalizeState(cached ? JSON.parse(cached) : null); }
    catch { state = defaultState(); }
    $(".sync-status")?.replaceChildren(document.createTextNode("Local mode"));
  }
  applyAppearance();
  render();
}

function queueSave(message = "Saved") {
  state.meta.updatedAt = nowISO();
  localCache.set(JSON.stringify(state));
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

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function applyAppearance() {
  const accent = ACCENTS[state.settings.accent] || ACCENTS.Teal;
  document.documentElement.style.setProperty("--accent", accent[0]);
  document.documentElement.style.setProperty("--accent-rgb", accent[1]);
  document.documentElement.dataset.theme = state.settings.theme === "system" ? "" : state.settings.theme;
  document.documentElement.style.setProperty("--radius", state.settings.compact ? "18px" : "24px");
}

function dateOnly(value) { return new Date(String(value).length === 10 ? `${value}T12:00:00` : value); }
function fmtDate(value, options = { month: "short", day: "numeric" }) { return value ? new Intl.DateTimeFormat(undefined, options).format(dateOnly(value)) : ""; }
function fmtDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : ""; }
function startOfDay(date) { const copy = new Date(date); copy.setHours(0,0,0,0); return copy; }
function addDays(date, amount) { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; }
function startOfWeek(date) { const copy = startOfDay(date); const delta = (copy.getDay() - Number(state.settings.weekStart || 0) + 7) % 7; return addDays(copy, -delta); }
function rangeForAnalytics() {
  const anchor = dateOnly(ui.analyticsAnchor);
  if (ui.analyticsRange === "month") return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1), end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23,59,59), label: new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(anchor) };
  const start = startOfWeek(anchor), end = addDays(start, 6); end.setHours(23,59,59,999);
  const sameMonth = start.getMonth() === end.getMonth();
  const label = sameMonth ? `${fmtDate(start,{month:"long",day:"numeric"})}–${end.getDate()}` : `${fmtDate(start,{month:"long",day:"numeric"})}–${fmtDate(end,{month:"long",day:"numeric"})}`;
  return { start, end, label };
}
function inRange(value, range) { const date = new Date(value); return date >= range.start && date <= range.end; }
function countedConversations(range = null) { return state.contacts.flatMap(contact => contact.conversations.map(log => ({ ...log, contact }))).filter(log => log.isCountedConversation && (!range || inRange(log.conversationDate || log.createdAt, range))); }
function activeFollowUps() { return state.contacts.flatMap(contact => contact.followUps.filter(item => !item.completedAt).map(item => ({ ...item, contact }))).sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate)); }
function stageFor(contact) { return [...(PIPELINES[contact.role] || [])].reverse().find(stage => contact.stages?.[stage]) || "No stage"; }

function render() {
  const app = $("#app");
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar glass">
      <div class="brand"><div class="brand-mark">B</div><span>Bridge</span></div>
      <nav class="nav" aria-label="Primary navigation">
        ${navButton("dashboard", "Dashboard", "home")}
        ${navButton("contacts", "Contacts", "people")}
        ${navButton("add", "Add New", "plus")}
        ${navButton("followups", "Follow-Ups", "bell")}
        ${navButton("analytics", "Analytics", "chart")}
      </nav>
      <div class="nav-spacer"></div><div class="sync-status">Cloud synced</div>
    </aside>
    <main class="main"><section class="page">${renderPage()}</section></main>
  </div>${ui.settingsOpen ? settingsModal() : ""}${ui.detailId ? contactModal(ui.detailId) : ""}`;
  bindCommonEvents();
  bindPageEvents();
  if (ui.settingsOpen) bindSettingsEvents();
  if (ui.detailId) bindContactModalEvents();
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
  const todayCount = countedConversations().filter(log => String(log.conversationDate).slice(0,10) === today).length;
  const overdue = activeFollowUps().filter(item => new Date(item.dueDate) < new Date()).length;
  const launches = state.contacts.filter(contact => contact.stages.LA).length;
  const streak = calculateStreak();
  const upcoming = activeFollowUps().slice(0, 5);
  return `${pageHead("Dashboard", "Your relationship-building work at a glance.", `<button class="icon-button" id="settingsButton" aria-label="Settings">${icons.gear}</button>`)}
    <div class="card glass"><div class="goal-row"><div><span class="eyebrow">Daily conversation goal</span><div class="goal-count">${todayCount} of ${state.settings.dailyGoal}</div></div><button class="button primary" data-page="add">${icons.plus}<span>Add conversation</span></button></div><div class="progress"><span style="width:${Math.min(100,todayCount/Math.max(1,state.settings.dailyGoal)*100)}%"></span></div><span class="muted">${streak} day prospecting streak</span></div>
    <div class="grid stats-grid" style="margin-top:16px">
      ${statCard("userPlus", state.contacts.length, "Contacts")}${statCard("warning", overdue, "Overdue")}${statCard("flag", launches, "Launches")}${statCard("fire", `${streak}d`, "Streak")}
    </div>
    <div class="grid dashboard-grid">
      <div class="card glass"><h2>Upcoming Follow-Ups</h2>${upcoming.length ? `<div class="list-stack">${upcoming.map(item => miniFollowUp(item)).join("")}</div>` : emptyInline("No follow-ups scheduled", "Set one from a contact to keep momentum moving.")}</div>
      <div class="card glass"><h2>Smart Suggestions</h2><div class="list-stack">${suggestions(todayCount, overdue).map(text => `<div class="mini-row"><div class="stat-icon">${icons.check}</div><span>${escapeHTML(text)}</span></div>`).join("")}</div></div>
    </div>`;
}
function statCard(icon, value, label) { return `<div class="card stat glass"><div class="stat-icon">${icons[icon]}</div><div><div class="stat-value">${value}</div><div class="muted">${label}</div></div></div>`; }
function calculateStreak() { const days = new Set(countedConversations().map(log => String(log.conversationDate).slice(0,10))); let count=0, cursor=startOfDay(new Date()); while(days.has(cursor.toISOString().slice(0,10))){count++;cursor=addDays(cursor,-1);} return count; }
function suggestions(todayCount, overdue) { const list=[]; if(todayCount<state.settings.dailyGoal) list.push(`Log ${state.settings.dailyGoal-todayCount} more conversation${state.settings.dailyGoal-todayCount===1?"":"s"} to reach today's goal.`); if(overdue) list.push(`Reconnect with ${overdue} overdue follow-up${overdue===1?"":"s"}.`); const high=state.contacts.filter(c=>c.interestLevel==="High"&&!c.isFilteredOut).length; if(high) list.push(`${high} high-interest contact${high===1?" is":"s are"} ready for attention.`); if(!list.length) list.push("You're caught up. Review your pipeline for the next best conversation."); return list.slice(0,3); }
function miniFollowUp(item) { const overdue = new Date(item.dueDate)<new Date(); return `<button class="mini-row" data-contact-id="${item.contact.id}" style="width:100%;background:none;text-align:left"><div class="avatar">${initials(item.contact.fullName)}</div><div><strong>${escapeHTML(item.contact.fullName)}</strong><span class="muted">${escapeHTML(item.note||"Follow up")}</span></div><div class="row-end"><span class="pill ${overdue?"danger":"accent"}">${overdue?"Overdue · ":""}${fmtDateTime(item.dueDate)}</span></div></button>`; }
function emptyInline(title, text) { return `<div class="empty"><div><strong>${title}</strong>${text}</div></div>`; }

function renderContacts() {
  const filtered = getFilteredContacts();
  const modeControls = ["list","pipeline","places"].map(mode => `<button data-contact-mode="${mode}" class="${ui.contactMode===mode?"active":""}">${mode[0].toUpperCase()+mode.slice(1)}</button>`).join("");
  return `${pageHead("Contacts", "Search, segment, and move relationships forward.", `<button class="button primary" data-page="add">${icons.plus}<span>Add contact</span></button>`)}
    <div class="toolbar glass"><div class="segmented">${modeControls}</div><div class="select-wrap">${icons.chart}<select id="sortContacts" aria-label="Sort contacts"><option value="recent" ${ui.sort==="recent"?"selected":""}>Most recent</option><option value="followup" ${ui.sort==="followup"?"selected":""}>Follow-up date</option><option value="interest" ${ui.sort==="interest"?"selected":""}>Interest level</option></select></div><label class="search">${icons.search}<input id="contactSearch" type="search" value="${escapeHTML(ui.search)}" placeholder="Search contacts" autocomplete="off"></label></div>
    ${ui.contactMode!=="places"?`<div class="filter-row"><label class="select-wrap">${icons.people}<select id="roleFilter"><option>All Roles</option><option ${ui.roleFilter==="Prospect"?"selected":""}>Prospect</option><option ${ui.roleFilter==="Customer"?"selected":""}>Customer</option></select></label><label class="select-wrap">${icons.check}<select id="typeFilter"><option>All Types</option>${CONVERSATION_TYPES.map(type=>`<option ${ui.typeFilter===type?"selected":""}>${type}</option>`).join("")}</select></label></div>`:""}
    ${ui.contactMode === "pipeline" ? renderPipeline(filtered) : ui.contactMode === "places" ? renderPlaces() : renderContactList(filtered)}`;
}
function getFilteredContacts() {
  const query=ui.search.trim().toLowerCase();
  const rank={High:0,Medium:1,Low:2,Unsure:3};
  return state.contacts.filter(c=>(ui.roleFilter==="All Roles"||c.role===ui.roleFilter)&&(ui.typeFilter==="All Types"||c.conversationType===ui.typeFilter)&&(!query||[c.fullName,c.phoneNumber,c.placeName,c.personalInfo].join(" ").toLowerCase().includes(query))).sort((a,b)=>ui.sort==="interest"?rank[a.interestLevel]-rank[b.interestLevel]:ui.sort==="followup"?nextFollowUpDate(a)-nextFollowUpDate(b):new Date(b.updatedAt)-new Date(a.updatedAt));
}
function nextFollowUpDate(contact){const active=contact.followUps.filter(f=>!f.completedAt).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];return active?new Date(active.dueDate).getTime():Number.MAX_SAFE_INTEGER;}
function renderContactList(contacts) { return contacts.length?`<div class="contact-list">${contacts.map(contactCard).join("")}</div>`:emptyInline("No contacts found","Try a different filter or add a new conversation."); }
function contactCard(contact) { const follow=contact.followUps.filter(f=>!f.completedAt).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0]; return `<button class="contact-card glass" data-contact-id="${contact.id}"><div class="avatar">${initials(contact.fullName)}</div><div><h3>${escapeHTML(contact.fullName)}</h3><div class="contact-meta"><span>${escapeHTML(contact.role)}</span><span>${escapeHTML(contact.interestLevel)} interest</span><span>${escapeHTML(stageFor(contact))}</span>${contact.placeName?`<span>${escapeHTML(contact.placeName)}</span>`:""}</div></div><div>${contact.isFilteredOut?'<span class="pill danger">Filtered out</span>':follow?`<span class="pill ${new Date(follow.dueDate)<new Date()?"danger":"accent"}">${fmtDate(follow.dueDate)}</span>`:`<span class="pill">${escapeHTML(contact.judgement)}</span>`}</div></button>`; }
function renderPipeline(contacts) { const stages=["No stage","PQI","QI/P","FUP","LA","CNA"]; return `<div class="pipeline-board">${stages.map(stage=>{const group=contacts.filter(c=>stageFor(c)===stage);return `<div class="pipeline-column glass"><div class="column-head"><strong>${stage}</strong><span class="pill">${group.length}</span></div>${group.map(c=>`<button class="pipeline-person" data-contact-id="${c.id}"><strong>${escapeHTML(c.fullName)}</strong><div class="muted">${escapeHTML(c.role)} · ${escapeHTML(c.interestLevel)}</div></button>`).join("")||'<span class="muted">No contacts</span>'}</div>`}).join("")}</div>`; }
function renderPlaces() { const places=state.places.map(place=>({...place,count:state.contacts.filter(c=>c.placeId===place.id||(!c.placeId&&c.placeName===place.name)).length})).sort((a,b)=>Number(b.isFavorite)-Number(a.isFavorite)||b.count-a.count); return places.length?`<div class="grid places-grid">${places.map(place=>`<div class="card place-card glass"><div><span class="eyebrow">${place.isFavorite?"Favorite place":"Saved place"}</span><h2>${escapeHTML(place.name)}</h2></div><div class="place-count">${place.count}<span class="muted" style="font-size:14px;font-weight:400"> contacts</span></div></div>`).join("")}</div>`:emptyInline("No saved places","Add a place while creating your next contact."); }

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
        ${field("Saved place",`<select name="placeId"><option value="">None</option>${[...state.places].sort((a,b)=>Number(b.isFavorite)-Number(a.isFavorite)||a.name.localeCompare(b.name)).map(p=>`<option value="${p.id}">${escapeHTML(p.name)}${p.isFavorite?" · Favorite":""}</option>`).join("")}</select>`)}${field("Create new place",'<input name="newPlaceName" placeholder="Coffee shop, gym, event…">')}
        <label class="check-tile field full"><input type="checkbox" name="favoritePlace"><span>Save new place as a favorite</span></label>
      </div></section>
      <section class="form-section"><h2>Tracking</h2><div class="card glass"><span class="eyebrow">Standalone activity</span><div class="checks" style="margin:10px 0 18px">${stageCheck("MSA","Made Aware")}${stageCheck("DTM","Drop The Message")}</div><span class="eyebrow">Pipeline · optional</span><div class="checks" id="newPipelineChecks" style="margin-top:10px">${PIPELINES.Prospect.map(stage=>stageCheck(stage,stageTitle(stage))).join("")}</div></div></section>
      <section class="form-section"><h2>What I Learned</h2><div class="card glass grid form-grid">${field("Conversation notes",'<textarea name="notes" placeholder="Family, work, goals, interests, pain points, or anything worth remembering"></textarea>',"full")}${field("Check back later",'<input name="checkBackDate" type="datetime-local">')}${field("Follow-up",'<input name="followUpDate" type="datetime-local">')}</div></section>
      <div class="form-actions"><button class="button primary" type="submit">${icons.check}Save conversation</button></div>
    </form>`;
}
function field(label, control, cls="") { return `<label class="field ${cls}"><span>${label}</span>${control}</label>`; }
function stageCheck(stage,title) { return `<label class="check-tile"><input type="checkbox" name="stage_${stage.replace("/","")}" value="${stage}"><span><strong>${stage}</strong><br><small class="muted">${title}</small></span></label>`; }
function stageTitle(stage){return ({PQI:"Pre-Qualifying Interview","QI/P":"Quality Interview / Plan",FUP:"Follow-Up",LA:"Launch",CNA:"Customer Needs Assessment"})[stage]||stage;}

function renderFollowUps() {
  const items=activeFollowUps(), overdue=items.filter(x=>new Date(x.dueDate)<new Date()), upcoming=items.filter(x=>new Date(x.dueDate)>=new Date());
  return `${pageHead("Follow-Ups", "Stay close to the relationships that need attention.")}${followSection("Overdue",overdue,true)}${followSection("Upcoming",upcoming,false)}`;
}
function followSection(title,items,danger){return `<div class="card glass" style="margin-bottom:16px"><div class="goal-row"><h2>${title}</h2><span class="pill ${danger&&items.length?"danger":""}">${items.length}</span></div>${items.length?`<div class="list-stack">${items.map(miniFollowUp).join("")}</div>`:emptyInline(`No ${title.toLowerCase()} follow-ups`,danger?"You're all caught up.":"Schedule one from a contact.")}</div>`;}

function renderAnalytics() {
  const range=rangeForAnalytics(), logs=countedConversations(range), contacts=state.contacts.filter(c=>inRange(c.dateFirstMet,range));
  const stageCounts=Object.fromEntries(ALL_STAGES.map(stage=>[stage,state.contacts.filter(c=>c.stages[stage]&&inRange(c.stageDates?.[stage]||c.updatedAt,range)).length]));
  const interest=Object.fromEntries(INTERESTS.map(level=>[level,contacts.filter(c=>c.interestLevel===level).length]));
  const maxInterest=Math.max(1,...Object.values(interest));
  return `${pageHead("Analytics", "See the activity that creates momentum.")}
    <div class="card glass" style="margin-bottom:16px"><div class="period-controls"><div class="segmented"><button data-range="week" class="${ui.analyticsRange==="week"?"active":""}">Week</button><button data-range="month" class="${ui.analyticsRange==="month"?"active":""}">Month</button></div><input id="analyticsAnchor" type="date" value="${ui.analyticsAnchor}" style="min-height:44px;border:1px solid var(--line);border-radius:14px;padding:0 12px;background:var(--surface-strong)"><strong>${range.label}</strong></div></div>
    <div class="grid stats-grid">${statCard("chart",logs.length,"Conversations")}${statCard("people",contacts.filter(c=>c.role==="Prospect").length,"Prospects")}${statCard("userPlus",contacts.filter(c=>c.role==="Customer").length,"Customers")}${statCard("flag",stageCounts.LA,"Launches")}</div>
    <div class="grid analytics-grid" style="margin-top:16px"><div class="card glass"><h2>Pipeline Activity</h2><div class="metric-bars">${["MSA","DTM","PQI","QI/P","FUP","LA","CNA"].map(stage=>metricBar(stage,stageCounts[stage],Math.max(1,...Object.values(stageCounts)))).join("")}</div></div><div class="card glass"><h2>Interest Breakdown</h2><div class="metric-bars">${INTERESTS.map(level=>metricBar(level,interest[level],maxInterest)).join("")}</div></div><div class="card glass"><h2>Conversation Mix</h2><div class="metric-bars">${CONVERSATION_TYPES.map(type=>metricBar(type,logs.filter(log=>log.type===type).length,Math.max(1,logs.length))).join("")}</div></div><div class="card glass"><h2>Follow-Up Completion</h2>${followUpAnalytics(range)}</div></div>`;
}
function metricBar(label,value,max){return `<div><div class="metric-label"><span>${label}</span><strong>${value}</strong></div><div class="bar"><span style="width:${value/Math.max(1,max)*100}%"></span></div></div>`;}
function followUpAnalytics(range){const all=state.contacts.flatMap(c=>c.followUps).filter(f=>inRange(f.createdAt||f.dueDate,range));const done=all.filter(f=>f.completedAt).length;const pct=all.length?Math.round(done/all.length*100):0;return `<div style="display:grid;place-items:center;min-height:220px"><div style="text-align:center"><div class="stat-value">${pct}%</div><div class="muted">${done} of ${all.length} completed</div></div></div>`;}

function settingsModal() {
  const s=state.settings;
  return `<div class="modal-backdrop" id="settingsBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle"><header class="modal-head"><h2 id="settingsTitle">Settings</h2><button class="icon-button close-modal" aria-label="Close">${icons.close}</button></header><div class="modal-body"><form id="settingsForm">
    ${settingsSection("Profile & Goals",`${settingsRow("Your name",`<input name="name" value="${escapeHTML(s.name)}" placeholder="Name">`)}${settingsRow("Business name",`<input name="businessName" value="${escapeHTML(s.businessName)}" placeholder="Business">`)}${settingsRow("Daily goal",`<input name="dailyGoal" type="number" min="1" max="100" value="${s.dailyGoal}">`)}${settingsRow("Weekly goal",`<input name="weeklyGoal" type="number" min="1" max="500" value="${s.weeklyGoal}">`)}${settingsRow("Monthly goal",`<input name="monthlyGoal" type="number" min="1" max="2000" value="${s.monthlyGoal}">`)}`)}
    ${settingsSection("Workflow",`${settingsRow("Default follow-up",`<select name="defaultFollowUpDays"><option value="1" ${s.defaultFollowUpDays==1?"selected":""}>1 day</option><option value="2" ${s.defaultFollowUpDays==2?"selected":""}>2 days</option><option value="7" ${s.defaultFollowUpDays==7?"selected":""}>1 week</option></select>`)}${settingsRow("Week starts",`<select name="weekStart"><option value="0" ${s.weekStart==0?"selected":""}>Sunday</option><option value="1" ${s.weekStart==1?"selected":""}>Monday</option></select>`)}`)}
    ${settingsSection("Appearance",`${settingsRow("Theme",`<select name="theme"><option value="system" ${s.theme==="system"?"selected":""}>System</option><option value="light" ${s.theme==="light"?"selected":""}>Light</option><option value="dark" ${s.theme==="dark"?"selected":""}>Dark</option></select>`)}${settingsRow("Accent color",`<div class="accent-options">${Object.entries(ACCENTS).map(([name,[color]])=>`<button type="button" class="accent-dot ${s.accent===name?"active":""}" data-accent="${name}" title="${name}" style="background:${color};color:${color}"></button>`).join("")}</div>`)}${settingsRow("Compact cards",`<input type="checkbox" name="compact" ${s.compact?"checked":""}>`)}`)}
    ${settingsSection("Data & Backup",`${settingsRow("Download all Bridge data",`<button type="button" class="button subtle" id="exportBackup">${icons.download}JSON</button>`)}${settingsRow("Export contacts",`<button type="button" class="button subtle" id="exportCSV">${icons.download}CSV</button>`)}${settingsRow("Restore from backup",`<label class="button subtle">Choose file<input id="importBackup" type="file" accept="application/json" hidden></label>`)}`)}
    ${settingsSection("Support",`${settingsRow("Send feedback",`<a class="button subtle" href="mailto:fountainofyouthxs@gmail.com?subject=Bridge%20Feedback">Email</a>`)}${settingsRow("Report a bug",`<a class="button subtle" href="mailto:fountainofyouthxs@gmail.com?subject=Bridge%20Bug%20Report">Email</a>`)}`)}
    <div class="form-actions"><button class="button primary" type="submit">Save settings</button></div></form></div></section></div>`;
}
function settingsSection(title,content){return `<section class="settings-section card glass"><h2>${title}</h2>${content}</section>`;}
function settingsRow(label,control){return `<div class="settings-row"><span>${label}</span>${control}</div>`;}

function contactModal(id) {
  const c=state.contacts.find(x=>x.id===id); if(!c){ui.detailId=null;return "";}
  const active=c.followUps.filter(f=>!f.completedAt).sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];
  return `<div class="modal-backdrop" id="contactBackdrop"><section class="modal wide" role="dialog" aria-modal="true" aria-labelledby="contactTitle"><header class="modal-head"><div><span class="eyebrow">${escapeHTML(c.role)}</span><h2 id="contactTitle">${escapeHTML(c.fullName)}</h2></div><button class="icon-button close-modal" aria-label="Close">${icons.close}</button></header><div class="modal-body"><div class="grid detail-grid">
    <div><section class="card glass"><form id="editContactForm"><div class="grid form-grid">${field("Full name",`<input name="fullName" value="${escapeHTML(c.fullName)}" required>`)}${field("Phone",`<input name="phoneNumber" value="${escapeHTML(c.phoneNumber)}">`)}${field("Role",`<select name="role" id="editRole"><option ${c.role==="Prospect"?"selected":""}>Prospect</option><option ${c.role==="Customer"?"selected":""}>Customer</option></select>`)}${field("Interest",`<select name="interestLevel">${INTERESTS.map(x=>`<option ${c.interestLevel===x?"selected":""}>${x}</option>`).join("")}</select>`)}${field("Judgement",`<select name="judgement"><option ${c.judgement==="Good Fit"?"selected":""}>Good Fit</option><option ${c.judgement==="Not Good Fit"?"selected":""}>Not Good Fit</option></select>`)}${field("Conversation type",`<select name="conversationType">${CONVERSATION_TYPES.map(x=>`<option ${c.conversationType===x?"selected":""}>${x}</option>`).join("")}</select>`)}${field("What I know",`<textarea name="personalInfo">${escapeHTML(c.personalInfo)}</textarea>`,"full")}</div><span class="eyebrow">Standalone activity</span><div class="checks" style="margin:10px 0 18px">${editStageCheck(c,"MSA","Made Aware")}${editStageCheck(c,"DTM","Drop The Message")}</div><span class="eyebrow">Pipeline · optional</span><div class="checks" id="editPipelineChecks" style="margin:10px 0 18px">${PIPELINES[c.role].map(stage=>editStageCheck(c,stage,stageTitle(stage))).join("")}</div><div class="form-actions"><button class="button primary" type="submit">Save changes</button></div></form></section>
    <section class="card glass" style="margin-top:14px"><h2>Conversation History</h2><form id="addLogForm" style="margin-top:14px"><div class="grid form-grid">${field("Note or activity",'<textarea name="notes" required placeholder="Log what you learned or discussed"></textarea>',"full")}${field("Type",`<select name="type">${CONVERSATION_TYPES.map(x=>`<option>${x}</option>`).join("")}</select>`)}${field("Date",`<input name="conversationDate" type="date" max="${todayInput()}" value="${todayInput()}">`)}</div><p class="muted">Contact notes do not increase the Conversations metric. Only Add New creates a counted conversation.</p><button class="button" type="submit">${icons.plus}Add note</button></form><div class="timeline" style="margin-top:16px">${renderLogs(c)}</div></section></div>
    <aside><section class="card glass"><h2>Follow-Up</h2>${active?`<div style="margin:15px 0"><span class="pill ${new Date(active.dueDate)<new Date()?"danger":"accent"}">${fmtDateTime(active.dueDate)}</span><p>${escapeHTML(active.note||"Follow up")}</p></div><button class="button danger" id="removeFollowUp">${icons.trash}Remove follow-up</button>`:`<p class="muted">No follow-up set.</p>`}<form id="setFollowUpForm" style="margin-top:15px">${field(active?"Replace with":"Set follow-up",'<input name="dueDate" type="datetime-local" required>')}<button class="button" type="submit" style="margin-top:10px">Set reminder</button></form></section>
    <section class="card glass" style="margin-top:14px"><h2>Place Met</h2><p>${c.placeName?escapeHTML(c.placeName):'<span class="muted">No place saved</span>'}</p></section>
    <div class="danger-zone"><button class="button danger" id="deleteContact">${icons.trash}Delete contact</button></div></aside></div></div></section></div>`;
}
function editStageCheck(c,stage,title){return `<label class="check-tile"><input type="checkbox" name="stage_${stage.replace("/","")}" value="${stage}" ${c.stages?.[stage]?"checked":""}><span><strong>${stage}</strong><br><small class="muted">${title}</small></span></label>`;}
function renderLogs(c){const logs=[...c.conversations].sort((a,b)=>new Date(b.conversationDate)-new Date(a.conversationDate));return logs.length?logs.map(log=>`<div class="log-row"><div class="log-row-head"><div><strong>${escapeHTML(log.type||"Activity")}</strong><div class="muted">${fmtDate(log.conversationDate||log.createdAt,{month:"short",day:"numeric",year:"numeric"})}${log.isCountedConversation?' · Counted conversation':' · Note'}</div></div><button class="icon-button delete-log" data-log-id="${log.id}" aria-label="Delete log">${icons.trash}</button></div>${log.notes?`<p>${escapeHTML(log.notes)}</p>`:""}</div>`).join(""):emptyInline("No conversation history","Add a note to start the timeline.");}

function bindCommonEvents(){
  $$('[data-page]').forEach(button=>button.addEventListener('click',()=>{ui.page=button.dataset.page;ui.detailId=null;render();window.scrollTo({top:0,behavior:'smooth'});}));
  $$('[data-contact-id]').forEach(button=>button.addEventListener('click',()=>{ui.detailId=button.dataset.contactId;render();}));
  $('.close-modal')?.addEventListener('click',()=>{ui.settingsOpen=false;ui.detailId=null;render();});
  $('#settingsBackdrop')?.addEventListener('click',event=>{if(event.target.id==='settingsBackdrop'){ui.settingsOpen=false;render();}});
  $('#contactBackdrop')?.addEventListener('click',event=>{if(event.target.id==='contactBackdrop'){ui.detailId=null;render();}});
  document.onkeydown=event=>{if(event.key==='Escape'&&(ui.settingsOpen||ui.detailId)){ui.settingsOpen=false;ui.detailId=null;render();}};
}

function bindPageEvents(){
  $('#settingsButton')?.addEventListener('click',()=>{ui.settingsOpen=true;render();});
  $$('[data-contact-mode]').forEach(button=>button.addEventListener('click',()=>{ui.contactMode=button.dataset.contactMode;render();}));
  $('#contactSearch')?.addEventListener('input',event=>{ui.search=event.target.value;const cursor=event.target.selectionStart;render();const input=$('#contactSearch');input?.focus();input?.setSelectionRange(cursor,cursor);});
  $('#roleFilter')?.addEventListener('change',event=>{ui.roleFilter=event.target.value;render();});
  $('#typeFilter')?.addEventListener('change',event=>{ui.typeFilter=event.target.value;render();});
  $('#sortContacts')?.addEventListener('change',event=>{ui.sort=event.target.value;render();});
  $('#newRole')?.addEventListener('change',event=>{const container=$('#newPipelineChecks');container.innerHTML=PIPELINES[event.target.value].map(stage=>stageCheck(stage,stageTitle(stage))).join('');});
  $('#addContactForm')?.addEventListener('submit',handleAddContact);
  $$('[data-range]').forEach(button=>button.addEventListener('click',()=>{ui.analyticsRange=button.dataset.range;render();}));
  $('#analyticsAnchor')?.addEventListener('change',event=>{ui.analyticsAnchor=event.target.value;render();});
}

function handleAddContact(event){
  event.preventDefault(); const form=new FormData(event.currentTarget); const fullName=String(form.get('fullName')||'').trim(); if(!fullName)return;
  let placeId=String(form.get('placeId')||'')||null, placeName=''; const newPlaceName=String(form.get('newPlaceName')||'').trim();
  if(newPlaceName){let place=state.places.find(p=>p.name.toLowerCase()===newPlaceName.toLowerCase());if(!place){place={id:uid(),name:newPlaceName,isFavorite:form.has('favoritePlace'),createdAt:nowISO()};state.places.push(place);}else if(form.has('favoritePlace'))place.isFavorite=true;placeId=place.id;placeName=place.name;} else if(placeId){placeName=state.places.find(p=>p.id===placeId)?.name||'';}
  const role=String(form.get('role')); const conversationDate=`${form.get('conversationDate')}T12:00:00`; const stages=Object.fromEntries(ALL_STAGES.map(stage=>[stage,false])); const stageDates={};
  for(const stage of ['MSA','DTM',...(PIPELINES[role]||[])]){if(form.has(`stage_${stage.replace('/','')}`)){stages[stage]=true;stageDates[stage]=conversationDate;}}
  const notes=String(form.get('notes')||'').trim(); const contact={id:uid(),fullName,phoneNumber:String(form.get('phoneNumber')||''),role,judgement:String(form.get('judgement')),interestLevel:String(form.get('interestLevel')),conversationType:String(form.get('conversationType')),placeId,placeName,dateFirstMet:conversationDate,personalInfo:'',isFilteredOut:Boolean(form.get('checkBackDate')),checkBackDate:form.get('checkBackDate')?new Date(String(form.get('checkBackDate'))).toISOString():null,stages,stageDates,followUps:[],notes:[],conversations:[{id:uid(),type:String(form.get('conversationType')),interestLevel:String(form.get('interestLevel')),notes,createdAt:nowISO(),conversationDate,isCountedConversation:true}],createdAt:nowISO(),updatedAt:nowISO()};
  if(form.get('followUpDate'))contact.followUps.push({id:uid(),dueDate:new Date(String(form.get('followUpDate'))).toISOString(),completedAt:null,note:'Follow up',createdAt:nowISO()});
  if(form.get('checkBackDate'))contact.followUps.push({id:uid(),dueDate:new Date(String(form.get('checkBackDate'))).toISOString(),completedAt:null,note:'Check back down the line',createdAt:nowISO()});
  state.contacts.unshift(contact); queueSave('Conversation saved'); ui.page='contacts'; render();
}

function bindSettingsEvents(){
  $$('.accent-dot').forEach(button=>button.addEventListener('click',()=>{state.settings.accent=button.dataset.accent;applyAppearance();render();}));
  $('#settingsForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);state.settings={...state.settings,name:String(f.get('name')||''),businessName:String(f.get('businessName')||''),dailyGoal:Number(f.get('dailyGoal'))||5,weeklyGoal:Number(f.get('weeklyGoal'))||25,monthlyGoal:Number(f.get('monthlyGoal'))||100,defaultFollowUpDays:Number(f.get('defaultFollowUpDays'))||2,weekStart:Number(f.get('weekStart'))||0,theme:String(f.get('theme')),compact:f.has('compact')};applyAppearance();queueSave('Settings saved');ui.settingsOpen=false;render();});
  $('#exportBackup')?.addEventListener('click',()=>downloadFile(`bridge-backup-${todayInput()}.json`,JSON.stringify(state,null,2),'application/json'));
  $('#exportCSV')?.addEventListener('click',()=>{const rows=[['Name','Phone','Role','Interest','Judgement','Conversation Type','Place','Date First Met','Pipeline'],...state.contacts.map(c=>[c.fullName,c.phoneNumber,c.role,c.interestLevel,c.judgement,c.conversationType,c.placeName,c.dateFirstMet,stageFor(c)])];downloadFile(`bridge-contacts-${todayInput()}.csv`,rows.map(r=>r.map(csvCell).join(',')).join('\n'),'text/csv');});
  $('#importBackup')?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const imported=normalizeState(JSON.parse(await file.text()));if(!confirm(`Restore ${imported.contacts.length} contacts and replace current Bridge data?`))return;state=imported;applyAppearance();queueSave('Backup restored');ui.settingsOpen=false;render();}catch{showToast('That backup file could not be read');}});
}
function csvCell(value){return `"${String(value||'').replaceAll('"','""')}"`;}
function downloadFile(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function bindContactModalEvents(){
  const c=state.contacts.find(x=>x.id===ui.detailId);if(!c)return;
  $('#editRole')?.addEventListener('change',event=>{const container=$('#editPipelineChecks');container.innerHTML=PIPELINES[event.target.value].map(stage=>editStageCheck(c,stage,stageTitle(stage))).join('');});
  $('#editContactForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);const oldRole=c.role;c.fullName=String(f.get('fullName')).trim()||c.fullName;c.phoneNumber=String(f.get('phoneNumber')||'');c.role=String(f.get('role'));c.interestLevel=String(f.get('interestLevel'));c.judgement=String(f.get('judgement'));c.conversationType=String(f.get('conversationType'));c.personalInfo=String(f.get('personalInfo')||'');for(const stage of ALL_STAGES){const allowed=stage==='MSA'||stage==='DTM'||PIPELINES[c.role].includes(stage);if(!allowed){c.stages[stage]=false;delete c.stageDates[stage];continue;}const checked=f.has(`stage_${stage.replace('/','')}`);if(checked&&!c.stages[stage])c.stageDates[stage]=nowISO();if(!checked)delete c.stageDates[stage];c.stages[stage]=checked;}c.updatedAt=nowISO();queueSave('Contact updated');render();});
  $('#addLogForm')?.addEventListener('submit',event=>{event.preventDefault();const f=new FormData(event.currentTarget);c.conversations.push({id:uid(),type:String(f.get('type')),interestLevel:c.interestLevel,notes:String(f.get('notes')).trim(),createdAt:nowISO(),conversationDate:`${f.get('conversationDate')}T12:00:00`,isCountedConversation:false});c.updatedAt=nowISO();queueSave('Note added');render();});
  $$('.delete-log').forEach(button=>button.addEventListener('click',()=>{if(!confirm('Delete this conversation log? The contact will remain.'))return;c.conversations=c.conversations.filter(log=>log.id!==button.dataset.logId);c.updatedAt=nowISO();queueSave('Log deleted');render();}));
  $('#setFollowUpForm')?.addEventListener('submit',event=>{event.preventDefault();const due=new FormData(event.currentTarget).get('dueDate');if(!due)return;c.followUps=c.followUps.filter(f=>f.completedAt);c.followUps.push({id:uid(),dueDate:new Date(String(due)).toISOString(),completedAt:null,note:'Follow up',createdAt:nowISO()});c.updatedAt=nowISO();queueSave('Follow-up set');render();});
  $('#removeFollowUp')?.addEventListener('click',()=>{if(!confirm('Remove this follow-up?'))return;c.followUps=c.followUps.filter(f=>f.completedAt);c.updatedAt=nowISO();queueSave('Follow-up removed');render();});
  $('#deleteContact')?.addEventListener('click',()=>{if(!confirm(`Delete ${c.fullName}? This cannot be undone.`))return;state.contacts=state.contacts.filter(x=>x.id!==c.id);ui.detailId=null;queueSave('Contact deleted');render();});
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}), { once: true });
}

loadState();
