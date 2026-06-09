/**
 * 檔案位置：skhpsv2/apps-script/CssSheetApi.gs
 * 時間戳記：2026-06-09 20:00 UTC+8
 * 用途：CSS Sheet 讀取 API；支援單一 tab preview 與 runtime 全量讀取。
 */

function getCssSheetPreview_(tabKey) {
  tabKey = String(tabKey || '').trim();

  var cssSheetConfig = getCssSheetConfig_(tabKey);

  if (!cssSheetConfig) {
    return {
      ok: false,
      configured: false,
      tabKey: tabKey,
      error: 'UNKNOWN_CSS_SHEET',
      message: 'Unknown CSS sheet key: ' + tabKey
    };
  }

  if (cssSheetConfig.tabGid === undefined || cssSheetConfig.tabGid === null || String(cssSheetConfig.tabGid) === '') {
    return {
      ok: false,
      configured: false,
      tabKey: tabKey,
      title: cssSheetConfig.title,
      message: 'tabGid is not configured.'
    };
  }

  var spreadsheetId = getSpreadsheetId_();

  if (!spreadsheetId) {
    return {
      ok: false,
      configured: false,
      tabKey: tabKey,
      title: cssSheetConfig.title,
      message: 'mainSpreadsheetId is not configured.'
    };
  }

  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var targetSheet = getSheetByGidForCssRead_(ss, String(cssSheetConfig.tabGid));

    if (!targetSheet) {
      return {
        ok: false,
        configured: true,
        tabKey: tabKey,
        title: cssSheetConfig.title,
        tabGid: String(cssSheetConfig.tabGid),
        error: 'SHEET_TAB_NOT_FOUND',
        message: 'Cannot find sheet tab gid: ' + cssSheetConfig.tabGid
      };
    }

    var range = targetSheet.getDataRange();
    var values = range.getDisplayValues();
    var previewRows = values.slice(0, 10);

    return {
      ok: true,
      configured: true,
      tabKey: tabKey,
      title: cssSheetConfig.title,
      tabGid: String(cssSheetConfig.tabGid),
      sheetName: targetSheet.getName(),
      rowCount: values.length,
      columnCount: values.length ? values[0].length : 0,
      previewRows: previewRows
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      tabKey: tabKey,
      title: cssSheetConfig.title,
      tabGid: String(cssSheetConfig.tabGid),
      error: error && error.message ? error.message : String(error)
    };
  }
}

function getCssSheetRuntime_(sheetKeys) {
  sheetKeys = Array.isArray(sheetKeys) && sheetKeys.length
    ? sheetKeys
    : getEnabledCssSheetKeys_();

  var spreadsheetId = getSpreadsheetId_();

  if (!spreadsheetId) {
    throw new Error('mainSpreadsheetId is not configured.');
  }

  var ss = SpreadsheetApp.openById(spreadsheetId);
  var rows = [];

  sheetKeys.forEach(function(sheetKey) {
    sheetKey = String(sheetKey || '').trim();
    if (!sheetKey) return;

    var cssSheetConfig = getCssSheetConfig_(sheetKey);
    if (!cssSheetConfig) return;

    if (cssSheetConfig.tabGid === undefined || cssSheetConfig.tabGid === null || String(cssSheetConfig.tabGid) === '') {
      return;
    }

    var sheet = getSheetByGidForCssRead_(ss, String(cssSheetConfig.tabGid));
    if (!sheet) return;

    rows = rows.concat(readCssSheetRows_(sheetKey, sheet));
  });

  return rows;
}

function readCssSheetRows_(sheetKey, sheet) {
  var values = sheet.getDataRange().getDisplayValues();

  if (!values || values.length < 2) {
    return [];
  }

  var header = values[0] || [];
  var idx = {};

  header.forEach(function(h, i) {
    idx[String(h || '').trim()] = i;
  });

  return values.slice(1).map(function(row, order) {
    return {
      sheetKey: sheetKey,
      component: String(row[idx.component] || '').trim(),
      className: String(row[idx.className] || '').trim(),
      property: String(row[idx.property] || '').trim(),
      value: String(row[idx.value] || '').trim(),
      description: String(row[idx.description] || '').trim(),
      updatedAt: String(row[idx.updatedAt] || '').trim(),
      __order: order
    };
  }).filter(function(row) {
    return row.className && row.property && row.value;
  });
}

function getSheetByGidForCssRead_(ss, gid) {
  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) {
      return sheets[i];
    }
  }

  return null;
}