/*
檔案位置：skhpsv2/assets/js/toast.js
時間戳：2026-07-17 UTC+8
用途：暖砂主題第二波，輕量成功/警告/錯誤回饋元件。window.SKHPSToast.show(
message, { tone, duration }) 顯示一則浮出訊息，自動淡出。純行為腳本，樣式
交給 CSS Sheet 的 .skhps-toast 系列 class，本檔不寫 inline style。

非 gate-critical：不影響 loading gate、不擋頁面渲染，失敗也不影響其他功能。
目前尚未被任何頁面呼叫，是可用的共用元件基礎設施，各業務頁要不要接上
（例如簽到成功時用它取代/搭配既有 alert 橫幅）由各自頁面決定。
*/

(function () {
  "use strict";

  var TOAST_ID = "skhps-toast";
  var hideTimer = null;

  function ensureEl() {
    var el = document.getElementById(TOAST_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TOAST_ID;
      el.className = "skhps-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  function show(message, options) {
    options = options || {};
    var el = ensureEl();

    el.textContent = String(message || "");
    el.classList.remove("is-warn", "is-error");

    if (options.tone === "warn") el.classList.add("is-warn");
    if (options.tone === "error") el.classList.add("is-error");

    // 強制 reflow，確保連續呼叫（訊息還沒淡出又觸發一次）也會重新播動畫。
    void el.offsetWidth;
    el.classList.add("is-visible");

    if (hideTimer) window.clearTimeout(hideTimer);

    var duration = Number(options.duration) || 2400;
    hideTimer = window.setTimeout(function () {
      el.classList.remove("is-visible");
    }, duration);
  }

  function hide() {
    var el = document.getElementById(TOAST_ID);
    if (el) el.classList.remove("is-visible");
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  window.SKHPSToast = {
    show: show,
    hide: hide
  };
})();
