/**
 * Clockify Telegram Bot — Entry point with deduplication
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "ok",
      service: "Clockify Telegram Bot",
      version: "1.6",
      timestamp: new Date().toISOString()
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Deduplication: skip if update_id was already processed
    // Telegram retries when GAS cold start is slow
    if (body.update_id) {
      var cache = CacheService.getScriptCache();
      var key = "upd_" + body.update_id;
      if (cache.get(key)) {
        // Already processed this update, skip
        return ContentService.createTextOutput("ok");
      }
      // Mark as processed (expires in 5 minutes)
      cache.put(key, "1", 300);
    }

    processMessage(body);
  } catch (err) {
    Logger.log("Webhook error: " + err);
  }
  return ContentService.createTextOutput("ok");
}
