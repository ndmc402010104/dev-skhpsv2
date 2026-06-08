/*
檔案位置：skhpsv2/assets/js/css-setting-editor-core.js
時間戳記：2026-06-09 19:00 UTC+8
用途：CSS Setting 共用 editor core；處理編輯、取消、baseline 還原、dirty、undo、default、save 後更新 baseline。
*/

(function () {
  "use strict";

  var labels = {
    edit: "編輯",
    cancel: "取消編輯",
    undo: "返回上一動",
    save: "儲存",
    defaultValue: "恢復 default",
    reloadSheet: "回到 Sheet 值"
  };

  function allEditors(root) {
    return Array.prototype.slice.call(
      (root || document).querySelectorAll('[data-css-setting-editor][data-css-setting-core="on"]')
    );
  }

  function inputList(scope) {
    return Array.prototype.slice.call(
      scope.querySelectorAll("[data-css-var], [data-class-name][data-property]")
    );
  }

  function btn(scope, action) {
    return scope.querySelector('[data-css-setting-action="' + action + '"]');
  }

  function show(el, yes) {
    if (!el) return;
    el.hidden = !yes;
    el.style.display = yes ? "" : "none";
  }

  function setStatus(scope, message) {
    var target = scope.querySelector("[data-css-setting-status]");
    if (target) target.textContent = message;
  }

  function keyOf(input, index) {
    return [
      input.getAttribute("data-class-name") || "",
      input.getAttribute("data-css-var") || "",
      input.getAttribute("data-property") || "",
      input.name || "",
      input.id || "",
      index
    ].join("|");
  }

  function snapshot(scope) {
    var out = {};

    inputList(scope).forEach(function (input, index) {
      out[keyOf(input, index)] = input.value;
    });

    return out;
  }

  function same(a, b) {
    return JSON.stringify(a || {}) === JSON.stringify(b || {});
  }

  function restoreSnapshot(scope, snap) {
    if (!snap) return;

    inputList(scope).forEach(function (input, index) {
      var key = keyOf(input, index);

      if (Object.prototype.hasOwnProperty.call(snap, key)) {
        input.value = snap[key] == null ? "" : String(snap[key]);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  }

  function setEditable(scope, editable) {
    inputList(scope).forEach(function (input) {
      var type = String(input.type || "").toLowerCase();

      if (type === "color" || type === "range") {
        input.disabled = !editable;
      } else {
        input.readOnly = !editable;
      }
    });
  }

  function ensureUndo(scope) {
    var undo = btn(scope, "undo");
    if (undo) return undo;

    var edit = btn(scope, "edit");
    if (!edit || !edit.parentNode) return null;

    undo = document.createElement("button");
    undo.type = "button";
    undo.textContent = labels.undo;
    undo.setAttribute("data-css-setting-action", "undo");

    edit.parentNode.insertBefore(undo, edit.nextSibling);
    return undo;
  }

  function update(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s) return;

    var edit = btn(scope, "edit");
    var undo = btn(scope, "undo");
    var save = btn(scope, "save");
    var def = btn(scope, "default");
    var reload = btn(scope, "reload-sheet");

    if (!s.editing) {
      if (edit) edit.textContent = labels.edit;

      show(edit, true);
      show(undo, false);
      show(save, false);
      show(def, false);
      show(reload, false);

      scope.setAttribute("data-css-setting-edit-mode", "readonly");
      setEditable(scope, false);
      return;
    }

    if (edit) edit.textContent = labels.cancel;

    show(edit, true);

    if (!s.dirty) {
      show(undo, false);
      show(save, false);
      show(def, false);
      show(reload, false);

      scope.setAttribute("data-css-setting-edit-mode", "editing");
      setEditable(scope, true);
      return;
    }

    show(undo, s.undoStack.length > 1);
    show(save, true);
    show(def, true);
    show(reload, true);

    scope.setAttribute("data-css-setting-edit-mode", "dirty");
    setEditable(scope, true);
  }

  function refreshDirty(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s) return;

    s.dirty = !same(snapshot(scope), s.baseline);
    update(scope);
  }

  function beginEdit(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s) return;

    s.editing = true;
    s.dirty = false;
    s.baseline = snapshot(scope);
    s.sheetValue = snapshot(scope);
    s.undoStack = [s.baseline];

    setStatus(scope, "編輯中：修改後才會顯示儲存。");
    update(scope);
  }

  function cancelEdit(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s) return;

    s.applying = true;
    restoreSnapshot(scope, s.baseline);
    s.applying = false;

    s.editing = false;
    s.dirty = false;
    s.undoStack = [];

    setStatus(scope, "已取消編輯，回到進入編輯前的值。");
    update(scope);
  }

  function commit(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s || !s.editing || s.applying) return;

    var cur = snapshot(scope);
    var last = s.undoStack[s.undoStack.length - 1];

    if (!same(cur, last)) {
      s.undoStack.push(cur);
      if (s.undoStack.length > 50) s.undoStack.shift();
    }

    refreshDirty(scope);
  }

  function undo(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s || !s.editing) return;

    if (s.undoStack.length > 1) {
      s.undoStack.pop();
    }

    s.applying = true;
    restoreSnapshot(scope, s.undoStack[s.undoStack.length - 1] || s.baseline);
    s.applying = false;

    refreshDirty(scope);
  }

  function restoreDefault(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s || !s.editing) return;

    var snap = {};

    inputList(scope).forEach(function (input, index) {
      snap[keyOf(input, index)] = input.getAttribute("data-default") || "";
    });

    s.applying = true;
    restoreSnapshot(scope, snap);
    s.applying = false;

    commit(scope);
    setStatus(scope, "已恢復 default，尚未儲存。");
  }

  function restoreSheet(scope) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s || !s.editing) return;

    s.applying = true;
    restoreSnapshot(scope, s.sheetValue);
    s.applying = false;

    commit(scope);
    setStatus(scope, "已回到 Sheet 值，尚未儲存。");
  }

  function afterSave(scope, detail) {
    var s = scope.__skhpsCssSettingCoreState;
    if (!s) return;

    s.baseline = snapshot(scope);
    s.sheetValue = snapshot(scope);
    s.undoStack = [s.baseline];
    s.editing = false;
    s.dirty = false;

    var response = detail && detail.response;
    if (response && response.appendedRows !== undefined) {
      setStatus(scope, "已寫回 Sheet：" + response.appendedRows + " 筆，updatedAt=" + response.updatedAt);
    } else {
      setStatus(scope, "已寫回 Sheet。");
    }

    update(scope);
  }

  function bind(scope) {
    if (!scope || scope.__skhpsCssSettingCoreBound) return;

    ensureUndo(scope);

    scope.__skhpsCssSettingCoreBound = true;
    scope.__skhpsCssSettingCoreState = {
      editing: false,
      dirty: false,
      applying: false,
      baseline: snapshot(scope),
      sheetValue: snapshot(scope),
      undoStack: []
    };

    scope.addEventListener("click", function (event) {
      var button = event.target.closest("[data-css-setting-action]");
      if (!button || !scope.contains(button)) return;

      var action = button.getAttribute("data-css-setting-action");

      if (action === "edit") {
        event.preventDefault();

        if (!scope.__skhpsCssSettingCoreState.editing) {
          beginEdit(scope);
        } else {
          cancelEdit(scope);
        }

        return;
      }

      if (action === "undo") {
        event.preventDefault();
        undo(scope);
        return;
      }

      if (action === "default") {
        event.preventDefault();
        restoreDefault(scope);
        return;
      }

      if (action === "reload-sheet") {
        event.preventDefault();
        restoreSheet(scope);
      }
    });

    scope.addEventListener("input", function (event) {
      if (!event.target.closest("[data-css-var], [data-class-name][data-property]")) return;

      var s = scope.__skhpsCssSettingCoreState;
      if (!s || !s.editing || s.applying) return;

      refreshDirty(scope);
    });

    scope.addEventListener("change", function (event) {
      if (!event.target.closest("[data-css-var], [data-class-name][data-property]")) return;
      commit(scope);
    });

    scope.addEventListener("skhps-css-setting-save-success", function (event) {
      afterSave(scope, event.detail || {});
    });

    update(scope);
  }

  function init(root) {
    allEditors(root || document).forEach(bind);
  }

  window.SKHPSCssSettingEditorCore = {
    init: init,
    bind: bind
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init(document);
    });
  } else {
    init(document);
  }
})();
