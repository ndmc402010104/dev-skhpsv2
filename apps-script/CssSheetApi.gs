/**
 * 檔案位置：skhpsv2/apps-script/CssSheetApi.gs
 * 時間戳記：2026-06-11 UTC+8
 * 用途：CSS Sheet 讀取 API；固定讀取 gid 0 / CSS總表，並相容舊 tabKey=baseStyle。
 */

var CSS_MAIN_TAB_KEY_ = typeof CSS_MAIN_TAB_KEY_ !== 'undefined' ? CSS_MAIN_TAB_KEY_ : 'cssMain';
var CSS_MAIN_TAB_NAME_ = typeof CSS_MAIN_TAB_NAME_ !== 'undefined' ? CSS_MAIN_TAB_NAME_ : 'CSS總表';
var CSS_MAIN_TAB_GID_ = typeof CSS_MAIN_TAB_GID_ !== 'undefined' ? CSS_MAIN_TAB_GID_ : '0';

function normalizeCssSheetTabKeyForRead_(tabKey) {
  tabKey = String(tabKey || '').trim();

  // 舊前端/舊資料仍可能送 baseStyle；先相容導到 CSS總表。
  if (!tabKey || tabKey === 'baseStyle') {
    return CSS_MAIN_TAB_KEY_;
  }

  return tabKey;
}

function getCssSheetConfig_(tabKey) {
  tabKey = normalizeCssSheetTabKeyForRead_(tabKey);

  var config = typeof getServerConfig_ === 'function' ? getServerConfig_() : null;
  var fromConfig =
    config &&
    config.sheets &&
    config.sheets.cssSheets &&
    config.sheets.cssSheets[tabKey];

  if (fromConfig) {
    return {
      key: fromConfig.key || tabKey,
      title: fromConfig.title || CSS_MAIN_TAB_NAME_,
      tabName: fromConfig.tabName || fromConfig.title || CSS_MAIN_TAB_NAME_,
      tabGid: String(fromConfig.tabGid === undefined || fromConfig.tabGid === null ? CSS_MAIN_TAB_GID_ : fromConfig.tabGid),
      enabled: fromConfig.enabled !== false
    };
  }

  if (tabKey === CSS_MAIN_TAB_KEY_) {
    return {
      key: CSS_MAIN_TAB_KEY_,
      title: CSS_MAIN_TAB_NAME_,
      tabName: CSS_MAIN_TAB_NAME_,
      tabGid: CSS_MAIN_TAB_GID_,
      enabled: true
    };
  }

  return null;
}

function getEnabledCssSheetKeys_() {
  var config = typeof getServerConfig_ === 'function' ? getServerConfig_() : null;
  var cssSheets = config && config.sheets && config.sheets.cssSheets ? config.sheets.cssSheets : null;

  if (!cssSheets) {
    return [CSS_MAIN_TAB_KEY_];
  }

  var keys = Object.keys(cssSheets).filter(function(key) {
    return cssSheets[key] && cssSheets[key].enabled !== false;
  });

  return keys.length ? keys : [CSS_MAIN_TAB_KEY_];
}

function getCssSheetPreview_(tabKey) {
  tabKey = normalizeCssSheetTabKeyForRead_(tabKey);

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
    ? sheetKeys.map(normalizeCssSheetTabKeyForRead_)
    : getEnabledCssSheetKeys_();

  // 現階段 CSS 來源固定為單一 CSS總表，避免舊多分頁設定混進來。
  sheetKeys = sheetKeys.filter(function(key, index, arr) {
    return key && arr.indexOf(key) === index;
  });

  var spreadsheetId = getSpreadsheetId_();

  if (!spreadsheetId) {
    throw new Error('mainSpreadsheetId is not configured.');
  }

  var ss = SpreadsheetApp.openById(spreadsheetId);
  var rows = [];

  sheetKeys.forEach(function(sheetKey) {
    sheetKey = normalizeCssSheetTabKeyForRead_(sheetKey);
    if (!sheetKey) return;

    var cssSheetConfig = getCssSheetConfig_(sheetKey);
    if (!cssSheetConfig || cssSheetConfig.enabled === false) return;

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