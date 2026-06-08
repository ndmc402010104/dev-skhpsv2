/**
 * 檔案位置：skhpsv2/apps-script/AuthDiagnostics.gs
 * 時間戳記：2026-06-08 16:00 UTC+8
 * 用途：集中觸發與檢查 skhpsv2 Apps Script 所需 Google 服務授權，避免第一次授權流程變成碰運氣。
 */

function authorizeRequiredServices() {
  const result = {
    ok: true,
    app: 'skhpsv2',
    checkedAt: formatTaipeiDateTime_(new Date()),
    services: []
  };

  try {
    const spreadsheetId = getAuthDiagnosticSpreadsheetId_();

    if (!spreadsheetId) {
      result.ok = false;
      result.services.push({
        service: 'SpreadsheetApp',
        ok: false,
        skipped: true,
        message: '找不到 SPREADSHEET_ID。請先在 Script Properties 或設定檔中放入試算表 ID。'
      });
    } else {
      const ss = SpreadsheetApp.openById(spreadsheetId);
      result.services.push({
        service: 'SpreadsheetApp',
        ok: true,
        detail: ss.getName()
      });
    }
  } catch (err) {
    result.ok = false;
    result.services.push({
      service: 'SpreadsheetApp',
      ok: false,
      error: normalizeErrorMessage_(err)
    });
  }

  try {
    const calendarId = getAuthDiagnosticCalendarId_();

    if (!calendarId) {
      result.services.push({
        service: 'CalendarApp',
        ok: false,
        skipped: true,
        message: '找不到 CALENDAR_ID。若此專案暫時不使用行事曆，可先略過。'
      });
    } else {
      const cal = CalendarApp.getCalendarById(calendarId);
      result.services.push({
        service: 'CalendarApp',
        ok: !!cal,
        detail: cal ? cal.getName() : '找不到指定 Calendar，請確認 CALENDAR_ID 是否正確。'
      });

      if (!cal) {
        result.ok = false;
      }
    }
  } catch (err) {
    result.ok = false;
    result.services.push({
      service: 'CalendarApp',
      ok: false,
      error: normalizeErrorMessage_(err)
    });
  }

  try {
    const props = PropertiesService.getScriptProperties().getProperties();
    result.services.push({
      service: 'PropertiesService',
      ok: true,
      detail: Object.keys(props).length + ' properties'
    });
  } catch (err) {
    result.ok = false;
    result.services.push({
      service: 'PropertiesService',
      ok: false,
      error: normalizeErrorMessage_(err)
    });
  }

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function checkRequiredServices() {
  const result = {
    ok: true,
    app: 'skhpsv2',
    checkedAt: formatTaipeiDateTime_(new Date()),
    services: []
  };

  try {
    const spreadsheetId = getAuthDiagnosticSpreadsheetId_();

    if (!spreadsheetId) {
      result.ok = false;
      result.services.push({
        service: 'SpreadsheetApp',
        ok: false,
        message: '找不到 SPREADSHEET_ID。'
      });
    } else {
      const ss = SpreadsheetApp.openById(spreadsheetId);
      result.services.push({
        service: 'SpreadsheetApp',
        ok: true,
        detail: ss.getName()
      });
    }
  } catch (err) {
    result.ok = false;
    result.services.push({
      service: 'SpreadsheetApp',
      ok: false,
      error: normalizeErrorMessage_(err)
    });
  }

  try {
    const calendarId = getAuthDiagnosticCalendarId_();

    if (!calendarId) {
      result.services.push({
        service: 'CalendarApp',
        ok: false,
        skipped: true,
        message: '找不到 CALENDAR_ID。若此頁不使用行事曆，可略過。'
      });
    } else {
      const cal = CalendarApp.getCalendarById(calendarId);
      result.services.push({
        service: 'CalendarApp',
        ok: !!cal,
        detail: cal ? cal.getName() : '找不到指定 Calendar。'
      });

      if (!cal) {
        result.ok = false;
      }
    }
  } catch (err) {
    result.ok = false;
    result.services.push({
      service: 'CalendarApp',
      ok: false,
      error: normalizeErrorMessage_(err)
    });
  }

  try {
    const props = PropertiesService.getScriptProperties().getProperties();
    result.services.push({
      service: 'PropertiesService',
      ok: true,
      detail: Object.keys(props).length + ' properties'
    });
  } catch (err) {
    result.ok = false;
    result.services.push({
      service: 'PropertiesService',
      ok: false,
      error: normalizeErrorMessage_(err)
    });
  }

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function apiCheckRequiredServices() {
  return checkRequiredServices();
}

function getAuthDiagnosticSpreadsheetId_() {
  const props = PropertiesService.getScriptProperties();

  const fromProps =
    props.getProperty('SPREADSHEET_ID') ||
    props.getProperty('SHEET_ID');

  if (fromProps) return fromProps;

  if (typeof SKH_CONFIG !== 'undefined' && SKH_CONFIG && SKH_CONFIG.SPREADSHEET_ID) {
    return SKH_CONFIG.SPREADSHEET_ID;
  }

  if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.SPREADSHEET_ID) {
    return CONFIG.SPREADSHEET_ID;
  }

  return '';
}

function getAuthDiagnosticCalendarId_() {
  const props = PropertiesService.getScriptProperties();

  const fromProps =
    props.getProperty('CALENDAR_ID') ||
    props.getProperty('RESIDENT_CALENDAR_ID');

  if (fromProps) return fromProps;

  if (typeof SKH_CONFIG !== 'undefined' && SKH_CONFIG && SKH_CONFIG.CALENDAR_ID) {
    return SKH_CONFIG.CALENDAR_ID;
  }

  if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.CALENDAR_ID) {
    return CONFIG.CALENDAR_ID;
  }

  return '';
}

function normalizeErrorMessage_(err) {
  if (!err) return 'Unknown error';
  if (err.message) return String(err.message);
  return String(err);
}

function formatTaipeiDateTime_(date) {
  return Utilities.formatDate(date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}
