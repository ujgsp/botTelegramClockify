/**
 * Clockify Telegram Bot — Entry point with deduplication
 */
function isDuplicateUpdate_(updateId) {
  if (!updateId) return false;
  var cache = CacheService.getScriptCache();
  var key = "upd_" + updateId;
  if (cache.get(key)) return true;
  cache.put(key, "1", 300);
  return false;
}

function handleTelegramUpdate_(body) {
  if (body.update_id && isDuplicateUpdate_(body.update_id)) return;
  processMessage(body);
}

function doGet(e) {
  try {
    // Cloudflare Worker bridge: /exec?update=<encoded Telegram update JSON>
    if (e && e.parameter && e.parameter.update) {
      var body = JSON.parse(e.parameter.update);
      handleTelegramUpdate_(body);
      return ContentService.createTextOutput("ok");
    }
  } catch (err) {
    Logger.log("doGet bridge error: " + err);
    return ContentService.createTextOutput("ok");
  }

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "ok",
      service: "Clockify Telegram Bot",
      version: "1.7",
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    handleTelegramUpdate_(body);
  } catch (err) {
    Logger.log("Webhook error: " + err);
  }
  return ContentService.createTextOutput("ok");
}
