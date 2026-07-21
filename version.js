/*
檔案位置：skhpsv2/version.js
時間戳：2026-07-21 10:58 UTC+8
用途：SKHPSv2 dev 版本；加入 Jonaminz bridge 與 CSS package runtime 相容層。
2026-07-17：entry-core 加 script preload（平行預抓），開場 JS 序列瀑布
收斂，本地 A/B 測 gate 4923ms→2323ms（-53%）。
2026-07-17：後台新增「工具包」頁（tools.html），收納 18:00 跳台倒數
bookmarklet；水庫合規（零 inline CSS，只用既有 skhps class）。
2026-07-17：工具包加手機版 userscript（platform-timer.user.js，由 bookmarklet
產生器包出，@grant none＋偵測 ko 浮出啟動鈕），含 Android/iOS 安裝步驟。
2026-07-17：真機回饋調整——面板/啟動鈕移到左上/右上＋寬度自適應手機；工具頁
加「快速登入」與「用 Via 開啟(intent)」按鈕；Android 步驟改推 Via；前台首頁
加「跳台工具」入口（不需登入）。
2026-07-17：userscript 加 @updateURL/@downloadURL（v2.0.2，改版自動更新免重裝）；
工具頁加「下載 Via 瀏覽器」按鈕（Play 商店 mark.via.gp）。
2026-07-17：手機版按鈕簡化——移除失敗的 Via intent，改一顆「開啟醫院系統快速
登入」一般連結（Android/iOS 共用，在當前瀏覽器開）；前台「跳台工具」拿掉 emoji
與其他入口一致。
2026-07-18：拆除 CSS 存檔的 Sheet 殭屍路徑——backend-client.js call() 在退回 JSONP 前
加白名單守衛，saveCssSheetRows 等固定走 Worker 的 action 若因 worker 設定失效落到
fallback，一律 reject，不再無聲寫回已 retire 的 Google Sheet（原本 UI 還會誤報「已寫入」）。
2026-07-21：dev-server（local-dev 靜態伺服器）預設 coreRoot 改為「啟動它的 checkout」
（scriptRoot），不再默默優先供應 _dev-worktrees/skhpsv2-v3，避免「改 A checkout、畫面
卻來自 B worktree」；只有明確設 SKHPS_CORE_ROOT 才覆寫，啟動 log 標示實際來源。純本機
開發工具改動，不影響 GitHub Pages/PROD 部署行為（Compatibility Renderer 步驟1 checkpoint）。
*/
window.SKHPS_VERSION = {
  appId: "skhpsv2",
  version: "v2.12.10-202607211058",
  major: 2,
  minor: 12,
  patch: 10,
  buildTime: "202607211058",
  updatedAt: "2026-07-21T10:58:00+08:00",
  source: "version.js"
};































































































