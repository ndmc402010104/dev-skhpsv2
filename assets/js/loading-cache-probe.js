/*
檔案位置：skhpsv2/assets/js/loading-cache-probe.js
時間戳記：2026-06-14 13:25 UTC+8
用途：loading CSS 前的極早期探針；CSS runtime 改為 uni-CSS.CSS 優先後，本檔不再用 localStorage cache 提前解除 shell loading。
*/

(function () {
  "use strict";

  var html = document.documentElement;

  function hasUsableCache() {
    return false;
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
