/*
檔案位置：skhpsv2/assets/js/css-setting-sheet-save.js
時間戳記：2026-06-14 13:25 UTC+8
用途：CSS Setting 共用 Sheet save；固定寫回 CSS總表（cssMain / gid 0）。後端採 upsert，同一組 component + className + property 不再無限 append；儲存後清除 runtime localStorage cache，uni-CSS.CSS 需由 helper script 更新。
*/

(function () {
  "use strict";

  var DEFAULT_TAB_KEY = "cssMain";
  var LEGACY_TAB_KEY_MAP = {
    baseStyle: "cssMain",
    tokenStyle: "cssMain",
    layoutStyle: "cssMain",
    headerStyle: "cssMain",
    footerStyle: "cssMain",
    buttonStyle: "cssMain",
    formStyle: "cssMain"
  };

  function normalizeTabKey(tabKey) {
    var key = String(tabKey || "").trim();
    if (!key) return DEFAULT_TAB_KEY;
    return LEGACY_TAB_KEY_MAP[key] || key;
  }

  function clearCssRuntimeCache() {
    if (
      window.SKHPSCssSheetRuntimeLoader &&
      typeof window.SKHPSCssSheetRuntimeLoader.clearCache === "function"
    ) {
      window.SKHPSCssSheetRuntimeLoader.clearCache();
      return;
    }

    try {
      localStorage.removeItem("skhpsv2.cssSheetRuntimeCache.v1");
      localStorage.removeItem("skhpsv2.cssSheetRuntimeCache.v2");
    } catch (error) {
      console.warn("CSS runtime local cache clear failed:", error);
    }

    try {
      sessionStorage.removeItem("skhpsv2.cssSheetRuntimeSessionReady.v1");
    } catch (error) {
      console.warn("CSS runtime session cache clear failed:", error);
    }
  }

  function setStatus(scope, message) {
    var status = scope.querySelector("[data-css-setting-status]");
    if (status) status.textContent = message;
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = !!busy;
    button.textContent = busy ? "儲存中..." : "儲存";
  }

  function getDescription(input) {
    var row = input.closest("tr");
    var label = row ? row.querySelector("strong") : input.previousElementSibling;

    if (label && label.tagName && label.tagName.toLowerCase() === "strong") {
      return label.getAttribute("title") || label.textContent || "";
    }

    return "";
  }

  function getComponent(scope, input) {
    return String(
      scope.getAttribute("data-css-setting-component") ||
      input.getAttribute("data-css-setting-component") ||
      input.getAttribute("data-class-name") ||
      ""
    ).trim();
  }

  function collectRows(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll("[data-class-name][data-property]"))
      .map(function (input) {
        return {
          component: getComponent(scope, input),
          className: String(input.getAttribute("data-class-name") || "").trim(),
          property: String(input.getAttribute("data-property") || "").trim(),
          value: String(input.value || "").trim(),
          description: String(getDescription(input) || "").trim()
        };
      })
      .filter(function (row) {
        return row.component && row.className && row.property && row.value !== "";
      });
  }

  function dispatch(scope, name, detail) {
    scope.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      detail: detail || {}
    }));
  }

  function saveToSheet(scope, button) {
    var rawTabKey = scope.getAttribute("data-css-setting-tab-key") || "";
    var tabKey = normalizeTabKey(rawTabKey);

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      setStatus(scope, "儲存失敗：找不到 SKHPSBackend.call，請確認 backend-client.js 已載入。");
      return;
    }

    var rows = collectRows(scope);

    if (!rows.length) {
      setStatus(scope, "沒有可儲存的欄位。");
      return;
    }

    setBusy(button, true);
    setStatus(scope, "寫回 CSS總表 中...");

    window.SKHPSBackend.call("saveCssSheetRows", {
      tabKey: tabKey,
      sheetKey: tabKey,
      sheetName: "CSS總表",
      saveMode: "upsert",
      upsertKey: ["component", "className", "property"],
      rows: rows
    })
      .then(function (response) {
        if (!response || response.ok !== true) {
          throw new Error(response && response.message ? response.message : JSON.stringify(response));
        }

        clearCssRuntimeCache();

        var inserted = Number(response.insertedRows || response.appendedRows || 0);
        var updated = Number(response.updatedRows || 0);

        setStatus(
          scope,
          "已寫回 CSS總表：更新 " + updated +
          " 筆 / 新增 " + inserted +
          " 筆，updatedAt=" +
          (response.updatedAt || "unknown") +
          "；CSS 快取已清除。"
        );

        dispatch(scope, "skhps-css-setting-save-success", {
          response: response,
          rows: rows,
          tabKey: tabKey
        });
      })
      .catch(function (error) {
        var message = error && error.message ? error.message : String(error);
        setStatus(scope, "儲存失敗：" + message);

        dispatch(scope, "skhps-css-setting-save-error", {
          error: message,
          tabKey: tabKey
        });
      })
      .finally(function () {
        setBusy(button, false);
      });
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest('[data-css-setting-action="save"]');
    if (!button) return;

    var scope = button.closest("[data-css-setting-editor]");
    if (!scope) return;

    if (scope.getAttribute("data-css-setting-sheet-save") !== "on") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    saveToSheet(scope, button);
  }, true);

  window.SKHPSCssSettingSheetSave = {
    normalizeTabKey: normalizeTabKey,
    collectRows: collectRows,
    clearCssRuntimeCache: clearCssRuntimeCache,
    saveToSheet: saveToSheet
  };
})();
