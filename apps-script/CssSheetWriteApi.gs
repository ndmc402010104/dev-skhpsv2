function getCssSheetConfigForWrite_(tabKey) {
  tabKey = String(tabKey || '').trim();

  var config = getServerConfig_ ? getServerConfig_() : null;
  var fromConfig =
    config &&
    config.sheets &&
    config.sheets.cssSheets &&
    config.sheets.cssSheets[tabKey];

  if (fromConfig) {
    return fromConfig;
  }

  var fallback = {
    baseStyle: {
      key: 'baseStyle',
      title: '基礎樣式',
      tabGid: '311728002'
    },
    tokenStyle: {
      key: 'tokenStyle',
      title: 'Token',
      tabGid: '1124186481'
    },
    layoutStyle: {
      key: 'layoutStyle',
      title: 'Layout',
      tabGid: '1670979619'
    },
    headerStyle: {
      key: 'headerStyle',
      title: 'Header',
      tabGid: '1632413533'
    },
    footerStyle: {
      key: 'footerStyle',
      title: 'Footer',
      tabGid: '1469302944'
    },
    buttonStyle: {
      key: 'buttonStyle',
      title: '按鈕',
      tabGid: '0'
    },
    formStyle: {
      key: 'formStyle',
      title: '表單',
      tabGid: '1178004000'
    }
  };

  return fallback[tabKey] || null;
}
/**
 * 檔案位置：skhpsv2/apps-script/CssSheetWriteApi.gs
 * 用途：CSS Setting v2 寫回 Google Sheet；append rows，不覆蓋歷史紀錄。
 */

function saveCssSheetRows_(payload) {
  payload = payload || {};

  var tabKey = String(payload.tabKey || '').trim();
  var rows = Array.isArray(payload.rows) ? payload.rows : [];

  if (!tabKey) {
    throw new Error('Missing tabKey');
  }

  if (!rows.length) {
    throw new Error('Missing rows');
  }

  var sheetConfig = getCssSheetConfigForWrite_(tabKey);

  if (!sheetConfig) {
    throw new Error('Unknown css sheet tabKey: ' + tabKey);
  }

  if (!sheetConfig.tabGid && String(sheetConfig.tabGid) !== '0') {
    throw new Error('tabGid is not configured: ' + tabKey);
  }

  var ss = SpreadsheetApp.openById(getSpreadsheetId_());
  var sheet = getSheetByGidForCssWrite_(ss, String(sheetConfig.tabGid));

  if (!sheet) {
    throw new Error('Sheet not found by tabGid: ' + sheetConfig.tabGid);
  }

  ensureCssSheetWriteHeader_(sheet);

  var updatedAt = Utilities.formatDate(
    new Date(),
    'Asia/Taipei',
    'yyyy/MM/dd HH:mm:ss'
  );

  var values = rows.map(function(row) {
    return [
      String(row.component || '').trim(),
      String(row.className || '').trim(),
      String(row.property || '').trim(),
      String(row.value || '').trim(),
      String(row.description || '').trim(),
      (String(row.updatedAt || '').trim().toLowerCase() === 'default' ? 'default' : updatedAt)];
  }).filter(function(row) {
    return row[0] && row[1] && row[2];
  });

  if (!values.length) {
    throw new Error('No valid rows');
  }

  sheet
    .getRange(sheet.getLastRow() + 1, 1, values.length, 6)
    .setValues(values);

  return {
    ok: true,
    action: 'saveCssSheetRows',
    tabKey: tabKey,
    sheetName: sheet.getName(),
    appendedRows: values.length,
    updatedAt: updatedAt
  };
}

function ensureCssSheetWriteHeader_(sheet) {
  var header = [
    'component',
    'className',
    'property',
    'value',
    'description',
    'updatedAt'
  ];

  var range = sheet.getRange(1, 1, 1, header.length);
  var current = range.getValues()[0];

  var needWrite = false;

  for (var i = 0; i < header.length; i++) {
    if (String(current[i] || '').trim() !== header[i]) {
      needWrite = true;
      break;
    }
  }

  if (needWrite) {
    range.setValues([header]);
  }
}

function getSheetByGidForCssWrite_(ss, gid) {
  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) {
      return sheets[i];
    }
  }

  return null;
}
