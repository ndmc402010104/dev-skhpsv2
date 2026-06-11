/*
File: skhpsv2/assets/js/bootstrap.legacy.js
Purpose: legacy compatibility wrapper for SKHPS external child apps.

設計：
- 新外部 App 請直接載入 assets/js/external-app-loader.js。
- 此檔只保留舊引用相容性，將 bootstrap.legacy.js 轉接到 external-app-loader.js。
- 真正的外部 App include loader 邏輯只維護在 external-app-loader.js。
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var LEGACY_PREFIX = "[SKHPSBootstrapLegacy]";

  function stripQueryAndHash(url) {
    return String(url || "").split("#")[0].split("?")[0];
  }

  function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/+$/, "") + "/";
  }

  function joinUrl(baseUrl, path) {
    return normalizeBaseUrl(baseUrl) + String(path || "").replace(/^\/+/, "");
  }

  function withVersion(url, version) {
    if (!version) return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(version);
  }

  function currentScriptVersion() {
    if (!currentScript || !currentScript.src || currentScript.src.indexOf("?") < 0) return "";

    try {
      return new URL(currentScript.src).searchParams.get("v") || "";
    } catch (error) {
      return "";
    }
  }

  function inferLoaderUrl() {
    var version =
      (window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.version) ||
      currentScriptVersion() ||
      "";

    if (currentScript && currentScript.src) {
      return withVersion(
        stripQueryAndHash(currentScript.src).replace(/\/bootstrap\.legacy\.js$/i, "/external-app-loader.js"),
        version
      );
    }

    if (window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.sharedBaseUrl) {
      return withVersion(
        joinUrl(window.SKHPS_APP_ENV.sharedBaseUrl, "assets/js/external-app-loader.js"),
        version
      );
    }

    return withVersion("assets/js/external-app-loader.js", version);
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
        reject(new Error("legacy bootstrap failed to load external-app-loader: " + src));
      };

      document.head.appendChild(script);
    });
  }

  function markFailed(error) {
    console.error(LEGACY_PREFIX, error);

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail("bootstrap", error);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
  }

  function load() {
    window.SKHPS_BOOTSTRAP_LEGACY = true;

    if (window.SKHPSExternalAppLoader) {
      window.SKHPSBootstrap = window.SKHPSExternalAppLoader;
      return Promise.resolve(window.SKHPSExternalAppLoader);
    }

    if (window.SKHPS_BOOTSTRAP_LEGACY_PROMISE) {
      return window.SKHPS_BOOTSTRAP_LEGACY_PROMISE;
    }

    window.SKHPS_BOOTSTRAP_LEGACY_PROMISE = loadScript(inferLoaderUrl()).then(function () {
      window.SKHPSBootstrap = window.SKHPSExternalAppLoader || window.SKHPSBootstrap;
      return window.SKHPSBootstrap;
    });

    return window.SKHPS_BOOTSTRAP_LEGACY_PROMISE;
  }

  window.SKHPSBootstrap = window.SKHPSBootstrap || {
    isLegacyWrapper: true,
    load: load
  };

  load().catch(markFailed);
})();
