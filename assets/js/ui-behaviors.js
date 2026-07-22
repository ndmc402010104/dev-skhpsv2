/*
檔案位置：skhpsv2/assets/js/ui-behaviors.js
時間戳：2026-07-22 12:00 UTC+8
用途：**全站通用 UI 行為**——一次設定、統一控制，所有頁面（含外部專案）自動吃到。
      這是使用者定的原則：「把所有動作收到元件裡面……做出來的網站 details 都會按空白關閉，
      一次設定統一控制」。通用互動不該每個地方各做一次（header 剛做過就是反例），收斂在這裡。

第一個行為：**下拉選單（<details>）點外面／Esc 自動關閉**。
 - 原生 <details> 只有點 summary 才 toggle，點外面不會收——這裡補上，全站生效。
 - 預設**所有** open 的 <details> 都適用（使用者：details 都該這樣）；特殊情況（例如刻意常開的
   可折疊內容區）在該 details 加 data-skhps-keep-open 即可 opt-out。
 - document 級委派、只掛一次，跟頁面內容重繪無關。

是 entry-core 的 boot script，本體與外部專案共用同一份 boot（app-entry 傳 coreScripts:null），
所以任何走 entry-core 的專案都自動有這些行為，不用各自實作（水庫理論）。
*/
(function () {
  "use strict";

  if (typeof document === "undefined" || window.__skhpsUiBehaviors) return;
  window.__skhpsUiBehaviors = true;

  function closeOpenMenus(except) {
    var opened = document.querySelectorAll("details[open]:not([data-skhps-keep-open])");
    Array.prototype.forEach.call(opened, function (d) {
      if (except && d.contains(except)) return; // 點在這個 details 內（含 summary/選單項）＝不關它
      d.removeAttribute("open");
    });
  }

  /* 點外面關閉：點擊落在某個 open 的 details 之外，就收那個 details。用 capture 讓它在
     其他 click handler（如選單項導航）之前也能判斷，但只做「關閉不在點擊路徑上的選單」，
     不攔截點擊本身。 */
  document.addEventListener("click", function (e) {
    closeOpenMenus(e.target);
  });

  /* Esc 關閉全部。 */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeOpenMenus(null);
  });
})();
