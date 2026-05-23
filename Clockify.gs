/**
 * Clockify REST API client
 */
var CLOCKIFY_BASE = "https://api.clockify.me/api/v1";

function clockifyRequest(method, path, body) {
  var config = getConfig();
  var options = {
    method: method,
    headers: {
      "X-Api-Key": config.CLOCKIFY_API_KEY,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };
  if (body) options.payload = JSON.stringify(body);

  var response = UrlFetchApp.fetch(CLOCKIFY_BASE + path, options);
  var code = response.getResponseCode();
  var text = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Clockify API error " + code + ": " + text);
  }
  return JSON.parse(text);
}

function startClockifyTimer(taskName) {
  var config = getConfig();
  var body = { description: taskName, start: new Date().toISOString(), billable: true };
  return clockifyRequest("POST", "/workspaces/" + config.CLOCKIFY_WORKSPACE_ID + "/time-entries", body);
}

function stopClockifyTimer(entryId, entryStart, entryDesc) {
  var config = getConfig();
  var wid = config.CLOCKIFY_WORKSPACE_ID;
  var now = new Date().toISOString();
  var url = "/workspaces/" + wid + "/time-entries/" + entryId;
  var body = { start: entryStart, end: now, description: entryDesc || "" };
  return clockifyRequest("PUT", url, body);
}

function getCurrentClockifyTimer() {
  var config = getConfig();
  var wid = config.CLOCKIFY_WORKSPACE_ID;
  var uid = config.CLOCKIFY_USER_ID;
  var entries = clockifyRequest("GET", "/workspaces/" + wid + "/user/" + uid + "/time-entries?page-size=1");
  if (entries.length > 0 && !entries[0].timeInterval.end) {
    return entries[0];
  }
  return null;
}
