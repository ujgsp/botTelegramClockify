/**
 * Date helpers
 */
function formatTime(date) {
  return Utilities.formatDate(date, getConfig().TIMEZONE, "HH:mm");
}

function formatDate(date) {
  return Utilities.formatDate(date, getConfig().TIMEZONE, "yyyy-MM-dd");
}

function escapeHtml_(value) {
  return String(value || "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDuration(startIso, endIso) {
  var diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  var mins = Math.round(diffMs / 60000);
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  if (h > 0 && m > 0) return h + "j " + m + "m";
  if (h > 0) return h + "j";
  return m + "m";
}

function formatDurationMs(ms) {
  var mins = Math.round(ms / 60000);
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  if (h > 0 && m > 0) return h + "j " + m + "m";
  if (h > 0) return h + "j";
  return m + "m";
}

function calculateOvertimeByDate_(entries, targetHours) {
  var targetMs = targetHours * 60 * 60 * 1000;
  var byDate = {};
  entries.forEach(function(entry) {
    var start = new Date(entry.timeInterval.start);
    var end = entry.timeInterval.end ? new Date(entry.timeInterval.end) : new Date();
    var dateKey = formatDate(start);
    if (!byDate[dateKey]) byDate[dateKey] = { totalMs: 0, overtimeMs: 0, ranges: [] };
    var day = byDate[dateKey];
    var duration = Math.max(0, end.getTime() - start.getTime());
    var regularMs = Math.max(0, Math.min(duration, targetMs - day.totalMs));
    var overtimeMs = duration - regularMs;
    if (overtimeMs > 0) {
      var overtimeStart = new Date(start.getTime() + regularMs);
      day.ranges.push({ start: overtimeStart, end: end, ms: overtimeMs });
      day.overtimeMs += overtimeMs;
    }
    day.totalMs += duration;
  });
  return byDate;
}
