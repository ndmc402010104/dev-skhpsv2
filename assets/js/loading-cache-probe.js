/*
檔案位置：skhpsv2/assets/js/loading-cache-probe.js
時間戳記：2026-07-01 23:59 UTC+8
用途：極早期 CSS registry cache probe；在 css-sheet-runtime.js 載入前，先從 Supabase Registry cache 套用 CSS，避免首屏閃爍。
*/

(function () {
  "use strict";

  var html = document.documentElement;
  var STYLE_ID = "skhps-css-runtime-style";
  var CACHE_KEY = "skhpsv2.cssRegistryRuntimeCache.v1";

  function hashText(text) {
    var hash = 2166136261;
    var input = String(text || "");

    for (var i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }

    return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      var cache;

      if (!raw) return null;

      cache = JSON.parse(raw);

      if (!cache || !cache.cssText || !String(cache.cssText).trim()) {
        return null;
      }

      return cache;
    } catch (error) {
      return null;
    }
  }

  function injectCache(cache) {
    var style = document.getElementById(STYLE_ID);
    var cssText = String(cache.cssText || "");
    var hash = cache.hash || hashText(cssText);

    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      style.setAttribute("data-skhps-css-runtime", "true");
      document.head.appendChild(style);
    }

    style.textContent = cssText;
    style.setAttribute("data-source", "early-localStorage-cache");
    style.setAttribute("data-skhps-css-source", "early-localStorage-cache");
    style.setAttribute("data-skhps-css-hash", hash);
    style.setAttribute("data-skhps-css-updated-at", cache.generatedAt || cache.savedAtText || "");
    style.setAttribute("data-skhps-css-version", cache.version || "");

    html.setAttribute("data-skhps-css-cache-ready", "true");
    html.setAttribute("data-skhps-css-ready", "preloaded");
    html.setAttribute("data-skhps-css-source", "early-localStorage-cache");
    html.setAttribute("data-skhps-css-hash", hash);

    /*
      只放 shell，main 是否放行仍交給 loading-gate。
    */
    html.setAttribute("data-skhps-shell-ready", "true");
    html.setAttribute("data-skhps-shell-ready-reason", "early-css-runtime-cache");
    html.classList.remove("skhps-shell-loading");

    return true;
  }

  var cache = readCache();

  if (cache && injectCache(cache)) {
    return;
  }

  html.setAttribute("data-skhps-css-cache-ready", "false");
  html.setAttribute("data-skhps-shell-ready", "false");
  html.classList.add("skhps-shell-loading");
})();
