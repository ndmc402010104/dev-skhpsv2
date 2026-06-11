/**
 * 檔案位置：skhpsv2/apps-script/CssSheetWriteApi.gs
 * 時間戳記：2026-06-11 UTC+8
 * 用途：CSS Setting 寫回 Google Sheet；固定寫入 gid 0 / CSS總表；同一組 component + className + property 採 upsert，不再無限 append。
 */

var CSS_MAIN_TAB_KEY_ = 'cssMain';
var CSS_MAIN_TAB_NAME_ = 'CSS總表';
var CSS_MAIN_TAB_GID_ = '0';

function normalizeCssSheetTabKeyForWrite_(tabKey) {
  tabKey = String(tabKey || '').trim();

  var legacyMap = {
    baseStyle: CSS_MAIN_TAB_KEY_,
    tokenStyle: CSS_MAIN_TAB_KEY_,
    layoutStyle: CSS_MAIN_TAB_KEY_,
    headerStyle: CSS_MAIN_TAB_KEY_,
    footerStyle: CSS_MAIN_TAB_KEY_,
    buttonStyle: CSS_MAIN_TAB_KEY_,
    formStyle: CSS_MAIN_TAB_KEY_
  };

  if (!tabKey) return CSS_MAIN_TAB_KEY_;
  return legacyMap[tabKey] || tabKey;
}

function getCssSheetConfigForWrite_(tabKey) {
  tabKey = normalizeCssSheetTabKeyForWrite_(tabKey);

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
      tabGid: String(fromConfig.tabGid === undefined || fromConfig.tabGid === null ? CSS_MAIN_TAB_GID_ : fromConfig.tabGid)
    };
  }

  if (tabKey === CSS_MAIN_TAB_KEY_) {
    return {
      key: CSS_MAIN_TAB_KEY_,
      title: CSS_MAIN_TAB_NAME_,
      tabName: CSS_MAIN_TAB_NAME_,
      tabGid: CSS_MAIN_TAB_GID_
    };
  }

  return null;
}

function saveCssSheetRows_(payload) {
  payload = payload || {};

  var originalTabKey = String(payload.tabKey || payload.sheetKey || '').trim();
  var tabKey = normalizeCssSheetTabKeyForWrite_(originalTabKey);
  var rows = Array.isArray(payload.rows) ? payload.rows : [];

  if (!tabKey) throw new Error('Missing tabKey');
  if (!rows.length) throw new Error('Missing rows');

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

  ensureCssMainSheetNameForWrite_(ss, sheet, sheetConfig.tabName || CSS_MAIN_TAB_NAME_);
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
      (String(row.updatedAt || '').trim().toLowerCase() === 'default' ? 'default' : updatedAt)
    ];
  }).filter(function(row) {
    return row[0] && row[1] && row[2] && row[3] !== '';
  });

  if (!values.length) throw new Error('No valid rows');

  var result = upsertCssSheetRowsByKey_(sheet, values);

  return {
    ok: true,
    action: 'saveCssSheetRows',
    mode: 'upsert',
    tabKey: tabKey,
    originalTabKey: originalTabKey || tabKey,
    sheetName: sheet.getName(),
    tabGid: String(sheet.getSheetId()),
    insertedRows: result.insertedRows,
    updatedRows: result.updatedRows,
    appendedRows: result.insertedRows,
    touchedRows: values.length,
    updatedAt: updatedAt
  };
}

/**
 * Upsert key:
 *   component + className + property
 *
 * 規則：
 * - 若已有同 key 且 updatedAt 不是 default：更新最後一筆非 default row。
 * - 若只有 default row：保留 default，另外新增一筆 override row。
 * - 若完全沒有：新增一筆。
 *
 * 這樣可以保留 DEFAULT 種子資料，同時避免同一設定一直無限 append。
 */
function upsertCssSheetRowsByKey_(sheet, values) {
  var lastRow = sheet.getLastRow();
  var index = {};

  if (lastRow >= 2) {
    var existing = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

    existing.forEach(function(row, i) {
      var component = String(row[0] || '').trim();
      var className = String(row[1] || '').trim();
      var property = String(row[2] || '').trim();
      var updatedAt = String(row[5] || '').trim().toLowerCase();

      if (!component || !className || !property) return;

      var key = cssSheetUpsertKey_(component, className, property);
      index[key] = index[key] || { defaultRowNumber: 0, overrideRowNumber: 0 };

      var rowNumber = i + 2;

      if (updatedAt === 'default') {
        index[key].defaultRowNumber = rowNumber;
      } else {
        // 取最後一筆 override；舊的重複列不刪，之後可手動清，但不再新增更多。
        index[key].overrideRowNumber = rowNumber;
      }
    });
  }

  var toAppend = [];
  var updatedRows = 0;

  values.forEach(function(valueRow) {
    var key = cssSheetUpsertKey_(valueRow[0], valueRow[1], valueRow[2]);
    var hit = index[key];
    var targetRow = hit && hit.overrideRowNumber ? hit.overrideRowNumber : 0;

    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, 6).setValues([valueRow]);
      updatedRows += 1;
    } else {
      toAppend.push(valueRow);
    }
  });

  if (toAppend.length) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, toAppend.length, 6)
      .setValues(toAppend);
  }

  return {
    insertedRows: toAppend.length,
    updatedRows: updatedRows
  };
}

function cssSheetUpsertKey_(component, className, property) {
  return [
    String(component || '').trim(),
    String(className || '').trim(),
    String(property || '').trim()
  ].join('||');
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

function ensureCssMainSheetNameForWrite_(ss, sheet, expectedName) {
  expectedName = String(expectedName || CSS_MAIN_TAB_NAME_).trim();

  if (!expectedName || sheet.getName() === expectedName) {
    return;
  }

  var existing = ss.getSheetByName(expectedName);

  if (existing && existing.getSheetId() !== sheet.getSheetId()) {
    throw new Error(
      'Cannot rename gid ' + sheet.getSheetId() + ' to ' + expectedName +
      ': another sheet with this name already exists. Please remove/rename the duplicate first.'
    );
  }

  sheet.setName(expectedName);
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