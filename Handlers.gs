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
    var active = getActiveTask(userId);
    var clockifyEntry = getCurrentClockifyTimer();

    // Stop previous timer from Clockify even if Sheets is out-of-sync
    if (clockifyEntry) {
      stopClockifyTimer(clockifyEntry.id, clockifyEntry.timeInterval.start, clockifyEntry.description);
    }

    if (active) {
      var endTime = new Date();
      var dur = formatDuration(active.startTime, endTime.toISOString());
      logTaskStop(userId, endTime, dur);
    }

    var entry = startClockifyTimer(taskName.trim());
    var now = new Date();
    logTaskStart(userId, taskName.trim(), entry.id, now, formatDate(now));

    var reply = "";
    if (clockifyEntry) {
      var prevDur = formatDuration(clockifyEntry.timeInterval.start, new Date().toISOString());
      reply += "⏹️ Selesai: <b>" + (clockifyEntry.description || "Task sebelumnya") + "</b> (" + prevDur + ")\n\n";
    }
    reply += "🟢 <b>Task aktif:</b>\n" + taskName.trim();
    Telegram.send(chatId, reply);
  } catch (e) {
    Logger.log("handleTask error: " + e.message + " " + e.stack);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleStop(chatId, userId) {
  try {
    var active = getActiveTask(userId);
    var clockifyEntry = getCurrentClockifyTimer();

    if (!active && !clockifyEntry) {
      Telegram.send(chatId, "💤 Tidak ada task aktif.\nKetik <code>/task &lt;nama&gt;</code> untuk mulai.");
      return;
    }

    var endTime = new Date();
    var taskName = active ? active.taskName : (clockifyEntry.description || "Task aktif");
    var startTime = active ? active.startTime : clockifyEntry.timeInterval.start;

    if (clockifyEntry) {
      stopClockifyTimer(clockifyEntry.id, clockifyEntry.timeInterval.start, clockifyEntry.description);
    }

    var dur = formatDuration(startTime, endTime.toISOString());
    if (active) {
      logTaskStop(userId, endTime, dur);
    }

    Telegram.send(chatId, "⏹️ <b>Task selesai:</b>\n" + taskName + "\n⏱️ Durasi: " + dur);
  } catch (e) {
    Logger.log("handleStop error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleStatus(chatId, userId) {
  try {
    var active = getActiveTask(userId);
    var clockifyEntry = getCurrentClockifyTimer();

    if (!active && !clockifyEntry) {
      Telegram.send(chatId, "💤 Tidak ada task aktif.\nKetik <code>/task &lt;nama&gt;</code> untuk mulai.");
      return;
    }

    var taskName = active ? active.taskName : (clockifyEntry.description || "Task aktif");
    var startTime = active ? active.startTime : clockifyEntry.timeInterval.start;
    var dur = formatDuration(startTime, new Date().toISOString());
    Telegram.send(chatId, "🔄 <b>Task aktif sekarang:</b>\n" + taskName + "\n⏱️ Sudah berjalan: " + dur);
  } catch (e) {
    Logger.log("handleStatus error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleReport(chatId, userId) {
  try {
    var tasks = getTodayTasks(userId);
    var msg = "📅 <b>Aktivitas Hari Ini</b>\n\n";
    var totalMs = 0;

    if (tasks.length > 0) {
      for (var i = 0; i < tasks.length; i++) {
        var t = tasks[i];
        var startStr = formatTime(new Date(t.startTime));
        var endStr = t.endTime ? formatTime(new Date(t.endTime)) : "sekarang";
        msg += "🕐 <b>" + startStr + " - " + endStr + "</b>\n" + t.taskName + "\n\n";
        var end = new Date(t.endTime || new Date().toISOString());
        totalMs += end.getTime() - new Date(t.startTime).getTime();
      }
    } else {
      // Fallback to Clockify when Sheets is out-of-sync
      var entries = getTodayClockifyEntries();
      if (entries.length === 0) {
        Telegram.send(chatId, "📭 Belum ada aktivitas hari ini.");
        return;
      }
      for (var j = 0; j < entries.length; j++) {
        var e = entries[j];
        var s = new Date(e.timeInterval.start);
        var en = e.timeInterval.end ? new Date(e.timeInterval.end) : new Date();
        msg += "🕐 <b>" + formatTime(s) + " - " + (e.timeInterval.end ? formatTime(en) : "sekarang") + "</b>\n" + (e.description || "-") + "\n\n";
        totalMs += en.getTime() - s.getTime();
      }
    }

    msg += "━━━━━━━━━━━━━━\n";
    msg += "⏱️ <b>Total: " + formatDurationMs(totalMs) + "</b>";
    Telegram.send(chatId, msg);
  } catch (e) {
    Logger.log("handleReport error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function setWebhook() {
  var token = getConfig().TELEGRAM_BOT_TOKEN;
  var url = ScriptApp.getService().getUrl();
  var resp = UrlFetchApp.fetch(
    "https://api.telegram.org/bot" + token + "/setWebhook?url=" + url
  );
  Logger.log(resp.getContentText());
}
