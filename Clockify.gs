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
  if (config.CLOCKIFY_DEFAULT_PROJECT_ID) {
    body.projectId = config.CLOCKIFY_DEFAULT_PROJECT_ID;
  }
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

function getRecentClockifyEntries(limit) {
  var config = getConfig();
  var wid = config.CLOCKIFY_WORKSPACE_ID;
  var uid = config.CLOCKIFY_USER_ID;
  return clockifyRequest("GET", "/workspaces/" + wid + "/user/" + uid + "/time-entries?page-size=" + (limit || 20));
}

function getCurrentClockifyTimer() {
  var entries = getRecentClockifyEntries(1);
  if (entries.length > 0 && !entries[0].timeInterval.end) {
    return entries[0];
  }
  return null;
}

function getTodayClockifyEntries() {
  var today = Utilities.formatDate(new Date(), getConfig().TIMEZONE, "yyyy-MM-dd");
  var entries = getRecentClockifyEntries(50);
  var result = [];
  for (var i = 0; i < entries.length; i++) {
    var start = entries[i].timeInterval.start;
    if (start && Utilities.formatDate(new Date(start), getConfig().TIMEZONE, "yyyy-MM-dd") === today) {
      result.push(entries[i]);
    }
  }
  return result;
}

function getClockifyProjects() {
  var config = getConfig();
  return clockifyRequest("GET", "/workspaces/" + config.CLOCKIFY_WORKSPACE_ID + "/projects?page-size=50&archived=false");
}

function createClockifyProject(name) {
  var config = getConfig();
  return clockifyRequest("POST", "/workspaces/" + config.CLOCKIFY_WORKSPACE_ID + "/projects", {
    name: name,
    isPublic: true,
    billable: true
  });
}

function findClockifyProject(query) {
  var projects = getClockifyProjects();
  var q = String(query || "").toLowerCase().trim();
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === query || String(projects[i].name || "").toLowerCase() === q) {
      return projects[i];
    }
  }
  for (var j = 0; j < projects.length; j++) {
    if (String(projects[j].name || "").toLowerCase().indexOf(q) !== -1) {
      return projects[j];
    }
  }
  return null;
}
