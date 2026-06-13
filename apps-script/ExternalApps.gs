/**
 * 檔案位置：skhpsv2/apps-script/ExternalApps.gs
 * 時間戳：2026-06-14 01:25 UTC+8
 * 用途：skhpsv2 外部專案報到 / 清單 / 啟用管理；使用 Sheet 既有欄位「顯示位置」分流前台 / 後台。
 *
 * Sheet：外部專案
 * 欄位：
 * 專案ID、環境、專案名稱、入口網址、顯示位置、顯示群組、排序、啟用、版本、最後報到時間、報到次數
 *
 * 規則：
 * - 唯一鍵 = 專案ID + 環境
 * - 第一次看到 專案ID + 環境：新增，啟用 = FALSE
 * - 再次看到 專案ID + 環境：更新名片資料，但不動啟用 / 顯示位置 / 排序
 * - 啟用、顯示位置、排序由 skhpsv2 後台啟動器修改
 * - 表頭不覆蓋；只在空表時建立，或缺必要欄位時 append 到最後
 */

const SKHPS_EXTERNAL_APPS_SHEET_NAME = '外部專案';

const SKHPS_EXTERNAL_APPS_HEADERS = [
  '專案ID',
  '環境',
  '專案名稱',
  '入口網址',
  '顯示位置',
  '顯示群組',
  '排序',
  '啟用',
  '版本',
  '最後報到時間',
  '報到次數'
];

function registerExternalApp(payload) {
  payload = payload || {};

  const app = normalizeExternalAppPayload_(payload);
  const now = new Date();

  if (!app.appId) {
    return {
      ok: false,
      message: '缺少專案ID'
    };
  }

  if (!app.env) {
    return {
      ok: false,
      message: '缺少環境'
    };
  }

  if (!app.title) {
    return {
      ok: false,
      message: '缺少專案名稱'
    };
  }

  if (!app.href) {
    return {
      ok: false,
      message: '缺少入口網址'
    };
  }

  const sheet = getExternalAppsSheet_();
  const table = readExternalAppsTable_(sheet);

  const found = table.rows.find(function (row) {
    return String(row['專案ID'] || '').trim() === app.appId &&
      String(row['環境'] || '').trim() === app.env;
  });

  if (!found) {
    appendExternalAppRow_(sheet, {
      '專案ID': app.appId,
      '環境': app.env,
      '專案名稱': app.title,
      '入口網址': app.href,
      '顯示群組': app.group,
      // 顯示位置與排序屬於 skhpsv2 後台 registry 管理欄位；外部專案第一次報到不自行決定。
      '顯示位置': '',
      '排序': 9999,
      '啟用': false,
      '版本': app.version,
      '最後報到時間': now,
      '報到次數': 1
    });

    return {
      ok: true,
      status: 'created',
      appId: app.appId,
      env: app.env,
      active: false,
      message: '外部專案第一次報到，已建立為未啟用'
    };
  }

  const currentActive = toBoolean_(found['啟用']);
  const currentCount = Number(found['報到次數'] || 0) || 0;

  updateExternalAppRow_(sheet, found.rowIndex, {
    '專案名稱': app.title,
    '入口網址': app.href,
    // 重要：啟用 / 顯示位置 / 顯示群組 / 排序不動，避免外部專案報到覆蓋後台設定
    '版本': app.version,
    '最後報到時間': now,
    '報到次數': currentCount + 1
  });

  return {
    ok: true,
    status: 'updated',
    appId: app.appId,
    env: app.env,
    active: currentActive,
    message: '外部專案已存在，已更新報到資訊，啟用狀態維持不變'
  };
}

