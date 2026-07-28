(function installBridgeScorecardLogic(global) {
  const text = (value, max = 160) => String(value || "").trim().slice(0, max);
  const metric = value => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.min(Math.floor(number), 1_000_000_000) : 0;
  };

  function firstName(value) {
    return text(value, 80).split(/\s+/)[0] || "Bridge";
  }

  function initials(value) {
    return text(value, 120).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
  }

  function sanitizeSharedContact(contact) {
    const fullName = text(contact?.fullName, 120) || "Unnamed contact";
    return {
      initials: initials(fullName),
      name: fullName,
      role: ["Prospect", "Customer", "Team"].includes(contact?.role) ? contact.role : "Prospect",
      pipelineStage: text(contact?.pipelineStage, 80),
      placeName: text(contact?.placeName, 120)
    };
  }

  function createSnapshot({ ownerName, range, metrics, includeContacts = false, contacts = [] } = {}) {
    const safeMetrics = {
      conversations: metric(metrics?.conversations),
      contacts: metric(metrics?.contacts),
      prospects: metric(metrics?.prospects),
      prospectiveCustomers: metric(metrics?.prospectiveCustomers)
    };
    return {
      version: 1,
      ownerName: firstName(ownerName),
      periodLabel: text(range?.label, 160) || "Today",
      range: {
        start: text(range?.start, 40),
        end: text(range?.end, 40)
      },
      metrics: safeMetrics,
      includeContacts: Boolean(includeContacts),
      contacts: includeContacts ? contacts.slice(0, 100).map(sanitizeSharedContact) : []
    };
  }

  function scorecardSummary(snapshot) {
    const metrics = snapshot?.metrics || {};
    return `${metric(metrics.conversations)} conversations, ${metric(metrics.contacts)} contacts, ${metric(metrics.prospects)} prospects, and ${metric(metrics.prospectiveCustomers)} prospective customers`;
  }

  global.BridgeScorecard = Object.freeze({ createSnapshot, sanitizeSharedContact, scorecardSummary });
})(globalThis);
