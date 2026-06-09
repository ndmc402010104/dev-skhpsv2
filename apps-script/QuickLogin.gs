/*
檔案位置：skhpsv2/apps-script/QuickLogin.gs
時間戳記：2026-06-10 23:55 UTC+8
用途：提供 quick-login 讀取人員主檔；Sheet 位置一律從 config.json / getConfig_() 取得。
*/

function getQuickLoginStaff_(payload) {
  var config = getConfig_();

  var spreadsheetId =
    config &&
    config.sheets &&
    config.sheets.mainSpreadsheetId;

  var staffSheetTitle =
    config &&
    config.sheets &&
    config.sheets.dataSheets &&
    config.sheets.dataSheets.staffMaster &&
    config.sheets.dataSheets.staffMaster.title;

  if (!spreadsheetId) {
    return {
      ok: false,
      error: 'CONFIG_MISSING_MAIN_SPREADSHEET_ID'
    };
  }

  if (!staffSheetTitle) {
    return {
      ok: false,
      error: 'CONFIG_MISSING_STAFF_MASTER_TITLE'
    };
  }

  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName(staffSheetTitle);

  if (!sheet) {
    return {
      ok: false,
      error: 'SHEET_NOT_FOUND',
      sheetTitle: staffSheetTitle
    };
  }

  var values = sheet.getDataRange().getValues();

  if (!values || values.length < 2) {
    return {
      ok: true,
      staffList: [],
      extraList: [],
      source: {
        sheetTitle: staffSheetTitle
      }
    };
  }

  var headers = values[0].map(function (v) {
    return String(v || '').trim();
  });

  function cell(row, names) {
    for (var i = 0; i < names.length; i += 1) {
      var index = headers.indexOf(names[i]);
      if (index >= 0) return row[index];
    }
    return '';
  }

  function isActive(value) {
    var text = String(value || '').trim();
    if (!text) return true;

    return (
      text === 'TRUE' ||
      text === 'true' ||
      text === '1' ||
      text === '是' ||
      text === 'Y' ||
      text === 'y'
    );
  }

  var staffList = [];
  var extraList = [];

  values.slice(1).forEach(function (row) {
    var active = cell(row, ['active', '啟用', '是否啟用']);
    if (!isActive(active)) return;

    var group = String(cell(row, ['group', '群組', '分類', '登入分類'])).trim();
    var role = String(cell(row, ['role', '職級', '身分'])).trim();
    var title = String(cell(row, ['title', '標題', '行政標題'])).trim();
    var name = String(cell(row, ['name', '姓名'])).trim();
    var emp = String(cell(row, ['emp', '員工編號', '員編', 'employeeId'])).trim();
    var password = String(cell(row, ['password', '密碼'])).trim();
    var sortOrderRaw = cell(row, ['sortOrder', '排序', '順序']);
    var sortOrder = Number(sortOrderRaw || 9999);

    if (!name && !emp) return;

    var person = {
      group: group,
      role: role,
      title: title,
      name: name,
      emp: emp,
      password: password,
      sortOrder: isNaN(sortOrder) ? 9999 : sortOrder
    };

    if (
      group === 'extra' ||
      group === '行政' ||
      group === 'admin' ||
      title
    ) {
      extraList.push(person);
    } else {
      staffList.push(person);
    }
  });

  function sortPeople(a, b) {
    return (a.sortOrder || 9999) - (b.sortOrder || 9999);
  }

  staffList.sort(sortPeople);
  extraList.sort(sortPeople);

  return {
    ok: true,
    staffList: staffList,
    extraList: extraList,
    source: {
      sheetTitle: staffSheetTitle
    }
  };
}