function listExternalApps(payload) {
  payload = payload || {};

  const activeOnly = payload.activeOnly === true;
  const env = String(payload.env || payload.runtime || '').trim();

  const sheet = getExternalAppsSheet_();
  const table = readExternalAppsTable_(sheet);

  let apps = table.rows.map(function (row) {
    return {
      appId: String(row['專案ID'] || '').trim(),
      projectId: String(row['專案ID'] || '').trim(),
      env: String(row['環境'] || '').trim(),
      title: String(row['專案名稱'] || '').trim(),
      href: String(row['入口網址'] || '').trim(),
      group: String(row['顯示群組'] || '').trim(),
      displayPosition: normalizeExternalAppDisplayPosition_(row['顯示位置']),
      '顯示位置': normalizeExternalAppDisplayPosition_(row['顯示位置']),
      order: Number(row['排序'] || 9999) || 9999,
      sort: Number(row['排序'] || 9999) || 9999,
      active: toBoolean_(row['啟用']),
      enabled: toBoolean_(row['啟用']),
      version: String(row['版本'] || '').trim(),
      lastSeenAt: row['最後報到時間'] || '',
      lastReportAt: row['最後報到時間'] || '',
      registerCount: Number(row['報到次數'] || 0) || 0,
      reportCount: Number(row['報到次數'] || 0) || 0
    };
  }).filter(function (app) {
    return app.appId && app.env && app.title && app.href;
  });

  if (activeOnly) {
    apps = apps.filter(function (app) {
      return app.active === true;
    });
  }

  if (env) {
    apps = apps.filter(function (app) {
      return app.env === env;
    });
  }

  apps.sort(function (a, b) {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title, 'zh-Hant');
  });

  return {
    ok: true,
    apps: apps,
    count: apps.length
  };
}

function listExternalProjects(payload) {
  const result = listExternalApps(payload || {});
  result.projects = result.apps || [];
  return result;
}

function updateExternalProjectActivation(payload) {
  payload = payload || {};

  const appId = String(payload.projectId || payload.appId || payload['專案ID'] || '').trim();
  const env = String(payload.env || payload['環境'] || '').trim();

  const hasActive =
    Object.prototype.hasOwnProperty.call(payload, 'active') ||
    Object.prototype.hasOwnProperty.call(payload, 'enabled') ||
    Object.prototype.hasOwnProperty.call(payload, '啟用');

  const hasDisplayPosition =
    Object.prototype.hasOwnProperty.call(payload, 'displayPosition') ||
    Object.prototype.hasOwnProperty.call(payload, 'position') ||
    Object.prototype.hasOwnProperty.call(payload, '顯示位置');

  const hasSort =
    Object.prototype.hasOwnProperty.call(payload, 'sort') ||
    Object.prototype.hasOwnProperty.call(payload, 'order') ||
    Object.prototype.hasOwnProperty.call(payload, 'displayOrder') ||
    Object.prototype.hasOwnProperty.call(payload, '排序');

  const active = hasActive ? toBoolean_(
    Object.prototype.hasOwnProperty.call(payload, 'active') ? payload.active :
      Object.prototype.hasOwnProperty.call(payload, 'enabled') ? payload.enabled :
        payload['啟用']
  ) : false;

  const displayPosition = externalAppDisplayPositionFromPayload_(payload);

  if (!appId) {
    return {
      ok: false,
      error: 'MISSING_APP_ID',
      message: '缺少專案ID'
    };
  }

  if (!env) {
    return {
      ok: false,
      error: 'MISSING_ENV',
      message: '缺少環境'
    };
  }

  const sheet = getExternalAppsSheet_();
  const table = readExternalAppsTable_(sheet);

  const found = table.rows.find(function (row) {
    return String(row['專案ID'] || '').trim() === appId &&
      String(row['環境'] || '').trim() === env;
  });

  if (!found) {
    return {
      ok: false,
      error: 'PROJECT_NOT_FOUND',
      message: '找不到外部專案：' + appId + ' / ' + env,
      appId: appId,
      env: env
    };
  }

  const patch = {};

  if (hasActive) {
    patch['啟用'] = active;
  }

  if (hasDisplayPosition) {
    if (!displayPosition) {
      return {
        ok: false,
        error: 'MISSING_DISPLAY_POSITION',
        message: '顯示位置不可為空'
      };
    }

    if (displayPosition !== '前台' && displayPosition !== '後台') {
      return {
        ok: false,
        error: 'INVALID_DISPLAY_POSITION',
        message: '顯示位置只能是「前台」或「後台」',
        displayPosition: displayPosition
      };
    }

    patch['顯示位置'] = displayPosition;
  }

  if (hasSort) {
    const sortValue = getExternalAppSortFromPayload_(payload);
    const sortNumber = Number(sortValue);

    if (!isFinite(sortNumber)) {
      return {
        ok: false,
        error: 'INVALID_SORT',
        message: '排序必須是數字',
        sort: sortValue
      };
    }

    patch['排序'] = sortNumber;
  }

  if (!Object.keys(patch).length) {
    return {
      ok: false,
      error: 'NO_UPDATABLE_FIELDS',
      message: '沒有可更新的欄位'
    };
  }

  updateExternalAppRow_(sheet, found.rowIndex, patch);
  SpreadsheetApp.flush();

  const nextActive = hasActive ? active : toBoolean_(found['啟用']);
  const nextPosition = hasDisplayPosition ? displayPosition : normalizeExternalAppDisplayPosition_(found['顯示位置']);
  const nextSort = hasSort ? Number(patch['排序']) : (Number(found['排序'] || 9999) || 9999);

  return {
    ok: true,
    appId: appId,
    projectId: appId,
    env: env,
    active: nextActive,
    enabled: nextActive,
    displayPosition: nextPosition,
    order: nextSort,
    sort: nextSort,
    data: {
      appId: appId,
      env: env,
      enabled: nextActive,
      displayPosition: nextPosition,
      sort: nextSort,
      updatedFields: Object.keys(patch)
    },
    message: '已更新外部專案設定'
  };
}

