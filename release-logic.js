(function (global) {
  const RELEASE_STORAGE_KEY = "bridgeLastSeenVersion";
  const APP_RELEASE = Object.freeze({
    version: "1.1.66",
    assetVersion: "v1.1.66",
    title: "What's New",
    items: Object.freeze([
      Object.freeze({
        icon: "network",
        title: "Safer cloud account foundation",
        description: "Bridge now verifies every required cloud service before offering sign-in or synced data."
      }),
      Object.freeze({
        icon: "download",
        title: "Private sync and backup controls",
        description: "New account tools keep local data available and prepare secure, user-isolated cloud copies."
      }),
      Object.freeze({
        icon: "circleCheck",
        title: "Protected sessions and recovery",
        description: "Account sessions, verification, recovery, and deletion now share one guarded workflow."
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
