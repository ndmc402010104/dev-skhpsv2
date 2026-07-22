/*
檔案位置：skhpsv2/assets/js/header.js
時間戳記：2026-06-19 UTC+8
用途：
共用 Header。

本版重點：
- Header 掛載到 <header id="header">。
- Header 左側顯示 SKHPS / Plastic Surgery。
- Header 左側按下去回「目前被水庫放置的位置」首頁。
- 外部 App 的回首頁位置不再由 app.json 寫死判斷，而是以 ExternalProject registry 當下 displayPosition 為準。
  - displayPosition=backend / 後台 → 回 skhpsv2/admin.html
  - displayPosition=front / 前台 → 回 skhpsv2/index.html
  - 查不到 registry → fallback 回 skhpsv2/index.html
- Header 右側目前只顯示「登入」，登入連到 skhpsv2/admin.html。
- Header 不顯示 runtime / backend / CSS / version 狀態。
- Header 不進 loading gate，不呼叫 SKHPSLoading.done()。
*/

(function () {
  "use strict";

  function rlog(status, action, detail) {
    try {
      if (window.SKHPSRuntimeLog && typeof window.SKHPSRuntimeLog.log === "function") {
        window.SKHPSRuntimeLog.log({
          source: "header.js",
          category: "dom",
          action: action,
          status: status,
          detail: detail || ""
        });
      }
    } catch (error) {}
  }

  rlog("RUN", "moduleStart", "header.js");

  var HEADER_ID = "header";
  var BRAND_MARK = "SKHPS";
  var BRAND_MAIN = "SKHPS";
  var BRAND_SUB = "Plastic Surgery";
  var LOGIN_HREF = "admin.html";
  var FRONT_HREF = "index.html";
  var ADMIN_HREF = "admin.html";
  var currentResolvedPlacement = "";
  var currentRenderedHomeHref = "";
  var registryResolveStarted = false;

  function getHeaderRoot() {
    return document.getElementById(HEADER_ID);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* 登入後使用者選單樣式（2026-07-22）：header 沒有既有的下拉選單樣式，這裡注入一次
     （跟 footer 的 guard style 同模式）。用 registry token 變數（--surface/--ink/--line…）
     讓它跟著換膚走；沒有變數時有 fallback 值。只在登入後狀態才會用到這些 class。 */
  function ensureHeaderUserMenuStyle() {
    var STYLE_ID = "skhps-header-user-menu-style";
    if (typeof document === "undefined" || document.getElementById(STYLE_ID) || !document.head) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".skhps-header-user{position:relative}",
      ".skhps-header-user>summary{list-style:none;display:inline-flex;align-items:center;gap:9px;height:44px;padding:0 6px 0 14px;border-radius:999px;cursor:pointer;font-weight:750;color:var(--ink,#2f2b26);white-space:nowrap;transition:.12s}",
      ".skhps-header-user>summary::-webkit-details-marker{display:none}",
      ".skhps-header-user>summary:hover{background:color-mix(in srgb,var(--sage,#6b8f71) 12%,transparent)}",
      ".skhps-header-user-name{font-size:14.5px}",
      ".skhps-header-user-avatar{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:color-mix(in srgb,var(--sage,#6b8f71) 16%,var(--surface,#fff));color:var(--sage,#6b8f71)}",
      ".skhps-header-user[open]>summary{background:color-mix(in srgb,var(--sage,#6b8f71) 14%,transparent)}",
      ".skhps-header-user-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:200px;background:var(--surface,#fff);border:1px solid var(--line,#e7e0d5);border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.16);padding:7px;z-index:2147483001;display:flex;flex-direction:column}",
      ".skhps-header-user-menu-item{display:block;padding:9px 13px;border-radius:9px;font-size:14px;font-weight:700;color:var(--ink,#2f2b26);text-decoration:none;white-space:nowrap}",
      ".skhps-header-user-menu-item:hover{background:color-mix(in srgb,var(--sage,#6b8f71) 12%,transparent)}",
      ".skhps-header-user-menu-item-danger{color:var(--danger,#c0392b)}",
      ".skhps-header-user-menu-item-danger:hover{background:color-mix(in srgb,var(--danger,#c0392b) 10%,transparent)}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeBaseUrl(baseUrl) {
    return String(baseUrl || "").replace(/\/+$/, "") + "/";
  }

  function joinUrl(baseUrl, path) {
    baseUrl = normalizeText(baseUrl);
    path = String(path || "").replace(/^\/+/, "");

    if (!baseUrl) {
      return path;
    }

    return normalizeBaseUrl(baseUrl) + path;
  }

  function isAbsoluteUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
  }

  function getSharedBaseUrl() {
    if (window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.sharedBaseUrl) {
      return window.SKHPS_APP_ENV.sharedBaseUrl;
    }

    if (window.SKHPS_ENTRY_BASE_URL) {
      return window.SKHPS_ENTRY_BASE_URL;
    }

    if (
      window.SKHPSConfig &&
      typeof window.SKHPSConfig.getSiteBaseUrl === "function"
    ) {
      return window.SKHPSConfig.getSiteBaseUrl(window.SKHPS_CONFIG);
    }

    return "";
  }

  function sharedHref(path) {
    var sharedBaseUrl = getSharedBaseUrl();

    if (!sharedBaseUrl) {
      return path;
    }

    return joinUrl(sharedBaseUrl, path);
  }

  function getEntryScope() {
    return normalizeText(
      document.documentElement.getAttribute("data-skhps-entry-scope")
    );
  }

  function isExternalApp() {
    return getEntryScope() === "external-app" || Boolean(window.SKHPS_APP_ENV || window.SKHPS_APP_MANIFEST);
  }

  function getCurrentPageId() {
    return normalizeText(
      document.documentElement.getAttribute("data-skhps-page-id")
    );
  }

  function getCurrentAppId() {
    var html = document.documentElement;
    var appEnv = window.SKHPS_APP_ENV || {};
    var manifest = window.SKHPS_APP_ROOT_MANIFEST || window.SKHPS_APP_MANIFEST || {};
    var effective = window.SKHPS_APP_EFFECTIVE_MANIFEST || {};

    /*
      多頁外部 App 必須先用「目前 page/project」找 registry。
      rootAppId 只代表檔案家族，不代表目前頁面所在的前台/後台位置。
    */
    return normalizeText(
      html.getAttribute("data-skhps-registry-project-id") ||
      html.getAttribute("data-skhps-project-id") ||
      appEnv.projectId ||
      appEnv.currentAppId ||
      window.SKHPS_CURRENT_PROJECT_ID ||
      effective.projectId ||
      effective.appId ||
      appEnv.pageId ||
      html.getAttribute("data-skhps-page-id") ||
      appEnv.appId ||
      html.getAttribute("data-skhps-app-id") ||
      window.SKHPS_CURRENT_APP_ID ||
      manifest.projectId ||
      manifest.appId ||
      appEnv.rootAppId ||
      effective.rootAppId ||
      html.getAttribute("data-skhps-root-app-id") ||
      window.SKHPS_APP_ID ||
      ""
    );
  }

  function normalizePlacement(value) {
    value = normalizeText(value).toLowerCase();

    if (!value) return "";
    if (value === "backend" || value === "admin" || value === "back" || value === "後台" || value === "管理") return "backend";
    if (value === "front" || value === "frontend" || value === "home" || value === "index" || value === "前台" || value === "首頁") return "front";

    return value;
  }

  function pickPlacementFromObject(item) {
    if (!item || typeof item !== "object") return "";

    return normalizePlacement(
      item.displayPosition ||
      item.display_position ||
      item.position ||
      item.placement ||
      item.area ||
      item.zone ||
      item["顯示位置"] ||
      item["位置"] ||
      ""
    );
  }

  function matchesAppId(item, appId) {
    var ids;

    if (!item || typeof item !== "object" || !appId) return false;

    ids = [
      item.projectId,
      item.project_id,
      item.pageId,
      item.page_id,
      item.appId,
      item.app_id,
      item.id,
      item.key,
      item.registryKey,
      item.registry_key,
      item["appId"],
      item["專案ID"],
      item["專案Id"],
      item["專案id"]
    ].map(function (value) {
      return normalizeText(value);
    }).filter(Boolean);

    return ids.indexOf(appId) >= 0;
  }

  function collectCandidateArrays(value, output) {
    if (!value || typeof value !== "object") return output;

    if (Array.isArray(value)) {
      output.push(value);
      return output;
    }

    ["projects", "apps", "items", "rows", "data", "result", "records", "list"].forEach(function (key) {
      if (Array.isArray(value[key])) {
        output.push(value[key]);
      } else if (value[key] && typeof value[key] === "object") {
        collectCandidateArrays(value[key], output);
      }
    });

    return output;
  }

  function findRegistryItemFromResult(result, appId) {
    var arrays = collectCandidateArrays(result || {}, []);
    var found = null;

    arrays.some(function (items) {
      return items.some(function (item) {
        if (matchesAppId(item, appId)) {
          found = item;
          return true;
        }
        return false;
      });
    });

    return found;
  }

  function registryResultCandidates() {
    return [
      window.SKHPS_CURRENT_APP_REGISTRY,
      window.SKHPS_EXTERNAL_APP_REGISTER_RESULT,
      window.SKHPS_EXTERNAL_APP_REGISTRY_RESULT,
      window.SKHPS_EXTERNAL_PROJECTS_RESULT,
      window.SKHPS_EXTERNAL_APPS_RESULT
    ].filter(Boolean);
  }

  function resolvePlacementFromKnownResults(appId) {
    var placement = "";

    registryResultCandidates().some(function (result) {
      var item;

      if (matchesAppId(result, appId)) {
        placement = pickPlacementFromObject(result);
        if (placement) return true;
      }

      item = findRegistryItemFromResult(result, appId);
      placement = pickPlacementFromObject(item);
      if (placement) {
        window.SKHPS_CURRENT_APP_REGISTRY = item;
        return true;
      }

      return false;
    });

    return placement;
  }

  function getHeaderMode() {
    var fromHtml = normalizeText(
      document.documentElement.getAttribute("data-skhps-header-mode")
    );
    var pageId;

    if (fromHtml) {
      return fromHtml;
    }

    if (isExternalApp()) {
      return currentResolvedPlacement === "backend" ? "admin" : "front";
    }

    pageId = getCurrentPageId();

    if (pageId === "admin" || pageId === "backend-project-launcher") {
      return "admin";
    }

    return "front";
  }

  function getHomeHref() {
    var fromHtml = normalizeText(
      document.documentElement.getAttribute("data-skhps-header-home-href")
    );
    var mode = getHeaderMode();

    if (fromHtml) {
      return fromHtml;
    }

    if (isExternalApp()) {
      return sharedHref(mode === "admin" ? ADMIN_HREF : FRONT_HREF);
    }

    if (mode === "admin") {
      return ADMIN_HREF;
    }

    if (window.SKHPS_ENTRY_BASE_URL && isAbsoluteUrl(window.SKHPS_ENTRY_BASE_URL)) {
      return window.SKHPS_ENTRY_BASE_URL;
    }

    return FRONT_HREF;
  }

  function getLoginHref() {
    /* 母片優先（2026-07-22）：跟品牌名同一個「有母片設定就用、沒有就用既有邏輯」模式。
       母片沒設 loginHref＝走原本的 data 屬性→sharedHref 預設，行為不變。 */
    var sh = (window.SKHPS_SHELL && window.SKHPS_SHELL.header) || {};
    var fromShell = normalizeText(sh.loginHref);
    if (fromShell) {
      return fromShell;
    }

    var fromHtml = normalizeText(
      document.documentElement.getAttribute("data-skhps-header-login-href")
    );

    if (fromHtml) {
      return fromHtml;
    }

    return sharedHref(LOGIN_HREF);
  }

  function applyResolvedPlacement(placement, reason) {
    placement = normalizePlacement(placement);

    if (!placement) return false;
    if (placement !== "backend" && placement !== "front") return false;
    if (currentResolvedPlacement === placement) return false;

    currentResolvedPlacement = placement;
    document.documentElement.setAttribute("data-skhps-current-display-position", placement);

    rlog("OK", "resolvePlacement", {
      appId: getCurrentAppId(),
      placement: placement,
      reason: reason || ""
    });

    renderHeader();
    return true;
  }

  function resolvePlacementFromBackend() {
    var appId = getCurrentAppId();
    var knownPlacement;

    if (!isExternalApp() || !appId || registryResolveStarted) {
      return;
    }

    knownPlacement = resolvePlacementFromKnownResults(appId);
    if (applyResolvedPlacement(knownPlacement, "known-result")) {
      return;
    }

    if (!window.SKHPSBackend || typeof window.SKHPSBackend.call !== "function") {
      rlog("WARN", "resolvePlacementSkipped", "SKHPSBackend.call not available");
      return;
    }

    registryResolveStarted = true;

    window.SKHPSBackend.call("listExternalProjects", {}, {
      timeoutMs: 8000
    }).then(function (result) {
      var item = findRegistryItemFromResult(result, appId);
      var placement = pickPlacementFromObject(item);

      if (item) {
        window.SKHPS_CURRENT_APP_REGISTRY = item;
      }

      if (!applyResolvedPlacement(placement, "listExternalProjects")) {
        rlog("WARN", "resolvePlacementNoMatch", {
          appId: appId,
          hasResult: Boolean(result)
        });
      }

      try {
        document.dispatchEvent(new CustomEvent("skhps-current-app-registry-resolved", {
          detail: {
            appId: appId,
            placement: placement,
            item: item || null,
            result: result || null
          }
        }));
      } catch (error) {}
    }).catch(function (error) {
      rlog("WARN", "resolvePlacementFailed", error && error.message ? error.message : String(error));
    });
  }

  /* 母片結構值 → root CSS 變數（2026-07-22）。只在母片有設定該值時才寫變數，沒設定＝
     不寫＝維持 registry 現有樣式（prod 零影響）。bg 只認 hex（防斷屬性），高度數字化。
     registry 端的 header 規則要用 var(--skhps-header-*, 原值) 才會吃到——沒吃到也不出錯，
     只是該結構值暫時無效果（等 agent 把 registry 規則變數化，屬「展示出來讓 agent 調」）。 */
  function applyShellHeaderStyle(sh) {
    try {
      var root = document.documentElement;
      var h = (sh && sh.heightPx != null && isFinite(Number(sh.heightPx))) ? Math.round(Number(sh.heightPx)) : null;
      if (h != null) root.style.setProperty("--skhps-header-height", h + "px");
      else root.style.removeProperty("--skhps-header-height");

      var bg = sh && typeof sh.bg === "string" && /^#[0-9a-fA-F]{3,8}$/.test(sh.bg) ? sh.bg : null;
      if (bg) root.style.setProperty("--skhps-header-bg", bg);
      else root.style.removeProperty("--skhps-header-bg");

      if (sh && sh.sticky === false) root.setAttribute("data-skhps-header-sticky", "false");
      else root.removeAttribute("data-skhps-header-sticky");
    } catch (e) {}
  }

  function renderHeader() {
    var root = getHeaderRoot();
    var mode;
    var homeHref;
    var loginHref;

    if (!root) {
      rlog("WARN", "renderHeader", "missing header root");
      return;
    }

    mode = getHeaderMode();
    homeHref = getHomeHref();
    loginHref = getLoginHref();

    currentRenderedHomeHref = homeHref;

    /* 母片（2026-07-22）：品牌名／登入文字改成「有母片設定就用、沒有就用寫死常數」——
       跟 getHomeHref()/getLoginHref() 同一個漸進增強模式。window.SKHPS_SHELL 由 shell-config.js
       在 boot 階段填入；prod 沒母片設定時 sh 為空物件，全數 fallback 到原常數＝行為不變。
       值一律經 escapeHtml（下面 innerHTML），母片來源即使被竄改也不會 XSS。 */
    var sh = (window.SKHPS_SHELL && window.SKHPS_SHELL.header) || {};
    var brandMark = normalizeText(sh.brandMark) || BRAND_MARK;
    var brandMain = normalizeText(sh.brandMain) || BRAND_MAIN;
    var brandSub = (sh.brandSub != null && String(sh.brandSub) !== "") ? String(sh.brandSub) : BRAND_SUB;
    var loginText = normalizeText(sh.loginText) || "登入";

    /* 多狀態 header（2026-07-22，設計層）：header 右側按「當前狀態」顯示不同內容。
       真站永遠是 loggedOut（沒身分系統，__SHELL_PREVIEW_STATE 不存在）＝現有登入鈕＝prod 零風險；
       母片編輯畫面設 window.__SHELL_PREVIEW_STATE 切換預覽各狀態（登入後/角色），對應設計存在
       sh.states[state]。未設計的狀態顯示占位提示。這是「設計/預覽層」——真站要真的按登入身分
       顯示，還需要身分系統（另案）。 */
    var previewState = String(window.__SHELL_PREVIEW_STATE || "loggedOut");
    var rightHtml;
    if (previewState === "loggedOut") {
      rightHtml = '<a class="skhps-btn skhps-btn-primary skhps-header-login-btn" href="' + escapeHtml(loginHref) + '" data-skhps-login-link>' + escapeHtml(loginText) + "</a>";
    } else {
      /* 登入後統一長相（2026-07-22，使用者定，參考業界慣例）：「名字 你好 ＋ 人臉 icon」，
         點 icon 展開下拉選單（設定/登出/角色專屬項都收進去）。這樣不管什麼角色，header 右側
         結構都一樣（一個使用者選單）、不會因角色不同而忽多忽少——解決了「按鈕數量不同 header
         會變」的問題。角色差異只反映在**選單項目**（menu），header 骨架不變。
         用原生 <details>：點 summary 展開/收合，不用額外 JS 管開關。 */
      ensureHeaderUserMenuStyle();
      var stateDef = (sh.states && sh.states[previewState]) || {};
      var userLabel = normalizeText(stateDef.userLabel);
      var menuItems = Array.isArray(stateDef.menu) ? stateDef.menu : [];
      if (userLabel || menuItems.length) {
        var menuHtml = menuItems.map(function (mi) {
          var danger = mi && mi.danger ? " skhps-header-user-menu-item-danger" : "";
          return '<a class="skhps-header-user-menu-item' + danger + '" href="' + escapeHtml(mi && mi.href || "#") + '" data-skhps-user-menu-item>' + escapeHtml(mi && mi.text || "") + "</a>";
        }).join("");
        rightHtml = '<details class="skhps-header-user" data-skhps-user-menu>' +
          '<summary class="skhps-header-user-trigger">' +
            '<span class="skhps-header-user-name">' + escapeHtml(userLabel || "你好") + "</span>" +
            '<span class="skhps-header-user-avatar" aria-hidden="true">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"></path></svg>' +
            "</span>" +
          "</summary>" +
          '<div class="skhps-header-user-menu">' + menuHtml + "</div>" +
        "</details>";
      } else {
        rightHtml = '<span class="skhps-header-state-placeholder" data-skhps-state-empty="' + escapeHtml(previewState) + '">（這個狀態的 header 還沒設計）</span>';
      }
    }

    root.classList.add("skhps-header");
    root.setAttribute("data-skhps-header-ready", "true");
    root.setAttribute("data-skhps-header-mode", mode);

    /* 結構值（高度／sticky／背景）＝「展示出來讓 agent 調」那一類：設成 root CSS 變數，
       registry 規則吃這些變數才會生效。沒設定＝不寫變數＝維持 registry 現有寫死值。 */
    applyShellHeaderStyle(sh);

    root.innerHTML = [
      '<div class="skhps-header-inner">',
        '<a class="skhps-header-brand" href="' + escapeHtml(homeHref) + '" aria-label="回到首頁">',
          '<span class="skhps-header-brand-mark">',
            escapeHtml(brandMark),
          '</span>',
          '<span class="skhps-header-brand-copy">',
            '<span class="skhps-header-brand-main">',
              escapeHtml(brandMain),
            '</span>',
            '<span class="skhps-header-brand-sub">',
              escapeHtml(brandSub),
            '</span>',
          '</span>',
        '</a>',

        '<nav class="skhps-header-actions" aria-label="主要導覽">',
          rightHtml,
        '</nav>',
      '</div>'
    ].join("");

    /* header 內容寬度（2026-07-22，母片可控、獨立於頁面寬度）：header 是全站共用的殼，它的
       寬度該全站一致（母片），不跟每頁的頁面寬度走——否則窄頁/寬頁的 header 會不一樣寬。
       用**跟頁面完全相同的四段定義**（css-setting page.html PAGE_WIDTHS），詞彙一致；想跟頁面
       一樣就兩邊設一樣（使用者的想法）。inline important 覆蓋 registry，沒設定＝清掉＝用
       registry 現值（prod 零風險）。 */
    var innerEl = root.querySelector(".skhps-header-inner");
    if (innerEl) {
      var HEADER_WIDTHS = { narrow: "max(55%, 640px)", standard: "max(70%, 680px)", wide: "max(88%, 720px)", full: "none" };
      if (sh.width && HEADER_WIDTHS[sh.width]) {
        innerEl.style.setProperty("max-width", HEADER_WIDTHS[sh.width], "important");
      } else {
        innerEl.style.removeProperty("max-width");
      }
    }

    rlog("OK", "renderHeader", {
      mode: mode,
      homeHref: homeHref,
      loginHref: loginHref,
      placement: currentResolvedPlacement || ""
    });
  }

  function boot() {
    /*
      先用 fallback render，避免 header 空白。
      外部 App 再用 registry 的當下 displayPosition 非同步修正回首頁位置。
    */
    renderHeader();
    resolvePlacementFromBackend();

    document.addEventListener("skhps-runtime-updated", function () {
      if (!currentResolvedPlacement) {
        resolvePlacementFromBackend();
      }
    });

    document.addEventListener("skhps-current-app-registry-resolved", function () {
      var nextHomeHref = getHomeHref();
      if (nextHomeHref !== currentRenderedHomeHref) {
        renderHeader();
      }
    });
  }

  /* 公開 render（2026-07-22）：對稱 window.SKHPSFooter.render——讓 header 可被程式化重繪
     （母片回歸測試注入 window.SKHPS_SHELL 後重繪檢查、未來母片即時預覽也用得到）。 */
  window.SKHPSHeader = window.SKHPSHeader || {};
  window.SKHPSHeader.render = renderHeader;
  /* 使用者選單「點外面／Esc 關閉」由**全站通用** ui-behaviors.js 統一處理（使用者定的原則：
     這種行為一次設定、統一控制，不在 header 各做一次）。這裡不再自己掛。 */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  rlog("OK", "moduleReady", "header.js");
})();
