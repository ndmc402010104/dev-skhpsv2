/*
檔案位置：skhpsv2/assets/js/app-entry.js
用途：子專案共用入口。
規則：
- 子專案只宣告 window.SKHPS_APP_ID，例如 "quick-login"。
- app-entry 從 skhpsv2/assets/js/app-registry.js 讀取設定。
- URL 參數 skhpsRuntime=local-dev|dev|prod 可指定要使用哪個 skhpsv2 runtime。
- app-entry 建立 window.SKHPS_APP_ENV，最後載入 skhpsv2/assets/js/bootstrap.js。
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var ALLOWED_ENVS = {
    "local-dev": true,
    dev: true,
    prod: true
  };

  function stripQueryAndHash(url) {
    return String(url || "").split("#")[0].split("?")[0];
  }

  function inferSharedBaseUrl() {
    var src = currentScript && currentScript.src ? currentScript.src : "";

    if (!src) {
      return "";
    }

    return stripQueryAndHash(src)
      .replace(/\/assets\/js\/app-entry\.js$/i, "/");
  }

  function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/+$/, "") + "/";
  }

  function joinUrl(baseUrl, path) {
    return normalizeBaseUrl(baseUrl) + String(path || "").replace(/^\/+/, "");
  }

  function getVersion() {
    if (window.SKHPS_ENTRY_VERSION) {
      return window.SKHPS_ENTRY_VERSION;
    }

    if (currentScript && currentScript.src && currentScript.src.indexOf("?") >= 0) {
      try {
        return new URL(currentScript.src).searchParams.get("v") || "";
      } catch (error) {
        return "";
      }
    }

    return "";
  }

  function withVersion(url, version) {
    if (!version) return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(version);
  }

  function getRuntimeParam() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var runtime = String(params.get("skhpsRuntime") || "").trim();

      if (ALLOWED_ENVS[runtime]) {
        return runtime;
      }
    } catch (error) {}

    return "";
  }

  function inferEnvFromPageLocation() {
    var requestedRuntime = getRuntimeParam();

    if (requestedRuntime) {
      return requestedRuntime;
    }

    var host = String(window.location.hostname || "").toLowerCase();

    if (host === "127.0.0.1" || host === "localhost" || host === "") {
      return "local-dev";
    }

    if (
      host.indexOf("dev-") === 0 ||
      host.indexOf("dev.") === 0 ||
      host.indexOf("dev-skhps") >= 0
    ) {
      return "dev";
    }

    return "prod";
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = false;

      script.onload = function () {
        resolve(src);
      };

      script.onerror = function () {
        reject(new Error("app-entry script load failed: " + src));
      };

      document.head.appendChild(script);
    });
  }

  function markFailed(error) {
    console.error("[SKHPSAppEntry]", error);

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail("app-entry", error);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
  }

  function init() {
    var appId = window.SKHPS_APP_ID ||
      (currentScript && currentScript.getAttribute("data-skhps-app")) ||
      "";

    appId = String(appId || "").trim();

    if (!appId) {
      throw new Error("SKHPS_APP_ID missing");
    }

    var sharedBaseUrl = normalizeBaseUrl(window.SKHPS_ENTRY_BASE_URL || inferSharedBaseUrl());
    var version = getVersion();

    if (!sharedBaseUrl || sharedBaseUrl === "/") {
      throw new Error("shared base url missing");
    }

    return loadScript(withVersion(joinUrl(sharedBaseUrl, "assets/js/app-registry.js"), version))
      .then(function () {
        var registry = window.SKHPS_APP_REGISTRY || {};
        var apps = registry.apps || {};
        var app = apps[appId];

        if (!app) {
          throw new Error("app not registered: " + appId);
        }

        var env = inferEnvFromPageLocation();
        var registrySharedBaseUrl =
          registry.sharedBaseUrl &&
          (registry.sharedBaseUrl[env] || registry.sharedBaseUrl.prod || registry.sharedBaseUrl.dev);

        window.SKHPS_APP_ENV = {
          appId: appId,
          env: env,
          requestedRuntime: getRuntimeParam() || "",
          sharedBaseUrl: normalizeBaseUrl(registrySharedBaseUrl || sharedBaseUrl),
          version: version,
          title: app.title || appId,
          baseUrl: app.baseUrl || {},
          afterScripts: app.afterScripts || []
        };

        window.SKHPS_APP_ENTRY_LOADED = true;

        return loadScript(withVersion(joinUrl(window.SKHPS_APP_ENV.sharedBaseUrl, "assets/js/bootstrap.js"), version));
      });
  }

  window.SKHPSAppEntry = {
    init: init,
    getRuntimeParam: getRuntimeParam,
    inferEnvFromPageLocation: inferEnvFromPageLocation
  };

  init().catch(markFailed);
})();
