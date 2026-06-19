/*
檔案位置：skhpsv2/assets/js/admin.js
時間戳：2026-06-13 00:00 UTC+8
用途：skhpsv2 系統後台頁；載入後台顯示位置的外部專案。
*/

(function () {
  "use strict";

  var TASK_NAME = "admin-backend-apps";
  var WAIT_BACKEND_TIMEOUT_MS = 8000;
  var WAIT_BACKEND_INTERVAL_MS = 100;
  var startedAt = Date.now();

  function $(selector) {
    return document.querySelector(selector);
  }

  function rlog(status, action, detail, durationMs) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({
          source: "admin.js",
          category: "external-app",
          action: action,
          status: status,
          detail: detail || "",
          durationMs: durationMs
        });
      }
    } catch (error) {}
  }

  function loadingDone() {
    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done(TASK_NAME);
    }
  }

  function loadingFail(error) {
    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail(TASK_NAME, error);
    } else {
      loadingDone();
    }
  }

  function getRuntime() {
    var state = window.SKHPSRuntime && typeof window.SKHPSRuntime.getState === "function"
      ? window.SKHPSRuntime.getState()
      : {};
    var runtime = state && state.runtime && state.runtime.effective;

    return normalizeRegistryEnv(runtime ||
      document.documentElement.getAttribute("data-skhps-runtime") ||
      "");
  }

  function normalizeRegistryEnv(value) {
    value = String(value || "").trim();
    if (value === "LOCAL") return "local-dev";
    if (value === "DEV") return "dev";
    if (value === "PROD") return "prod";
    return value;
  }

  function waitForBackend() {
    var waitStartedAt = Date.now();

    return new Promise(function (resolve, reject) {
      function check() {
        if (window.SKHPSBackend && typeof window.SKHPSBackend.call === "function") {
          resolve(window.SKHPSBackend);
          return;
        }

        if (Date.now() - waitStartedAt >= WAIT_BACKEND_TIMEOUT_MS) {
          reject(new Error("SKHPSBackend.call not loaded"));
          return;
        }

        window.setTimeout(check, WAIT_BACKEND_INTERVAL_MS);
      }

      check();
    });
  }

  function normalizeApps(response) {
    if (!response) return [];
    if (Array.isArray(response.apps)) return response.apps;
    if (response.data && Array.isArray(response.data.apps)) return response.data.apps;
    return [];
  }

  function isActive(app) {
    if (!app) return false;
    if (app.active === true || app.enabled === true) return true;

    var value = String(app.active || app.enabled || app["啟用"] || "").trim().toLowerCase();
    return value === "true" || value === "是" || value === "1" || value === "yes";
  }

  function normalizeDisplayLocation(app) {
    var value = app && (
      app["顯示位置"] ||
      app.displayPosition ||
      ""
    );
    var text = String(value || "").trim().toLowerCase();

    if (value === "後台" || text === "backend" || text === "back" || text === "admin") return "backend";
    if (value === "前台" || text === "front" || text === "frontend") return "front";
    return "";
  }

  function showInLauncher(app) {
    if (!app) return true;

    var value =
      app.showInLauncher !== undefined ? app.showInLauncher :
      app.show_in_launcher !== undefined ? app.show_in_launcher :
      app["顯示於啟動器"] !== undefined ? app["顯示於啟動器"] :
      app.launcherVisible !== undefined ? app.launcherVisible :
      app.visibleInLauncher;

    if (value === false || value === 0) return false;

    var text = String(value === undefined || value === null ? "" : value).trim().toLowerCase();

    if (!text) return true;
    return !(text === "false" || text === "0" || text === "no" || text === "n" || text === "off" || text === "否" || text === "不顯示");
  }

  function isBackendApp(app) {
    return showInLauncher(app) && isActive(app) && normalizeDisplayLocation(app) === "backend";
  }

  function withRuntime(href, appRuntime) {
    if (!href || href === "#") return href || "#";

    if (window.SKHPSConfig && typeof window.SKHPSConfig.withRuntime === "function") {
      return window.SKHPSConfig.withRuntime(href, window.SKHPS_CONFIG || {}, appRuntime || getRuntime());
    }

    return href;
  }

  function setStatus(text) {
    var status = $("[data-skhps-admin-backend-apps-status]");
    if (status) status.textContent = text || "";
  }

  function renderApp(app) {
    var article = document.createElement("article");
    var link = document.createElement("a");
    var meta = document.createElement("div");
    var title = document.createElement("strong");
    var href = withRuntime(app.href || "#", app.env);

    article.className = "skhps-hero-card skhps-admin-app-card";
    article.setAttribute("data-skhps-admin-backend-app-id", app.appId || "");

    title.textContent = app.title || app.appId || "未命名後台外部專案";

    link.className = "skhps-btn skhps-btn-secondary";
    link.href = href;
    link.textContent = "開啟後台";

    meta.className = "skhps-admin-app-meta";
    meta.innerHTML = [
      "<span>App ID：" + escapeHtml(app.appId || "-") + "</span>",
      "<span>環境：" + escapeHtml(app.env || "-") + "</span>",
      "<span>版本：" + escapeHtml(app.version || "-") + "</span>"
    ].join("");

    article.appendChild(title);
    article.appendChild(meta);
    article.appendChild(link);

    return article;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderBackendApps(apps, runtime) {
    var container = $("[data-skhps-admin-backend-apps]");

    if (!container) return;

    container.innerHTML = "";

    if (!apps.length) {
      setStatus("目前沒有啟用且顯示位置為後台的外部專案（" + (runtime || "runtime 未知") + "）。");
      return;
    }

    apps.forEach(function (app) {
      container.appendChild(renderApp(app));
    });
    setStatus("已載入 " + apps.length + " 個後台外部專案（" + (runtime || "runtime 未知") + "）。");
  }

  function loadBackendApps() {
    var runtime = getRuntime();

    setStatus("後台外部專案載入中...");
    rlog("RUN", "listBackendExternalApps", { env: runtime });

    return waitForBackend()
      .then(function (backend) {
        return backend.listExternalProjects({
          activeOnly: true,
          env: runtime
        });
      })
      .then(function (response) {
        var apps = normalizeApps(response).filter(isBackendApp);

        renderBackendApps(apps, runtime);
        rlog("OK", "listBackendExternalApps", {
          env: runtime,
          count: apps.length
        }, Date.now() - startedAt);
        loadingDone();
      })
      .catch(function (error) {
        console.error("[SKHPSAdmin]", error);
        setStatus("後台外部專案清單讀取失敗：" + (error && error.message ? error.message : String(error)));
        rlog("FAIL", "listBackendExternalApps", {
          env: runtime,
          error: error && error.message ? error.message : String(error)
        }, Date.now() - startedAt);
        loadingFail(error);
      });
  }

  function init() {
    if (!$("[data-skhps-admin-backend-apps]")) {
      loadingDone();
      return;
    }

    loadBackendApps();
  }

  window.SKHPSAdmin = {
    init: init,
    loadBackendApps: loadBackendApps
  };

  rlog("RUN", "moduleStart", "admin.js");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
