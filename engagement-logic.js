(function installBridgeEngagementLogic(global) {
  const dayKey = value => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  function achievementMetrics(state) {
    const contacts = state.contacts || [];
    const counted = contacts.flatMap(contact => contact.conversations || []).filter(log => log.isCountedConversation);
    const conversationDays = new Map();
    counted.forEach(log => {
      const key = dayKey(log.conversationDate || log.createdAt);
      if (key) conversationDays.set(key, (conversationDays.get(key) || 0) + 1);
    });
    const goal = Math.max(1, Number(state.settings?.dailyGoal) || 5);
    const goalDays = new Set([...conversationDays].filter(([, count]) => count >= goal).map(([key]) => key));
    let goalStreak = 0;
    const cursor = new Date();
    while (goalDays.has(dayKey(cursor))) {
      goalStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const followUps = contacts.flatMap(contact => contact.followUps || []);
    const completedFollowUps = followUps.filter(item => item.completedAt).length;
    const pipelineEvents = contacts.flatMap(contact => contact.stageEvents || []).filter(event => ["PQI", "QI/P", "FUP", "LA", "CNA"].includes(event.stage));
    return {
      contacts: contacts.length,
      conversations: counted.length,
      followUpsScheduled: followUps.length,
      followUpsCompleted: completedFollowUps,
      pipelineMoves: pipelineEvents.length,
      launches: contacts.flatMap(contact => contact.stageEvents || []).filter(event => event.stage === "LA").length,
      favoritePlaces: (state.places || []).filter(place => place.isFavorite).length,
      savedPlaces: (state.places || []).length,
      goalDays: goalDays.size,
      goalStreak
    };
  }

  const definitions = [
    { id: "first-contact", category: "Getting Started", name: "First Connection", description: "Add your first contact.", metric: "contacts", target: 1, icon: "people" },
    { id: "first-conversation", category: "Getting Started", name: "Conversation Starter", description: "Log your first counted conversation.", metric: "conversations", target: 1, icon: "chat" },
    { id: "bridge-builder", category: "Getting Started", name: "Bridge Builder", description: "Build a list of 5 contacts.", metric: "contacts", target: 5, icon: "bridge" },
    { id: "getting-organized", category: "Getting Started", name: "Getting Organized", description: "Schedule your first follow-up.", metric: "followUpsScheduled", target: 1, icon: "calendar" },
    { id: "first-step-forward", category: "Getting Started", name: "First Step Forward", description: "Move a contact into a pipeline stage.", metric: "pipelineMoves", target: 1, icon: "flag" },
    { id: "opening-doors", category: "Conversations", name: "Opening Doors", description: "Log 10 counted conversations.", metric: "conversations", target: 10, icon: "chat" },
    { id: "momentum-builder", category: "Conversations", name: "Momentum Builder", description: "Log 25 counted conversations.", metric: "conversations", target: 25, icon: "fire" },
    { id: "connector", category: "Conversations", name: "Connector", description: "Log 50 counted conversations.", metric: "conversations", target: 50, icon: "people" },
    { id: "community-builder", category: "Conversations", name: "Community Builder", description: "Log 100 counted conversations.", metric: "conversations", target: 100, icon: "bridge" },
    { id: "goal-getter", category: "Consistency", name: "Goal Getter", description: "Complete your daily conversation goal.", metric: "goalDays", target: 1, icon: "target" },
    { id: "three-day-spark", category: "Consistency", name: "Three-Day Spark", description: "Complete your daily goal 3 days in a row.", metric: "goalStreak", target: 3, icon: "fire" },
    { id: "one-week-momentum", category: "Consistency", name: "One-Week Momentum", description: "Complete your daily goal 7 days in a row.", metric: "goalStreak", target: 7, icon: "calendar" },
    { id: "consistency-wins", category: "Consistency", name: "Consistency Wins", description: "Complete your daily goal 14 days in a row.", metric: "goalStreak", target: 14, icon: "target" },
    { id: "unstoppable", category: "Consistency", name: "Unstoppable", description: "Complete your daily goal 30 days in a row.", metric: "goalStreak", target: 30, icon: "fire" },
    { id: "follow-through", category: "Follow-Ups", name: "Follow Through", description: "Complete your first scheduled follow-up.", metric: "followUpsCompleted", target: 1, icon: "check" },
    { id: "reliable", category: "Follow-Ups", name: "Reliable", description: "Complete 10 follow-ups.", metric: "followUpsCompleted", target: 10, icon: "check" },
    { id: "relationship-builder", category: "Follow-Ups", name: "Relationship Builder", description: "Complete 25 follow-ups.", metric: "followUpsCompleted", target: 25, icon: "people" },
    { id: "trust-builder", category: "Follow-Ups", name: "Trust Builder", description: "Complete 50 follow-ups.", metric: "followUpsCompleted", target: 50, icon: "bridge" },
    { id: "first-launch", category: "Pipeline", name: "First Launch", description: "Record your first launch.", metric: "launches", target: 1, icon: "flag" },
    { id: "favorite-stop", category: "Organization", name: "Favorite Stop", description: "Save your first favorite networking place.", metric: "favoritePlaces", target: 1, icon: "star" },
    { id: "places-to-go", category: "Organization", name: "Places to Go", description: "Save 3 useful networking places.", metric: "savedPlaces", target: 3, icon: "location" }
  ];

  function evaluateAchievements(state, unlocked = {}) {
    const metrics = achievementMetrics(state);
    const newlyUnlocked = [];
    const progress = definitions.map(definition => {
      const current = Number(metrics[definition.metric]) || 0;
      const unlockDate = unlocked[definition.id] || null;
      if (!unlockDate && current >= definition.target) newlyUnlocked.push(definition.id);
      return { ...definition, current, unlockedAt: unlockDate, complete: Boolean(unlockDate) || current >= definition.target };
    });
    return { metrics, progress, newlyUnlocked };
  }

  function dueReminderEvents(state, now = new Date()) {
    const settings = state.settings || {};
    if (!settings.notificationsEnabled) return [];
    const events = [];
    if (settings.followUpNotifications) {
      (state.contacts || []).filter(contact => !contact.archivedAt).forEach(contact => {
        (contact.followUps || []).filter(item => !item.completedAt && !item.notificationSentAt).forEach(item => {
          const due = new Date(item.dueDate);
          if (!Number.isNaN(due.getTime()) && due <= now) events.push({ type: "followup", contact, followUp: item });
        });
      });
    }
    if (settings.dailyReminderEnabled && state.meta?.dailyReminderSentDate !== dayKey(now)) {
      const [hour, minute] = String(settings.dailyReminderTime || "09:00").split(":").map(Number);
      const reminderAt = new Date(now); reminderAt.setHours(hour || 0, minute || 0, 0, 0);
      const todayCount = (state.contacts || []).flatMap(contact => contact.conversations || []).filter(log => log.isCountedConversation && dayKey(log.conversationDate || log.createdAt) === dayKey(now)).length;
      const goal = Math.max(1, Number(settings.dailyGoal) || 5);
      if (now >= reminderAt && todayCount < goal) events.push({ type: "daily", remaining: goal - todayCount, date: dayKey(now) });
    }
    return events;
  }

  global.BridgeEngagement = Object.freeze({ achievementMetrics, dayKey, definitions, dueReminderEvents, evaluateAchievements });
})(globalThis);
