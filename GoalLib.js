/* ===========================================================
   GoalLib.js — Universal Goal System Library for StreamElements
   =========================================================== */

(function (global) {
  const GoalLib = {
    version: "1.0.0",
    debug: false,
    state: {},
    listeners: {},
    alwaysVisibleTimer: null,

    log(...args) {
      if (GoalLib.debug) console.log("[GoalLib]", ...args);
    },

    on(event, callback) {
      if (!GoalLib.listeners[event]) GoalLib.listeners[event] = [];
      GoalLib.listeners[event].push(callback);
    },

    emit(event, data) {
      if (!GoalLib.listeners[event]) return;
      for (const cb of GoalLib.listeners[event]) cb(data);
    },

    init(fieldData) {
      GoalLib.state = {
        eventType: fieldData.eventType?.value || "follower",
        eventPeriod: fieldData.eventPeriod?.value || "session",
        goalAmount: Number(fieldData.goal?.value) || 100,
        baseGoal: Number(fieldData.goal?.value) || 100,
        progress: 0,
        title: fieldData.titleText?.value || "Goal",
        showSparkles: !!fieldData.showSparkles?.value,
        showTitle: !!fieldData.showtitle?.value,
        showProgress: !!fieldData.showprogress?.value,
        resubs: !!fieldData.resubs?.value,
        goalReachedAction: fieldData.goalReachedAction?.value || "stop",
        goalIncreaseAmount: Number(fieldData.goalIncreaseAmount?.value) || 0,
        roles: (fieldData.roles?.value || "broadcaster,mod")
          .split(",")
          .map((r) => r.trim().toLowerCase()),
        baseCommand: fieldData.baseCommand?.value || "!ticket",
        eventCurrency: fieldData.currency?.value || "$",
        textPosition: fieldData.textposition?.value || "bottom",
        alwaysVisible: fieldData.alwaysVisible?.value || false,
        widgetVisible: true,
        goalReached: false,
      };

      GoalLib.debug = fieldData.debug?.value || false;

      GoalLib.log("Init complete", GoalLib.state);
      GoalLib.setupListeners();
      if (GoalLib.state.eventPeriod === "custom") {
        GoalLib.load();
      }
    },

    setupListeners() {
      window.addEventListener("onEventReceived", GoalLib.onEventReceived);
      window.addEventListener("onWidgetLoad", GoalLib.onWidgetLoad);
    },

    onWidgetLoad(obj) {
      const s = GoalLib.state;
      const data = obj?.detail?.session?.data || {};
      const index = `${s.eventType}-${s.eventPeriod}`;
      const entry = data[index] || {};

      if (s.eventPeriod !== "custom") {
        if (s.eventType === "tip" || s.eventType === "cheer") {
          s.progress = Number(entry.amount) || 0;
        } else {
          s.progress = Number(entry.count) || 0;
        }
      }
      GoalLib.update();
    },

    async onEventReceived(obj) {
      const listener = obj?.detail?.listener;
      const data = obj?.detail?.event || {};

      // Always visible system
      if (GoalLib.state.alwaysVisible) {
        GoalLib.applyVisibility(true);
        clearTimeout(GoalLib.alwaysVisibleTimer);
        GoalLib.alwaysVisibleTimer = setTimeout(() => {
          GoalLib.applyVisibility(false);
        }, 10000);
      }

      if (listener === "message") {
        const message = data.renderedText?.trim() || "";
        if (!message.toLowerCase().startsWith(GoalLib.state.baseCommand)) return;
        const role = GoalLib.getUserRole(data);
        if (!GoalLib.state.roles.includes(role)) {
          GoalLib.log("Role not allowed:", role);
          return;
        }
        GoalLib.handleCommand(message);
        return;
      }

      // Standard StreamElements events
      const s = GoalLib.state;
      const amount = Number(data.amount) || 0;
      const gift = data.bulkGifted;
      if (listener === "subscriber-latest" && s.eventType === "subscriber") {
        const isResub = data.amount > 1 || data.cumulativeMonths > 1;
        if (!s.resubs && isResub && gift !== true) return;
        s.progress++;
      } else if (listener === "follower-latest" && s.eventType === "follower") {
        s.progress++;
      } else if (listener === "tip-latest" && s.eventType === "tip") {
        s.progress += amount;
      } else if (listener === "cheer-latest" && s.eventType === "cheer") {
        s.progress += amount;
      }

      GoalLib.update();
      if (s.eventPeriod === "custom") GoalLib.save();
    },

    getUserRole(data) {
      let role = "viewer";
      const badges = data.data?.badges || [];
      if (Array.isArray(badges)) {
        const list = badges.map((b) => b.type);
        if (list.includes("broadcaster")) role = "broadcaster";
        else if (list.includes("mod")) role = "mod";
        else if (list.includes("vip")) role = "vip";
        else if (list.includes("subscriber") || list.includes("founder"))
          role = "subscriber";
        else if (list.includes("artist-badge")) role = "artist";
      } else if (data.data?.tags?.badges) {
        const list = data.data.tags.badges
          .split(",")
          .map((b) => b.split("/")[0]);
        if (list.includes("broadcaster")) role = "broadcaster";
        else if (list.includes("mod")) role = "mod";
        else if (list.includes("vip")) role = "vip";
        else if (list.includes("subscriber") || list.includes("founder"))
          role = "subscriber";
        else if (list.includes("artist-badge")) role = "artist";
      }
      return role;
    },

    handleCommand(msg) {
      const s = GoalLib.state;
      const args = msg.slice(s.baseCommand.length).trim().split(/\s+/);
      const command = args.shift()?.toLowerCase() || "";
      const val = parseInt(args[0], 10);

      GoalLib.log("Command:", command, args);

      switch (command) {
        case "progress":
          if (!isNaN(val)) GoalLib.updateProgress(val);
          break;
        case "goal":
          if (!isNaN(val)) GoalLib.updateGoal(val);
          break;
        case "increase":
          if (!isNaN(val)) GoalLib.increaseGoal(val);
          break;
        case "reset":
          const type = args[0]?.toLowerCase();
          if (type === "all") GoalLib.resetAll(s.baseGoal);
          else if (type === "goal") GoalLib.resetGoal(s.baseGoal);
          else if (type === "progress") GoalLib.resetProgress();
          break;
        case "title":
          const newTitle = args.join(" ").replace(/^["']|["']$/g, "");
          s.title = newTitle;
          GoalLib.update();
          break;
        case "hide":
          GoalLib.applyVisibility(false);
          break;
        case "show":
          GoalLib.applyVisibility(true);
          break;
      }
      if (s.eventPeriod === "custom") GoalLib.save();
    },

    update() {
      const s = GoalLib.state;
      const percent =
        s.goalAmount > 0 ? Math.min((s.progress / s.goalAmount) * 100, 100) : 0;
      GoalLib.emit("update", {
        progress: s.progress,
        goal: s.goalAmount,
        percent,
        title: s.title,
        eventType: s.eventType,
        visible: s.widgetVisible,
      });
      GoalLib.log(
        `Progress updated → ${s.progress}/${s.goalAmount} (${percent.toFixed(
          1
        )}%)`
      );
      if (percent >= 100 && !s.goalReached) GoalLib.handleGoalReached();
    },

    async handleGoalReached() {
      const s = GoalLib.state;
      s.goalReached = true;
      GoalLib.emit("goalReached", s);
      GoalLib.log("Goal reached!");
      switch (s.goalReachedAction) {
        case "stop":
          break;
        case "increase":
          await GoalLib.increaseGoal(s.goalIncreaseAmount);
          s.goalReached = false;
          break;
        case "reset":
          await GoalLib.resetAll(s.baseGoal);
          s.goalReached = false;
          break;
      }
      if (s.eventPeriod === "custom") GoalLib.save();
    },

    async save() {
      const s = GoalLib.state;
      const key = `GoalLib:${s.eventType}:${s.eventPeriod}`;
      await SE_API.store.set(key, {
        goalAmount: s.goalAmount,
        progress: s.progress,
        title: s.title,
        widgetVisible: s.widgetVisible,
      });
      GoalLib.emit("save", s);
      GoalLib.log("Custom save stored");
    },

    async load() {
      const s = GoalLib.state;
      const key = `GoalLib:${s.eventType}:${s.eventPeriod}`;
      const data = await SE_API.store.get(key);
      if (data) {
        s.goalAmount = Number(data.goalAmount) || s.goalAmount;
        s.progress = Number(data.progress) || 0;
        s.title = data.title || s.title;
        s.widgetVisible = data.widgetVisible !== false;
        GoalLib.log("Custom data loaded");
      } else {
        await GoalLib.save();
      }
      GoalLib.update();
    },

    updateProgress(value) {
      GoalLib.state.progress = value;
      GoalLib.update();
    },

    updateGoal(value) {
      GoalLib.state.goalAmount = value;
      GoalLib.update();
    },

    async increaseGoal(amount) {
      GoalLib.state.goalAmount += amount;
      GoalLib.update();
      await GoalLib.save();
    },

    async resetGoal(value) {
      GoalLib.state.goalAmount = value;
      GoalLib.update();
      await GoalLib.save();
    },

    async resetProgress() {
      GoalLib.state.progress = 0;
      GoalLib.update();
      await GoalLib.save();
    },

    async resetAll(value = 0) {
      GoalLib.state.goalAmount = value;
      GoalLib.state.progress = 0;
      GoalLib.update();
      await GoalLib.save();
    },

    applyVisibility(state) {
      GoalLib.state.widgetVisible = state;
      GoalLib.emit("visibilityChange", state);
      GoalLib.log("Visibility:", state ? "shown" : "hidden");
      if (GoalLib.state.eventPeriod === "custom") GoalLib.save();
    },
  };

  global.GoalLib = GoalLib;
})(typeof window !== "undefined" ? window : globalThis);