function updateExternalAppSettings(payload) {
  return updateExternalProjectActivation(payload || {});
}

function setExternalAppActive(payload) {
  payload = payload || {};

  const appId = String(payload.appId || payload['專案ID'] || '').trim();
  const env = String(payload.env || payload['環境'] || '').trim();
  const active = payload.active === true || payload.active === 'TRUE' || payload.active === 'true';

  if (!appId) {
    return {
      ok: false,
      message: '缺少專案ID'
    };
  }

  if (!env) {
    return {
      ok: false,
      message: '缺少環境'
    };
  }

  const sheet = getExternalAppsSheet_();
  const table = readExternalAppsTable_(sheet);

  const found = table.rows.find(function (row) {
    return String(row['專案ID'] || '').trim() === appId &&
      String(row['環境'] || '').trim() === env;
  });

  if (!found) {
    return {
      ok: false,
      message: '找不到外部專案：' + appId + ' / ' + env
    };
  }

  updateExternalAppRow_(sheet, found.rowIndex, {
    '啟用': active
  });

  return {
    ok: true,
    appId: appId,
    env: env,
    active: active,
    message: active ? '已啟用外部專案' : '已停用外部專案'
  };
}

/**
 * ===== helpers =====
 */

function normalizeExternalAppPayload_(payload) {
  const config = payload.config || payload.appConfig || payload || {};

  return {
    appId: String(
      config.appId ||
      config.id ||
      payload.appId ||
      payload.id ||
      ''
    ).trim(),

    env: String(
      config.env ||
      payload.env ||
      payload.runtime ||
      payload.requestedRuntime ||
      'prod'
    ).trim(),

    title: String(
      config.title ||
      config.name ||
      payload.title ||
      ''
    ).trim(),

    href: String(
      config.href ||
      config.url ||
      payload.href ||
      payload.url ||
      ''
    ).trim(),

    group: String(
      config.group ||
      config.category ||
      payload.group ||
      payload.category ||
      ''
    ).trim(),

    displayPosition: externalAppDisplayPositionFromPayload_(payload) ||
      externalAppDisplayPositionFromPayload_(config),

    order: Number(
      config.order ||
      payload.order ||
      9999
    ) || 9999,

    version: String(
      config.version ||
      payload.version ||
      ''
    ).trim()
  };
}

function getExternalAppsSheet_() {
  const spreadsheetId = getSpreadsheetId_();

  if (!spreadsheetId) {
    throw new Error('CONFIG_MISSING_MAIN_SPREADSHEET_ID');
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(SKHPS_EXTERNAL_APPS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SKHPS_EXTERNAL_APPS_SHEET_NAME);
  }

  ensureExternalAppsHeaders_(sheet);
  return sheet;
}

