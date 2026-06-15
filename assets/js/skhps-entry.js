/*
檔案位置：skhpsv2/assets/js/skhps-entry.js
時間戳記：2026-06-16 UTC+8
用途：skhpsv2 本體頁唯一入口；一載入先裝 loading guard，DOM ready 後再交給 entry-core.js。
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var SOURCE = "skhps-entry.js";

  function installEntryLoadingGuard() {
    var html = document.documentElement;
    var styleId = "skhps-entry-loading-guard";
    var style;

    html.classList.add("skhps-loading");
    html.classList.add("skhps-css-loading");
    html.classList.add("skhps-main-loading");
    html.setAttribute("data-skhps-entry-guard", "true");

    if (document.getElementById(styleId)) {
      return;
    }

    style = document.createElement("style");
    style.id = styleId;
    style.setAttribute("data-skhps-entry-guard-style", "true");
    style.textContent = [
      "html.skhps-loading body > header,",
      "html.skhps-loading body > main,",
      "html.skhps-loading body > footer,",
      "html.skhps-css-loading body > header,",
      "html.skhps-css-loading body > main,",
      "html.skhps-css-loading body > footer,",
      "html.skhps-main-loading body > header,",
      "html.skhps-main-loading body > main,",
      "html.skhps-main-loading body > footer {",
      "  opacity: 0 !important;",
      "  visibility: hidden !important;",
      "}",
      "",
      "html.skhps-loading,",
      "html.skhps-css-loading,",
      "html.skhps-main-loading {",
      "  background: #eef3f8;",
      "}",
      "",
      "html:not(.skhps-loading):not(.skhps-css-loading):not(.skhps-main-loading) body > header,",
      "html:not(.skhps-loading):not(.skhps-css-loading):not(.skhps-main-loading) body > main,",
      "html:not(.skhps-loading):not(.skhps-css-loading):not(.skhps-main-loading) body > footer {",
      "  opacity: 1;",
      "  visibility: visible;",
      "}"
    ].join("\n");

    document.head.appendChild(style);
  }

  function onDomReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
      return;
    }

    fn();
  }

  installEntryLoadingGuard();

  var PAGE_SCRIPTS = {
    index: [
      "assets/js/external-apps-runtime.js"
    ],
    home: [
      "assets/js/external-apps-runtime.js"
    ],
    admin: [
      "assets/js/admin.js"
    ],
    "css-setting": [
      "assets/js/css-setting-sheet-apply.js",
      "assets/js/css-setting-style-editor.js",
      "assets/js/css-setting-editor-core.js",
      "assets/js/css-setting-sheet-save.js",
      "assets/js/footer-style-editor.js"
    ],
    "backend-project-launcher": []
  };

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

  function joinUrl(baseUrl, path) {
    return normalizeBaseUrl(baseUrl) + String(path || "").replace(/^\/+/, "");
  }

  function withVersion(url, version) {
    version = String(version || "").trim();

    if (!version) {
      return url;
    }

    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(version);
  }

  function inferSharedBaseUrl() {
    var src = currentScript && currentScript.src ? currentScript.src : "";

    if (window.SKHPS_ENTRY_BASE_URL) {
      return normalizeBaseUrl(window.SKHPS_ENTRY_BASE_URL);
    }

    if (src) {
      return normalizeBaseUrl(
        stripQueryAndHash(src).replace(/\/assets\/js\/skhps-entry\.js$/i, "/")
      );
    }

    return normalizeBaseUrl(window.location.origin + "/");
  }

  function getVersion() {
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
        reject(new Error("skhps-entry script load failed: " + src));
      };

      document.head.appendChild(script);
    });
  }

  function loadEntryCore(sharedBaseUrl, version) {
    if (window.SKHPSEntryCore && typeof window.SKHPSEntryCore.load === "function") {
      return Promise.resolve(window.SKHPSEntryCore);
    }

    return loadScript(
      withVersion(
        joinUrl(sharedBaseUrl, "assets/js/entry-core.js"),
        version
      )
    ).then(function () {
      if (!window.SKHPSEntryCore || typeof window.SKHPSEntryCore.load !== "function") {
        throw new Error("SKHPSEntryCore.load not available");
      }

      return window.SKHPSEntryCore;
    });
  }

  function getRuntimeParam() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var runtime = String(params.get("skhpsRuntime") || params.get("runtime") || "").trim();

      if (runtime === "local-dev" || runtime === "dev" || runtime === "prod") {
        return runtime;
      }
    } catch (error) {}

    return "";
  }

  function inferEnvFromLocation() {
    var requestedRuntime = getRuntimeParam();
    var host = String(window.location.hostname || "").toLowerCase();

    if (requestedRuntime) {
      return requestedRuntime;
    }

    if (host === "127.0.0.1" || host === "localhost" || host === "") {
      return "local-dev";
    }

    if (host === "dev-skhps.jonaminz.com" || host.indexOf("dev-") === 0 || host.indexOf("dev-skhps") >= 0) {
      return "dev";
    }

    return "prod";
  }

  function inferPageId() {
    var fromHtml = String(document.documentElement.getAttribute("data-skhps-page-id") || "").trim();

    if (fromHtml) {
      return fromHtml;
    }

    var filename = String(window.location.pathname || "").split("/").pop() || "index.html";

    if (!filename || filename === "index.html") {
      return "index";
    }

    return filename.replace(/\.html?$/i, "");
  }

  function getPageScripts(pageId) {
    var raw = String(document.documentElement.getAttribute("data-skhps-page-scripts") || "").trim();

    if (raw) {
      return raw.split(",").map(function (item) {
        return String(item || "").trim();
      }).filter(Boolean);
    }

    if (Array.isArray(window.SKHPS_PAGE_SCRIPTS)) {
      return window.SKHPS_PAGE_SCRIPTS.slice();
    }

    return (PAGE_SCRIPTS[pageId] || []).slice();
  }

  function getFailureTask(pageId) {
    if (pageId === "index" || pageId === "home") {
      return "external-apps-runtime";
    }

    if (pageId === "admin") {
      return "admin-backend-apps";
    }

    if (pageId === "backend-project-launcher") {
      return "backend-project-launcher";
    }

    return "skhps-entry";
  }

  function markFailed(error) {
    console.error("[SKHPSEntry]", error);

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail("skhps-entry", error);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
    document.documentElement.classList.remove("skhps-shell-loading");
    document.documentElement.classList.remove("skhps-main-loading");
    document.documentElement.setAttribute("data-skhps-shell-ready", "true");
    document.documentElement.setAttribute("data-skhps-page-ready", "true");
  }

  function init() {
    var sharedBaseUrl = inferSharedBaseUrl();
    var version = getVersion();
    var pageId = inferPageId();
    var env = inferEnvFromLocation();
    var pageScripts = getPageScripts(pageId);

    window.SKHPS_ENTRY_BASE_URL = sharedBaseUrl;
    window.SKHPS_CONFIG_BASE_URL = sharedBaseUrl;

    window.SKHPS_PAGE_ENV = {
      pageId: pageId,
      env: env,
      requestedRuntime: getRuntimeParam() || "",
      sharedBaseUrl: sharedBaseUrl,
      version: version,
      pageScripts: pageScripts
    };

    document.documentElement.setAttribute("data-skhps-page-id", pageId);
    document.documentElement.setAttribute("data-skhps-runtime", env);
    document.documentElement.setAttribute("data-skhps-entry-scope", "skhps-core");

    earlyRuntimeLog("RUN", "init", {
      pageId: pageId,
      env: env,
      sharedBaseUrl: sharedBaseUrl,
      pageScripts: pageScripts
    });

    return loadEntryCore(sharedBaseUrl, version)
      .then(function () {
        return window.SKHPSEntryCore.load({
          scope: "skhps-core",
          pageId: pageId,
          env: env,
          requestedRuntime: getRuntimeParam() || "",
          sharedBaseUrl: sharedBaseUrl,
          coreVersion: version,
          specificBaseUrl: sharedBaseUrl,
          specificVersion: version,
          specificScripts: pageScripts,
          failureTask: getFailureTask(pageId)
        });
      })
      .then(function (options) {
        window.SKHPS_CORE_ENTRY_LOADED = true;

        try {
          document.dispatchEvent(new CustomEvent("skhps-entry-ready", {
            detail: options
          }));
        } catch (error) {}

        return options;
      });
  }

  window.SKHPSEntry = {
    init: init,
    inferPageId: inferPageId,
    getPageScripts: getPageScripts
  };

  earlyRuntimeLog("OK", "moduleReady", "skhps-entry.js");

  onDomReady(function () {
    init().catch(markFailed);
  });
})();