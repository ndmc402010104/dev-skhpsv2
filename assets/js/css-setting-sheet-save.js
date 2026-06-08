/*
檔案位置：skhpsv2/assets/js/css-setting-sheet-save.js
時間戳記：2026-06-08 20:00 UTC+8
用途：攔截 baseStyle Theme Editor 的「儲存」按鈕，透過 skhpsv2 backend-client 寫回 Google Sheet。
*/

(function () {
  function setStatus(scope, message) {
    var status = scope.querySelector("[data-base-status]");
    if (status) status.textContent = message;
  }

  function setBusy(button, busy) {
    button.disabled = !!busy;
    button.textContent = busy ? "儲存中..." : "儲存";
  }

  function getDescription(input) {
    var label = input.previousElementSibling;

    if (label && label.tagName && label.tagName.toLowerCase() === "strong") {
      return label.getAttribute("title") || label.textContent || "";
    }

    return "";
  }

  function collectRows(scope) {
    return Array.prototype.slice.call(scope.querySelectorAll("[data-class-name][data-property]"))
      .map(function (input) {
        return {
          component: "base",
          className: input.getAttribute("data-class-name") || "",
          property: input.getAttribute("data-property") || "",
          value: input.value || "",
          description: getDescription(input)
        };
      })
      .filter(function (row) {
        return row.className && row.property;
      });
  }

  function saveToSheet(scope, button) {
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
    setStatus(scope, "寫回 Google Sheet 中...");

    window.SKHPSBackend.call("saveCssSheetRows", {
      tabKey: "baseStyle",
      rows: rows
    })
      .then(function (response) {
        if (!response || response.ok !== true) {
          throw new Error(response && response.message ? response.message : JSON.stringify(response));
        }

        setStatus(scope, "已寫回 Sheet：" + response.appendedRows + " 筆，updatedAt=" + response.updatedAt);

        rows.forEach(function (row) {
          var input = scope.querySelector(
            '[data-class-name="' + row.className + '"][data-property="' + row.property + '"]'
          );
          if (input) input.readOnly = true;
        });
      })
      .catch(function (error) {
        setStatus(scope, "儲存失敗：" + (error && error.message ? error.message : String(error)));
      })
      .finally(function () {
        setBusy(button, false);
      });
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest('[data-base-action="save"]');
    if (!button) return;

    var scope = button.closest("[data-base-editor]");
    if (!scope) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    saveToSheet(scope, button);
  }, true);
})();
