/*
File: skhpsv2/assets/js/page-map.js
Purpose: render the shared SKHPS page map / breadcrumb.
*/

(function () {
  "use strict";

  var NAV_SELECTOR = "nav[data-skhps-page-map]";

  function html() {
    return document.documentElement;
  }

  function text(value) {
    return String(value || "").trim();
  }

  function isHomePage() {
    var pageId = text(html().getAttribute("data-skhps-page-id"));
    var path = String(window.location.pathname || "").toLowerCase();

    return pageId === "home" ||
      pageId === "index" ||
      /(^|\/)index\.html$/.test(path) && path.indexOf("/skhpsv2/") >= 0;
  }

  function getRuntime() {
    if (window.SKHPSConfig && typeof window.SKHPSConfig.getEnv === "function") {
      return window.SKHPSConfig.getEnv(window.SKHPS_CONFIG || {});
    }

    return text(html().getAttribute("data-skhps-runtime"));
  }

  function withRuntime(href) {
    if (!href || href === "#") return href || "";

    if (window.SKHPSConfig && typeof window.SKHPSConfig.withRuntime === "function") {
      return window.SKHPSConfig.withRuntime(href, window.SKHPS_CONFIG || {});
    }

    var runtime = getRuntime();
    if (!runtime) return href;

    try {
      var url = new URL(href, window.location.href);
      url.searchParams.set("skhpsRuntime", runtime);
      return url.toString();
    } catch (error) {
      return href +
        (String(href).indexOf("?") >= 0 ? "&" : "?") +
        "skhpsRuntime=" +
        encodeURIComponent(runtime);
    }
  }

  function sharedHomeHref() {
    var explicit = text(html().getAttribute("data-skhps-page-map-home-href"));
    var sharedBase = window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.sharedBaseUrl;
    var configBase = "";

    if (explicit) return withRuntime(explicit);

    if (window.SKHPSConfig && typeof window.SKHPSConfig.getSiteBaseUrl === "function") {
      configBase = window.SKHPSConfig.getSiteBaseUrl(window.SKHPS_CONFIG || {});
    }

    if (sharedBase) return withRuntime(sharedBase);
    if (configBase) return withRuntime(configBase);

    return withRuntime("index.html");
  }

  function currentLabel() {
    return text(html().getAttribute("data-skhps-page-map-current")) ||
      text(html().getAttribute("data-skhps-page-map-title")) ||
      text(html().getAttribute("data-loading-title")) ||
      text(window.SKHPS_APP_ENV && window.SKHPS_APP_ENV.title) ||
      text(window.SKHPS_APP_CONFIG && window.SKHPS_APP_CONFIG.title) ||
      text(document.title) ||
      "目前頁面";
  }

  function parseCustomMap() {
    var raw = text(html().getAttribute("data-skhps-page-map"));
    if (!raw) return null;

    try {
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    } catch (error) {
      return null;
    }
  }

  function fallbackItems() {
    var homeLabel = text(html().getAttribute("data-skhps-page-map-home-label")) || "首頁";
    var parentLabel = text(html().getAttribute("data-skhps-page-map-parent-label"));
    var parentHref = text(html().getAttribute("data-skhps-page-map-parent-href"));
    var current = currentLabel();
    var items = [];

    if (isHomePage() && current === homeLabel) {
      return [{ label: homeLabel, current: true }];
    }

    if (!parentLabel) {
      items.push({
        label: homeLabel,
        href: sharedHomeHref()
      });
    } else {
      items.push({
        label: parentLabel,
        href: withRuntime(parentHref || sharedHomeHref())
      });
    }

    items.push({
      label: current,
      current: true
    });

    return items;
  }

  function getItems() {
    var custom = parseCustomMap();
    if (!custom || !custom.length) return fallbackItems();

    return custom.map(function (item, index) {
      item = item || {};
      return {
        label: text(item.label),
        href: item.href ? withRuntime(String(item.href)) : "",
        current: Boolean(item.current) || index === custom.length - 1
      };
    }).filter(function (item) {
      return item.label;
    });
  }

  function getTarget() {
    return document.querySelector("[data-skhps-page-map-container]") ||
      document.querySelector("main .skhps-container") ||
      document.querySelector("main");
  }

  function claimExistingNav() {
    var shared = document.querySelector(NAV_SELECTOR);
    var legacy = Array.prototype.slice.call(
      document.querySelectorAll("nav.skhps-page-map:not([data-skhps-page-map])")
    );

    if (shared) {
      legacy.forEach(function (nav) {
        if (nav && nav.parentNode) nav.parentNode.removeChild(nav);
      });
      return shared;
    }

    if (!legacy.length) return null;

    legacy.slice(1).forEach(function (nav) {
      if (nav && nav.parentNode) nav.parentNode.removeChild(nav);
    });

    legacy[0].setAttribute("data-skhps-page-map", "");
    return legacy[0];
  }

  function makeLink(item) {
    var link = document.createElement("a");
    link.className = "skhps-page-map-link";
    link.href = item.href || "#";
    link.textContent = item.label;
    return link;
  }

  function makeCurrent(item) {
    var span = document.createElement("span");
    span.className = "skhps-page-map-current";
    span.setAttribute("aria-current", "page");
    span.textContent = item.label;
    return span;
  }

  function makeSeparator() {
    var sep = document.createElement("span");
    sep.className = "skhps-page-map-sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "/";
    return sep;
  }

  /* 母片可控「內容外框間距」（2026-07-24）：頁面內容根（main＝.skhps-page）上緣到頁首、下緣到頁尾
     的距離，是全站一致的版面外框 → 母片控制（shell.content.topGap／bottomGap，px）。用 inline
     important 覆蓋 registry 的寫死 padding（首頁 hero 的 .skhps-index-page 上緣 ~51px），確保調得動；
     沒設定＝清掉 inline＝用 registry 現值（prod 零風險）。跟麵包屑顯示與否無關，故在 render() 最前面
     就套——麵包屑全站關掉時外框間距照樣生效。統一管理間距的中央入口，之後其他間距照同一套擴充。 */
  function applyContentFrame() {
    var main = document.querySelector("main");
    if (!main) return;
    var c = window.SKHPS_SHELL && window.SKHPS_SHELL.content;
    function px(v) { return (v != null && isFinite(Number(v))) ? Math.round(Number(v)) : null; }
    var top = px(c && c.topGap);
    var bottom = px(c && c.bottomGap);
    var first = main.firstElementChild;
    var last = main.lastElementChild;
    /* 只設 main 的 padding 還不夠統一：有些頁在 main 內又包一層 .skhps-container，那層自帶
       margin-top（admin/tools 72px、quick ~34px、index 沒有），會疊在 topGap 上讓「header→內容」
       各頁不一。所以 topGap 生效時，把第一個內容元素自帶的 top margin 一併收掉（bottomGap 同理收
       最後一個元素的 bottom margin）——header→內容／內容→footer 完全由母片這兩個值決定，全站一致。
       沒設＝清掉全部 inline＝退回 registry 現值（prod 零風險）。 */
    if (top != null) {
      main.style.setProperty("padding-top", top + "px", "important");
      if (first) first.style.setProperty("margin-top", "0", "important");
    } else {
      main.style.removeProperty("padding-top");
      if (first) first.style.removeProperty("margin-top");
    }
    if (bottom != null) {
      main.style.setProperty("padding-bottom", bottom + "px", "important");
      if (last) last.style.setProperty("margin-bottom", "0", "important");
    } else {
      main.style.removeProperty("padding-bottom");
      if (last) last.style.removeProperty("margin-bottom");
    }
  }

  function render() {
    applyContentFrame();

    var target = getTarget();

    /* 母片全站開關（2026-07-22）：麵包屑「要不要顯示」是全站共用行為 → 母片控制
       （shell.breadcrumb.enabled）；每頁的「階層/名稱」仍由各頁 data-skhps-page-map 宣告
       （那是頁面的事，不進母片——見母片邊界裁決）。enabled===false 全站隱藏麵包屑；沒設定
       ／true＝各頁照自己宣告（現況，prod 零風險）。 */
    var bc = window.SKHPS_SHELL && window.SKHPS_SHELL.breadcrumb;
    if (bc && bc.enabled === false) {
      var hide = claimExistingNav();
      if (hide && hide.parentNode) hide.parentNode.removeChild(hide);
      html().setAttribute("data-skhps-page-map-ready", "true");
      return;
    }

    var items = getItems();
    var existing = claimExistingNav();
    var nav;

    if (!target || !items.length) return;

    nav = existing || document.createElement("nav");
    nav.className = "skhps-page-map";
    nav.setAttribute("data-skhps-page-map", "");
    nav.setAttribute("aria-label", "頁面地圖");
    nav.textContent = "";

    /* 母片可控間距（2026-07-22）：麵包屑到下方內容（標題）的距離是全站一致的麵包屑樣式 →
       母片控制（shell.breadcrumb.gap，px）。用 inline important 覆蓋 registry 的寫死 margin，
       確保調得動；沒設定＝清掉 inline＝用 registry 現值（prod 零風險）。 */
    if (bc && bc.gap != null && isFinite(Number(bc.gap))) {
      nav.style.setProperty("margin-bottom", Math.round(Number(bc.gap)) + "px", "important");
    } else {
      nav.style.removeProperty("margin-bottom");
    }

    items.forEach(function (item, index) {
      if (index) nav.appendChild(makeSeparator());
      nav.appendChild(item.current || !item.href ? makeCurrent(item) : makeLink(item));
    });

    if (!existing) {
      target.insertBefore(nav, target.firstElementChild || null);
    }

    html().setAttribute("data-skhps-page-map-ready", "true");
  }

  window.SKHPSPageMap = window.SKHPSPageMap || {};
  window.SKHPSPageMap.render = render;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
