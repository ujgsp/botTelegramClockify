/**
 * Telegram Bot API — send messages + webhook processing
 */
var Telegram = {
  API_URL: "https://api.telegram.org/bot",

  send: function(chatId, text) {
    var token = getConfig().TELEGRAM_BOT_TOKEN;
    var url = this.API_URL + token + "/sendMessage";
    try {
      UrlFetchApp.fetch(url, {
        method: "post",
        payload: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML"
        }),
        contentType: "application/json"
      });
    } catch (e) {
      Logger.log("Gagal kirim: " + e.message);
      Logger.log("Chat: " + chatId + " Text: " + text.substring(0, 100));
    }
  },

  sendLoading: function(chatId) {
    var token = getConfig().TELEGRAM_BOT_TOKEN;
    var url = this.API_URL + token + "/sendMessage";
    try {
      var res = UrlFetchApp.fetch(url, {
        method: "post",
        payload: JSON.stringify({
          chat_id: chatId,
          text: "⏳ Mohon ditunggu...",
          parse_mode: "HTML"
        }),
        contentType: "application/json"
      });
      var json = JSON.parse(res.getContentText());
      return json.result ? json.result.message_id : null;
    } catch (e) {
      Logger.log("sendLoading error: " + e.message);
      return null;
    }
  },

  editMessage: function(chatId, messageId, text) {
    if (!messageId) return;
    var token = getConfig().TELEGRAM_BOT_TOKEN;
    var url = this.API_URL + token + "/editMessageText";
    try {
      UrlFetchApp.fetch(url, {
        method: "post",
        payload: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: text,
          parse_mode: "HTML"
        }),
        contentType: "application/json"
      });
    } catch (e) {
      Logger.log("editMessage error: " + e.message);
    }
  }
};

// ============================================================
// WEBHOOK ROUTER
// ============================================================
function processMessage(body) {
  var msg = body.message;
  if (!msg || !msg.text) return;

  var chatId = msg.chat.id;
  var userId = String(msg.from.id);
  var text = msg.text.trim();

  // Final guard (fail-open when whitelist empty).
  var rawAllowed = (getConfig().TELEGRAM_ALLOWED_USER_IDS || "").trim();
  if (rawAllowed) {
    var allowed = rawAllowed.split(/[\s,]+/).map(function(v) { return String(v).trim(); }).filter(Boolean);
    if (allowed.indexOf(userId) === -1) {
      Logger.log("Blocked Telegram user in processMessage: " + userId + " chat=" + chatId + " text=" + text.substring(0, 80));
      Telegram.send(chatId, "Akses ditolak.");
      return;
    }
  }

  // Remember chat for reminder delivery.
  PropertiesService.getScriptProperties().setProperty("REMINDER_CHAT_ID", String(chatId));

  var spaceIdx = text.indexOf(" ");
  var command, arg;
  if (spaceIdx === -1) {
    command = text.toLowerCase();
    arg = "";
  } else {
    command = text.substring(0, spaceIdx).toLowerCase();
    arg = text.substring(spaceIdx + 1).trim();
  }

  switch (command) {
    case "/task":
      handleTask(chatId, userId, arg);
      break;
    case "/stop":
      handleStop(chatId, userId);
      break;
    case "/status":
      handleStatus(chatId, userId);
      break;
    case "/report":
    case "/today":
    case "/r":
      handleReport(chatId, userId, arg);
      break;
    case "/last":
      handleLast(chatId);
      break;
    case "/projects":
      handleProjects(chatId);
      break;
    case "/project":
      handleProject(chatId, arg);
      break;
    case "/reminder":
      handleReminder(chatId, arg);
      break;
    case "/workhours":
      handleWorkhours(chatId, arg);
      break;
    case "/target":
      handleTarget(chatId, arg);
      break;
    case "/piket":
      handleDateListCommand(chatId, "PIKET_DATES", "piket", arg);
      break;
    case "/libur":
      handleDateListCommand(chatId, "LIBUR_DATES", "libur", arg);
      break;
    case "/diag":
      handleDiag(chatId);
      break;
    case "/help":
    case "/start":
      handleHelp(chatId);
      break;
    case "/deploy":
      handleTask(chatId, userId, "Deploy");
      break;
    case "/meeting":
      handleTask(chatId, userId, "Meeting");
      break;
    case "/debug":
      handleTask(chatId, userId, "Debug");
      break;
    case "/review":
      handleTask(chatId, userId, "Code Review");
      break;
    default:
      if (command.charAt(0) === "/") {
        Telegram.send(chatId, formatHelp());
      }
      break;
  }
}
