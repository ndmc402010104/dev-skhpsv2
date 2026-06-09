/*
檔案位置：skhpsv2/assets/js/route.js
時間戳記：2026-06-10 19:30 UTC+8
用途：skhpsv2 前端頁面路由 helper；從 config.pages 依 page id 自動補上 href，避免 HTML 寫死頁面路徑。
*/

(function () {
  "use strict";

  function getConfig() {
    return (
      window.SKHPS_CONFIG ||
      window.SKHPSConfig ||
      window.skhpsConfig ||
      {}
    );
  }

  function getPages() {
    var config = getConfig();
    return Array.isArray(config.pages) ? config.pages : [];
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
    var page = getPageById(pageId);

    if (page && page.href) {
      return page.href;
    }

    return fallbackHref || "#";
  }

  function applyPageLinks(root) {
    var scope = root || document;
    var links = scope.querySelectorAll("[data-skhps-page-id]");

    links.forEach(function (link) {
      var pageId = link.getAttribute("data-skhps-page-id");
      var href = getHref(pageId);

      if (!href || href === "#") {
        link.setAttribute("href", "#");
        link.setAttribute("aria-disabled", "true");
        link.classList.add("skhps-btn-disabled");

        link.addEventListener("click", function (event) {
          event.preventDefault();
          alert("config.json 尚未設定 pages: " + pageId);
        });

        return;
      }

      link.setAttribute("href", href);
    });
  }

  window.SKHPSRoute = {
    getConfig: getConfig,
    getPages: getPages,
    getPageById: getPageById,
    getHref: getHref,
    applyPageLinks: applyPageLinks
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyPageLinks(document);
    });
  } else {
    applyPageLinks(document);
  }
})();