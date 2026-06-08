function getSheetStatus_() {
  var spreadsheetId = '';

  if (typeof getSpreadsheetId_ === 'function') {
    spreadsheetId = getSpreadsheetId_();
  }

  if (!spreadsheetId) {
    var props = PropertiesService.getScriptProperties();
    spreadsheetId =
      props.getProperty('SPREADSHEET_ID') ||
      props.getProperty('SHEET_ID') ||
      '';
  }

  if (!spreadsheetId) {
    return {
      ok: false,
      configured: false,
      message: 'SPREADSHEET_ID is not configured.'
    };
  }

  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);

    return {
      ok: true,
      configured: true,
      spreadsheetId: spreadsheetId,
      spreadsheetName: ss.getName(),
      sheetCount: ss.getSheets().length,
      url: ss.getUrl()
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      spreadsheetId: spreadsheetId,
      error: error && error.message ? error.message : String(error)
    };
  }
}