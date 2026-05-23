/**
 * Command handlers
 */

function formatHelp() {
  return "📖 <b>Commands:</b>\n\n" +
    "/task &lt;nama&gt;  — Mulai task baru\n" +
    "/stop           — Stop task aktif\n" +
    "/status         — Lihat task aktif\n" +
    "/report         — Ringkasan hari ini\n\n" +
    "<b>Shortcut:</b>\n" +
    "/deploy, /meeting, /debug, /review";
}

function handleHelp(chatId) {
  Telegram.send(chatId, formatHelp());
}

function handleTask(chatId, userId, taskName) {
  if (!taskName || !taskName.trim()) {
    Telegram.send(chatId, "❌ Nama task tidak boleh kosong.\nContoh: <code>/task Deploy server</code>");
    return;
  }

  try {
    // Stop previous if active
    var active = getActiveTask(userId);
    if (active) {
      try {
        var clockifyEntry = getCurrentClockifyTimer();
        if (clockifyEntry) {
          stopClockifyTimer(clockifyEntry.id, clockifyEntry.timeInterval.start, clockifyEntry.description);
        }
      } catch (e) {
        Logger.log("Stop previous Clockify error: " + e.message);
      }
      var endTime = new Date();
      var dur = formatDuration(active.startTime, endTime.toISOString());
      logTaskStop(userId, endTime, dur);
    }

    // Start new
    var entry = startClockifyTimer(taskName.trim());
    var now = new Date();
    logTaskStart(userId, taskName.trim(), entry.id, now, formatDate(now));

    var reply = "";
    if (active) {
      var prevDur = formatDuration(active.startTime, active.endTime || new Date().toISOString());
      reply += "⏹️ Selesai: <b>" + active.taskName + "</b> (" + prevDur + ")\n\n";
    }
    reply += "🟢 <b>Task aktif:</b>\n" + taskName.trim();
    Telegram.send(chatId, reply);
  } catch (e) {
    Logger.log("handleTask error: " + e.message + " " + e.stack);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleStop(chatId, userId) {
  var active = getActiveTask(userId);
  if (!active) {
    Telegram.send(chatId, "💤 Tidak ada task aktif.\nKetik <code>/task &lt;nama&gt;</code> untuk mulai.");
    return;
  }

  try {
    var clockifyEntry = getCurrentClockifyTimer();
    if (clockifyEntry) {
      stopClockifyTimer(clockifyEntry.id, clockifyEntry.timeInterval.start, clockifyEntry.description);
    }
    var endTime = new Date();
    var dur = formatDuration(active.startTime, endTime.toISOString());
    logTaskStop(userId, endTime, dur);
    Telegram.send(chatId, "⏹️ <b>Task selesai:</b>\n" + active.taskName + "\n⏱️ Durasi: " + dur);
  } catch (e) {
    Logger.log("handleStop error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleStatus(chatId, userId) {
  var active = getActiveTask(userId);
  if (!active) {
    Telegram.send(chatId, "💤 Tidak ada task aktif.\nKetik <code>/task &lt;nama&gt;</code> untuk mulai.");
    return;
  }
  var dur = formatDuration(active.startTime, new Date().toISOString());
  Telegram.send(chatId, "🔄 <b>Task aktif sekarang:</b>\n" + active.taskName + "\n⏱️ Sudah berjalan: " + dur);
}

function handleReport(chatId, userId) {
  var tasks = getTodayTasks(userId);
  if (tasks.length === 0) {
    Telegram.send(chatId, "📭 Belum ada aktivitas hari ini.");
    return;
  }

  var msg = "📅 <b>Aktivitas Hari Ini</b>\n\n";
  var totalMs = 0;
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i];
    var startStr = formatTime(new Date(t.startTime));
    var endStr = t.endTime ? formatTime(new Date(t.endTime)) : "sekarang";
    msg += "🕐 <b>" + startStr + " - " + endStr + "</b>\n" + t.taskName + "\n\n";

    var end = new Date(t.endTime || new Date().toISOString());
    totalMs += end.getTime() - new Date(t.startTime).getTime();
  }

  msg += "━━━━━━━━━━━━━━\n";
  msg += "⏱️ <b>Total: " + formatDurationMs(totalMs) + "</b>";
  Telegram.send(chatId, msg);
}

// ============================================================
// WEBHOOK SETUP
// ============================================================
function setWebhook() {
  var token = getConfig().TELEGRAM_BOT_TOKEN;
  var url = ScriptApp.getService().getUrl();
  var resp = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + token + "/setWebhook?url=" + url
  );
  Logger.log(resp.getContentText());
}
