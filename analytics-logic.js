(function installBridgeAnalyticsLogic(global) {
  const parseDate = value => {
    if (value instanceof Date) return new Date(value);
    const text = String(value || "");
    return new Date(text.length === 10 ? `${text}T12:00:00` : text);
  };

  const startOfDay = value => {
    const date = parseDate(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const endOfDay = value => {
    const date = parseDate(value);
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const addDays = (value, amount) => {
    const date = parseDate(value);
    date.setDate(date.getDate() + amount);
    return date;
  };

  const fullDate = date => new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);

  function dateRangeLabel(start, end) {
    if (start.toDateString() === end.toDateString()) return fullDate(start);
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    if (sameMonth) {
      const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(start);
      return `${month} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    }
    if (sameYear) {
      const left = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(start);
      const right = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(end);
      return `${left}–${right}, ${end.getFullYear()}`;
    }
    return `${fullDate(start)}–${fullDate(end)}`;
  }

  function analyticsRange({ mode = "week", anchor, customStart, customEnd, weekStart = 0 }) {
    const anchorDate = parseDate(anchor);
    if (mode === "day") {
      const start = startOfDay(anchorDate);
      return { start, end: endOfDay(anchorDate), label: fullDate(start) };
    }
    if (mode === "month") {
      const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start,
        end,
        label: new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(anchorDate)
      };
    }
    if (mode === "custom") {
      let start = startOfDay(customStart || anchor);
      let end = endOfDay(customEnd || customStart || anchor);
      if (start > end) [start, end] = [startOfDay(end), endOfDay(start)];
      return { start, end, label: dateRangeLabel(start, end) };
    }
    const day = startOfDay(anchorDate);
    const delta = (day.getDay() - Number(weekStart || 0) + 7) % 7;
    const start = addDays(day, -delta);
    const end = endOfDay(addDays(start, 6));
    return { start, end, label: dateRangeLabel(start, end) };
  }

  function inAnalyticsRange(value, range) {
    const date = parseDate(value);
    return Number.isFinite(date.getTime()) && date >= range.start && date <= range.end;
  }

  function normalizePhone(value) {
    const identity = global.BridgeCommunication?.phoneIdentity?.(value);
    if (identity) return identity.startsWith("1") && identity.length === 11 ? identity.slice(1) : identity;
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  }

  function uniquePhoneCaptures(contacts, range = null) {
    const earliestByPhone = new Map();
    for (const contact of contacts || []) {
      const phone = normalizePhone(contact.capturedPhoneNumber || "");
      const capturedAt = contact.phoneCapturedAt;
      const capturedDate = parseDate(capturedAt);
      if (!phone || !capturedAt || !Number.isFinite(capturedDate.getTime())) continue;
      const current = earliestByPhone.get(phone);
      if (!current || capturedDate < current.capturedDate) {
        earliestByPhone.set(phone, { phone, capturedAt, capturedDate, contact });
      }
    }
    const captures = [...earliestByPhone.values()];
    return range ? captures.filter(capture => inAnalyticsRange(capture.capturedAt, range)) : captures;
  }

  global.BridgeAnalytics = Object.freeze({ analyticsRange, dateRangeLabel, inAnalyticsRange, normalizePhone, uniquePhoneCaptures });
})(globalThis);
