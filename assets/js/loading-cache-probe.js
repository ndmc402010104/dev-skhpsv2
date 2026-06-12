/*
檔案位置：skhpsv2/assets/js/loading-cache-probe.js
用途：loading CSS 前的極早期 CSS runtime cache probe。
*/

(function () {
  "use strict";

  var CACHE_KEY = "skhpsv2.cssSheetRuntimeCache.v1";
  var SESSION_READY_KEY = "skhpsv2.cssSheetRuntimeSessionReady.v1";
  var html = document.documentElement;

  function hasUsableCache() {
    try {
      if (sessionStorage.getItem(SESSION_READY_KEY) !== "1") {
        return false;
      }

      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;

      var cache = JSON.parse(raw);
      return Boolean(cache && cache.cssText);
    } catch (error) {
      return false;
    }
  }

  if (hasUsableCache()) {
    html.setAttribute("data-skhps-css-cache-ready", "true");
    html.setAttribute("data-skhps-shell-ready", "true");
    html.setAttribute("data-skhps-shell-ready-reason", "css-runtime-cache");
    html.classList.remove("skhps-shell-loading");
  } else {
    html.setAttribute("data-skhps-css-cache-ready", "false");
    html.setAttribute("data-skhps-shell-ready", "false");
    html.classList.add("skhps-shell-loading");
  }
})();
