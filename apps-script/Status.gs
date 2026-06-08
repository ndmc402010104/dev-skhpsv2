/*
檔案位置：skhpsv2/apps-script/Status.gs
時間戳記：2026-06-08 20:15 UTC+8
用途：skhpsv2 Apps Script API response helper；只負責 JSON / JSONP 輸出，不定義 health 或 getBackendStatus。
*/

function outputJson_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function outputJsonOrJsonp_(data, callback) {
  if (callback) {
    var safeCallback = String(callback).replace(/[^\w.$]/g, '');

    return ContentService
      .createTextOutput(safeCallback + '(' + JSON.stringify(data) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return outputJson_(data);
}

function normalizeApiError_(err) {
  if (!err) {
    return {
      message: 'Unknown error',
      stack: ''
    };
  }

  return {
    message: err && err.message ? String(err.message) : String(err),
    stack: err && err.stack ? String(err.stack) : ''
  };
}

function formatTaipeiDateTimeForApi_(date) {
  return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}