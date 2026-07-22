/*
檔案位置：skhpsv2/assets/js/shell-config.js
時間戳：2026-07-22 08:30 UTC+8
用途：**母片（Shell）設定載入器**——把 shell-skhps（CssPageLayout）的 layout_json.shell 讀進
      window.SKHPS_SHELL，讓 header.js／footer.js／loading-gate.js 能「有母片設定就用、沒有就用
      寫死預設」。這是「shell＝投影片母片，母片裡能控制 header／footer／loading gate」願景的地基。

水庫理論（使用者硬約束「外部專案一樣用簡單 JS/JSON 調用就好」）：
 - 本檔是 entry-core 的 boot script，**所有走 entry-core 的專案（本體＋外部 qr-signin／
   quick-login／dressing-inventory…）自動載入、自動吃到同一份母片**，外部專案的 config.json
   與 app-entry 身份宣告一個字都不用改。母片是水庫層的共用設定（一份，全站共用）。

prod 安全（使用者反覆強調「正式站不能被影響」）：
 - 讀失敗／無 shell 欄位／backend 未就緒 → window.SKHPS_SHELL 留空 → 三支 shell 模組全走
   寫死預設 → 行為 byte 級跟現在一樣。整段包 try/catch，絕不擋 boot。
 - 用 SKHPSEntryCore.defer 讓 boot 等這次讀取完成（母片值要在 header render 前就位）；
   逾時 4 秒放行（跟 blueprint barrier 同哲學，barrier 只延後、不卡死）。
 - 頁面若已在 head 早期 prefetch（window.__SKHPS_SHELL_PREFETCH），直接接手那個 promise，
   把 fetch 並行掉（跟 blueprint prefetch 同招）；沒 prefetch 就自己走 SKHPSBackend.call。
*/
(function () {
  "use strict";

  var SHELL_PAGE_KEY = "shell-skhps";

  function rlog(status, action, detail) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({ source: "shell-config.js", category: "shell", action: action, status: status, detail: detail || "" });
      }
    } catch (e) {}
  }

  function currentEnv() {
    try {
      if (window.SKHPSConfig && typeof window.SKHPSConfig.getEnv === "function") {
        var e = String(window.SKHPSConfig.getEnv() || "").trim();
        if (e) return e;
      }
    } catch (err) {}
    return String(document.documentElement.getAttribute("data-skhps-runtime") || "").trim() || "prod";
  }

  function applyShell(res) {
    var shell = res && res.page && res.page.layout_json && res.page.layout_json.shell;
    if (shell && typeof shell === "object" && !Array.isArray(shell)) {
      window.SKHPS_SHELL = shell;
      rlog("OK", "shellLoaded", { hasHeader: !!shell.header, hasFooter: !!shell.footer, hasGate: !!shell.gate });
    } else {
      rlog("OK", "shellEmpty", "無 shell 設定，維持寫死預設"); // 這是 prod 的正常狀態，不是錯誤
    }
  }

  function loadPromise(env) {
    /* prefetch 接手（頁面 head 早發、跟整個載入並行）——key 對得上才用，否則自己抓。 */
    var pf = window.__SKHPS_SHELL_PREFETCH;
    if (pf && pf.env === env && pf.promise) return pf.promise;

    if (window.SKHPSBackend && typeof window.SKHPSBackend.call === "function") {
      return window.SKHPSBackend.call("getPageLayout", { pageKey: SHELL_PAGE_KEY, env: env });
    }
    return null; // backend 未就緒＝這次不載母片（留空、用寫死預設），不擋 boot
  }

  try {
    var env = currentEnv();
    var promise = loadPromise(env);
    if (!promise) {
      rlog("WARN", "backendNotReady", "SKHPSBackend 未就緒，母片維持寫死預設");
      return;
    }

    var work = promise.then(applyShell).catch(function (error) {
      rlog("WARN", "shellLoadFailed", { error: error && error.message ? error.message : String(error) });
      // 靜默降級：不設 window.SKHPS_SHELL＝三支 shell 模組用寫死預設
    });

    /* 讓 boot 等母片就位再繼續（header 在 shell 階段 render，要讀得到值）。 */
    if (window.SKHPSEntryCore && typeof window.SKHPSEntryCore.defer === "function") {
      window.SKHPSEntryCore.defer(work, { label: "shell-config", timeoutMs: 4000 });
    }
  } catch (error) {
    rlog("WARN", "shellConfigError", { error: error && error.message ? error.message : String(error) });
  }
})();
