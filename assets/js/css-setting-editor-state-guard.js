(function () {
  "use strict";

  var labels = {
    edit: "\u7de8\u8f2f",
    cancel: "\u53d6\u6d88\u7de8\u8f2f",
    undo: "\u8fd4\u56de\u4e0a\u4e00\u52d5"
  };

  function allEditors(root) {
    return Array.prototype.slice.call(
      (root || document).querySelectorAll("[data-base-editor]")
    );
  }

  function inputList(editor) {
    return Array.prototype.slice.call(editor.querySelectorAll("[data-css-var]"));
  }

  function btn(editor, action) {
    return editor.querySelector("[data-base-action='" + action + "']");
  }

  function show(el, yes) {
    if (!el) return;
    el.hidden = !yes;
    el.style.display = yes ? "" : "none";
  }

  function getKey(input) {
    return input.getAttribute("data-property") ||
      input.getAttribute("data-css-var") ||
      input.name ||
      input.id ||
      "";
  }

  function snapshot(editor) {
    var out = {};
    inputList(editor).forEach(function (input, index) {
      var key = getKey(input) || String(index);
      out[key] = input.value;
    });
    return out;
  }

  function same(a, b) {
    return JSON.stringify(a || {}) === JSON.stringify(b || {});
  }

  function applySnapshot(editor, snap) {
    inputList(editor).forEach(function (input, index) {
      var key = getKey(input) || String(index);
      if (!Object.prototype.hasOwnProperty.call(snap, key)) return;

      input.value = snap[key] == null ? "" : String(snap[key]);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function setEditable(editor, yes) {
    inputList(editor).forEach(function (input) {
      var type = String(input.type || "").toLowerCase();

      if (type === "color" || type === "range") {
        input.disabled = !yes;
      } else {
        input.readOnly = !yes;
      }
    });
  }

  function ensureUndo(editor) {
    var undo = btn(editor, "undo");
    if (undo) return undo;

    var edit = btn(editor, "edit");
    if (!edit) return null;

    undo = document.createElement("button");
    undo.type = "button";
    undo.textContent = labels.undo;
    undo.setAttribute("data-base-action", "undo");
    undo.className = edit.className || "";

    edit.parentNode.insertBefore(undo, edit.nextSibling);
    return undo;
  }

  function update(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s) return;

    var edit = btn(editor, "edit");
    var undo = btn(editor, "undo");
    var save = btn(editor, "save");
    var def = btn(editor, "default");
    var sheet = btn(editor, "reload-sheet");
    var replaceDefault = btn(editor, "replace-default");

    if (!s.editing) {
      if (edit) edit.textContent = labels.edit;

      show(edit, true);
      show(undo, false);
      show(save, false);
      show(def, false);
      show(sheet, false);
      show(replaceDefault, false);

      editor.setAttribute("data-base-edit-mode", "readonly");
      return;
    }

    if (edit) edit.textContent = labels.cancel;

    show(edit, true);

    if (!s.dirty) {
      show(undo, false);
      show(save, false);
      show(def, false);
      show(sheet, false);
      show(replaceDefault, false);

      editor.setAttribute("data-base-edit-mode", "editing");
      return;
    }

    show(undo, s.undoStack.length > 1);
    show(save, true);
    show(def, true);
    show(sheet, true);
    show(replaceDefault, true);

    editor.setAttribute("data-base-edit-mode", "dirty");
  }

  function refreshDirty(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s) return;

    s.dirty = !same(snapshot(editor), s.baseline);
    update(editor);
  }

  function begin(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s) return;

    s.editing = true;
    s.dirty = false;
    s.baseline = snapshot(editor);
    s.sheetValue = snapshot(editor);
    s.undoStack = [s.baseline];

    setEditable(editor, true);
    update(editor);
  }

  function cancel(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s) return;

    s.applying = true;
    applySnapshot(editor, s.baseline);
    s.applying = false;

    s.editing = false;
    s.dirty = false;
    s.undoStack = [];

    setEditable(editor, false);
    update(editor);
  }

  function commit(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s || !s.editing || s.applying) return;

    var cur = snapshot(editor);
    var last = s.undoStack[s.undoStack.length - 1];

    if (!same(cur, last)) {
      s.undoStack.push(cur);
      if (s.undoStack.length > 50) s.undoStack.shift();
    }

    refreshDirty(editor);
  }

  function undo(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s || !s.editing) return;

    if (s.undoStack.length > 1) {
      s.undoStack.pop();
    }

    s.applying = true;
    applySnapshot(editor, s.undoStack[s.undoStack.length - 1] || s.baseline);
    s.applying = false;

    refreshDirty(editor);
  }

  function restoreDefault(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s || !s.editing) return;

    commit(editor);

    var snap = {};
    inputList(editor).forEach(function (input, index) {
      var key = getKey(input) || String(index);
      snap[key] = input.getAttribute("data-default") || "";
    });

    s.applying = true;
    applySnapshot(editor, snap);
    s.applying = false;

    commit(editor);
  }

  function restoreSheet(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s || !s.editing) return;

    commit(editor);

    s.applying = true;
    applySnapshot(editor, s.sheetValue);
    s.applying = false;

    commit(editor);
  }

  function afterSave(editor) {
    var s = editor.__skhpsBaseGuardState;
    if (!s) return;

    s.baseline = snapshot(editor);
    s.sheetValue = snapshot(editor);
    s.undoStack = [s.baseline];
    s.editing = false;
    s.dirty = false;

    setEditable(editor, false);
    update(editor);
  }

  function bind(editor) {
    if (!editor) return;

    ensureUndo(editor);

    if (!editor.__skhpsBaseGuardState) {
      editor.__skhpsBaseGuardState = {
        editing: false,
        dirty: false,
        applying: false,
        baseline: snapshot(editor),
        sheetValue: snapshot(editor),
        undoStack: []
      };
    }

    if (!editor.__skhpsBaseGuardBound) {
      editor.__skhpsBaseGuardBound = true;

      editor.addEventListener("click", function (event) {
        var button = event.target.closest("[data-base-action]");
        if (!button || !editor.contains(button)) return;

        var action = button.getAttribute("data-base-action");

        if (action === "edit") {
          event.preventDefault();
          event.stopImmediatePropagation();

          if (!editor.__skhpsBaseGuardState.editing) {
            begin(editor);
          } else {
            cancel(editor);
          }
          return;
        }

        if (action === "undo") {
          event.preventDefault();
          event.stopImmediatePropagation();
          undo(editor);
          return;
        }

        if (action === "default") {
          event.preventDefault();
          event.stopImmediatePropagation();
          restoreDefault(editor);
          return;
        }

        if (action === "reload-sheet") {
          event.preventDefault();
          event.stopImmediatePropagation();
          restoreSheet(editor);
          return;
        }

        if (action === "save") {
          window.setTimeout(function () {
            afterSave(editor);
          }, 1000);
        }
      }, true);

      editor.addEventListener("input", function (event) {
        if (!event.target.closest("[data-css-var]")) return;

        var s = editor.__skhpsBaseGuardState;
        if (!s || !s.editing || s.applying) return;

        refreshDirty(editor);
      }, true);

      editor.addEventListener("change", function (event) {
        if (!event.target.closest("[data-css-var]")) return;
        commit(editor);
      }, true);
    }

    setEditable(editor, false);
    update(editor);
  }

  function init(root) {
    allEditors(root || document).forEach(bind);
  }

  window.SKHPSBaseStyleEditorStateGuard = {
    init: init
  };

  function boot() {
    init(document);

    [100, 300, 700, 1200, 2000, 3000, 5000].forEach(function (ms) {
      window.setTimeout(function () {
        init(document);
      }, ms);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
