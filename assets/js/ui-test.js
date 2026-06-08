console.log('skhpsv2 ui-test loaded');

/*
時間戳記：2026-06-08 UTC+8
用途：CSS / UI 測試頁 Script 載入狀態檢查；只要本檔成功被瀏覽器載入，就在頁面顯示綠燈。
*/
(function () {
  function addScriptHealthLight() {
    var existing = document.getElementById('skhps-script-health-light');
    if (existing) return;

    var box = document.createElement('section');
    box.id = 'skhps-script-health-light';
    box.style.margin = '16px 0';
    box.style.padding = '12px 14px';
    box.style.border = '1px solid #d1fae5';
    box.style.borderRadius = '12px';
    box.style.background = '#ecfdf5';
    box.style.color = '#065f46';
    box.style.fontSize = '14px';
    box.style.lineHeight = '1.6';

    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;font-weight:700;">' +
        '<span style="width:12px;height:12px;border-radius:999px;background:#22c55e;display:inline-block;box-shadow:0 0 0 4px rgba(34,197,94,.16);"></span>' +
        '<span>Script 載入成功</span>' +
      '</div>' +
      '<div style="margin-top:4px;">assets/js/ui-test.js 已被瀏覽器執行。</div>' +
      '<div style="font-size:12px;opacity:.8;">檢查時間：' + new Date().toLocaleString('zh-TW') + '</div>';

    var target =
      document.querySelector('main') ||
      document.querySelector('.page-main') ||
      document.querySelector('.ui-test-page') ||
      document.body;

    target.insertBefore(box, target.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addScriptHealthLight);
  } else {
    addScriptHealthLight();
  }
})();
