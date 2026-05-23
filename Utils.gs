/**
 * Date helpers
 */
function formatTime(date) {
  return Utilities.formatDate(date, getConfig().TIMEZONE, "HH:mm");
}

function formatDate(date) {
  return Utilities.formatDate(date, getConfig().TIMEZONE, "yyyy-MM-dd");
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
