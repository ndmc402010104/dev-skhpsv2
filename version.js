/*
檔案位置：skhpsv2/version.js
時間戳：2026-07-17 01:26 UTC+8
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
*/
window.SKHPS_VERSION = {
  appId: "skhpsv2",
  version: "v2.12.5-202607170146",
  major: 2,
  minor: 12,
  patch: 5,
  buildTime: "202607170146",
  updatedAt: "2026-07-17T01:46:00+08:00",
  source: "version.js"
};































































































