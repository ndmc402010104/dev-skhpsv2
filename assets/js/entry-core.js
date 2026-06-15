/*
檔案位置：skhpsv2/assets/js/entry-core.js
時間戳記：2026-06-16 UTC+8
用途：SKHPS 共用 entry core；只負責依序載入共用 JS、頁面/外部專案自己的 JS，最後載 footer。
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var SOURCE = "entry-core.js";

  var DEFAULT_CORE_SCRIPTS = [
    "assets/js/runtime.js",
    "assets/js/loading-gate.js",
    "assets/js/config.js",
    "assets/js/route.js",
    "assets/js/backend-client.js",
    "assets/js/css-sheet-runtime.js",
    "assets/js/header.js",
    "assets/js/page-map.js"
  ];

  var DEFAULT_FOOTER_SCRIPT = "assets/js/footer.js";

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
        category: "script",
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

  function isAbsoluteUrl(url) {
    return /^https?:\/\//i.test(String(url || ""));
  }

  function joinUrl(baseUrl, path) {
    if (isAbsoluteUrl(path)) return path;
    return normalizeBaseUrl(baseUrl) + String(path || "").replace(/^\/+/, "");
  }

  function withVersion(url, version) {
    version = String(version || "").trim();
    if (!version) return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(version);
  }

  function currentScriptVersion() {
    if (!currentScript || !currentScript.src || currentScript.src.indexOf("?") < 0) {
      return "";
    }

    try {
      return new URL(currentScript.src).searchParams.get("v") || "";
    } catch (error) {
      return "";
    }
  }

  function inferSharedBaseUrl() {
    var src = currentScript && currentScript.src ? currentScript.src : "";

    if (window.SKHPS_ENTRY_BASE_URL) {
      return normalizeBaseUrl(window.SKHPS_ENTRY_BASE_URL);
    }

    if (window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.sharedBaseUrl) {
      return normalizeBaseUrl(window.SKHPS_APP_ENV.sharedBaseUrl);
    }

    if (window.SKHPS_CONFIG_BASE_URL) {
      return normalizeBaseUrl(window.SKHPS_CONFIG_BASE_URL);
    }

    if (src) {
      return normalizeBaseUrl(
        stripQueryAndHash(src).replace(/\/assets\/js\/entry-core\.js$/i, "/")
      );
    }

    return normalizeBaseUrl(window.location.origin + "/");
  }

  function normalizeScriptEntry(entry) {
    if (typeof entry === "string") {
      return {
        path: entry,
        optional: false
      };
    }

    entry = entry || {};

    return {
      path: String(entry.path || entry.src || entry.url || "").trim(),
      optional: Boolean(entry.optional)
    };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var startedAt = Date.now();
      var script = document.createElement("script");

      earlyRuntimeLog("RUN", "loadScript", src);

      script.src = src;
      script.async = false;
      script.setAttribute("data-skhps-entry-src", src);

      script.onload = function () {
        earlyRuntimeLog("OK", "scriptLoaded", src, Date.now() - startedAt);
        resolve(src);
      };

      script.onerror = function () {
        earlyRuntimeLog("FAIL", "scriptError", src, Date.now() - startedAt);
        reject(new Error("entry-core script load failed: " + src));
      };

      document.head.appendChild(script);
    });
  }

  function loadSequential(entries, eventBaseName) {
    var chain = Promise.resolve();

    entries.forEach(function (entry) {
      chain = chain.then(function () {
        earlyRuntimeLog("RUN", eventBaseName + ":start", entry.path || entry.url || "");

        return loadScript(entry.url).then(function (src) {
          earlyRuntimeLog("OK", eventBaseName + ":loaded", entry.path || src || "");
          return src;
        }).catch(function (error) {
          if (entry.optional) {
            console.warn("[SKHPSEntryCore] optional script load failed:", entry.url, error);
            earlyRuntimeLog("WARN", eventBaseName + ":optional-error", error.message || String(error));
            return null;
          }

          throw error;
        });
      });
    });

    return chain;
  }

  function resolveCoreScripts(options) {
    return (options.coreScripts || DEFAULT_CORE_SCRIPTS).map(function (entry) {
      var normalized = normalizeScriptEntry(entry);

      return {
        path: normalized.path,
        optional: normalized.optional,
        url: withVersion(joinUrl(options.sharedBaseUrl, normalized.path), options.coreVersion)
      };
    }).filter(function (entry) {
      return Boolean(entry.path);
    });
  }

  function resolveSpecificScripts(options) {
    return (options.specificScripts || options.afterScripts || []).map(function (entry) {
      var normalized = normalizeScriptEntry(entry);
      var path = normalized.path;
      var url = "";

      if (isAbsoluteUrl(path)) {
        url = path;
      } else {
        try {
          url = new URL(path, options.specificBaseUrl || window.location.href).toString();
        } catch (error) {
          url = path;
        }
      }

      return {
        path: path,
        optional: normalized.optional,
        url: withVersion(url, options.specificVersion || options.coreVersion)
      };
    }).filter(function (entry) {
      return Boolean(entry.path);
    });
  }

  function resolveFooterScript(options) {
    var path = options.footerScript || DEFAULT_FOOTER_SCRIPT;

    return {
      path: path,
      optional: true,
      url: withVersion(joinUrl(options.sharedBaseUrl, path), options.coreVersion)
    };
  }

  function normalizeOptions(rawOptions) {
    var options = rawOptions || {};

    options.sharedBaseUrl = normalizeBaseUrl(options.sharedBaseUrl || inferSharedBaseUrl());
    options.coreVersion = String(options.coreVersion || currentScriptVersion() || "").trim();
    options.specificBaseUrl = options.specificBaseUrl || options.sharedBaseUrl;
    options.specificVersion = String(options.specificVersion || options.coreVersion || "").trim();

    return options;
  }

  function markFailed(error, options) {
    options = options || {};

    console.error("[SKHPSEntryCore]", error);
    earlyRuntimeLog("FAIL", "entryCoreError", error && error.message ? error.message : String(error));

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail(options.failureTask || "entry-core", error);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
    document.documentElement.classList.remove("skhps-shell-loading");
    document.documentElement.classList.remove("skhps-main-loading");
    document.documentElement.setAttribute("data-skhps-shell-ready", "true");
    document.documentElement.setAttribute("data-skhps-page-ready", "true");
  }

  function dispatchReady(options) {
    try {
      document.dispatchEvent(new CustomEvent("skhps-entry-core-ready", {
        detail: options
      }));
    } catch (error) {}
  }

  function load(rawOptions) {
    var options = normalizeOptions(rawOptions);

    window.SKHPS_ENTRY_CORE_OPTIONS = options;
    window.SKHPS_ENTRY_BASE_URL = options.sharedBaseUrl;
    window.SKHPS_CONFIG_BASE_URL = options.sharedBaseUrl;

    earlyRuntimeLog("RUN", "entryCoreStart", {
      scope: options.scope || "",
      pageId: options.pageId || "",
      appId: options.appId || "",
      sharedBaseUrl: options.sharedBaseUrl,
      coreVersion: options.coreVersion
    });

    return loadSequential(resolveCoreScripts(options), "entry-core:core")
      .then(function () {
        if (typeof options.beforeSpecific === "function") {
          return options.beforeSpecific(options);
        }
        return null;
      })
      .then(function () {
        return loadSequential(resolveSpecificScripts(options), "entry-core:specific");
      })
      .then(function () {
        if (typeof options.afterSpecific === "function") {
          return options.afterSpecific(options);
        }
        return null;
      })
      .then(function () {
        return loadSequential([resolveFooterScript(options)], "entry-core:footer");
      })
      .then(function () {
        window.SKHPS_ENTRY_CORE_LOADED = true;
        earlyRuntimeLog("OK", "entryCoreReady", options.scope || "");
        dispatchReady(options);
        return options;
      })
      .catch(function (error) {
        markFailed(error, options);
        throw error;
      });
  }

  window.SKHPSEntryCore = {
    load: load,
    loadScript: loadScript,
    loadSequential: loadSequential,
    normalizeBaseUrl: normalizeBaseUrl,
    joinUrl: joinUrl,
    withVersion: withVersion,
    inferSharedBaseUrl: inferSharedBaseUrl
  };

  earlyRuntimeLog("OK", "moduleReady", "entry-core.js");
})();