/*
檔案位置：skhpsv2/assets/js/entry-core.js
時間戳記：2026-07-21 18:30 UTC+8
用途：SKHPS 共用 entry core；統一載入共通 JS、掛載 shell、回報 skhps-shell，再載入頁面/外部專案自己的 JS。

責任切分：
- skhps-entry.js：只負責 skhpsv2 本體頁身份 adapter。
- app-entry.js：只負責外部專案身份 adapter。
- entry-core.js：負責真正共通啟動流程。
- loading-gate.js：負責 shell/main 分段 release。
- skhps-loading.css：唯一 loading CSS，負責 loading 階段視覺與隱藏規則。

流程：
1. 正規化 loading task 名稱，例如 external-apps-runtime → external-apps-layout
2. 載 runtime.js
3. 載 loading-gate.js
4. require("skhps-shell")
5. 載 config.js
6. 載 route.js
7. 載 backend-client.js
8. 載 css-sheet-runtime.js
9. DOM ready
10. 載 header.js
11. 載 page-map.js
12. 載 footer.js
13. done("skhps-shell")
14. 載 page/app-specific JS
*/

(function () {
  "use strict";

  var currentScript = document.currentScript;
  var SOURCE = "entry-core.js";

  var DEFAULT_BOOT_SCRIPTS = [
    "assets/js/runtime.js",
    { path: "assets/js/layout-metrics.js", optional: true },
    { path: "assets/js/layout-fit.js", optional: true },
    "assets/js/loading-gate.js",
    "assets/js/config.js",
    "assets/js/route.js",
    "assets/js/backend-client.js",
    // 2026-07-22（母片）：讀 shell-skhps 的母片設定填 window.SKHPS_SHELL，讓
    // header/footer/loading-gate 可由母片控制。放 backend-client 之後（要用 SKHPSBackend）、
    // css-sheet-runtime／shell scripts 之前（header render 前母片值要就位）。optional＝
    // 讀失敗不擋 boot、無母片設定＝維持寫死預設（prod 零風險）。外部專案共用這份 boot
    // scripts，自動吃到同一份母片，不用改任何 config/JS（水庫理論）。
    { path: "assets/js/shell-config.js", optional: true },
    // 2026-07-22（全站通用 UI 行為）：下拉選單點外面/Esc 關閉等，一次設定、全站（含外部
    // 專案）統一控制。optional＝載失敗不擋 boot。使用者原則：通用互動收進元件、統一管理。
    { path: "assets/js/ui-behaviors.js", optional: true },
    { path: "assets/js/jonaminz-bridge.js", optional: true },
    "assets/js/css-sheet-runtime.js",
    { path: "assets/js/toast.js", optional: true }
  ];

  var DEFAULT_SHELL_SCRIPTS = [
    "assets/js/header.js",
    "assets/js/page-map.js",
    "assets/js/footer.js"
  ];

  var LOADING_TASK_ALIASES = {
    "external-apps-runtime": "external-apps-layout"
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

  function normalizeTaskToken(token) {
    var normalized = String(token || "").trim();

    return LOADING_TASK_ALIASES[normalized] || normalized;
  }

  function getCurrentPageId() {
    var html = document.documentElement;
    var body = document.body;

    return String(
      html.getAttribute("data-skhps-page-id") ||
      html.getAttribute("data-page-id") ||
      body && body.getAttribute("data-skhps-page-id") ||
      body && body.getAttribute("data-page-id") ||
      ""
    ).trim();
  }

  function mergeObject(base, override) {
    return Object.assign({}, base || {}, override || {});
  }

  function resolveEffectiveManifest(rawManifest) {
    var manifest = rawManifest || {};
    var pageId = getCurrentPageId();
    var pages = manifest.pages && typeof manifest.pages === "object" && !Array.isArray(manifest.pages)
      ? manifest.pages
      : {};
    var page = pageId && pages[pageId] && typeof pages[pageId] === "object" && !Array.isArray(pages[pageId])
      ? pages[pageId]
      : null;
    var effective;

    if (!page) {
      window.SKHPS_APP_ROOT_MANIFEST = manifest;
      window.SKHPS_APP_EFFECTIVE_MANIFEST = manifest;
      return manifest;
    }

    var rootAppId = String(manifest.appId || page.rootAppId || "").trim();
    var currentAppId = String(page.appId || page.projectId || page.pageId || pageId || rootAppId).trim();

    effective = Object.assign({}, manifest, page, {
      appId: currentAppId,
      projectId: currentAppId,
      rootAppId: rootAppId,
      pageId: page.pageId || pageId || currentAppId,
      title: page.title || manifest.title || "",
      description: page.description || manifest.description || "",
      group: page.group || manifest.group || "",
      href: page.href || manifest.href || "",
      version: manifest.version || {},
      entry: page.entry || manifest.entry || {},
      features: mergeObject(manifest.features, page.features),
      backend: mergeObject(manifest.backend, page.backend),
      pages: manifest.pages,
      __skhpsMatchedPage: true
    });

    if (page.registerExternalApp !== undefined) {
      effective.registerExternalApp = page.registerExternalApp;
    } else {
      effective.registerExternalApp = manifest.registerExternalApp;
    }

    if (page.configUrl === undefined && manifest.configUrl !== undefined) {
      effective.configUrl = manifest.configUrl;
    }

    if (page.signPageUrl === undefined && manifest.signPageUrl !== undefined) {
      effective.signPageUrl = manifest.signPageUrl;
    }

    window.SKHPS_APP_ROOT_MANIFEST = manifest;
    window.SKHPS_APP_EFFECTIVE_MANIFEST = effective;

    earlyRuntimeLog("OK", "resolveEffectiveManifest", {
      appId: manifest.appId || "",
      pageId: pageId,
      title: effective.title || "",
      afterScripts: effective.entry && effective.entry.afterScripts || [],
      loadingTasks: effective.entry && effective.entry.loadingTasks || []
    });

    return effective;
  }

  function normalizeLoadingTaskAttribute(attributeName) {
    var html = document.documentElement;
    var raw = html.getAttribute(attributeName) || "";

    if (!raw) {
      return raw;
    }

    var changed = false;
    var seen = {};
    var tasks = raw.split(/[\s,]+/).map(function (token) {
      var original = String(token || "").trim();
      var normalized = normalizeTaskToken(original);

      if (original && original !== normalized) {
        changed = true;
      }

      return normalized;
    }).filter(function (token) {
      if (!token || seen[token]) {
        return false;
      }

      seen[token] = true;
      return true;
    });

    if (!tasks.length) {
      return raw;
    }

    var next = tasks.join(",");

    if (changed || raw !== next) {
      html.setAttribute(attributeName, next);
      html.setAttribute("data-skhps-loading-tasks-normalized", "true");
      earlyRuntimeLog("OK", "normalizeLoadingTaskNames", {
        attribute: attributeName,
        from: raw,
        to: next
      });
    }

    return next;
  }

  function normalizeLoadingTaskNames() {
    normalizeLoadingTaskAttribute("data-loading-tasks");
    normalizeLoadingTaskAttribute("data-skhps-loading-tasks");

    return document.documentElement.getAttribute("data-loading-tasks") ||
      document.documentElement.getAttribute("data-skhps-loading-tasks") ||
      "";
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

  // 2026-07-17（效能）：loadSequential 是「一支載完＋執行完才請求下一支」
  // 的序列瀑布——正確但慢，實測首頁光是 JS 串行載入就吃掉約 5 秒。
  // loadScript 已經用 script.async=false 保證「執行順序」，所以其實可以
  // 「平行下載、依序執行」。這支在真正開始 loadSequential 前，先對所有
  // 已解析的 script URL 塞 <link rel="preload" as="script">，讓瀏覽器
  // 提早平行預抓；序列載入器之後插入 <script> 時直接命中預抓快取，
  // 近乎瞬間。執行順序、gate 邏輯、事件時序完全不變，只有網路被平行
  // 預熱。只預抓同源、http(s) 的 URL（跨源要 crossorigin 屬性相符否則
  // 會重抓，乾脆跳過；相對路徑也跳過交給瀏覽器自己解析）。
  function preloadScripts(entries) {
    try {
      var head = document.head;
      if (!head || !Array.isArray(entries)) {
        return;
      }

      var origin = "";
      try {
        origin = window.location.origin || "";
      } catch (originError) {
        origin = "";
      }

      var seen = {};

      entries.forEach(function (entry) {
        var url = entry && entry.url;

        if (!url || seen[url]) {
          return;
        }

        // 只預抓絕對 http(s) 且同源的；跨源／相對路徑跳過。
        if (!isAbsoluteUrl(url)) {
          return;
        }

        if (origin && url.indexOf(origin + "/") !== 0) {
          return;
        }

        seen[url] = true;

        var link = document.createElement("link");
        link.rel = "preload";
        link.as = "script";
        link.href = url;
        link.setAttribute("data-skhps-preload", "true");
        head.appendChild(link);
      });

      earlyRuntimeLog("OK", "preloadScripts", Object.keys(seen).length + " scripts");
    } catch (error) {
      earlyRuntimeLog("WARN", "preloadScriptsFailed", error && error.message ? error.message : String(error));
    }
  }

  // 2026-07-21（Compatibility Renderer B 可調關）：script barrier。
  // loadSequential 保證的是「上一支 script **執行完**才載下一支」，對同步腳本
  // 剛好等於「上一支的效果已經落地」；但只要有一支要 await（例如頁面內容改成
  // 從後端非同步載入再 render），它的 onload 早在資料回來之前就觸發了，後面
  // 依賴那份 DOM 的 runtime（external-apps-runtime 等）就會撲空。
  //
  // 這裡補上通用能力：script 在自己執行期間呼叫 SKHPSEntryCore.defer(promise)，
  // 載入器就會在載下一支之前先等它。**沒有人呼叫＝完全不進這條路徑**
  // （deferred 陣列空的時候連一個 .then 都不多加），現有所有頁面行為 byte 級不變。
  //
  // 逾時（預設 15 秒）是刻意的：barrier 卡住只該延後後面的 script，絕不能變成
  // 「整頁永遠停在 loading」——逾時就記 WARN 繼續往下走，讓依賴方走自己的降級
  // 分支（跟 loading gate 的 timeout-fallback 同一個哲學）。
  var DEFAULT_DEFER_TIMEOUT_MS = 15000;
  var deferredBarriers = [];

  function defer(thenable, options) {
    options = options || {};

    var label = String(options.label || options.name || "").trim() || "anonymous";
    var timeoutMs = isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
      ? Number(options.timeoutMs)
      : DEFAULT_DEFER_TIMEOUT_MS;

    if (!thenable || typeof thenable.then !== "function") {
      earlyRuntimeLog("WARN", "defer:ignored", { label: label, reason: "not-a-promise" });
      return false;
    }

    deferredBarriers.push({ label: label, timeoutMs: timeoutMs, promise: thenable });
    earlyRuntimeLog("RUN", "defer:registered", { label: label, timeoutMs: timeoutMs });
    return true;
  }

  function awaitBarrier(barrier) {
    var startedAt = Date.now();

    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) {
          return;
        }

        settled = true;
        earlyRuntimeLog("WARN", "defer:timeout", { label: barrier.label, timeoutMs: barrier.timeoutMs }, Date.now() - startedAt);
        resolve();
      }, barrier.timeoutMs);

      barrier.promise.then(function () {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        earlyRuntimeLog("OK", "defer:resolved", { label: barrier.label }, Date.now() - startedAt);
        resolve();
      }, function (error) {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timer);
        // barrier 失敗＝那支 script 自己的事（它該自己回報 loading fail），
        // 載入器只負責「不要再等下去」，不把整條 entry chain 拖下水。
        earlyRuntimeLog("WARN", "defer:rejected", {
          label: barrier.label,
          error: error && error.message ? error.message : String(error)
        }, Date.now() - startedAt);
        resolve();
      });
    });
  }

  // 回傳 null＝這一輪沒有 barrier（呼叫端就不要多包一層 then，維持零回歸）。
  function drainBarriers() {
    if (!deferredBarriers.length) {
      return null;
    }

    var batch = deferredBarriers;
    deferredBarriers = [];

    return Promise.all(batch.map(awaitBarrier));
  }

  function loadSequential(entries, eventBaseName) {
    var chain = Promise.resolve();

    entries.forEach(function (entry) {
      chain = chain.then(function () {
        earlyRuntimeLog("RUN", eventBaseName + ":start", entry.path || entry.url || "");

        return loadScript(entry.url).then(function (src) {
          earlyRuntimeLog("OK", eventBaseName + ":loaded", entry.path || src || "");

          // 這支 script 執行時若登記了 barrier，先等完再載下一支。
          var barriers = drainBarriers();

          if (!barriers) {
            return src;
          }

          earlyRuntimeLog("RUN", eventBaseName + ":await-deferred", entry.path || src || "");

          return barriers.then(function () {
            earlyRuntimeLog("OK", eventBaseName + ":deferred-ready", entry.path || src || "");
            return src;
          });
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
    var rawManifest = options.manifest || window.SKHPS_APP_MANIFEST || window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.manifest || null;
    var effectiveManifest;

    if (rawManifest && typeof rawManifest === "object" && !Array.isArray(rawManifest)) {
      effectiveManifest = resolveEffectiveManifest(rawManifest);
      options.rootManifest = window.SKHPS_APP_ROOT_MANIFEST || rawManifest;
      options.manifest = effectiveManifest;
      options.effectiveManifest = effectiveManifest;
      options.rootAppId = options.rootAppId || effectiveManifest.rootAppId || options.rootManifest.appId || "";
      options.projectId = options.projectId || effectiveManifest.projectId || effectiveManifest.appId || effectiveManifest.pageId || options.rootAppId || "";
      options.appId = options.appId || options.projectId || options.rootAppId || "";
      options.pageId = options.pageId || effectiveManifest.pageId || getCurrentPageId() || options.projectId || "";
      options.title = options.title || effectiveManifest.title || options.rootManifest.title || "";
      options.href = options.href || effectiveManifest.href || options.rootManifest.href || "";
      options.group = options.group || effectiveManifest.group || options.rootManifest.group || "";

      if (
        effectiveManifest.entry &&
        Array.isArray(effectiveManifest.entry.afterScripts) &&
        (effectiveManifest.__skhpsMatchedPage || (!options.specificScripts && !options.afterScripts))
      ) {
        options.specificScripts = effectiveManifest.entry.afterScripts.slice();
        options.afterScripts = effectiveManifest.entry.afterScripts.slice();
      }

      if (effectiveManifest.entry && Array.isArray(effectiveManifest.entry.loadingTasks)) {
        options.loadingTasks = effectiveManifest.entry.loadingTasks.slice();
      }
    }

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
    normalizeLoadingTaskNames();

    // 效能：在序列載入開始前，先平行預抓所有 boot/shell/page script。
    // 這不改變任何載入順序或 gate 邏輯，只是把網路預熱平行化（見
    // preloadScripts 註解）。
    preloadScripts(bootScripts.concat(shellScripts, specificScripts));

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
    defer: defer,
    onDomReady: onDomReady,
    requireShellTask: requireShellTask,
    doneShellTask: doneShellTask,
    normalizeLoadingTaskNames: normalizeLoadingTaskNames,
    resolveEffectiveManifest: resolveEffectiveManifest
  };
})();
