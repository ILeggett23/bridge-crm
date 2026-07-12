(function installBridgeContactLogic(global) {
  const time = value => {
    const result = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(result) ? result : null;
  };

  function latestConversationTime(contact) {
    const values = (contact.conversations || []).map(log => time(log.conversationDate || log.createdAt)).filter(value => value !== null);
    return values.length ? Math.max(...values) : null;
  }

  function hasConversationInRange(contact, from, to) {
    if (!from && !to) return true;
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return (contact.conversations || []).some(log => {
      const value = time(log.conversationDate || log.createdAt);
      return value !== null && value >= start && value <= end;
    });
  }

  function sortContacts(contacts, sort, interestRank, nextFollowUpTime) {
    return [...contacts].sort((a, b) => {
      if (sort === "recentConversation" || sort === "oldestConversation") {
        const aTime = latestConversationTime(a);
        const bTime = latestConversationTime(b);
        if (aTime === null && bTime === null) return 0;
        if (aTime === null) return 1;
        if (bTime === null) return -1;
        return sort === "recentConversation" ? bTime - aTime : aTime - bTime;
      }
      if (sort === "followup") return nextFollowUpTime(a) - nextFollowUpTime(b);
      if (sort === "interest") return interestRank[a.interestLevel] - interestRank[b.interestLevel];
      return (time(b.createdAt) || 0) - (time(a.createdAt) || 0);
    });
  }

  function lastRelevantActivityTime(contact) {
    const values = [time(contact.createdAt), time(contact.updatedAt), latestConversationTime(contact)];
    Object.values(contact.stageDates || {}).forEach(value => values.push(time(value)));
    (contact.stageEvents || []).forEach(event => values.push(time(event.occurredAt)));
    (contact.followUps || []).forEach(followUp => {
      values.push(time(followUp.createdAt), time(followUp.completedAt));
    });
    return Math.max(...values.filter(value => value !== null), 0);
  }

  function shouldArchiveContact(contact, now = Date.now()) {
    if (contact.archivedAt || contact.role === "Customer" || contact.isFilteredOut) return false;
    if (Object.values(contact.stages || {}).some(Boolean)) return false;
    if ((contact.followUps || []).some(followUp => !followUp.completedAt)) return false;
    if (contact.checkBackDate && (time(contact.checkBackDate) || 0) > now) return false;
    const inactiveFor = now - lastRelevantActivityTime(contact);
    return inactiveFor >= 30 * 24 * 60 * 60 * 1000;
  }

  function archiveInactiveContacts(contacts, enabled, now = Date.now()) {
    if (!enabled) return 0;
    let archived = 0;
    contacts.forEach(contact => {
      if (!shouldArchiveContact(contact, now)) return;
      contact.archivedAt = new Date(now).toISOString();
      contact.archiveReason = "inactive-30-days";
      archived += 1;
    });
    return archived;
  }

  function restoreContact(contact, restoredAt = new Date().toISOString()) {
    contact.archivedAt = null;
    contact.archiveReason = null;
    contact.updatedAt = restoredAt;
    return contact;
  }

  function setFilteredOut(contact, filtered, changedAt = new Date().toISOString()) {
    contact.isFilteredOut = Boolean(filtered);
    contact.filteredOutAt = filtered ? (contact.filteredOutAt || changedAt) : null;
    return contact;
  }

  global.BridgeLogic = Object.freeze({
    archiveInactiveContacts,
    hasConversationInRange,
    lastRelevantActivityTime,
    latestConversationTime,
    restoreContact,
    setFilteredOut,
    shouldArchiveContact,
    sortContacts
  });
})(globalThis);
