/*
檔案位置：skhpsv2/assets/js/CSS-fetch.js
時間戳記：2026-06-14 13:25 UTC+8
用途：CSS runtime 背景刷新協調器；從 CSS Sheet 取得最新樣式，套用到唯一 runtime style tag，並更新 localStorage cache。瀏覽器不能直接寫入 repo 內的 uni-CSS.CSS。
*/

(function () {
  "use strict";

  var refreshPromise = null;

  function rlog(status, action, detail, durationMs) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({
          source: "CSS-fetch.js",
          category: "css",
          action: action,
          status: status,
          detail: detail || "",
          durationMs: durationMs
        });
      }
    } catch (error) {}
  }

  function runtimeLoader() {
    return window.SKHPSCssSheetRuntimeLoader || null;
  }

  function warnNoRepoWrite() {
    rlog("INFO", "repoWriteSkipped", "browser runtime updates localStorage only; use scripts/update-uni-css.js to write uni-CSS.CSS");
  }

  function refresh(options) {
    var startedAt = Date.now();
    options = options || {};

    if (refreshPromise && !options.force) {
      return refreshPromise;
    }

    if (!runtimeLoader() || typeof runtimeLoader().refreshFromSheet !== "function") {
      return Promise.reject(new Error("SKHPSCssSheetRuntimeLoader.refreshFromSheet not available"));
    }

    warnNoRepoWrite();
    rlog("RUN", "refresh", {
      reason: options.reason || "background"
    });

    refreshPromise = runtimeLoader().refreshFromSheet(options)
      .then(function (result) {
        rlog("OK", "refresh", {
          applied: Boolean(result && result.applied),
          hash: result && result.model ? result.model.hash : ""
        }, Date.now() - startedAt);
        return result;
      })
      .catch(function (error) {
        rlog("WARN", "refresh", {
          error: error && error.message ? error.message : String(error)
        }, Date.now() - startedAt);
        throw error;
      })
      .finally(function () {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  window.SKHPSCssFetch = {
    refresh: refresh,
    canWriteRepoFileFromBrowser: false,
    cssUpdateCommand: "node scripts/update-uni-css.js"
  };

  rlog("OK", "moduleReady", "CSS-fetch.js");
})();
