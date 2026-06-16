/*
檔案位置：skhpsv2/assets/js/entry-core.js
時間戳記：2026-06-16 UTC+8
用途：SKHPS 共用 entry core；統一載入共通 JS、掛載 shell、回報 skhps-shell，再載入頁面/外部專案自己的 JS。

責任切分：
- skhps-entry.js：只負責 skhpsv2 本體頁身份 adapter。
- app-entry.js：只負責外部專案身份 adapter。
- entry-core.js：負責真正共通啟動流程。
- loading-gate.js：負責 shell/main 分段 release。
- skhps-loading.css：唯一 loading CSS，負責 loading 階段視覺與隱藏規則。

流程：
1. 載 runtime.js
2. 載 loading-gate.js
3. require("skhps-shell")
4. 載 config.js
5. 載 route.js
6. 載 backend-client.js
7. 載 css-sheet-runtime.js
8. DOM ready
9. 載 header.js
10. 載 page-map.js
11. 載 footer.js
12. done("skhps-shell")
13. 載 page/app-specific JS
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var SOURCE = "entry-core.js";

  var DEFAULT_BOOT_SCRIPTS = [
    "assets/js/runtime.js",
    "assets/js/loading-gate.js",
    "assets/js/config.js",
    "assets/js/route.js",
    "assets/js/backend-client.js",
    "assets/js/css-sheet-runtime.js"
  ];

  var DEFAULT_SHELL_SCRIPTS = [
    "assets/js/header.js",
    "assets/js/page-map.js",
    "assets/js/footer.js"
  ];

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
    if (isAbsoluteUrl(path)) {
      return path;
    }

    return normalizeBaseUrl(baseUrl) + String(path || "").replace(/^\/+/, "");
  }

  function withVersion(url, version) {
    version = String(version || "").trim();

    if (!version) {
      return url;
    }

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

  function onDomReady() {
    return new Promise(function (resolve) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          resolve();
        }, { once: true });
        return;
      }

      resolve();
    });
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

  function resolveSharedScript(options, entry) {
    var normalized = normalizeScriptEntry(entry);

    return {
      path: normalized.path,
      optional: normalized.optional,
      url: withVersion(joinUrl(options.sharedBaseUrl, normalized.path), options.coreVersion)
    };
  }

  function resolveSpecificScript(options, entry) {
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
  }

  function resolveBootScripts(options) {
    return (options.coreScripts || DEFAULT_BOOT_SCRIPTS).map(function (entry) {
      return resolveSharedScript(options, entry);
    }).filter(function (entry) {
      return Boolean(entry.path);
    });
  }

  function resolveShellScripts(options) {
    return (options.shellScripts || DEFAULT_SHELL_SCRIPTS).map(function (entry) {
      return resolveSharedScript(options, entry);
    }).filter(function (entry) {
      return Boolean(entry.path);
    });
  }

  function resolveSpecificScripts(options) {
    return (options.specificScripts || options.afterScripts || []).map(function (entry) {
      return resolveSpecificScript(options, entry);
    }).filter(function (entry) {
      return Boolean(entry.path);
    });
  }

  function normalizeOptions(rawOptions) {
    var options = rawOptions || {};

    options.sharedBaseUrl = normalizeBaseUrl(options.sharedBaseUrl || inferSharedBaseUrl());
    options.coreVersion = String(options.coreVersion || currentScriptVersion() || "").trim();
    options.specificBaseUrl = options.specificBaseUrl || options.sharedBaseUrl;
    options.specificVersion = String(options.specificVersion || options.coreVersion || "").trim();

    return options;
  }

  function ensureLoadingClasses() {
    var html = document.documentElement;

    html.classList.add("skhps-loading");
    html.classList.add("skhps-css-loading");
    html.classList.add("skhps-shell-loading");
    html.classList.add("skhps-main-loading");

    if (html.getAttribute("data-skhps-shell-ready") !== "true") {
      html.setAttribute("data-skhps-shell-ready", "false");
    }

    if (html.getAttribute("data-skhps-page-ready") !== "true") {
      html.setAttribute("data-skhps-page-ready", "false");
    }
  }

  function requireShellTask() {
    if (window.SKHPSLoading && typeof window.SKHPSLoading.require === "function") {
      window.SKHPSLoading.require("skhps-shell");
      earlyRuntimeLog("RUN", "requireShellTask", "skhps-shell");
      return true;
    }

    earlyRuntimeLog("WARN", "requireShellTaskSkipped", "SKHPSLoading.require not available");
    return false;
  }

  function doneShellTask() {
    document.documentElement.setAttribute("data-skhps-shell-mounted", "true");

    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done("skhps-shell");
      earlyRuntimeLog("OK", "doneShellTask", "skhps-shell");
      return true;
    }

    earlyRuntimeLog("WARN", "doneShellTaskSkipped", "SKHPSLoading.done not available");
    return false;
  }

  function failShellTask(error) {
    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail("skhps-shell", error);
      earlyRuntimeLog("FAIL", "failShellTask", error && error.message ? error.message : String(error));
      return true;
    }

    earlyRuntimeLog("WARN", "failShellTaskSkipped", "SKHPSLoading.fail not available");
    return false;
  }

  function markFailed(error, options) {
    options = options || {};

    console.error("[SKHPSEntryCore]", error);
    earlyRuntimeLog("FAIL", "entryCoreFailed", error && error.message ? error.message : String(error));

    failShellTask(error);

    if (options.failureTask && window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail(options.failureTask, error);
      return;
    }

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail("entry-core", error);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
    document.documentElement.classList.remove("skhps-shell-loading");
    document.documentElement.classList.remove("skhps-main-loading");
    document.documentElement.setAttribute("data-skhps-shell-ready", "true");
    document.documentElement.setAttribute("data-skhps-shell-ready-reason", "entry-core-failed");
    document.documentElement.setAttribute("data-skhps-page-ready", "true");
    document.documentElement.setAttribute("data-skhps-page-ready-reason", "entry-core-failed");
  }

  function dispatchEvent(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, {
        detail: detail || {}
      }));
    } catch (error) {}
  }

  function load(rawOptions) {
    var options = normalizeOptions(rawOptions || {});
    var bootScripts = resolveBootScripts(options);
    var shellScripts = resolveShellScripts(options);
    var specificScripts = resolveSpecificScripts(options);

    ensureLoadingClasses();

    window.SKHPS_ENTRY_CORE_OPTIONS = options;

    earlyRuntimeLog("RUN", "load:start", {
      scope: options.scope || "",
      pageId: options.pageId || "",
      appId: options.appId || "",
      sharedBaseUrl: options.sharedBaseUrl,
      specificBaseUrl: options.specificBaseUrl,
      bootScripts: bootScripts.map(function (item) { return item.path; }),
      shellScripts: shellScripts.map(function (item) { return item.path; }),
      specificScripts: specificScripts.map(function (item) { return item.path; })
    });

    dispatchEvent("skhps-entry-core-start", {
      options: options
    });

    return loadSequential(bootScripts, "bootScripts")
      .then(function () {
        requireShellTask();

        dispatchEvent("skhps-entry-core-boot-ready", {
          options: options
        });

        return onDomReady();
      })
      .then(function () {
        document.documentElement.setAttribute("data-skhps-dom-ready", "true");

        dispatchEvent("skhps-entry-core-dom-ready", {
          options: options
        });

        return loadSequential(shellScripts, "shellScripts");
      })
      .then(function () {
        doneShellTask();

        dispatchEvent("skhps-entry-core-shell-ready", {
          options: options
        });

        return loadSequential(specificScripts, "specificScripts");
      })
      .then(function () {
        window.SKHPS_ENTRY_CORE_LOADED = true;

        earlyRuntimeLog("OK", "load:done", {
          scope: options.scope || "",
          pageId: options.pageId || "",
          appId: options.appId || "",
          specificScripts: specificScripts.map(function (item) { return item.path; })
        });

        dispatchEvent("skhps-entry-core-ready", {
          options: options
        });

        return options;
      })
      .catch(function (error) {
        markFailed(error, options);
        throw error;
      });
  }

  window.SKHPSEntryCore = {
    load: load,
    normalizeOptions: normalizeOptions,
    loadScript: loadScript,
    loadSequential: loadSequential,
    onDomReady: onDomReady,
    requireShellTask: requireShellTask,
    doneShellTask: doneShellTask
  };
})();