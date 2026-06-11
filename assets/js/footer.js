/*
檔案位置：skhpsv2/assets/js/footer.js
時間戳記：2026-06-11 UTC+8
用途：Footer 共用狀態列。只讀 SKHPSRuntime 狀態，不自行偵測 env/backend/css。
*/

(function () {
  "use strict";

  var booted = false;

  function runtime() {
    return window.SKHPSRuntime || null;
  }

  function findFooter() {
    return document.querySelector("[data-skhps-footer]");
  }

  function getState() {
    if (runtime() && typeof runtime().getState === "function") {
      return runtime().getState();
    }

    return null;
  }

  function normalizeStatus(status) {
    status = String(status || "").toLowerCase();

    if (status === "ok" || status === "done" || status === "loaded" || status === "true") return "ok";
    if (status === "fail" || status === "failed" || status === "error" || status === "false") return "error";
    if (status === "warn" || status === "warning") return "warn";
    if (status === "waiting" || status === "pending" || status === "loading") return "pending";
    if (status === "active") return "active";

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

  function compact(value) {
    if (value === null || value === undefined || value === "") return "";
    value = String(value);
    return value.length > 80 ? value.slice(0, 77) + "..." : value;
  }

  function item(label, value, status, detail, order) {
    return {
      label: label,
      value: value,
      status: status,
      detail: detail || "",
      order: order
    };
  }

  function loadingSummary(state) {
    var gate = state.loadingGate || {};
    var required = gate.requiredTasks || [];
    var completed = gate.completedTasks || [];
    var failed = gate.failedTasks || [];

    if (!required.length) {
      return item("Loading", "no tasks", "info", "", 50);
    }

    if (failed.length) {
      return item("Loading", completed.length + "/" + required.length, "warn", failed.map(function (entry) {
        return entry.task + ": " + entry.error;
      }).join(" | "), 50);
    }

    if (completed.length >= required.length) {
      return item("Loading", "ready", "ok", required.join(", "), 50);
    }

    return item("Loading", completed.length + "/" + required.length, "pending", required.join(", "), 50);
  }

  function moduleItems(state) {
    return Object.keys(state.modules || {}).map(function (name, index) {
      var moduleState = state.modules[name] || {};
      return item(
        name,
        moduleState.status || "waiting",
        moduleState.status || "pending",
        moduleState.error || "",
        100 + index
      );
    });
  }

  function buildItems(state) {
    if (!state) {
      return [
        item("Runtime", "missing", "error", "SKHPSRuntime 尚未載入", 10)
      ];
    }

    var host = state.host || {};
    var runtimeState = state.runtime || {};
    var config = state.config || {};
    var backend = state.backend || {};
    var cssRuntime = state.cssRuntime || {};

    var items = [
      item("Host", host.env || "UNKNOWN", host.env === "UNKNOWN" ? "warn" : "active", host.hostname || "file", 10),
      item("Runtime", runtimeState.effective || "UNKNOWN", runtimeState.effective === "UNKNOWN" ? "warn" : "active", "requested: " + (runtimeState.requested || "auto"), 20),
      item("Config", config.loaded ? "loaded" : "waiting", config.loaded ? "ok" : "pending", config.source || "", 30),
      item("Backend", backend.healthy === false ? "failed" : backend.loaded ? (backend.healthy === true ? "healthy" : "loaded") : "waiting", backend.healthy === false ? "error" : backend.loaded ? "ok" : "pending", backend.endpoint || "", 40),
      loadingSummary(state),
      item("CSS", cssRuntime.loaded ? "ready" : "waiting", cssRuntime.loaded ? "ok" : "pending", cssRuntime.source || "", 60)
    ];

    return items.concat(moduleItems(state)).sort(function (a, b) {
      return a.order - b.order;
    });
  }

  function createFooterItem(data) {
    var wrap = document.createElement("span");
    wrap.className = "skhps-footer-item " + statusClass(data.status);

    var title = [data.label, data.value, data.detail].filter(Boolean).join(" | ");
    if (title) wrap.title = title;

    var dot = document.createElement("span");
    dot.className = "skhps-footer-dot";
    dot.setAttribute("aria-hidden", "true");

    var text = document.createElement("span");
    text.className = "skhps-footer-text";
    text.textContent = data.label + (data.value ? ": " + compact(data.value) : "");

    wrap.appendChild(dot);
    wrap.appendChild(text);
    return wrap;
  }

  function render() {
    var footer = findFooter();
    if (!footer) return;

    footer.classList.add("skhps-footer");
    footer.innerHTML = "";

    var track = document.createElement("span");
    track.className = "skhps-footer-track";

    buildItems(getState()).forEach(function (data) {
      track.appendChild(createFooterItem(data));
    });

    footer.appendChild(track);
  }

  function logViaRuntime(level, key, value, detail) {
    if (runtime() && typeof runtime().log === "function") {
      runtime().log({
        level: level,
        module: "footer",
        message: key + (value ? ": " + value : ""),
        data: detail || null
      });
    }

    render();
  }

  function setRuntimeStatus(name, status, detail, options) {
    options = options || {};

    if (runtime()) {
      if (status === "ok" && typeof runtime().done === "function") {
        runtime().done(name, {
          detail: detail || options.detail || ""
        });
      } else if ((status === "error" || status === "fail" || status === "failed") && typeof runtime().fail === "function") {
        runtime().fail(name, detail || "failed", options);
      } else if (typeof runtime().start === "function") {
        runtime().start(name);
      }
    }

    render();
  }

  function boot() {
    if (booted) {
      render();
      return;
    }

    booted = true;
    render();

    document.addEventListener("skhps-runtime-updated", render);
    document.addEventListener("skhps-css-sheet-runtime-ready", render);
    document.addEventListener("skhps-external-app-loader-ready", render);
  }

  window.SKHPSFooter = {
    set: function (key, patch) {
      logViaRuntime("info", key, patch && patch.value, patch);
    },
    remove: render,
    ok: function (key, value, detail) {
      setRuntimeStatus(key, "ok", detail || value);
    },
    warn: function (key, value, detail) {
      logViaRuntime("warn", key, value, detail);
    },
    error: function (key, value, detail) {
      setRuntimeStatus(key, "error", detail || value);
    },
    pending: function (key, value, detail) {
      setRuntimeStatus(key, "pending", detail || value);
    },
    info: function (key, value, detail) {
      logViaRuntime("info", key, value, detail);
    },
    setRuntimeStatus: setRuntimeStatus,
    taskPending: function (taskName) {
      if (runtime() && typeof runtime().setLoadingRequired === "function") {
        var state = getState();
        var required = state && state.loadingGate ? state.loadingGate.requiredTasks.slice() : [];
        if (required.indexOf(taskName) < 0) required.push(taskName);
        runtime().setLoadingRequired(required);
      }
    },
    taskDone: function (taskName) {
      if (runtime() && typeof runtime().taskDone === "function") {
        runtime().taskDone(taskName);
      }
    },
    taskWarn: function (taskName, detail) {
      logViaRuntime("warn", taskName, "warning", detail);
    },
    taskError: function (taskName, detail) {
      if (runtime() && typeof runtime().taskFailed === "function") {
        runtime().taskFailed(taskName, detail || "failed");
      }
    },
    quickLoginStaffPending: function (detail) {
      setRuntimeStatus("quick-login-staff", "pending", detail);
    },
    quickLoginStaffReady: function (count, detail) {
      setRuntimeStatus("quick-login-staff", "ok", detail || ("count: " + count));
    },
    quickLoginStaffFailed: function (errorMessage) {
      setRuntimeStatus("quick-login-staff", "error", errorMessage);
    },
    render: render,
    boot: boot
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
