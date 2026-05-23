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

function getTelegramUserIdFromUpdate_(body) {
  if (!body) return "";
  if (body.message && body.message.from && body.message.from.id) return String(body.message.from.id);
  if (body.edited_message && body.edited_message.from && body.edited_message.from.id) return String(body.edited_message.from.id);
  if (body.callback_query && body.callback_query.from && body.callback_query.from.id) return String(body.callback_query.from.id);
  return "";
}

function isAllowedTelegramUpdate_(body) {
  var userId = getTelegramUserIdFromUpdate_(body);
  if (!userId) return true;

  var raw = (getConfig().TELEGRAM_ALLOWED_USER_IDS || "").trim();
  if (!raw) return true;

  var allowed = raw.split(/[\s,]+/).map(function(v) { return String(v).trim(); }).filter(Boolean);
  return allowed.indexOf(userId) !== -1;
}

function handleTelegramUpdate_(body) {
  if (body.update_id && isDuplicateUpdate_(body.update_id)) return;
  if (!isAllowedTelegramUpdate_(body)) {
    Logger.log("Blocked Telegram update: user=" + getTelegramUserIdFromUpdate_(body) + " update_id=" + body.update_id);
    return;
  }
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
