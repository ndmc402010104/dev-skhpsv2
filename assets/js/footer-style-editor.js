/*
檔案位置：skhpsv2/assets/js/footer-style-editor.js
時間戳記：2026-06-09 19:00 UTC+8
用途：Footer Style Editor；每一個可改欄位都是獨立 editor，並依 CSS property 顯示色票、數字+單位、數字、下拉或文字輸入。
*/

(function () {
  "use strict";

  var ROOT_ID = "footerStyleEditorRoot";
  var STATUS_ID = "footerStyleEditorStatus";
  var RENDERED_ATTR = "data-css-setting-footer-editor-rendered";

  var COMPONENT = "footer";
  var TAB_KEY = "footerStyle";

  var FIELDS = [
    ["Footer 外層背景", ".skhps-footer", "background", "#eaf3fb", "footer 外層淡藍背景"],
    ["Footer 外層邊框", ".skhps-footer", "border", "1px solid #9fc4dc", "footer 外層邊框"],
    ["Footer 外層圓角", ".skhps-footer", "border-radius", "0 0 8px 8px", "footer 外層圓角"],
    ["Footer 外層內距", ".skhps-footer", "padding", "6px 20px", "footer 外層內距"],
    ["Footer 外層陰影", ".skhps-footer", "box-shadow", "inset 0 1px 0 rgba(255,255,255,.75)", "footer 外層內陰影"],
    ["Footer 最小高度", ".skhps-footer", "min-height", "54px", "footer 最小高度"],
    ["Footer 定位", ".skhps-footer", "position", "fixed", "footer 固定方式；fixed=永遠固定在視窗底部，sticky=捲動到位置後黏住"],
    ["Footer 底部距離", ".skhps-footer", "bottom", "0", "footer 距離視窗底部"],
    ["Footer 左側距離", ".skhps-footer", "left", "0", "footer 左側貼齊"],
    ["Footer 右側距離", ".skhps-footer", "right", "0", "footer 右側貼齊"],
    ["Footer 疊層", ".skhps-footer", "z-index", "1000", "footer 疊層高度，避免被內容蓋住"],
    ["Footer 寬度", ".skhps-footer", "width", "100%", "footer 寬度"],
    ["Footer 尺寸計算", ".skhps-footer", "box-sizing", "border-box", "footer 尺寸計算方式"],
    ["Footer 外層 display", ".skhps-footer", "display", "flex", "footer 外層使用 flex 讓 track 可以置中"],
    ["Footer 外層垂直置中", ".skhps-footer", "align-items", "center", "footer 外層垂直置中"],
    ["Footer 外層水平置中", ".skhps-footer", "justify-content", "center", "footer 外層水平置中"],

    ["Footer 軌道背景", ".skhps-footer-track", "background", "#e5edf5", "footer 內層膠囊軌道背景"],
    ["Footer 軌道邊框", ".skhps-footer-track", "border", "1px solid #c8d7e6", "footer 內層膠囊軌道邊框"],
    ["Footer 軌道圓角", ".skhps-footer-track", "border-radius", "999px", "footer 內層膠囊軌道圓角"],
    ["Footer 軌道內距", ".skhps-footer-track", "padding", "3px", "footer 內層膠囊軌道內距"],
    ["Footer item 間距", ".skhps-footer-track", "gap", "4px", "footer item 間距"],
    ["Footer 軌道高度", ".skhps-footer-track", "min-height", "32px", "footer 內層膠囊軌道高度"],
    ["Footer 軌道 display", ".skhps-footer-track", "display", "flex", "footer 內層膠囊軌道使用 flex"],
    ["Footer 軌道垂直置中", ".skhps-footer-track", "align-items", "center", "footer 內層 item 垂直置中"],
    ["Footer 軌道水平置中", ".skhps-footer-track", "justify-content", "center", "footer 內層 item 水平置中"],
    ["Footer 軌道寬度", ".skhps-footer-track", "width", "fit-content", "footer 內層膠囊寬度依內容"],
    ["Footer 軌道最大寬度", ".skhps-footer-track", "max-width", "100%", "footer 內層膠囊最大寬度"],
    ["Footer 軌道置中", ".skhps-footer-track", "margin", "0 auto", "footer 內層膠囊置中"],

    ["Footer 一般文字顏色", ".skhps-footer-item", "color", "#536175", "footer 一般版本文字顏色"],
    ["Footer 一般字體大小", ".skhps-footer-item", "font-size", "12px", "footer 一般版本字體大小"],
    ["Footer 一般字重", ".skhps-footer-item", "font-weight", "700", "footer 一般版本字重"],
    ["Footer 一般字距", ".skhps-footer-item", "letter-spacing", ".03em", "footer 一般版本字距"],
    ["Footer 一般內距", ".skhps-footer-item", "padding", "7px 18px", "footer 一般版本內距"],
    ["Footer 一般圓角", ".skhps-footer-item", "border-radius", "999px", "footer 一般版本圓角"],
    ["Footer item display", ".skhps-footer-item", "display", "inline-flex", "footer item 使用 inline-flex"],
    ["Footer item 垂直置中", ".skhps-footer-item", "align-items", "center", "footer item 垂直置中"],
    ["Footer item 水平置中", ".skhps-footer-item", "justify-content", "center", "footer item 水平置中"],
    ["Footer item 不換行", ".skhps-footer-item", "white-space", "nowrap", "footer item 不換行"],

    ["Footer 啟用背景", ".skhps-footer-item.is-active", "background", "linear-gradient(90deg,#2f6eea,#0f8178)", "footer 目前啟用版本背景"],
    ["Footer 啟用文字顏色", ".skhps-footer-item.is-active", "color", "#ffffff", "footer 目前啟用版本文字顏色"],
    ["Footer 啟用圓角", ".skhps-footer-item.is-active", "border-radius", "999px", "footer 目前啟用版本圓角"],
    ["Footer 啟用陰影", ".skhps-footer-item.is-active", "box-shadow", "inset 0 1px 0 rgba(255,255,255,.25),0 1px 2px rgba(15,23,42,.18)", "footer 目前啟用版本陰影"],
    ["Footer 啟用字重", ".skhps-footer-item.is-active", "font-weight", "800", "footer 目前啟用版本字重"],

    ["Footer 標籤間距", ".skhps-footer-label", "margin-right", "6px", "footer 版本標籤與版本號間距"],
    ["Footer 版本號字體", ".skhps-footer-version", "font-family", "ui-monospace,SFMono-Regular,Consolas,\"Liberation Mono\",monospace", "footer 版本號字體"],
    ["Footer 版本號字重", ".skhps-footer-version", "font-weight", "800", "footer 版本號字重"]
  ];

  var KEYWORD_OPTIONS = {
    position: ["static", "relative", "absolute", "fixed", "sticky"],
    "box-sizing": ["content-box", "border-box"],
    "text-align": ["left", "center", "right", "justify", "start", "end"],
    display: ["block", "inline", "inline-block", "flex", "inline-flex", "grid", "none"],
    overflow: ["visible", "hidden", "auto", "scroll"],
    "white-space": ["normal", "nowrap", "pre", "pre-wrap", "pre-line"]
  };

  var LENGTH_UNITS = ["", "px", "rem", "em", "%", "vh", "vw", "vmin", "vmax"];
  var RATIO_UNITS = ["", "%"];

  function el(id) { return document.getElementById(id); }

  function setStatus(message) {
    var target = el(STATUS_ID);
    if (target) target.textContent = message;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function fetchJson(path) {
    return fetch(path, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error(path + " HTTP " + res.status);
      return res.json();
    });
  }

  function csvUrl(config) {
    var id = config && config.sheets && config.sheets.mainSpreadsheetId;
    var tab = config && config.sheets && config.sheets.cssSheets && config.sheets.cssSheets[TAB_KEY];

    if (!id) throw new Error("config.json missing sheets.mainSpreadsheetId");
    if (!tab || tab.tabGid === undefined || tab.tabGid === null || tab.tabGid === "") {
      throw new Error("config.json missing sheets.cssSheets." + TAB_KEY + ".tabGid");
    }

    return "https://docs.google.com/spreadsheets/d/" +
      encodeURIComponent(id) + "/export?format=csv&gid=" + encodeURIComponent(tab.tabGid);
  }

  function parseCsv(text) {
    var rows = [], row = [], cell = "", quote = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i], n = text[i + 1];

      if (quote) {
        if (c === '"' && n === '"') { cell += '"'; i++; }
        else if (c === '"') quote = false;
        else cell += c;
      } else {
        if (c === '"') quote = true;
        else if (c === ",") { row.push(cell); cell = ""; }
        else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
        else if (c !== "\r") cell += c;
      }
    }

    row.push(cell);
    rows.push(row);

    return rows.filter(function (r) {
      return r.some(function (x) { return String(x || "").trim() !== ""; });
    });
  }

  function buildValueMap(rows) {
    var values = {}, header = rows[0] || [], idx = {};

    header.forEach(function (h, i) { idx[String(h || "").trim()] = i; });

    rows.slice(1).forEach(function (row) {
      var component = String(row[idx.component] || "").trim();
      var className = String(row[idx.className] || "").trim();
      var property = String(row[idx.property] || "").trim();
      var value = String(row[idx.value] || "").trim();
      var updatedAt = String(row[idx.updatedAt] || "").trim();

      if (component !== COMPONENT || !className || !property) return;

      var key = className + "|" + property;
      values[key] = values[key] || {};
      values[key].value = value;
      values[key].updatedAt = updatedAt;

      if (updatedAt.toLowerCase() === "default") {
        values[key].defaultValue = value;
      }
    });

    return values;
  }

  function getValue(values, className, property, fallback) {
    var key = className + "|" + property;
    return values[key] && values[key].value ? values[key].value : fallback;
  }

  function getDefaultValue(values, className, property, fallback) {
    var key = className + "|" + property;
    return values[key] && values[key].defaultValue ? values[key].defaultValue : fallback;
  }

  function isSimpleColor(value) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(value || "").trim());
  }

  function classifyValue(property, value) {
    var p = String(property || "").trim().toLowerCase();
    var raw = String(value || "").trim();

    if (KEYWORD_OPTIONS[p]) return "keyword";
    if (p === "z-index" || p === "order" || p === "flex-grow" || p === "flex-shrink" || p === "font-weight") return "number";
    if (p === "opacity" || p === "line-height" || p === "scale") return "ratio";
    if (p === "color" || p === "background-color" || p === "border-color") return "color";
    if (p === "background" && isSimpleColor(raw)) return "color";

    if (
      p === "font-size" || p === "border-radius" || p === "min-height" ||
      p === "height" || p === "width" || p === "max-width" ||
      p === "bottom" || p === "left" || p === "right" || p === "top" ||
      p === "gap" || p === "margin-right" || p === "letter-spacing"
    ) return "length";

    return "text";
  }

  function splitNumberUnit(value, units) {
    var raw = String(value || "").trim();
    var match = raw.match(/^(-?\d+(?:\.\d+)?)([a-zA-Z%]*)$/);

    if (!match) return { ok: false, number: raw, unit: "" };

    var unit = match[2] || "";
    if (units.indexOf(unit) < 0) return { ok: false, number: raw, unit: "" };

    return { ok: true, number: match[1], unit: unit };
  }

  function unitOptions(units, selected) {
    return units.map(function (unit) {
      var label = unit || "無";
      return "<option value='" + escapeAttr(unit) + "'" + (unit === selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
    }).join("");
  }

  function keywordOptions(property, selected) {
    var options = KEYWORD_OPTIONS[property] || [];
    if (options.indexOf(selected) < 0 && selected) options = [selected].concat(options);

    return options.map(function (option) {
      return "<option value='" + escapeAttr(option) + "'" + (option === selected ? " selected" : "") + ">" + escapeHtml(option) + "</option>";
    }).join("");
  }

  function inputAttrs(className, property, def, value) {
    return [
      "data-class-name='" + escapeAttr(className) + "'",
      "data-property='" + escapeAttr(property) + "'",
      "data-default='" + escapeAttr(def) + "'",
      "value='" + escapeAttr(value) + "'"
    ].join(" ");
  }

  function renderValueControl(className, property, value, def) {
    var type = classifyValue(property, value || def);
    var attrs = inputAttrs(className, property, def, value);

    if (type === "keyword") {
      return "<select disabled " + attrs + " data-css-value-kind='keyword'>" + keywordOptions(property, value) + "</select>";
    }

    if (type === "color") {
      var colorValue = isSimpleColor(value) ? value : "#000000";
      return [
        "<span data-css-control='color'>",
        "<input type='color' disabled data-css-value-helper='color' value='" + escapeAttr(colorValue) + "'>",
        "<input type='text' readonly " + attrs + " data-css-value-kind='color'>",
        "</span>"
      ].join("");
    }

    if (type === "length" || type === "ratio") {
      var units = type === "ratio" ? RATIO_UNITS : LENGTH_UNITS;
      var parts = splitNumberUnit(value, units);

      if (!parts.ok) return "<input type='text' readonly " + attrs + " data-css-value-kind='text'>";

      return [
        "<span data-css-control='" + type + "'>",
        "<input type='hidden' " + attrs + " data-css-value-kind='" + type + "'>",
        "<input type='number' step='any' disabled data-css-value-helper='number' value='" + escapeAttr(parts.number) + "'>",
        "<select disabled data-css-value-helper='unit'>",
        unitOptions(units, parts.unit),
        "</select>",
        "</span>"
      ].join("");
    }

    if (type === "number") {
      return "<input type='number' step='any' readonly " + attrs + " data-css-value-kind='number'>";
    }

    return "<input type='text' readonly " + attrs + " data-css-value-kind='text'>";
  }

  function renderField(field, values) {
    var label = field[0];
    var className = field[1];
    var property = field[2];
    var fallbackDefault = field[3];
    var desc = field[4];
    var value = getValue(values, className, property, fallbackDefault);
    var def = getDefaultValue(values, className, property, fallbackDefault);

    return [
      "<section data-css-setting-editor data-css-setting-core='on' data-css-setting-sheet-save='on' data-css-setting-component='" + COMPONENT + "' data-css-setting-tab-key='" + TAB_KEY + "'>",
      "<h3>" + escapeHtml(label) + "</h3>",
      "<p data-css-setting-status>已載入。這個欄位可單獨編輯與儲存。</p>",
      "<table>",
      "<thead><tr><th>CSS class</th><th>Property</th><th>值</th></tr></thead>",
      "<tbody>",
      "<tr>",
      "<td><strong title='" + escapeAttr(desc) + "'>" + escapeHtml(className) + "</strong></td>",
      "<td><code>" + escapeHtml(property) + "</code></td>",
      "<td>" + renderValueControl(className, property, value, def) + "</td>",
      "</tr>",
      "</tbody>",
      "</table>",
      "<p>",
      "<button type='button' data-css-setting-action='edit'>編輯</button> ",
      "<button type='button' data-css-setting-action='save'>儲存</button> ",
      "<button type='button' data-css-setting-action='default'>恢復 default</button>",
      "</p>",
      "</section>"
    ].join("");
  }

  function syncCompositeFromParts(wrapper) {
    var canonical = wrapper.querySelector("[data-class-name][data-property]");
    var number = wrapper.querySelector("[data-css-value-helper='number']");
    var unit = wrapper.querySelector("[data-css-value-helper='unit']");
    var color = wrapper.querySelector("[data-css-value-helper='color']");

    if (!canonical) return;

    if (color) canonical.value = color.value;
    if (number && unit) canonical.value = String(number.value || "") + String(unit.value || "");

    canonical.dispatchEvent(new Event("input", { bubbles: true }));
    canonical.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function syncPartsFromCanonical(canonical) {
    var wrapper = canonical.closest("[data-css-control]");
    if (!wrapper) return;

    var color = wrapper.querySelector("[data-css-value-helper='color']");
    var number = wrapper.querySelector("[data-css-value-helper='number']");
    var unit = wrapper.querySelector("[data-css-value-helper='unit']");

    if (color && isSimpleColor(canonical.value)) {
      color.value = canonical.value;
      return;
    }

    if (number && unit) {
      var units = canonical.getAttribute("data-css-value-kind") === "ratio" ? RATIO_UNITS : LENGTH_UNITS;
      var parts = splitNumberUnit(canonical.value, units);
      if (parts.ok) {
        number.value = parts.number;
        unit.value = parts.unit;
      }
    }
  }

  function toggleHelperControls(scope) {
    var mode = scope.getAttribute("data-css-setting-edit-mode");
    var editable = mode === "editing" || mode === "dirty";

    Array.prototype.slice.call(scope.querySelectorAll("select[data-class-name][data-property]")).forEach(function (select) {
      select.disabled = !editable;
    });

    Array.prototype.slice.call(scope.querySelectorAll("[data-css-value-helper]")).forEach(function (helper) {
      helper.disabled = !editable;
    });
  }

  function bindValueControls(root) {
    if (root.__footerValueControlBound) return;
    root.__footerValueControlBound = true;

    root.addEventListener("input", function (event) {
      var helper = event.target.closest("[data-css-value-helper]");
      if (!helper) return;
      var wrapper = helper.closest("[data-css-control]");
      if (wrapper) syncCompositeFromParts(wrapper);
    });

    root.addEventListener("change", function (event) {
      var helper = event.target.closest("[data-css-value-helper]");
      if (!helper) return;
      var wrapper = helper.closest("[data-css-control]");
      if (wrapper) syncCompositeFromParts(wrapper);
    });

    root.addEventListener("input", function (event) {
      var canonical = event.target.closest("[data-class-name][data-property]");
      if (!canonical) return;
      syncPartsFromCanonical(canonical);
    });

    Array.prototype.slice.call(root.querySelectorAll("[data-css-setting-editor]")).forEach(function (scope) {
      toggleHelperControls(scope);
      var observer = new MutationObserver(function () { toggleHelperControls(scope); });
      observer.observe(scope, { attributes: true, attributeFilter: ["data-css-setting-edit-mode"] });
    });
  }

  function applyFooterEditorLiveStyle(input) {
    if (!input) return;

    var className = input.getAttribute("data-class-name") || "";
    var property = input.getAttribute("data-property") || "";
    var value = input.value || "";

    if (!className || !property) return;

    var styleId = "skhps-footer-editor-live-style";
    var style = document.getElementById(styleId);

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      style.setAttribute("data-source", "footer editor live preview");
      document.head.appendChild(style);
    }

    window.__SKHPSFooterEditorLiveRules = window.__SKHPSFooterEditorLiveRules || {};
    window.__SKHPSFooterEditorLiveRules[className + "||" + property] = {
      className: className,
      property: property,
      value: value
    };

    var grouped = {};

    Object.keys(window.__SKHPSFooterEditorLiveRules).forEach(function (key) {
      var rule = window.__SKHPSFooterEditorLiveRules[key];
      grouped[rule.className] = grouped[rule.className] || [];
      grouped[rule.className].push("  " + rule.property + ": " + rule.value + ";");
    });

    style.textContent = Object.keys(grouped).map(function (selector) {
      return selector + "{\n" + grouped[selector].join("\n") + "\n}";
    }).join("\n\n");
  }

  function bindFooterLivePreview(root) {
    if (root.__footerLivePreviewBound) return;
    root.__footerLivePreviewBound = true;

    root.addEventListener("input", function (event) {
      var input = event.target.closest("[data-class-name][data-property]");
      if (!input) return;
      applyFooterEditorLiveStyle(input);
    });

    root.addEventListener("change", function (event) {
      var input = event.target.closest("[data-class-name][data-property]");
      if (!input) return;
      applyFooterEditorLiveStyle(input);
    });
  }
  function render(root, values) {
    root.innerHTML = [
      "<section>",
      "<h3>Footer 欄位</h3>",
      "<p>每一個欄位都是獨立 editor；前端會依 property 自動顯示色票、數字+單位、數字、下拉或文字輸入。</p>",
      "</section>",
      FIELDS.map(function (field) { return renderField(field, values); }).join("")
    ].join("");

    bindValueControls(root);
    bindFooterLivePreview(root);

    if (window.SKHPSCssSettingEditorCore && typeof window.SKHPSCssSettingEditorCore.init === "function") {
      window.SKHPSCssSettingEditorCore.init(root);
    }
  }

  function loadValues() {
    setStatus("讀取 footerStyle CSV 中...");

    return fetchJson("config.json")
      .then(function (config) { return fetch(csvUrl(config), { cache: "no-store" }); })
      .then(function (res) {
        return res.text().then(function (text) {
          if (!res.ok) throw new Error("footerStyle CSV HTTP " + res.status);
          return text;
        });
      })
      .then(function (csv) {
        setStatus("footerStyle 已載入。");
        return buildValueMap(parseCsv(csv));
      });
  }

  function boot() {
    var root = el(ROOT_ID);
    if (!root) return;
    if (root.getAttribute(RENDERED_ATTR) === "1") return;

    root.setAttribute(RENDERED_ATTR, "1");
    root.innerHTML = "<p>讀取 footerStyle 中...</p>";

    loadValues()
      .then(function (values) { render(root, values); })
      .catch(function (error) {
        setStatus("footerStyle 載入失敗。");
        root.innerHTML = "<pre>footerStyle editor failed:\n" + escapeHtml(error.message || error) + "</pre>";
      });
  }

  function init() { boot(); }

  window.SKHPSFooterStyleEditor = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();