function ensureExternalAppsHeaders_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  /*
    如果整張表是空的，才自動建立標準表頭。
    如果你已經手動建立表頭，就不要自動覆蓋，避免把未來新增欄位洗掉。
  */
  if (lastRow === 0 || lastColumn === 0) {
    sheet.getRange(1, 1, 1, SKHPS_EXTERNAL_APPS_HEADERS.length)
      .setValues([SKHPS_EXTERNAL_APPS_HEADERS]);
    return;
  }

  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function (header) {
      return String(header || '').trim();
    });

  const missing = SKHPS_EXTERNAL_APPS_HEADERS.filter(function (header) {
    return current.indexOf(header) === -1;
  });

  /*
    如果缺少必要欄位，只把缺少欄位 append 到最後。
    不重排、不覆蓋、不刪除既有欄位。
  */
  if (missing.length) {
    sheet.getRange(1, lastColumn + 1, 1, missing.length)
      .setValues([missing]);
  }
}

function readExternalAppsTable_(sheet) {
  ensureExternalAppsHeaders_(sheet);

  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), SKHPS_EXTERNAL_APPS_HEADERS.length);

  if (lastRow < 2) {
    return {
      headers: getExternalAppsHeaders_(sheet),
      rows: []
    };
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();

  const headers = values[0].map(function (header) {
    return String(header || '').trim();
  });

  const rows = values.slice(1).map(function (rowValues, rowOffset) {
    const row = {
      rowIndex: rowOffset + 2
    };

    headers.forEach(function (header, index) {
      if (header) {
        row[header] = rowValues[index];
      }
    });

    return row;
  });

  return {
    headers: headers,
    rows: rows
  };
}

function getExternalAppsHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), SKHPS_EXTERNAL_APPS_HEADERS.length);

  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map(function (header) {
      return String(header || '').trim();
    });
}

function appendExternalAppRow_(sheet, rowObject) {
  const headers = getExternalAppsHeaders_(sheet);

  const row = headers.map(function (header) {
    if (!header) return '';

    if (Object.prototype.hasOwnProperty.call(rowObject, header)) {
      return rowObject[header];
    }

    return '';
  });

  sheet.appendRow(row);
}

function updateExternalAppRow_(sheet, rowIndex, patch) {
  const headers = getExternalAppsHeaders_(sheet);

  Object.keys(patch).forEach(function (key) {
    const colIndex = headers.indexOf(key) + 1;

    if (colIndex <= 0) {
      return;
    }

    sheet.getRange(rowIndex, colIndex).setValue(patch[key]);
  });
}

function toBoolean_(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;

  const text = String(value || '').trim().toLowerCase();

  if (
    text === 'true' ||
    text === '是' ||
    text === '1' ||
    text === 'yes' ||
    text === 'y' ||
    text === 'on' ||
    text === '啟用'
  ) {
    return true;
  }

  return false;
}

function externalAppDisplayPositionFromPayload_(payload) {
  payload = payload || {};

  return normalizeExternalAppDisplayPosition_(
    payload['顯示位置'] ||
    payload.displayPosition ||
    ''
  );
}

function getExternalAppSortFromPayload_(payload) {
  payload = payload || {};

  if (Object.prototype.hasOwnProperty.call(payload, 'sort')) {
    return payload.sort;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'order')) {
    return payload.order;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'displayOrder')) {
    return payload.displayOrder;
  }

  if (Object.prototype.hasOwnProperty.call(payload, '排序')) {
    return payload['排序'];
  }

  return '';
}

function normalizeExternalAppDisplayPosition_(value) {
  const text = String(value || '').trim();
  const lower = text.toLowerCase();

  if (!text) return '';
  if (text === '前台' || lower === 'front' || lower === 'frontend') return '前台';
  if (text === '後台' || lower === 'back' || lower === 'backend' || lower === 'admin') return '後台';

  return text;
}
