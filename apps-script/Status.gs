/*
檔案位置：apps-script/Status.gs
時間戳記：2026-06-08 13:40 UTC+8
用途：skhpsv2 Apps Script health check；供 GitHub Pages footer 測試後端連線狀態。
*/

function getBackendStatus() {
  return {
    ok: true,
    app: 'skhpsv2',
    env: 'prod',
    serverTime: Utilities.formatDate(
      new Date(),
      'Asia/Taipei',
      'yyyy-MM-dd HH:mm:ss'
    )
  };
}

function outputJson_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
