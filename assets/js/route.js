/*
檔案位置：skhpsv2/assets/js/route.js
時間戳記：2026-06-10 UTC+8
用途：skhpsv2 前端頁面路由 helper；等待 config.pages 載入完成後，依 page id 自動補上 href。
修正：支援 page.href 為字串，或 { local-dev, dev, prod } 環境物件。
*/

(function () {
  "use strict";

  function rlog(status, action, detail) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({
          source: "route.js",
          category: "runtime",
          action: action,
          status: status,
          detail: detail || ""
        });
      }
    } catch (error) {}
  }

  rlog("RUN", "moduleStart", "route.js");

  var MAX_WAIT_MS = 5000;
  var CHECK_INTERVAL_MS = 100;

  function getConfig() {
    return (
      window.SKHPS_CONFIG ||
      window.skhpsConfig ||
      {}
    );
  }

  function getEnv(config) {
    config = config || getConfig();

    if (
      window.SKHPSConfig &&
      typeof window.SKHPSConfig.getEnv === "function"
    ) {
      return window.SKHPSConfig.getEnv(config);
    }

    return config.env || "prod";
  }

  function getEnvValue(value, config) {
    config = config || getConfig();
    var env = getEnv(config);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value[env] || value.prod || value.dev || value["local-dev"] || "";
    }

    return value;
  }

  function getPages() {
    var config = getConfig();
    return Array.isArray(config.pages) ? config.pages : [];
  }

  function hasPagesReady() {
    return getPages().length > 0;
  }

  function getPageById(pageId) {
    var pages = getPages();

    for (var i = 0; i < pages.length; i += 1) {
      if (pages[i] && pages[i].id === pageId) {
        return pages[i];
      }
    }

    return null;
  }

  function getHref(pageId, fallbackHref) {
    var config = getConfig();
    var page = getPageById(pageId);
    var href = "";

    if (page && page.href) {
      href = getEnvValue(page.href, config) || fallbackHref || "#";
    } else {
      href = fallbackHref || "#";
    }

    if (href !== "#" && window.SKHPSConfig && typeof window.SKHPSConfig.withRuntime === "function") {
      return window.SKHPSConfig.withRuntime(href, config);
    }

    return href;
  }

  function applyPageLinks(root) {
    var scope = root || document;

    /*
      重要：
      data-skhps-page-id 也會出現在 <html> 上，用來標記目前頁面。
      route.js 只應該處理真正要補 href 的連結，不可以處理 html/body/section。
    */
    var links = scope.querySelectorAll("a[data-skhps-page-id], area[data-skhps-page-id]");

    links.forEach(function (link) {
      var pageId = link.getAttribute("data-skhps-page-id");
      var fallbackHref = link.getAttribute("href") || "";
      var href = getHref(pageId, fallbackHref);

      if (!href || href === "#") {
        link.setAttribute("href", "#");
        link.setAttribute("aria-disabled", "true");
        link.classList.add("skhps-btn-disabled");

        if (!link.dataset.skhpsRouteClickBound) {
          link.dataset.skhpsRouteClickBound = "1";

          link.addEventListener("click", function (event) {
            event.preventDefault();

            var pages = getPages();
            var knownIds = pages.map(function (page) {
              return page && page.id;
            }).filter(Boolean).join(", ");

            alert(
              "config.pages 找不到 page id: " +
              pageId +
              "\n\n目前已載入的 page id: " +
              (knownIds || "尚未載入")
            );
          });
        }

        return;
      }

      link.setAttribute("href", href);
      link.removeAttribute("aria-disabled");
      link.classList.remove("skhps-btn-disabled");
    });
  }

  function waitForConfigThenApply() {
    var startedAt = Date.now();

    function tick() {
      if (hasPagesReady()) {
        applyPageLinks(document);
        rlog("OK", "applyPageLinks", {
          pages: getPages().length
        });
        return;
      }

      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        applyPageLinks(document);
        rlog("WARN", "applyPageLinks", {
          reason: "timeout",
          pages: getPages().length
        });
        return;
      }

      window.setTimeout(tick, CHECK_INTERVAL_MS);
    }

    tick();
  }

  window.SKHPSRoute = {
    getConfig: getConfig,
    getEnv: getEnv,
    getEnvValue: getEnvValue,
    getPages: getPages,
    getPageById: getPageById,
    getHref: getHref,
    applyPageLinks: applyPageLinks,
    waitForConfigThenApply: waitForConfigThenApply
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForConfigThenApply);
  } else {
    waitForConfigThenApply();
  }
  rlog("OK", "moduleReady", "route.js");
})();
