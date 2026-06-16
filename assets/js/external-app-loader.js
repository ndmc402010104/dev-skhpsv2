/*
檔案位置：skhpsv2/assets/js/external-app-loader.js
時間戳：2026-06-16 UTC+8
用途：include loader for SKHPS external child apps；正式標準只吃 window.SKHPS_APP_MANIFEST / app.json。

水庫標準：
- 外部專案 manifest 一律為 app.json。
- 外部專案資訊統一由 window.SKHPS_APP_MANIFEST 提供。
- 外部專案腳本只讀 manifest.entry.afterScripts。
- 外部專案 loading task 只讀 manifest.entry.loadingTasks。
- 不再讀 window.SKHPS_APP_CONFIG / window.SKHPS_APP_CARD。
- 不再支援 top-level afterScripts / loadingTasks。
- 不再提供 window.SKHPSBootstrap legacy alias。
*/

(function () {
  "use strict";

  var BOOTSTRAP_SOURCE = "external-app-loader.js";

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

      ["start", "ok", "fail", "warn", "info", "pending", "done"].forEach(function (method) {
        if (typeof window.SKHPSRuntimeLog[method] === "function") return;
        window.SKHPSRuntimeLog[method] = function (payload) {
          payload = payload || {};
          payload.status = payload.status || (method === "fail" ? "FAIL" : method === "warn" ? "WARN" : method === "ok" || method === "done" ? "OK" : method === "info" ? "INFO" : "RUN");
          return window.SKHPSRuntimeLog.log(payload);
        };
      });

      window.SKHPSRuntimeLog.log({
        source: BOOTSTRAP_SOURCE,
        category: "script",
        action: action,
        status: status,
        detail: detail || "",
        durationMs: durationMs
      });
    } catch (error) {}
  }

  earlyRuntimeLog("RUN", "bootstrapStart", window.location.href || "");

  var CORE_SCRIPTS = [
    "assets/js/runtime.js",
    "assets/js/loading-gate.js",
    "assets/js/config.js",
    "assets/js/backend-client.js",
    "assets/js/css-sheet-runtime.js",
    "assets/js/header.js",
    "assets/js/page-map.js",
    "assets/js/footer.js"
  ];

  function mark(name, detail) {
    earlyRuntimeLog("INFO", name, detail || "");
    if (window.SKHPSRuntime && typeof window.SKHPSRuntime.mark === "function") {
      window.SKHPSRuntime.mark(name, detail);
    }
  }

  function warn(name, detail) {
    earlyRuntimeLog("WARN", name, detail || "");
    if (window.SKHPSRuntime && typeof window.SKHPSRuntime.warn === "function") {
      window.SKHPSRuntime.warn(name, detail);
    }
  }

  function runtimeError(name, detail) {
    earlyRuntimeLog("FAIL", name, detail || "");
    if (window.SKHPSRuntime && typeof window.SKHPSRuntime.error === "function") {
      window.SKHPSRuntime.error(name, detail);
    }
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

  function isAbsoluteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
  }

  function currentScriptVersion() {
    var script = document.currentScript;
    if (!script || !script.src || script.src.indexOf("?") < 0) return "";

    try {
      return new URL(script.src).searchParams.get("v") || "";
    } catch (error) {
      return "";
    }
  }

  function normalizeScriptEntry(entry) {
    if (typeof entry === "string") {
      return {
        path: entry,
        optional: false
      };
    }

    return {
      path: entry && entry.path ? entry.path : "",
      optional: Boolean(entry && entry.optional)
    };
  }

  function requireManifest() {
    var manifest = window.SKHPS_APP_MANIFEST || (window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.manifest) || null;

    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("SKHPS_APP_MANIFEST missing; external apps must use app.json");
    }

    if (!manifest.entry || typeof manifest.entry !== "object" || Array.isArray(manifest.entry)) {
      throw new Error("SKHPS_APP_MANIFEST.entry missing");
    }

    if (!Array.isArray(manifest.entry.afterScripts)) {
      throw new Error("SKHPS_APP_MANIFEST.entry.afterScripts must be an array");
    }

    if (!Array.isArray(manifest.entry.loadingTasks)) {
      throw new Error("SKHPS_APP_MANIFEST.entry.loadingTasks must be an array");
    }

    return manifest;
  }

  function getAppEnv() {
    var appEnv = window.SKHPS_APP_ENV || {};
    var manifest = requireManifest();
    var version = appEnv.version || currentScriptVersion() || Date.now();

    mark("external-app-loader:init", {
      file: "external-app-loader.js",
      functionName: "getAppEnv",
      href: window.location.href
    });

    if (!appEnv.sharedBaseUrl) {
      throw new Error("SKHPS_APP_ENV.sharedBaseUrl missing");
    }

    var options = {
      appId: appEnv.appId || manifest.appId || window.SKHPS_APP_ID || "unknown",
      env: appEnv.env || "prod",
      requestedRuntime: appEnv.requestedRuntime || "",
      sharedBaseUrl: normalizeBaseUrl(appEnv.sharedBaseUrl),
      version: version,
      title: manifest.title || appEnv.title || "",
      href: manifest.href || appEnv.href || window.location.href,
      group: manifest.group || appEnv.group || "",
      displayPosition: "",
      order: 9999,
      coreScripts: CORE_SCRIPTS.slice(),
      afterScripts: manifest.entry.afterScripts.slice(),
      loadingTasks: manifest.entry.loadingTasks.slice(),
      manifest: manifest
    };

    mark("external-app-loader:env", Object.assign({
      file: "external-app-loader.js",
      functionName: "getAppEnv"
    }, options));
    return options;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var startedAt = Date.now();
      earlyRuntimeLog("RUN", "loadScript", src);

      var script = document.createElement("script");
      script.src = src;
      script.async = false;

      script.onload = function () {
        earlyRuntimeLog("OK", "scriptLoaded", src, Date.now() - startedAt);
        resolve(src);
      };

      script.onerror = function () {
        earlyRuntimeLog("FAIL", "scriptError", src, Date.now() - startedAt);
        reject(new Error("external app loader script load failed: " + src));
      };

      document.head.appendChild(script);
    });
  }

  function loadSequential(entries, eventBaseName) {
    var chain = Promise.resolve();

    entries.forEach(function (entry) {
      chain = chain.then(function () {
        mark(eventBaseName + "-start " + entry.path, {
          file: "external-app-loader.js",
          functionName: "loadSequential",
          scriptPath: entry.path,
          scriptUrl: entry.url,
          optional: entry.optional
        });
        return loadScript(entry.url)
          .then(function (src) {
            mark(eventBaseName + "-loaded " + entry.path, {
              file: "external-app-loader.js",
              functionName: "loadSequential",
              scriptPath: entry.path,
              scriptUrl: src,
              optional: entry.optional
            });
            return src;
          })
          .catch(function (error) {
            var detail = {
              file: "external-app-loader.js",
              functionName: "loadSequential",
              scriptPath: entry.path,
              scriptUrl: entry.url,
              optional: entry.optional,
              error: error && error.message ? error.message : String(error)
            };

            if (entry.optional) {
              console.warn("[SKHPSExternalAppLoader] optional script load failed:", entry.url, error);
              warn(eventBaseName + "-error", detail);
              return null;
            }

            runtimeError(eventBaseName + "-error", detail);
            throw error;
          });
      });
    });

    return chain;
  }

  function resolveCoreUrls(options) {
    return options.coreScripts.map(function (entry) {
      var normalized = normalizeScriptEntry(entry);
      return {
        path: normalized.path,
        optional: normalized.optional,
        url: withVersion(joinUrl(options.sharedBaseUrl, normalized.path), options.version)
      };
    }).filter(function (entry) {
      return Boolean(entry.path);
    });
  }

  function resolveAfterUrls(options) {
    return options.afterScripts.map(function (entry) {
      var normalized = normalizeScriptEntry(entry);
      var path = normalized.path;
      var url = "";

      if (isAbsoluteUrl(path)) {
        url = withVersion(path, options.version);
      } else {
        /*
          afterScripts 是外部專案自己的 script。
          相對路徑應該相對於外部專案頁面，而不是 skhpsv2 sharedBaseUrl。
        */
        url = withVersion(path, options.version);
      }

      return {
        path: path,
        optional: normalized.optional,
        url: url
      };
    }).filter(function (entry) {
      return Boolean(entry.path);
    });
  }

  function markFailed(error) {
    console.error("[SKHPSExternalAppLoader]", error);
    runtimeError("external-app-loader:error", {
      error: error && error.message ? error.message : String(error)
    });

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail("external-app-loader", error);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
    document.documentElement.classList.remove("skhps-shell-loading");
    document.documentElement.classList.remove("skhps-main-loading");
    document.documentElement.setAttribute("data-skhps-shell-ready", "true");
    document.documentElement.setAttribute("data-skhps-page-ready", "true");
  }

  function normalizeRegisterPayload(options) {
    var manifest = options.manifest || window.SKHPS_APP_MANIFEST || {};
    var appId = String(manifest.appId || options.appId || window.SKHPS_APP_ID || "").trim();
    var title = String(manifest.title || manifest.name || options.title || document.title || appId || "").trim();
    var href = String(manifest.href || options.href || window.location.href || "").trim();
    var group = String(manifest.group || options.group || "").trim();
    var version = String(options.version || "").trim();

    return {
      appId: appId,
      title: title,
      href: href,
      group: group,
      displayPosition: "",
      "顯示位置": "",
      order: 9999,
      version: version,
      env: options.env || "",
      requestedRuntime: options.requestedRuntime || "",
      origin: window.location.origin || "",
      pageUrl: window.location.href || "",
      userAgent: navigator.userAgent || ""
    };
  }

  function registerExternalAppIfNeeded(options) {
    var manifest = options.manifest || window.SKHPS_APP_MANIFEST || {};

    if (!manifest || typeof manifest !== "object") {
      return;
    }

    if (manifest.registerExternalApp === false) {
      return;
    }

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      console.warn("[SKHPSExternalAppLoader] registerExternalApp skipped: SKHPSBackend.call not available");
      return;
    }

    var payload = normalizeRegisterPayload(options);

    if (!payload.appId || !payload.title || !payload.href) {
      console.warn("[SKHPSExternalAppLoader] registerExternalApp skipped: missing appId/title/href", payload);
      return;
    }

    mark("external-app-loader:register-start", Object.assign({
      file: "external-app-loader.js",
      functionName: "registerExternalAppIfNeeded",
      action: "registerExternalApp"
    }, payload));

    /* 背景報到，不 await，不擋外部 app 自己的 afterScripts。 */
    window.SKHPS_EXTERNAL_APP_REGISTER_PROMISE = window.SKHPSBackend
      .call("registerExternalApp", payload, {
        timeoutMs: 8000
      })
      .then(function (result) {
        window.SKHPS_EXTERNAL_APP_REGISTER_RESULT = result;
        console.info("[SKHPSExternalAppLoader] external app registered:", result);
        mark("external-app-loader:register-done", {
          file: "external-app-loader.js",
          functionName: "registerExternalAppIfNeeded",
          action: "registerExternalApp",
          result: result
        });
        return result;
      })
      .catch(function (error) {
        window.SKHPS_EXTERNAL_APP_REGISTER_ERROR = error;
        console.warn("[SKHPSExternalAppLoader] registerExternalApp failed:", error);
        warn("external-app-loader:register-error", {
          file: "external-app-loader.js",
          functionName: "registerExternalAppIfNeeded",
          action: "registerExternalApp",
          error: error && error.message ? error.message : String(error)
        });
        return {
          ok: false,
          error: error && error.message ? error.message : String(error)
        };
      });
  }

  function load() {
    var options = getAppEnv();

    window.SKHPS_EXTERNAL_APP_LOADER_OPTIONS = options;
    window.SKHPS_CONFIG_BASE_URL = options.sharedBaseUrl;

    return loadSequential(resolveCoreUrls(options), "external-app-loader:core-script")
      .then(function () {
        mark("external-app-loader:core-ready", Object.assign({
          file: "external-app-loader.js",
          functionName: "load"
        }, options));
        registerExternalAppIfNeeded(options);
        return loadSequential(resolveAfterUrls(options), "external-app-loader:after-script");
      })
      .then(function () {
        window.SKHPS_EXTERNAL_APP_LOADER_LOADED = true;

        mark("external-app-loader:ready", Object.assign({
          file: "external-app-loader.js",
          functionName: "load"
        }, options));

        document.dispatchEvent(new CustomEvent("skhps-external-app-loader-ready", {
          detail: options
        }));

        return options;
      });
  }

  window.SKHPSExternalAppLoader = {
    getAppEnv: getAppEnv,
    load: load,
    registerExternalAppIfNeeded: registerExternalAppIfNeeded
  };

  load().then(function () {
    earlyRuntimeLog("OK", "externalAppLoaderDone", "scheduled");
  }).catch(markFailed);
})();
