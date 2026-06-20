/*
檔案位置：skhpsv2/assets/js/external-apps-runtime.js
時間戳：2026-06-21 UTC+8
用途：首頁讀取 external app registry（Apps Script / Sheet 或 Cloudflare / Supabase 競速），只顯示目前 runtime、啟用=true、且「顯示位置」為前台的外部專案。

Loading Gate：
- 任務名稱：external-apps-layout
- 語意：首頁外部專案區塊的 layout 已穩定，可以解除全頁 loading。
- 成功讀取 listExternalProjects 並 render 完成：done
- 讀取失敗但錯誤訊息已 render：fail
- 舊 loading task 名稱 external-apps-runtime 不再由本檔回報；若 HTML 尚未更新，由 entry-core.js 統一正規化成 external-apps-layout。

規則：
- 功能資料 / backend 資料不使用 localStorage cache。
- 首頁系統入口是可操作功能，必須等 backend 回來並完成 render 後才放行。
- CSS 可以 cache；功能資料不要 cache。
- 放行前只處理會影響首屏 layout 的 listExternalProjects / filter / sort / render。
- 放行後若未來要補 health、version、diagnostics、footer 狀態，只能更新既有區塊文字或 badge，不得新增/刪除卡片或改變高度。
*/

(function () {
  "use strict";

  var TASK_NAME = "external-apps-layout";
  var CONTAINER_SELECTOR = "[data-skhps-external-apps]";
  var STATUS_SELECTOR = "[data-skhps-external-apps-status]";
  var COUNT_SELECTOR = "[data-skhps-external-apps-count]";
  var WAIT_BACKEND_TIMEOUT_MS = 8000;
  var WAIT_BACKEND_INTERVAL_MS = 100;

  var loadStartedAt = Date.now();
  var readyMarked = false;

  function rlog(status, action, detail, durationMs) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({
          source: "external-apps-runtime.js",
          category: "external-app",
          action: action,
          status: status,
          detail: detail || "",
          durationMs: durationMs
        });
      }
    } catch (error) {}
  }

  function setRuntimeExternalApps(data) {
    try {
      if (window.SKHPSRuntime && typeof window.SKHPSRuntime.setExternalApps === "function") {
        window.SKHPSRuntime.setExternalApps(data || {});
      }
    } catch (error) {}
  }

  rlog("RUN", "moduleStart", TASK_NAME);

  function $(selector) {
    return document.querySelector(selector);
  }

  function markReady() {
    if (readyMarked) {
      return;
    }

    readyMarked = true;

    document.documentElement.setAttribute("data-skhps-external-apps-layout-ready", "true");
    document.documentElement.setAttribute("data-skhps-external-apps-layout-ready-reason", "backend-rendered");

    rlog("OK", "layoutReady", TASK_NAME, Date.now() - loadStartedAt);

    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done(TASK_NAME);
    }
  }

  function markFailed(error) {
    if (readyMarked) {
      return;
    }

    readyMarked = true;

    var message = error && error.message ? error.message : String(error || "unknown");

    document.documentElement.setAttribute("data-skhps-external-apps-layout-ready", "false");
    document.documentElement.setAttribute("data-skhps-external-apps-layout-error", message);

    rlog("FAIL", "layoutReady", {
      task: TASK_NAME,
      error: message
    }, Date.now() - loadStartedAt);

    setRuntimeExternalApps({
      loaded: false,
      task: TASK_NAME,
      source: "backend",
      error: message,
      durationMs: Date.now() - loadStartedAt
    });

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail(TASK_NAME, error);
    }
  }

  function normalizeRegistryEnv(value) {
    value = String(value || "").trim();

    if (value === "LOCAL") return "local-dev";
    if (value === "DEV") return "dev";
    if (value === "PROD") return "prod";

    return value;
  }

  function getRuntime() {
    if (window.SKHPSRuntime && typeof window.SKHPSRuntime.getState === "function") {
      var state = window.SKHPSRuntime.getState();
      if (state && state.runtime && state.runtime.effective) {
        return normalizeRegistryEnv(state.runtime.effective);
      }
    }

    var fromHtml = document.documentElement.getAttribute("data-skhps-runtime");
    if (fromHtml) {
      return normalizeRegistryEnv(fromHtml);
    }

    if (window.SKHPSConfig && typeof window.SKHPSConfig.getEnv === "function") {
      return normalizeRegistryEnv(window.SKHPSConfig.getEnv(window.SKHPS_CONFIG));
    }

    if (window.SKHPS_CONFIG && window.SKHPS_CONFIG.env) {
      return normalizeRegistryEnv(window.SKHPS_CONFIG.env);
    }

    return "";
  }

  function setStatus(text) {
    var el = $(STATUS_SELECTOR);
    if (el) {
      el.textContent = text || "";
    }
  }

  function setCount(value) {
    var el = $(COUNT_SELECTOR);
    if (el) {
      el.textContent = String(value);
    }
  }

  function clearContainer() {
    var container = $(CONTAINER_SELECTOR);

    if (container) {
      container.innerHTML = "";
    }

    return container;
  }


  function isLocalDevHost(host) {
    host = String(host || "").toLowerCase();

    return (
      host === "" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)
    );
  }

  function rewriteLocalDevUrl(url, env) {
    var raw = String(url || "").trim();
    var output;

    if (!raw || String(env || "") !== "local-dev") {
      return url || "";
    }

    if (window.SKHPSConfig && typeof window.SKHPSConfig.rewriteLocalDevUrl === "function") {
      return window.SKHPSConfig.rewriteLocalDevUrl(raw, env);
    }

    try {
      output = new URL(raw, window.location.href);

      if (isLocalDevHost(output.hostname)) {
        output.protocol = window.location.protocol || output.protocol;
        output.hostname = window.location.hostname || output.hostname;
        output.port = window.location.port || output.port;
        return output.toString();
      }
    } catch (error) {}

    return raw;
  }

  function createAppButton(app) {
    var a = document.createElement("a");
    var env = app.env || getRuntime();
    var href = rewriteLocalDevUrl(app.href || "#", env);

    if (href !== "#" && window.SKHPSConfig && typeof window.SKHPSConfig.withRuntime === "function") {
      href = window.SKHPSConfig.withRuntime(href, window.SKHPS_CONFIG || {}, env);
    }

    a.className = "skhps-btn skhps-btn-secondary skhps-btn-lg";
    a.href = href;
    a.textContent = app.title || app.appId || "未命名外部專案";
    a.setAttribute("data-skhps-external-app-id", app.appId || "");
    a.setAttribute("data-skhps-external-app-env", app.env || "");

    return a;
  }

  function normalizeApps(response) {
    if (!response) return [];
    if (Array.isArray(response.apps)) return response.apps;
    if (Array.isArray(response.projects)) return response.projects;
    if (Array.isArray(response.items)) return response.items;
    if (response.data && Array.isArray(response.data.apps)) return response.data.apps;
    if (response.data && Array.isArray(response.data.projects)) return response.data.projects;
    if (response.data && Array.isArray(response.data.items)) return response.data.items;
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
      app.placement ||
      app.location ||
      ""
    );

    var text = String(value || "").trim().toLowerCase();

    if (text === "front" || text === "frontend" || value === "前台") return "front";
    if (text === "back" || text === "backend" || text === "admin" || value === "後台") return "backend";

    return "";
  }

  function isFrontendApp(app) {
    return isActive(app) && normalizeDisplayLocation(app) === "front";
  }

  function getOrder(app) {
    var value = app && (
      app.order ||
      app.sort ||
      app.sortOrder ||
      app.sort_order ||
      app["排序"] ||
      9999
    );

    var number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }

    return 9999;
  }

  function sortApps(apps) {
    return (apps || []).slice().sort(function (a, b) {
      var orderA = getOrder(a);
      var orderB = getOrder(b);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return String(a.title || a.appId || "").localeCompare(
        String(b.title || b.appId || ""),
        "zh-Hant"
      );
    });
  }

  function filterHomeApps(apps) {
    return sortApps((apps || []).filter(isFrontendApp));
  }

  function renderApps(apps, runtime) {
    var container = clearContainer();

    if (!container) {
      throw new Error("missing external apps container: " + CONTAINER_SELECTOR);
    }

    setCount(apps.length);

    if (!apps.length) {
      setStatus("目前沒有啟用中的外部專案（" + runtime + "）");
      return;
    }

    apps.forEach(function (app) {
      container.appendChild(createAppButton(app));
    });

    setStatus("已載入 " + apps.length + " 個外部專案（" + runtime + "）");
  }

  function renderError(error) {
    var message = error && error.message ? error.message : String(error || "未知錯誤");

    console.error("[SKHPSExternalAppsRuntime]", error);

    clearContainer();
    setCount("讀取失敗");
    setStatus("外部專案清單讀取失敗：" + message);
  }

  function waitForBackend() {
    var startedAt = Date.now();

    return new Promise(function (resolve, reject) {
      function check() {
        if (window.SKHPSBackend && typeof window.SKHPSBackend.call === "function") {
          resolve(window.SKHPSBackend);
          return;
        }

        if (Date.now() - startedAt >= WAIT_BACKEND_TIMEOUT_MS) {
          reject(new Error("SKHPSBackend.call not loaded"));
          return;
        }

        window.setTimeout(check, WAIT_BACKEND_INTERVAL_MS);
      }

      check();
    });
  }

  function callBackend(action, payload) {
    return waitForBackend().then(function (backend) {
      return backend.call(action, payload || {});
    });
  }

  function listExternalApps(runtime) {
    rlog("RUN", "listExternalApps", {
      env: runtime
    });

    return callBackend("listExternalProjects", {
      activeOnly: true,
      env: runtime
    }).then(function (response) {
      console.info("[SKHPSExternalAppsRuntime] listExternalApps response:", response);

      var apps = filterHomeApps(normalizeApps(response));

      /*
        Array 可以帶少量 metadata，避免改動既有 API 回傳型態。
        init() 仍然把 apps 當陣列用，但 Runtime Panel 可以看到來源。
      */
      apps.registrySource = response && (response.source || response.winner || response.primarySource || "");
      apps.registrySourceLabel = response && (response.sourceLabel || "");
      apps.registryMode = response && (response.mode || "");

      rlog("OK", "listExternalApps", {
        env: runtime,
        count: apps.length,
        source: apps.registrySource || "backend"
      }, Date.now() - loadStartedAt);

      return apps;
    });
  }

  function init() {
    var container = $(CONTAINER_SELECTOR);
    var runtime = getRuntime();

    if (!container) {
      markReady();
      return;
    }

    document.documentElement.setAttribute("data-skhps-runtime", runtime);

    setCount("載入中");
    setStatus("外部專案清單載入中...");

    listExternalApps(runtime)
      .then(function (apps) {
        renderApps(apps, runtime);

        setRuntimeExternalApps({
          loaded: true,
          task: TASK_NAME,
          source: apps.registrySource || "backend",
          sourceLabel: apps.registrySourceLabel || "",
          mode: apps.registryMode || "",
          count: apps.length,
          env: runtime,
          error: "",
          durationMs: Date.now() - loadStartedAt
        });

        markReady();
      })
      .catch(function (error) {
        renderError(error);

        rlog("FAIL", "listExternalApps", {
          env: runtime,
          error: error && error.message ? error.message : String(error)
        }, Date.now() - loadStartedAt);

        markFailed(error);
      });
  }

  var api = {
    init: init,
    getRuntime: getRuntime,
    listExternalApps: listExternalApps,
    taskName: TASK_NAME
  };

  window.SKHPSExternalAppsLayout = api;
  window.SKHPSExternalAppsRuntime = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();