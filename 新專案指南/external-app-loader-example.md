# 外部 App 水庫接入標準

## 定位

`skhpsv2` 是水庫 / 共通地基 / runtime platform。外部 App 只保留自己的畫面、業務 JS、`app-card.json`、`version.js`，共用 runtime 由水庫提供。

水庫提供：

- config loader
- backend-client
- loading gate
- CSS Sheet runtime
- header / footer
- version / diagnostics / runtime panel
- external app registry / activation
- footer CSS cache 強制重讀工具

外部 App 例如 QR、Dressing、Quick Login、HIS patient list、Staff maintain，都不應把這些共用模組複製進自己的 repo。

## 目前標準

外部 App 的 HTML 只直接載入 `app-entry.js`。

`app-entry.js` 會：

1. 讀取 `app-card.json`
2. 讀取 `version.js`
3. 建立 `SKHPS_APP_CONFIG / SKHPS_APP_ENV`
4. 轉交 `external-app-loader.js`
5. 載入 skhpsv2 共用 runtime
6. 載入外部 App 自己的 `afterScripts`

外部 App 不直接載入：

- `config.js`
- `loading-gate.js`
- `backend-client.js`
- `css-sheet-runtime.js`
- `header.js`
- `footer.js`
- `external-app-loader.js`

## 最小檔案結構

```text
your-app/
  index.html
  app-card.json
  version.js
  CNAME
  assets/
    js/
      app.js
```

## index.html 最小模式

```html
<!DOCTYPE html>
<html
  lang="zh-Hant"
  class="skhps-css-loading"
  data-loading-title="外部 App"
  data-skhps-page-id="your-app-id"
  data-skhps-loading-tasks="css-runtime,app-ready"
>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>外部 App</title>

  <script>
    (function () {
      "use strict";

      var host = String(location.hostname || "").toLowerCase();
      var params = new URLSearchParams(location.search || "");
      var runtime = String(params.get("skhpsRuntime") || "").trim();
      var isLocal = host === "127.0.0.1" || host === "localhost" || host === "";
      var allowedRuntime = { "local-dev": true, dev: true, prod: true };

      function runtimeBaseUrl(value) {
        if (value === "local-dev") return "http://127.0.0.1:5500/skhpsv2/";
        if (value === "dev") return "https://dev-skhps.jonaminz.com/";
        return "https://skhps.jonaminz.com/";
      }

      function currentRuntime() {
        if (isLocal) return "local-dev";
        if (allowedRuntime[runtime]) return runtime;
        return "prod";
      }

      var resolvedRuntime = currentRuntime();

      window.SKHPS_ENTRY_VERSION = "20260612";
      window.SKHPS_ENTRY_BASE_URL = runtimeBaseUrl(resolvedRuntime);
      window.SKHPS_APP_CARD_URL = "app-card.json";

      document.documentElement.setAttribute("data-skhps-runtime", resolvedRuntime);

      document.write(
        '<link rel="stylesheet" href="' +
        window.SKHPS_ENTRY_BASE_URL +
        'assets/css/skhps-loading.css?v=' +
        encodeURIComponent(window.SKHPS_ENTRY_VERSION) +
        '">'
      );
    })();
  </script>
</head>
<body class="skhps-body">
  <header id="header" class="skhps-header" data-skhps-header></header>

  <main class="skhps-page">
    <div class="skhps-container">
      <section class="skhps-hero" aria-labelledby="appTitle">
        <div class="skhps-hero-card">
          <p class="skhps-eyebrow">External App</p>
          <h1 id="appTitle" class="skhps-page-title">外部 App</h1>
        </div>
      </section>
    </div>
  </main>

  <footer data-skhps-footer class="skhps-footer">Footer 載入中...</footer>

  <script>
    (function () {
      "use strict";

      var script = document.createElement("script");
      script.src =
        window.SKHPS_ENTRY_BASE_URL +
        "assets/js/app-entry.js?v=" +
        encodeURIComponent(window.SKHPS_ENTRY_VERSION);
      script.async = false;
      document.head.appendChild(script);
    })();
  </script>
</body>
</html>
```

