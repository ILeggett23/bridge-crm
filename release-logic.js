(function (global) {
  const RELEASE_STORAGE_KEY = "bridgeLastSeenVersion";
  const APP_RELEASE = Object.freeze({
    version: "1.1.64",
    assetVersion: "v1.1.64",
    title: "What's New",
    items: Object.freeze([
      Object.freeze({
        icon: "chart",
        title: "Better scorecard sharing",
        description: "Shared scorecards and image previews now match your Analytics cards."
      }),
      Object.freeze({
        icon: "calendarCheck",
        title: "Flexible streak rest days",
        description: "Protect your streak with one-time or repeating rest-day schedules."
      }),
      Object.freeze({
        icon: "sparkles",
        title: "Cleaner pipeline tracking",
        description: "Prospect and customer stages are simpler, clearer, and easier to scan."
      })
    ])
  });

  function shouldShowRelease(lastSeenVersion, release = APP_RELEASE) {
    return String(lastSeenVersion || "") !== release.version;
  }

  function readLastSeenVersion(storage = global.localStorage) {
    try { return storage?.getItem(RELEASE_STORAGE_KEY) || ""; }
    catch { return ""; }
  }

  function markReleaseSeen(storage = global.localStorage, release = APP_RELEASE) {
    try {
      storage?.setItem(RELEASE_STORAGE_KEY, release.version);
      return true;
    } catch {
      return false;
    }
  }

  global.BridgeRelease = Object.freeze({
    APP_RELEASE,
    RELEASE_STORAGE_KEY,
    shouldShowRelease,
    readLastSeenVersion,
    markReleaseSeen
  });
})(globalThis);
