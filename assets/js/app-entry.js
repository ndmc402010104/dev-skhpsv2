/*
檔案位置：skhpsv2/assets/js/app-entry.js
時間戳記：2026-06-16 UTC+8
用途：外部專案接入 skhpsv2 水庫的共用入口；只負責辨識外部專案身分，然後交給 entry-core.js。

責任切分：
- 本檔是 external-app adapter。
- 不動態插入 loading style。
- loading 階段樣式由唯一固定 CSS：assets/CSS/skhps-loading.css 管理。
- 共通 JS 載入順序、shell/main 分層、header/footer/main release 由 entry-core.js + loading-gate.js 管理。
- 外部專案資訊由 app-card.json / version.js / window.SKHPS_APP_CONFIG 合併。
- registerExternalApp 是背景報到，不擋畫面。
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var SOURCE = "app-entry.js";

  var ALLOWED_ENVS = {
    "local-dev": true,
    dev: true,
    prod: true
  };

  function installMinimalLoadingClasses() {
    var html = document.documentElement;

    html.classList.add("skhps-loading");
    html.classList.add("skhps-css-loading");
    html.classList.add("skhps-shell-loading");
    html.classList.add("skhps-main-loading");
    html.setAttribute("data-skhps-entry-guard", "true");

    if (html.getAttribute("data-skhps-shell-ready") !== "true") {
      html.setAttribute("data-skhps-shell-ready", "false");
    }

    if (html.getAttribute("data-skhps-page-ready") !== "true") {
      html.setAttribute("data-skhps-page-ready", "false");
    }
  }

  function earlyRuntimeLog(status, action, detail, durationMs) {
    try {
      window.SKHPSRuntimeLog = window.SKHPSRuntimeLog || {
        __queue: [],
        log: function (payload) {
          try {
            this.__queue.push(payload);
          } catch (error) {}
          return payload;
        }
      };

      if (typeof window.SKHPSRuntimeLog.log !== "function") {
        window.SKHPSRuntimeLog.log = function (payload) {
          try {
            this.__queue = this.__queue || [];
            this.__queue.push(payload);
          } catch (error) {}
          return payload;
        };
      }

      window.SKHPSRuntimeLog.log({
        source: SOURCE,
        category: "external-app",
        action: action,
        status: status,
        detail: detail || "",
        durationMs: durationMs
      });
    } catch (error) {}
  }

  function stripQueryAndHash(url) {
    return String(url || "").split("#")[0].split("?")[0];
  }

  function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/+$/, "") + "/";
  }

  function joinUrl(baseUrl, path) {
    return normalizeBaseUrl(baseUrl) + String(path || "").replace(/^\/+/, "");
  }

  function isAbsoluteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
  }

  function resolveRelativeUrl(baseUrl, path) {
    if (!path) {
      return "";
    }

    if (isAbsoluteUrl(path)) {
      return path;
    }

    try {
      return new URL(path, baseUrl || window.location.href).toString();
    } catch (error) {
      return path;
    }
  }

  function inferSharedBaseUrl() {
    var src = currentScript && currentScript.src ? currentScript.src : "";

    if (window.SKHPS_ENTRY_BASE_URL) {
      return normalizeBaseUrl(window.SKHPS_ENTRY_BASE_URL);
    }

    if (!src) {
      return "";
    }

    return normalizeBaseUrl(
      stripQueryAndHash(src).replace(/\/assets\/js\/app-entry\.js$/i, "/")
    );
  }

  function inferAppBaseUrl() {
    try {
      return new URL("./", window.location.href).toString();
    } catch (error) {
      return window.location.href;
    }
  }

  function getEntryVersion() {
    if (window.SKHPS_ENTRY_VERSION) {
      return String(window.SKHPS_ENTRY_VERSION || "").trim();
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
    version = String(version || "").trim();

    if (!version) {
      return url;
    }

    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(version);
  }

  function getRuntimeParam() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var runtime = String(params.get("skhpsRuntime") || params.get("runtime") || "").trim();

      if (ALLOWED_ENVS[runtime]) {
        return runtime;
      }
    } catch (error) {}

    return "";
  }

  function inferEnvFromPageLocation() {
    var requestedRuntime = getRuntimeParam();
    var host = String(window.location.hostname || "").toLowerCase();

    if (requestedRuntime) {
      return requestedRuntime;
    }

    if (host === "127.0.0.1" || host === "localhost" || host === "") {
      return "local-dev";
    }

    if (
      host.indexOf("dev-") === 0 ||
      host.indexOf("dev.") === 0 ||
      host.indexOf("dev-skhps") >= 0 ||
      host === "dev-skhps.jonaminz.com"
    ) {
      return "dev";
    }

    return "prod";
  }

  function withRuntimeParam(url, env) {
    if (!url || !env) {
      return url || "";
    }

    try {
      var output = new URL(url, window.location.href);
      output.searchParams.set("skhpsRuntime", env);
      return output.toString();
    } catch (error) {
      return String(url) +
        (String(url).indexOf("?") >= 0 ? "&" : "?") +
        "skhpsRuntime=" +
        encodeURIComponent(env);
    }
  }

  function fetchJson(url) {
    return fetch(url, {
      cache: "no-store"
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("fetch json failed: " + url + " (" + response.status + ")");
      }

      return response.json();
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var startedAt = Date.now();
      var script = document.createElement("script");

      earlyRuntimeLog("RUN", "loadScript", src);

      script.src = src;
      script.async = false;

      script.onload = function () {
        earlyRuntimeLog("OK", "scriptLoaded", src, Date.now() - startedAt);
        resolve(src);
      };

      script.onerror = function () {
        earlyRuntimeLog("FAIL", "scriptError", src, Date.now() - startedAt);
        reject(new Error("app-entry script load failed: " + src));
      };

      document.head.appendChild(script);
    });
  }

  function loadEntryCore(sharedBaseUrl, coreVersion) {
    if (window.SKHPSEntryCore && typeof window.SKHPSEntryCore.load === "function") {
      return Promise.resolve(window.SKHPSEntryCore);
    }

    return loadScript(
      withVersion(
        joinUrl(sharedBaseUrl, "assets/js/entry-core.js"),
        coreVersion
      )
    ).then(function () {
      if (!window.SKHPSEntryCore || typeof window.SKHPSEntryCore.load !== "function") {
        throw new Error("SKHPSEntryCore.load not available");
      }

      return window.SKHPSEntryCore;
    });
  }

  function releaseAllForEntryFailure(error) {
    var html = document.documentElement;

    html.classList.remove("skhps-css-loading");
    html.classList.remove("skhps-loading");
    html.classList.remove("skhps-shell-loading");
    html.classList.remove("skhps-main-loading");

    html.setAttribute("data-skhps-css-ready", "false");
    html.setAttribute("data-skhps-shell-ready", "true");
    html.setAttribute("data-skhps-shell-ready-reason", "app-entry-failed");
    html.setAttribute("data-skhps-page-ready", "true");
    html.setAttribute("data-skhps-page-ready-reason", "app-entry-failed");

    try {
      document.dispatchEvent(new CustomEvent("skhps-app-entry-failed", {
        detail: {
          error: error && error.message ? error.message : String(error || "")
        }
      }));
    } catch (eventError) {}
  }

  function markFailed(error) {
    console.error("[SKHPSAppEntry]", error);
    earlyRuntimeLog("FAIL", "appEntryFailed", error && error.message ? error.message : String(error));

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail("app-entry", error);
      return;
    }

    releaseAllForEntryFailure(error);
  }

  function mergeObjects(base, override) {
    var output = {};

    Object.keys(base || {}).forEach(function (key) {
      output[key] = base[key];
    });

    Object.keys(override || {}).forEach(function (key) {
      output[key] = override[key];
    });

    return output;
  }

  function pickEnvValue(value, env) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value[env] || value.prod || value.dev || value["local-dev"] || "";
    }

    return value;
  }

  function getAppCardUrl() {
    var url = window.SKHPS_APP_CARD_URL || window.SKHPS_APP_MANIFEST_URL || "";

    if (!url) {
      return "";
    }

    return resolveRelativeUrl(window.location.href, url);
  }

  function loadAppCard() {
    var cardUrl = getAppCardUrl();

    if (!cardUrl) {
      return Promise.resolve({});
    }

    earlyRuntimeLog("RUN", "loadAppCard", cardUrl);

    return fetchJson(cardUrl).then(function (card) {
      window.SKHPS_APP_CARD = card || {};
      window.SKHPS_APP_CARD_URL_RESOLVED = cardUrl;
      earlyRuntimeLog("OK", "loadAppCard", cardUrl);
      return card || {};
    });
  }

  function loadVersionForCard(card) {
    var versionUrl = card && card.versionUrl ? String(card.versionUrl || "").trim() : "";

    if (!versionUrl) {
      return Promise.resolve(null);
    }

    var baseUrl = window.SKHPS_APP_CARD_URL_RESOLVED || window.location.href;
    var resolvedVersionUrl = resolveRelativeUrl(baseUrl, versionUrl);

    return loadScript(resolvedVersionUrl)
      .then(function () {
        var versionInfo = window.SKHPS_VERSION || {};
        window.SKHPS_APP_VERSION_INFO = versionInfo || {};
        window.SKHPS_APP_VERSION_URL_RESOLVED = resolvedVersionUrl;
        return versionInfo || {};
      })
      .catch(function (error) {
        console.warn("[SKHPSAppEntry] version.js load failed:", error);
        earlyRuntimeLog("WARN", "versionLoadFailed", error && error.message ? error.message : String(error));
        return null;
      });
  }

  function buildAppConfig(card, versionInfo, env) {
    var inlineConfig = window.SKHPS_APP_CONFIG || {};
    var config = mergeObjects(card || {}, inlineConfig || {});
    var versionFromScript = "";

    if (versionInfo && versionInfo.version) {
      versionFromScript = String(versionInfo.version || "").trim();
    }

    if (versionFromScript) {
      config.version = versionFromScript;
    } else if (!config.version) {
      config.version = getEntryVersion();
    }

    if (config.href && typeof config.href === "object" && !Array.isArray(config.href)) {
      config.hrefMap = config.href;
      config.href = pickEnvValue(config.href, env);
    }

    if (!config.href) {
      config.href = window.location.href;
    }

    config.href = withRuntimeParam(config.href, env);

    if (!config.group) {
      config.group = "";
    }

    if (!config.order) {
      config.order = 9999;
    }

    if (!Array.isArray(config.afterScripts)) {
      config.afterScripts = [];
    }

    return config;
  }

  function getAppId(config) {
    var fromConfig = config && (config.appId || config.id);
    var fromWindow = window.SKHPS_APP_ID;
    var fromScript = currentScript && currentScript.getAttribute("data-skhps-app");
    var fromHtml = document.documentElement.getAttribute("data-skhps-app-id");

    return String(fromConfig || fromWindow || fromScript || fromHtml || "").trim();
  }

  function normalizeRegisterPayload(options) {
    var config = window.SKHPS_APP_CONFIG || {};

    var appId = String(config.appId || config.id || options.appId || window.SKHPS_APP_ID || "").trim();
    var title = String(config.title || config.name || options.title || document.title || appId || "").trim();
    var href = String(config.href || config.url || options.href || window.location.href || "").trim();
    var group = String(config.group || options.group || "").trim();
    var displayPosition = String(config["顯示位置"] || config.displayPosition || options.displayPosition || "").trim();
    var order = Number(config.order || options.order || 9999) || 9999;
    var version = String(config.version || options.appVersion || options.version || "").trim();

    return {
      appId: appId,
      title: title,
      href: href,
      group: group,
      displayPosition: displayPosition,
      "顯示位置": displayPosition,
      order: order,
      version: version,
      env: options.env || "",
      requestedRuntime: options.requestedRuntime || "",
      origin: window.location.origin || "",
      pageUrl: window.location.href || "",
      userAgent: navigator.userAgent || ""
    };
  }

  function registerExternalAppIfNeeded(options) {
    var config = window.SKHPS_APP_CONFIG || {};
    var payload;

    if (!config || typeof config !== "object") {
      return;
    }

    if (config.registerExternalApp === false) {
      return;
    }

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      console.warn("[SKHPSAppEntry] registerExternalApp skipped: SKHPSBackend.call not available");
      earlyRuntimeLog("WARN", "registerExternalAppSkipped", "SKHPSBackend.call not available");
      return;
    }

    payload = normalizeRegisterPayload(options || {});

    if (!payload.appId || !payload.title || !payload.href) {
      console.warn("[SKHPSAppEntry] registerExternalApp skipped: missing appId/title/href", payload);
      earlyRuntimeLog("WARN", "registerExternalAppSkipped", "missing appId/title/href");
      return;
    }

    earlyRuntimeLog("RUN", "registerExternalApp", payload.appId);

    window.SKHPS_EXTERNAL_APP_REGISTER_PROMISE = window.SKHPSBackend
      .call("registerExternalApp", payload, {
        timeoutMs: 8000
      })
      .then(function (result) {
        window.SKHPS_EXTERNAL_APP_REGISTER_RESULT = result;
        earlyRuntimeLog("OK", "registerExternalApp", payload.appId);
        return result;
      })
      .catch(function (error) {
        window.SKHPS_EXTERNAL_APP_REGISTER_ERROR = error;
        console.warn("[SKHPSAppEntry] registerExternalApp failed:", error);
        earlyRuntimeLog("WARN", "registerExternalAppFailed", error && error.message ? error.message : String(error));
        return {
          ok: false,
          error: error && error.message ? error.message : String(error)
        };
      });
  }

  function init() {
    var env = inferEnvFromPageLocation();
    var sharedBaseUrl = normalizeBaseUrl(window.SKHPS_ENTRY_BASE_URL || inferSharedBaseUrl());
    var appBaseUrl = inferAppBaseUrl();
    var coreVersion = String(window.SKHPS_ENTRY_VERSION || getEntryVersion() || "").trim();

    installMinimalLoadingClasses();

    if (!sharedBaseUrl || sharedBaseUrl === "/") {
      throw new Error("shared base url missing");
    }

    return loadAppCard()
      .then(function (card) {
        return loadVersionForCard(card).then(function (versionInfo) {
          return {
            card: card,
            versionInfo: versionInfo
          };
        });
      })
      .then(function (loaded) {
        var appConfig = buildAppConfig(loaded.card, loaded.versionInfo, env);
        var appId = getAppId(appConfig);
        var appVersion = String(appConfig.version || "").trim();

        if (!appId) {
          throw new Error("SKHPS appId missing");
        }

        if (!appConfig.appId) {
          appConfig.appId = appId;
        }

        if (!appConfig.id) {
          appConfig.id = appId;
        }

        if (!appConfig.title && document.title) {
          appConfig.title = document.title;
        }

        window.SKHPS_APP_ID = appId;
        window.SKHPS_APP_CONFIG = appConfig;

        window.SKHPS_APP_ENV = {
          appId: appId,
          env: env,
          requestedRuntime: getRuntimeParam() || "",
          sharedBaseUrl: sharedBaseUrl,
          appBaseUrl: appBaseUrl,
          coreVersion: coreVersion,
          appVersion: appVersion,
          version: appVersion || coreVersion,
          title: appConfig.title || appId,
          href: appConfig.href || window.location.href,
          group: appConfig.group || "",
          order: appConfig.order || 9999,
          displayPosition: appConfig.displayPosition || appConfig["顯示位置"] || "",
          coreScripts: appConfig.coreScripts || null,
          afterScripts: appConfig.afterScripts || []
        };

        window.SKHPS_ENTRY_BASE_URL = sharedBaseUrl;
        window.SKHPS_CONFIG_BASE_URL = sharedBaseUrl;

        document.documentElement.setAttribute("data-skhps-app-id", appId);
        document.documentElement.setAttribute("data-skhps-runtime", env);
        document.documentElement.setAttribute("data-skhps-entry-scope", "external-app");

        window.SKHPS_APP_ENTRY_LOADED = true;

        earlyRuntimeLog("RUN", "init", {
          appId: appId,
          env: env,
          sharedBaseUrl: sharedBaseUrl,
          appBaseUrl: appBaseUrl,
          appVersion: appVersion,
          afterScripts: appConfig.afterScripts || []
        });

        return loadEntryCore(sharedBaseUrl, coreVersion)
          .then(function () {
            return window.SKHPSEntryCore.load({
              scope: "external-app",
              appId: appId,
              env: env,
              requestedRuntime: getRuntimeParam() || "",
              sharedBaseUrl: sharedBaseUrl,
              coreVersion: coreVersion,
              specificBaseUrl: appBaseUrl,
              specificVersion: appVersion || coreVersion,
              specificScripts: appConfig.afterScripts || [],
              coreScripts: appConfig.coreScripts || null,
              failureTask: appId || "external-app"
            });
          })
          .then(function (options) {
            /*
              registerExternalApp 需要 backend-client.js 已經由 entry-core 載好。
              這裡只啟動背景 promise，不等待、不擋畫面。
            */
            registerExternalAppIfNeeded(window.SKHPS_APP_ENV);

            document.dispatchEvent(new CustomEvent("skhps-app-entry-ready", {
              detail: options || window.SKHPS_APP_ENV
            }));

            return options;
          });
      });
  }

  window.SKHPSAppEntry = {
    init: init,
    getRuntimeParam: getRuntimeParam,
    inferEnvFromPageLocation: inferEnvFromPageLocation,
    loadAppCard: loadAppCard,
    loadVersionForCard: loadVersionForCard
  };

  installMinimalLoadingClasses();
  init().catch(markFailed);
})();