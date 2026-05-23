/**
 * Google Sheets storage — task log
 */
function getTasksSheet() {
  var ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
  var sheet = ss.getSheetByName("tasks");
  if (!sheet) {
    sheet = ss.insertSheet("tasks");
    sheet.appendRow([
      "timestamp", "telegram_user", "task", "clockify_entry_id",
      "start_time", "end_time", "duration", "date"
    ]);
  }
  return sheet;
}

function logTaskStart(telegramUser, taskName, clockifyEntryId, startTime, dateStr) {
  var sheet = getTasksSheet();
  sheet.appendRow([
    new Date().toISOString(), telegramUser, taskName, clockifyEntryId,
    startTime.toISOString(), "", "", dateStr
  ]);
}

function logTaskStop(telegramUser, endTime, duration) {
  var sheet = getTasksSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === telegramUser && data[i][5] === "") {
      sheet.getRange(i + 1, 6).setValue(endTime.toISOString());
      sheet.getRange(i + 1, 7).setValue(duration);
      return;
    }
  }
}

function getTodayTasks(telegramUser) {
  var sheet = getTasksSheet();
  var data = sheet.getDataRange().getValues();
  var today = Utilities.formatDate(new Date(), getConfig().TIMEZONE, "yyyy-MM-dd");
  var tasks = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === telegramUser && data[i][7] === today) {
      tasks.push({
        row: i + 1, taskName: data[i][2], clockifyEntryId: data[i][3],
        startTime: data[i][4], endTime: data[i][5], duration: data[i][6]
      });
    }
  }
  return tasks;
}

function getActiveTask(telegramUser) {
  var tasks = getTodayTasks(telegramUser);
  for (var i = tasks.length - 1; i >= 0; i--) {
    if (!tasks[i].endTime) return tasks[i];
  }
  return null;
}
