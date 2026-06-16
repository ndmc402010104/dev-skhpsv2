/*
檔案位置：skhpsv2/assets/js/external-apps-runtime.js
時間戳：2026-06-16 UTC+8
用途：首頁讀取 Sheet「外部專案」，只顯示目前 runtime、啟用=true、且「顯示位置」為前台的外部專案。

Loading Gate：
- 任務名稱：external-apps-runtime
- 有 cache 時：先 render cache，立刻 done，再背景刷新 Sheet。
- 無 cache 時：維持等 listExternalProjects，成功 render 後 done。
- 讀取失敗但錯誤訊息已 render：fail。
*/

(function () {
  "use strict";

  var TASK_NAME = "external-apps-runtime";
  var CONTAINER_SELECTOR = "[data-skhps-external-apps]";
  var STATUS_SELECTOR = "[data-skhps-external-apps-status]";
  var WAIT_BACKEND_TIMEOUT_MS = 8000;
  var WAIT_BACKEND_INTERVAL_MS = 100;
  var CACHE_KEY = "skhpsv2.externalAppsRuntime.cache.v1";
  var CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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

  rlog("RUN", "moduleStart", "external-apps-runtime.js");

  function $(selector) {
    return document.querySelector(selector);
  }

  function markReady(reason) {
    if (readyMarked) {
      return;
    }

    readyMarked = true;

    document.documentElement.setAttribute("data-skhps-external-apps-runtime-ready", "true");
    document.documentElement.setAttribute(
      "data-skhps-external-apps-runtime-ready-reason",
      reason || "ready"
    );

    rlog("OK", "moduleReady", {
      file: "external-apps-runtime.js",
      reason: reason || "ready"
    }, Date.now() - loadStartedAt);

    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done(TASK_NAME);
    }
  }

  function markFailed(error) {
    if (readyMarked) {
      return;
    }

    readyMarked = true;

    document.documentElement.setAttribute("data-skhps-external-apps-runtime-ready", "false");
    document.documentElement.setAttribute(
      "data-skhps-external-apps-runtime-error",
      error && error.message ? error.message : String(error || "unknown")
    );

    rlog("FAIL", "moduleReady", {
      error: error && error.message ? error.message : String(error || "unknown")
    }, Date.now() - loadStartedAt);

    setRuntimeExternalApps({
      loaded: false,
      error: error && error.message ? error.message : String(error || "unknown"),
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
    if (fromHtml) return normalizeRegistryEnv(fromHtml);

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

  function clearContainer() {
    var container = $(CONTAINER_SELECTOR);
    if (container) {
      container.innerHTML = "";
    }
    return container;
  }

  function createAppButton(app) {
    var a = document.createElement("a");
    var href = app.href || "#";

    if (href !== "#" && window.SKHPSConfig && typeof window.SKHPSConfig.withRuntime === "function") {
      href = window.SKHPSConfig.withRuntime(href, window.SKHPS_CONFIG || {}, app.env || getRuntime());
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

    if (text === "front" || text === "frontend" || value === "前台") return "front";
    if (text === "back" || text === "backend" || text === "admin" || value === "後台") return "backend";

    return "";
  }

  function isFrontendApp(app) {
    return isActive(app) && normalizeDisplayLocation(app) === "front";
  }

  function sortApps(apps) {
    return (apps || []).slice().sort(function (a, b) {
      var orderA = Number(a.order || a["排序"] || 9999);
      var orderB = Number(b.order || b["排序"] || 9999);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return String(a.title || a.appId || "").localeCompare(String(b.title || b.appId || ""), "zh-Hant");
    });
  }

  function filterAppsForHome(apps) {
    return sortApps((apps || []).filter(isFrontendApp));
  }

  function renderApps(apps, runtime, options) {
    var container = clearContainer();
    var sourceLabel = options && options.sourceLabel ? options.sourceLabel : "";

    if (!container) {
      throw new Error("missing external apps container: " + CONTAINER_SELECTOR);
    }

    if (!apps.length) {
      if (sourceLabel) {
        setStatus("目前沒有啟用中的外部專案（" + runtime + "，" + sourceLabel + "）");
      } else {
        setStatus("目前沒有啟用中的外部專案（" + runtime + "）");
      }
      return;
    }

    apps.forEach(function (app) {
      container.appendChild(createAppButton(app));
    });

    if (sourceLabel) {
      setStatus("已載入 " + apps.length + " 個外部專案（" + runtime + "，" + sourceLabel + "）");
    } else {
      setStatus("已載入 " + apps.length + " 個外部專案（" + runtime + "）");
    }
  }

  function renderError(error) {
    console.error("[SKHPSExternalAppsRuntime]", error);

    clearContainer();

    setStatus(
      "外部專案清單讀取失敗：" +
      (error && error.message ? error.message : String(error || "未知錯誤"))
    );
  }

  function readCache(runtime) {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      var cache = raw ? JSON.parse(raw) : null;

      if (!cache || !Array.isArray(cache.apps)) {
        return null;
      }

      if (normalizeRegistryEnv(cache.env) !== normalizeRegistryEnv(runtime)) {
        return null;
      }

      if (cache.updatedAtMs && Date.now() - Number(cache.updatedAtMs) > CACHE_MAX_AGE_MS) {
        return null;
      }

      return cache;
    } catch (error) {
      rlog("WARN", "cacheReadFailed", error && error.message ? error.message : String(error));
      return null;
    }
  }

  function writeCache(runtime, apps) {
    try {
      var cache = {
        env: normalizeRegistryEnv(runtime),
        apps: apps || [],
        updatedAt: new Date().toISOString(),
        updatedAtMs: Date.now(),
        source: "listExternalProjects"
      };

      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

      rlog("OK", "cacheWrite", {
        env: runtime,
        count: cache.apps.length
      });

      return cache;
    } catch (error) {
      rlog("WARN", "cacheWriteFailed", error && error.message ? error.message : String(error));
      return null;
    }
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

  function fetchExternalApps(runtime) {
    rlog("RUN", "listExternalApps", {
      env: runtime
    });

    return callBackend("listExternalProjects", {
      activeOnly: true,
      env: runtime
    }).then(function (response) {
      console.info("[SKHPSExternalAppsRuntime] listExternalApps response:", response);

      var apps = filterAppsForHome(normalizeApps(response));

      writeCache(runtime, apps);

      setRuntimeExternalApps({
        loaded: true,
        count: apps.length,
        env: runtime,
        source: "backend",
        error: "",
        durationMs: Date.now() - loadStartedAt
      });

      rlog("OK", "listExternalApps", {
        env: runtime,
        count: apps.length
      }, Date.now() - loadStartedAt);

      return apps;
    });
  }

  function refreshFromBackend(runtime, options) {
    options = options || {};

    return fetchExternalApps(runtime)
      .then(function (apps) {
        renderApps(apps, runtime, {
          sourceLabel: options.background ? "已更新" : ""
        });

        if (!options.background) {
          markReady("backend");
        }

        return apps;
      })
      .catch(function (error) {
        if (options.background) {
          console.warn("[SKHPSExternalAppsRuntime] background refresh failed:", error);

          rlog("WARN", "backgroundRefreshFailed", {
            env: runtime,
            error: error && error.message ? error.message : String(error)
          }, Date.now() - loadStartedAt);

          setRuntimeExternalApps({
            loaded: true,
            env: runtime,
            source: "cache",
            refreshError: error && error.message ? error.message : String(error),
            durationMs: Date.now() - loadStartedAt
          });

          setStatus("外部專案清單已使用快取（背景更新失敗）");
          return null;
        }

        renderError(error);

        rlog("FAIL", "listExternalApps", {
          env: runtime,
          error: error && error.message ? error.message : String(error)
        }, Date.now() - loadStartedAt);

        markFailed(error);
        return null;
      });
  }

  function renderCacheAndRefresh(runtime, cache) {
    renderApps(cache.apps || [], runtime, {
      sourceLabel: "快取"
    });

    setRuntimeExternalApps({
      loaded: true,
      count: (cache.apps || []).length,
      env: runtime,
      source: "cache",
      cacheUpdatedAt: cache.updatedAt || "",
      error: "",
      durationMs: Date.now() - loadStartedAt
    });

    rlog("OK", "cacheHit", {
      env: runtime,
      count: (cache.apps || []).length,
      updatedAt: cache.updatedAt || ""
    }, Date.now() - loadStartedAt);

    markReady("cache");

    window.setTimeout(function () {
      refreshFromBackend(runtime, {
        background: true
      });
    }, 0);
  }

  function init() {
    var container = $(CONTAINER_SELECTOR);

    if (!container) {
      markReady("no-container");
      return;
    }

    var runtime = getRuntime();
    var cache = null;

    document.documentElement.setAttribute("data-skhps-runtime", runtime);

    cache = readCache(runtime);

    if (cache) {
      renderCacheAndRefresh(runtime, cache);
      return;
    }

    setStatus("外部專案清單載入中...");
    rlog("INFO", "cacheMiss", {
      env: runtime
    });

    refreshFromBackend(runtime, {
      background: false
    });
  }

  window.SKHPSExternalAppsRuntime = {
    init: init,
    getRuntime: getRuntime,
    readCache: readCache,
    writeCache: writeCache,
    refreshFromBackend: refreshFromBackend
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();