## app-card.json

```json
{
  "appId": "your-app-id",
  "title": "外部 App",
  "group": "未分類",
  "order": 9999,
  "registerExternalApp": true,
  "versionUrl": "version.js",
  "afterScripts": [
    "assets/js/app.js"
  ],
  "href": {
    "local-dev": "http://127.0.0.1:5500/your-app/?skhpsRuntime=local-dev",
    "dev": "https://your-app.skhps.jonaminz.com/?skhpsRuntime=dev",
    "prod": "https://your-app.skhps.jonaminz.com/?skhpsRuntime=prod"
  }
}
```

## version.js

```js
window.SKHPS_VERSION = {
  appId: "your-app-id",
  version: "v0.1.0-20260612",
  major: 0,
  minor: 1,
  patch: 0,
  buildTime: "20260612",
  updatedAt: "2026-06-12T00:00:00+08:00",
  source: "version.js"
};
```

## assets/js/app.js

```js
(function () {
  "use strict";

  var READY_TASK = "app-ready";

  function loadingDone(task) {
    document.documentElement.setAttribute("data-skhps-" + task + "-ready", "true");

    if (window.SKHPSLoading && typeof window.SKHPSLoading.done === "function") {
      window.SKHPSLoading.done(task);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
  }

  function loadingFail(task, error) {
    document.documentElement.setAttribute("data-skhps-" + task + "-ready", "false");

    if (window.SKHPSLoading && typeof window.SKHPSLoading.fail === "function") {
      window.SKHPSLoading.fail(task, error);
      return;
    }

    document.documentElement.classList.remove("skhps-css-loading");
    document.documentElement.classList.remove("skhps-loading");
  }

  function init() {
    try {
      /*
        App 初始化放這裡。
        如需後端：
        SKHPSBackend.call("actionName", {});
      */
      loadingDone(READY_TASK);
    } catch (error) {
      console.error(error);
      loadingFail(READY_TASK, error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
```

## Loading Gate

`data-skhps-loading-tasks` 必須包含：

- `css-runtime`
- App 自己的 ready task，例如 `app-ready`、`quick-login-staff`、`qr-signin-ready`

App JS 初始化完成後要呼叫：

```js
SKHPSLoading.done("app-ready");
```

失敗時呼叫：

```js
SKHPSLoading.fail("app-ready", error);
```

## CSS Sheet 與 Footer

- 外部 App 不寫 inline style，不複製舊 CSS 當主解法。
- 頁面結構使用既有語意 class：`skhps-page`、`skhps-container`、`skhps-hero-card`、`skhps-section`、`skhps-btn` 等。
- CSS Sheet runtime 會由水庫載入。
- Footer 的 `CSS` 狀態燈現在可點擊，會清除 CSS runtime cache 並重新載入頁面，強迫從 Sheet 讀取 CSS。
- Footer 的箭頭 runtime panel 是整頁 scroll，不是 panel 內部 scroll。

## 後端

外部 App 需要後端時，統一使用：

```js
SKHPSBackend.call("actionName", payload);
```

後端 action 放在共用 Apps Script 專案，由 `skhpsv2/apps-script` 管理。不要在外部 App repo 另建一套 backend-client 或 Apps Script router。

## 注意事項

- `afterScripts` 是相對外部 App 頁面的路徑，不是相對 `skhpsv2`。
- `registerExternalApp` 是背景報到，失敗不應阻斷 App 功能。
- `version.js` 由 footer/runtime panel 顯示，不要硬寫版本字串到畫面。
- 本機測試用 `?skhpsRuntime=local-dev`；線上測試可用 `?skhpsRuntime=dev`。
- 如果 CSS 看起來沒更新，先點 footer 的 `CSS` 狀態燈強制重讀 Sheet。
