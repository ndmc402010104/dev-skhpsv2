/*
檔案位置：skhpsv2/assets/js/footer.js
時間戳記：2026-06-11 UTC+8
用途：
Footer 共用狀態列。
負責顯示環境、version、Backend/API health、CSS Sheet runtime、loading gate tasks、各模組 runtime 狀態。
外部模組或 loading gate 可透過事件或 window.SKHPSFooter API 回報狀態。
Apps Script 一律透過 SKHPSBackend.call()，不自行組 webAppUrl。
*/

(function () {
  "use strict";

  var STATUS_ORDER = {
    error: 1,
    warn: 2,
    pending: 3,
    ok: 4,
    active: 5,
    info: 6
  };

  var TASK_LABELS = {
    "config": "Config",
    "environment": "Env",
    "backend": "Backend",
    "backend-health": "Backend",
    "api": "Backend",
    "sheet": "Sheet",
    "sheet-status": "Sheet",
    "css": "CSS",
    "css-runtime": "CSS",
    "css-sheet": "CSS",
    "css-sheet-runtime": "CSS",
    "staff": "人員名單",
    "staff-list": "人員名單",
    "staff-master": "人員名單",
    "quick-login": "快速登入",
    "quick-login-staff": "快速登入",
    "quick-login-staff-list": "快速登入",
    "meeting": "會議",
    "calendar": "Calendar",
    "external": "外部專案",
    "external-app": "外部專案",
    "external-registry": "外部專案",
    "runtime": "Runtime"
  };

  var CORE_KEYS = {
    System: true,
    Version: true,
    Backend: true,
    CSS: true
  };

  var state = {
    items: {},
    booted: false,
    loadingPatchInstalled: false
  };

  function findFooter() {
    return document.querySelector("[data-skhps-footer]");
  }

  function compactError(error) {
    var message = error && error.message ? error.message : String(error || "failed");
    message = message.replace(/^Error:\s*/, "");

    if (message.length > 80) {
      return message.slice(0, 77) + "...";
    }

    return message;
  }

  function detectEnvironment() {
    var host = window.location.hostname || "";

    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "" ||
      host.indexOf("192.168.") === 0
    ) {
      return "LOCAL";
    }

    if (host.indexOf("dev-skhps") >= 0) {
      return "DEV";
    }

    if (host.indexOf("skhps") >= 0) {
      return "PROD";
    }

    return host || "UNKNOWN";
  }

  function normalizeStatus(status) {
    status = String(status || "info").toLowerCase();

    if (status === "success") return "ok";
    if (status === "ready") return "ok";
    if (status === "done") return "ok";
    if (status === "loaded") return "ok";
    if (status === "warning") return "warn";
    if (status === "failed") return "error";
    if (status === "fail") return "error";
    if (status === "failure") return "error";
    if (status === "missing") return "error";
    if (status === "loading") return "pending";
    if (status === "running") return "pending";

    if (
      status === "ok" ||
      status === "warn" ||
      status === "error" ||
      status === "pending" ||
      status === "active" ||
      status === "info"
    ) {
      return status;
    }

    return "info";
  }

  function statusClass(status) {
    status = normalizeStatus(status);

    if (status === "ok") return "is-ok";
    if (status === "warn") return "is-warn";
    if (status === "error") return "is-error";
    if (status === "pending") return "is-pending";
    if (status === "active") return "is-active";

    return "is-info";
  }

  function normalizeTaskKey(key) {
    return String(key || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/_/g, "-")
      .toLowerCase();
  }

  function toItemKey(key) {
    key = String(key || "").trim();

    if (!key) return "";

    if (CORE_KEYS[key]) return key;

    var normalized = normalizeTaskKey(key);

    if (normalized === "backend" || normalized === "backend-health" || normalized === "api") {
      return "Backend";
    }

    if (normalized === "css" || normalized === "css-runtime" || normalized === "css-sheet-runtime") {
      return "CSS";
    }

    if (normalized === "version") {
      return "Version";
    }

    if (normalized === "system" || normalized === "env" || normalized === "environment") {
      return "System";
    }

    return "Task:" + normalized;
  }

  function labelForKey(key, fallback) {
    var normalized = normalizeTaskKey(key);

    if (TASK_LABELS[normalized]) {
      return TASK_LABELS[normalized];
    }

    if (fallback) {
      return fallback;
    }

    return String(key || "").trim() || "Task";
  }

  function createFooterItem(item) {
    var wrap = document.createElement("span");
    wrap.className = "skhps-footer-item " + statusClass(item.status);
    wrap.dataset.footerKey = item.key || "";

    var titleParts = [];

    if (item.label) titleParts.push(item.label);
    if (item.value) titleParts.push(item.value);
    if (item.detail) titleParts.push(item.detail);

    if (titleParts.length) {
      wrap.title = titleParts.join("｜");
    }

    var dot = document.createElement("span");
    dot.className = "skhps-footer-dot";
    dot.setAttribute("aria-hidden", "true");

    var text = document.createElement("span");
    text.className = "skhps-footer-text";

    if (item.displayText !== undefined && item.displayText !== null) {
      text.textContent = String(item.displayText);
    } else if (item.value) {
      text.textContent = String(item.value);
    } else if (item.label) {
      text.textContent = String(item.label);
    } else {
      text.textContent = "";
    }

    wrap.appendChild(dot);

    if (text.textContent) {
      wrap.appendChild(text);
    }

    return wrap;
  }

  function getSortedItems() {
    return Object.keys(state.items)
      .map(function (key) {
        return state.items[key];
      })
      .sort(function (a, b) {
        var aOrder = typeof a.order === "number" ? a.order : 999;
        var bOrder = typeof b.order === "number" ? b.order : 999;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        var aStatusOrder = STATUS_ORDER[normalizeStatus(a.status)] || 99;
        var bStatusOrder = STATUS_ORDER[normalizeStatus(b.status)] || 99;

        if (aStatusOrder !== bStatusOrder) {
          return aStatusOrder - bStatusOrder;
        }

        return String(a.label || "").localeCompare(String(b.label || ""));
      });
  }

  function renderFooter() {
    var footer = findFooter();

    if (!footer) {
      return;
    }

    footer.classList.add("skhps-footer");
    footer.innerHTML = "";

    var track = document.createElement("span");
    track.className = "skhps-footer-track";

    getSortedItems().forEach(function (item) {
      track.appendChild(createFooterItem(item));
    });

    footer.appendChild(track);
  }

  function setItem(key, patch) {
    key = String(key || "").trim();

    if (!key) {
      return;
    }

    patch = patch || {};

    var oldItem = state.items[key] || {};

    state.items[key] = {
      key: key,
      label: patch.label || oldItem.label || key,
      value: patch.value !== undefined ? patch.value : oldItem.value || "",
      displayText: patch.displayText !== undefined ? patch.displayText : oldItem.displayText,
      status: normalizeStatus(patch.status || oldItem.status || "info"),
      detail: patch.detail !== undefined ? patch.detail : oldItem.detail || "",
      order: patch.order !== undefined ? patch.order : oldItem.order
    };

    renderFooter();
  }

  function removeItem(key) {
    key = String(key || "").trim();

    if (!key) {
      return;
    }

    delete state.items[key];
    renderFooter();
  }

  function ok(key, value, detail, displayText) {
    setItem(key, {
      status: "ok",
      value: value || "OK",
      detail: detail,
      displayText: displayText
    });
  }

  function warn(key, value, detail, displayText) {
    setItem(key, {
      status: "warn",
      value: value || "warning",
      detail: detail,
      displayText: displayText
    });
  }

  function error(key, value, detail, displayText) {
    setItem(key, {
      status: "error",
      value: value || "failed",
      detail: detail,
      displayText: displayText
    });
  }

  function pending(key, value, detail, displayText) {
    setItem(key, {
      status: "pending",
      value: value || "loading",
      detail: detail,
      displayText: displayText
    });
  }

  function info(key, value, detail, displayText) {
    setItem(key, {
      status: "info",
      value: value || "",
      detail: detail,
      displayText: displayText
    });
  }

  function setRuntimeStatus(name, status, detail, options) {
    options = options || {};

    var rawName = String(name || options.key || "").trim();
    var normalized = normalizeTaskKey(rawName);
    var itemKey = toItemKey(rawName);
    var label = options.label || labelForKey(rawName);
    var displayText = options.displayText;

    if (!itemKey) {
      return;
    }

    if (displayText === undefined || displayText === null || displayText === "") {
      displayText = label;
    }

    setItem(itemKey, {
      label: label,
      value: options.value || normalizeStatus(status),
      status: status,
      detail: detail || options.detail || "",
      displayText: displayText,
      order: options.order !== undefined ? options.order : orderForTask(normalized)
    });
  }

  function orderForTask(taskKey) {
    taskKey = normalizeTaskKey(taskKey);

    if (taskKey === "config") return 15;
    if (taskKey === "version") return 20;
    if (taskKey === "backend" || taskKey === "backend-health" || taskKey === "api") return 30;
    if (taskKey === "css" || taskKey === "css-runtime" || taskKey === "css-sheet-runtime") return 40;
    if (taskKey.indexOf("quick-login") >= 0) return 50;
    if (taskKey.indexOf("staff") >= 0) return 55;
    if (taskKey.indexOf("meeting") >= 0) return 60;
    if (taskKey.indexOf("calendar") >= 0) return 65;
    if (taskKey.indexOf("external") >= 0) return 70;

    return 100;
  }

  function parseLoadingTasks() {
    var html = document.documentElement;
    var raw = "";

    if (html) {
      raw =
        html.getAttribute("data-skhps-loading-tasks") ||
        html.getAttribute("data-loading-tasks") ||
        html.getAttribute("data-runtime-tasks") ||
        "";
    }

    return raw
      .split(",")
      .map(function (item) {
        return normalizeTaskKey(item);
      })
      .filter(function (item) {
        return !!item;
      });
  }

  function registerDeclaredLoadingTasks() {
    parseLoadingTasks().forEach(function (taskName) {
      setRuntimeStatus(
        taskName,
        "pending",
        "等待 loading gate task 完成：" + taskName,
        {
          value: "pending",
          displayText: labelForKey(taskName),
          order: orderForTask(taskName)
        }
      );
    });
  }

  function handleTaskEvent(event, fallbackStatus) {
    var detail = event && event.detail ? event.detail : {};
    var taskName =
      detail.task ||
      detail.name ||
      detail.key ||
      detail.id ||
      detail.taskName ||
      detail.label ||
      "";

    var status =
      detail.status ||
      fallbackStatus ||
      "info";

    if (!taskName && typeof detail === "string") {
      taskName = detail;
    }

    if (!taskName) {
      return;
    }

    setRuntimeStatus(
      taskName,
      status,
      detail.message || detail.detail || detail.error || "",
      {
        value: detail.value || status,
        label: detail.label,
        displayText: detail.displayText || detail.label || labelForKey(taskName),
        order: detail.order !== undefined ? detail.order : orderForTask(taskName)
      }
    );
  }

  function installRuntimeEventListeners() {
    document.addEventListener("skhps-loading-task-pending", function (event) {
      handleTaskEvent(event, "pending");
    });

    document.addEventListener("skhps-loading-task-done", function (event) {
      handleTaskEvent(event, "ok");
    });

    document.addEventListener("skhps-loading-task-ready", function (event) {
      handleTaskEvent(event, "ok");
    });

    document.addEventListener("skhps-loading-task-ok", function (event) {
      handleTaskEvent(event, "ok");
    });

    document.addEventListener("skhps-loading-task-warn", function (event) {
      handleTaskEvent(event, "warn");
    });

    document.addEventListener("skhps-loading-task-error", function (event) {
      handleTaskEvent(event, "error");
    });

    document.addEventListener("skhps-loading-task-failed", function (event) {
      handleTaskEvent(event, "error");
    });

    document.addEventListener("skhps-runtime-status", function (event) {
      handleTaskEvent(event, null);
    });

    document.addEventListener("skhps-footer-status", function (event) {
      handleTaskEvent(event, null);
    });

    document.addEventListener("skhps-quick-login-staff-loading", function (event) {
      handleTaskEvent(event, "pending");
    });

    document.addEventListener("skhps-quick-login-staff-ready", function (event) {
      var detail = event && event.detail ? event.detail : {};

      setRuntimeStatus(
        "quick-login-staff",
        "ok",
        detail.message || detail.detail || buildCountDetail("快速登入已成功從 Sheet 載入人員名單", detail.count),
        {
          value: "sheet ready",
          displayText: "快速登入",
          order: 50
        }
      );
    });

    document.addEventListener("skhps-quick-login-staff-failed", function (event) {
      var detail = event && event.detail ? event.detail : {};

      setRuntimeStatus(
        "quick-login-staff",
        "error",
        detail.message || detail.error || detail.detail || "快速登入人員名單 Sheet 載入失敗",
        {
          value: "sheet failed",
          displayText: "快速登入",
          order: 50
        }
      );
    });

    document.addEventListener("skhps-staff-master-ready", function (event) {
      var detail = event && event.detail ? event.detail : {};

      setRuntimeStatus(
        "staff-master",
        "ok",
        detail.message || detail.detail || buildCountDetail("人員主檔已從 Sheet 載入", detail.count),
        {
          value: "sheet ready",
          displayText: "人員名單",
          order: 55
        }
      );
    });

    document.addEventListener("skhps-staff-master-failed", function (event) {
      var detail = event && event.detail ? event.detail : {};

      setRuntimeStatus(
        "staff-master",
        "error",
        detail.message || detail.error || detail.detail || "人員主檔載入失敗",
        {
          value: "sheet failed",
          displayText: "人員名單",
          order: 55
        }
      );
    });
  }

  function buildCountDetail(prefix, count) {
    if (typeof count === "number") {
      return prefix + "，共 " + count + " 筆";
    }

    return prefix;
  }

  function patchSKHPSLoadingIfAvailable() {
    if (state.loadingPatchInstalled) {
      return;
    }

    if (!window.SKHPSLoading) {
      return;
    }

    state.loadingPatchInstalled = true;

    patchLoadingMethod("done", "ok");
    patchLoadingMethod("ready", "ok");
    patchLoadingMethod("ok", "ok");
    patchLoadingMethod("pending", "pending");
    patchLoadingMethod("start", "pending");
    patchLoadingMethod("warn", "warn");
    patchLoadingMethod("error", "error");
    patchLoadingMethod("fail", "error");
    patchLoadingMethod("failed", "error");
  }

  function patchLoadingMethod(methodName, status) {
    if (!window.SKHPSLoading || typeof window.SKHPSLoading[methodName] !== "function") {
      return;
    }

    if (window.SKHPSLoading[methodName].__skhpsFooterPatched) {
      return;
    }

    var original = window.SKHPSLoading[methodName];

    var patched = function (taskName) {
      var result = original.apply(this, arguments);

      if (taskName) {
        setRuntimeStatus(
          taskName,
          status,
          "SKHPSLoading." + methodName + "(" + taskName + ")",
          {
            value: status,
            displayText: labelForKey(taskName),
            order: orderForTask(taskName)
          }
        );
      }

      return result;
    };

    patched.__skhpsFooterPatched = true;
    window.SKHPSLoading[methodName] = patched;
  }

  function startLoadingPatchPoll() {
    patchSKHPSLoadingIfAvailable();

    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      patchSKHPSLoadingIfAvailable();

      if (state.loadingPatchInstalled || tries >= 40) {
        window.clearInterval(timer);
      }
    }, 250);
  }

  function getVersionFromGlobals() {
    var meta;

    if (window.SKHPSConfig) {
      if (window.SKHPSConfig.version) {
        return String(window.SKHPSConfig.version);
      }

      if (window.SKHPSConfig.VERSION) {
        return String(window.SKHPSConfig.VERSION);
      }

      if (window.SKHPSConfig.appVersion) {
        return String(window.SKHPSConfig.appVersion);
      }
    }

    if (window.SKHPS_VERSION) {
      return String(window.SKHPS_VERSION);
    }

    if (window.__SKHPS_VERSION__) {
      return String(window.__SKHPS_VERSION__);
    }

    meta = document.querySelector('meta[name="skhps-version"]');

    if (meta && meta.getAttribute("content")) {
      return meta.getAttribute("content");
    }

    if (document.documentElement && document.documentElement.getAttribute("data-skhps-version")) {
      return document.documentElement.getAttribute("data-skhps-version");
    }

    return "";
  }

  function loadVersion() {
    var globalVersion = getVersionFromGlobals();

    pending("Version", "loading", "讀取版本資訊", "Version");

    if (globalVersion) {
      ok("Version", globalVersion, "version from global/meta/html", globalVersion);
      return Promise.resolve();
    }

    if (!window.SKHPSConfig || typeof window.SKHPSConfig.loadVersion !== "function") {
      error("Version", "missing", "找不到版本來源：SKHPSConfig.loadVersion / SKHPSConfig.version / meta / html data-skhps-version", "Version");
      return Promise.resolve();
    }

    return window.SKHPSConfig.loadVersion()
      .then(function (version) {
        var versionText =
          version && version.version ? version.version :
          version && version.VERSION ? version.VERSION :
          version && version.appVersion ? version.appVersion :
          "";

        if (!versionText) {
          error(
            "Version",
            "missing",
            "version.json loaded，但沒有 version 欄位",
            "Version"
          );
          return;
        }

        ok(
          "Version",
          versionText,
          "version.json loaded",
          versionText
        );
      })
      .catch(function (err) {
        console.warn("Footer version failed:", err);

        error(
          "Version",
          "version failed",
          compactError(err),
          "Version"
        );
      });
  }

  function checkBackend() {
    pending("Backend", "testing", "檢查 Apps Script health", "Backend");

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      error("Backend", "missing", "SKHPSBackend.call 不存在", "Backend");
      return Promise.resolve();
    }

    return window.SKHPSBackend.call("health")
      .then(function (response) {
        if (response && response.ok === true) {
          var envText = response.env || "backend";

          ok(
            "Backend",
            envText,
            "Apps Script health OK",
            envText
          );
          return;
        }

        error(
          "Backend",
          response && response.error ? response.error : "failed",
          "health 回傳非 ok",
          "Backend"
        );
      })
      .catch(function (err) {
        console.warn("Footer Apps Script health failed:", err);

        error(
          "Backend",
          "failed",
          compactError(err),
          "Backend"
        );
      });
  }

  function updateFromCssRuntime(runtime) {
    if (!runtime) {
      return false;
    }

    var count = runtime.sheetKeys ? runtime.sheetKeys.length : "?";
    var source = runtime.source || "runtime";

    ok(
      "CSS",
      "ready",
      "CSS Sheet runtime ready from " + source + " / " + count + " sheet(s)",
      "CSS"
    );

    setRuntimeStatus(
      "css-runtime",
      "ok",
      "CSS Sheet runtime ready from " + source + " / " + count + " sheet(s)",
      {
        value: "ready",
        displayText: "CSS",
        order: 40
      }
    );

    return true;
  }

  function watchCssRuntime() {
    pending("CSS", "runtime pending", "等待 CSS Sheet runtime", "CSS");

    if (window.SKHPSCssSheetRuntime) {
      updateFromCssRuntime(window.SKHPSCssSheetRuntime);
    }

    document.addEventListener("skhps-css-sheet-runtime-ready", function (event) {
      updateFromCssRuntime(event.detail || window.SKHPSCssSheetRuntime);
    });
  }

  function checkSheetStatusOnlyIfRuntimeMissing() {
    if (
      state.items.CSS &&
      normalizeStatus(state.items.CSS.status) === "ok"
    ) {
      return Promise.resolve();
    }

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      warn("CSS", "runtime pending", "Backend missing，無法查 sheetStatus", "CSS");
      return Promise.resolve();
    }

    return window.SKHPSBackend.call("sheetStatus")
      .then(function (response) {
        if (
          state.items.CSS &&
          normalizeStatus(state.items.CSS.status) === "ok"
        ) {
          return;
        }

        if (response && response.ok === true) {
          var count = response.data && response.data.sheetCount
            ? response.data.sheetCount
            : "OK";

          ok(
            "CSS",
            "api " + count,
            "sheetStatus OK，但 runtime 尚未回報",
            "CSS"
          );
          return;
        }

        warn(
          "CSS",
          response && response.error ? response.error : "status failed",
          "sheetStatus failed",
          "CSS"
        );
      })
      .catch(function (err) {
        if (
          state.items.CSS &&
          normalizeStatus(state.items.CSS.status) === "ok"
        ) {
          return;
        }

        warn(
          "CSS",
          "runtime pending",
          compactError(err),
          "CSS"
        );
      });
  }

  function boot() {
    if (state.booted) {
      renderFooter();
      return;
    }

    state.booted = true;

    var env = detectEnvironment();

    setItem("System", {
      label: "SKHPS",
      value: env,
      displayText: env,
      status: "active",
      detail: window.location.hostname || "local file",
      order: 10
    });

    setItem("Version", {
      label: "Version",
      value: "loading",
      displayText: "Version",
      status: "pending",
      detail: "",
      order: 20
    });

    setItem("Backend", {
      label: "Backend",
      value: "testing",
      displayText: "Backend",
      status: "pending",
      detail: "",
      order: 30
    });

    setItem("CSS", {
      label: "CSS",
      value: "runtime pending",
      displayText: "CSS",
      status: "pending",
      detail: "",
      order: 40
    });

    renderFooter();

    registerDeclaredLoadingTasks();
    installRuntimeEventListeners();
    startLoadingPatchPoll();

    watchCssRuntime();
    loadVersion();
    checkBackend();
    checkSheetStatusOnlyIfRuntimeMissing();
  }

  window.SKHPSFooter = {
    set: setItem,
    remove: removeItem,

    ok: ok,
    warn: warn,
    error: error,
    pending: pending,
    info: info,

    setRuntimeStatus: setRuntimeStatus,
    taskPending: function (taskName, detail) {
      setRuntimeStatus(taskName, "pending", detail, {
        value: "pending",
        displayText: labelForKey(taskName),
        order: orderForTask(taskName)
      });
    },
    taskDone: function (taskName, detail) {
      setRuntimeStatus(taskName, "ok", detail, {
        value: "done",
        displayText: labelForKey(taskName),
        order: orderForTask(taskName)
      });
    },
    taskWarn: function (taskName, detail) {
      setRuntimeStatus(taskName, "warn", detail, {
        value: "warn",
        displayText: labelForKey(taskName),
        order: orderForTask(taskName)
      });
    },
    taskError: function (taskName, detail) {
      setRuntimeStatus(taskName, "error", detail, {
        value: "error",
        displayText: labelForKey(taskName),
        order: orderForTask(taskName)
      });
    },

    quickLoginStaffPending: function (detail) {
      setRuntimeStatus("quick-login-staff", "pending", detail || "快速登入人員名單載入中", {
        value: "loading",
        displayText: "快速登入",
        order: 50
      });
    },
    quickLoginStaffReady: function (count, detail) {
      setRuntimeStatus("quick-login-staff", "ok", detail || buildCountDetail("快速登入已成功從 Sheet 載入人員名單", count), {
        value: "sheet ready",
        displayText: "快速登入",
        order: 50
      });
    },
    quickLoginStaffFailed: function (errorMessage) {
      setRuntimeStatus("quick-login-staff", "error", errorMessage || "快速登入人員名單 Sheet 載入失敗", {
        value: "sheet failed",
        displayText: "快速登入",
        order: 50
      });
    },

    render: renderFooter,
    boot: boot
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();