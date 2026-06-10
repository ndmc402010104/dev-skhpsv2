/*
檔案位置：skhpsv2/assets/js/config.js
時間戳記：2026-06-10 UTC+8
用途：SKHPS config loader。
原則：
- 不在 config.js 寫死整包設定。
- config.js 只負責讀取 skhpsv2/config.json。
- skhpsv2 本體不使用 env.js；環境由 config.js 依目前 hostname 判斷。
- config.json 的 env 只當 fallback，不當主要判斷來源。
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var cachedConfigPromise = null;

  function stripQueryAndHash(url) {
    return String(url || "").split("#")[0].split("?")[0];
  }

  function inferBaseUrlFromCurrentScript() {
    var src = currentScript && currentScript.src ? currentScript.src : "";

    if (!src) {
      return "";
    }

    return stripQueryAndHash(src)
      .replace(/\/assets\/js\/config\.js$/i, "/");
  }

  function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/+$/, "") + "/";
  }

  function joinUrl(baseUrl, path) {
    return normalizeBaseUrl(baseUrl) + String(path || "").replace(/^\/+/, "");
  }

  function inferEnvFromLocation() {
    var host = String(window.location.hostname || "").toLowerCase();

    if (host === "127.0.0.1" || host === "localhost" || host === "") {
      return "local-dev";
    }

    if (
      host === "dev-skhps.jonaminz.com" ||
      host.indexOf("dev-") === 0 ||
      host.indexOf("dev.") === 0
    ) {
      return "dev";
    }

    if (host === "skhps.jonaminz.com") {
      return "prod";
    }

    /*
      GitHub Pages fallback:
      目前如果直接開 github.io/skhpsv2，也視為 prod。
      dev/prod 正式分流仍以 jonaminz domain 為準。
    */
    if (host.indexOf("github.io") >= 0) {
      return "prod";
    }

    return "";
  }

  function getConfigUrl() {
    if (window.SKHPS_CONFIG_URL) {
      return window.SKHPS_CONFIG_URL;
    }

    var baseUrl = window.SKHPS_CONFIG_BASE_URL || inferBaseUrlFromCurrentScript();

    if (baseUrl) {
      return joinUrl(baseUrl, "config.json");
    }

    return "config.json";
  }

  function normalizeConfig(config) {
    config = config || {};

    /*
      Runtime env 是目前網址判斷結果。
      不直接改 config.env，避免把來源檔內容與 runtime 狀態混在一起。
    */
    config.runtimeEnv = getEnv(config);

    return config;
  }

  function loadConfig(force) {
    if (!force && window.SKHPS_CONFIG) {
      return Promise.resolve(window.SKHPS_CONFIG);
    }

    if (!force && cachedConfigPromise) {
      return cachedConfigPromise;
    }

    cachedConfigPromise = fetch(getConfigUrl(), {
      cache: "no-store"
    }).then(function (res) {
      if (!res.ok) {
        throw new Error("config.json HTTP " + res.status);
      }

      return res.json();
    }).then(function (config) {
      window.SKHPS_CONFIG = normalizeConfig(config);
      return window.SKHPS_CONFIG;
    });

    return cachedConfigPromise;
  }

  function getEnv(config) {
    config = config || window.SKHPS_CONFIG || {};

    /*
      優先順序：
      1. window.SKHPS_FORCE_ENV：手動強制測試用
      2. window.SKHPS_APP_ENV.env：子專案 app-entry 已建立時使用
      3. 目前網址 hostname 推論：skhpsv2 主頁主要靠這個
      4. config.env：只當 fallback
      5. prod
    */
    if (window.SKHPS_FORCE_ENV) {
      return window.SKHPS_FORCE_ENV;
    }

    if (window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.env) {
      return window.SKHPS_APP_ENV.env;
    }

    var inferred = inferEnvFromLocation();

    if (inferred) {
      return inferred;
    }

    return config.env || "prod";
  }

  function getEnvValue(value, config) {
    var env = getEnv(config);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value[env] || value.prod || value.dev || value["local-dev"] || "";
    }

    return value || "";
  }

  function getSiteBaseUrl(config) {
    config = config || window.SKHPS_CONFIG || {};

    return getEnvValue(
      config.site && config.site.baseUrl,
      config
    );
  }

  function joinConfigUrl(base, path) {
    if (!base) return path || "";
    if (!path) return base || "";

    var rawPath = String(path);

    if (/^https?:\/\//i.test(rawPath)) {
      return rawPath;
    }

    return String(base).replace(/\/+$/, "") + "/" + rawPath.replace(/^\/+/, "");
  }

  window.SKHPSConfig = window.SKHPSConfig || {};
  window.SKHPSConfig.loadConfig = loadConfig;
  window.SKHPSConfig.reloadConfig = function () {
    cachedConfigPromise = null;
    return loadConfig(true);
  };
  window.SKHPSConfig.getConfigUrl = getConfigUrl;
  window.SKHPSConfig.inferEnvFromLocation = inferEnvFromLocation;
  window.SKHPSConfig.getEnv = getEnv;
  window.SKHPSConfig.getEnvValue = getEnvValue;
  window.SKHPSConfig.getSiteBaseUrl = getSiteBaseUrl;
  window.SKHPSConfig.joinUrl = joinConfigUrl;
})();