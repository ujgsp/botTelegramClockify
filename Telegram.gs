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
    case "/r":
      handleReport(chatId, userId);
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
