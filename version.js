/*
檔案位置：skhpsv2/version.js
時間戳：2026-07-17 00:46 UTC+8
用途：SKHPSv2 dev 版本；加入 Jonaminz bridge 與 CSS package runtime 相容層。
2026-07-17：entry-core 加 script preload（平行預抓），開場 JS 序列瀑布
收斂，本地 A/B 測 gate 4923ms→2323ms（-53%）。
2026-07-17：後台新增「工具包」頁（tools.html），收納 18:00 跳台倒數
bookmarklet；水庫合規（零 inline CSS，只用既有 skhps class）。
*/
window.SKHPS_VERSION = {
  appId: "skhpsv2",
  version: "v2.12.3-202607170046",
  major: 2,
  minor: 12,
  patch: 3,
  buildTime: "202607170046",
  updatedAt: "2026-07-17T00:46:00+08:00",
  source: "version.js"
};































































































