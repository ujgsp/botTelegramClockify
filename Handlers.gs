/**
 * Command handlers
 */

function formatHelp() {
  return "📖 <b>Commands:</b>\n\n" +
    "/task &lt;nama&gt;  — Mulai task baru\n" +
    "/stop           — Stop task aktif\n" +
    "/status         — Lihat task aktif\n" +
    "/report atau /today — Ringkasan hari ini\n" +
    "/last           — Task Clockify terakhir\n" +
    "/projects       — List project Clockify\n" +
    "/project &lt;nama/id&gt; — Set default project\n" +
    "/diag           — Cek konfigurasi aman\n\n" +
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

function handleLast(chatId) {
  try {
    var entries = getRecentClockifyEntries(1);
    if (!entries || entries.length === 0) {
      Telegram.send(chatId, "📭 Belum ada entry Clockify.");
      return;
    }

    var e = entries[0];
    var start = new Date(e.timeInterval.start);
    var end = e.timeInterval.end ? new Date(e.timeInterval.end) : new Date();
    var status = e.timeInterval.end ? "⏹️ Selesai" : "🟢 Aktif";
    var msg = status + "\n<b>" + (e.description || "-") + "</b>\n" +
      "🕐 " + formatTime(start) + " - " + (e.timeInterval.end ? formatTime(end) : "sekarang") + "\n" +
      "⏱️ " + formatDuration(e.timeInterval.start, end.toISOString());
    Telegram.send(chatId, msg);
  } catch (e) {
    Logger.log("handleLast error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleDiag(chatId) {
  try {
    var config = getConfig();
    var active = getCurrentClockifyTimer();
    var sheetStatus = "OK";
    try {
      getTasksSheet();
    } catch (sheetErr) {
      sheetStatus = "ERROR";
    }

    var msg = "🧪 <b>Diagnostic</b>\n\n" +
      "Telegram token: " + (config.TELEGRAM_BOT_TOKEN ? "OK" : "MISSING") + "\n" +
      "Clockify key: " + (config.CLOCKIFY_API_KEY ? "OK" : "MISSING") + "\n" +
      "Workspace ID: " + (config.CLOCKIFY_WORKSPACE_ID ? "OK" : "MISSING") + "\n" +
      "User ID: " + (config.CLOCKIFY_USER_ID ? "OK" : "MISSING") + "\n" +
      "Spreadsheet: " + sheetStatus + "\n" +
      "Default project: " + (config.CLOCKIFY_DEFAULT_PROJECT_ID ? "SET" : "none") + "\n" +
      "Active timer: " + (active ? (active.description || "-") : "none");
    Telegram.send(chatId, msg);
  } catch (e) {
    Logger.log("handleDiag error: " + e.message);
    Telegram.send(chatId, "❌ Diagnostic error: " + e.message);
  }
}

function handleProjects(chatId) {
  try {
    var config = getConfig();
    var projects = getClockifyProjects();
    if (!projects || projects.length === 0) {
      Telegram.send(chatId, "📭 Tidak ada project aktif di Clockify.");
      return;
    }

    var msg = "📁 <b>Project Clockify</b>\n\n";
    var limit = Math.min(projects.length, 20);
    for (var i = 0; i < limit; i++) {
      var marker = projects[i].id === config.CLOCKIFY_DEFAULT_PROJECT_ID ? " ✅" : "";
      msg += (i + 1) + ". " + projects[i].name + marker + "\n";
      msg += "<code>" + projects[i].id + "</code>\n";
    }
    msg += "\nSet default: <code>/project nama-project</code>";
    Telegram.send(chatId, msg);
  } catch (e) {
    Logger.log("handleProjects error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleProject(chatId, query) {
  try {
    var props = PropertiesService.getScriptProperties();
    var config = getConfig();

    if (!query || !query.trim()) {
      if (!config.CLOCKIFY_DEFAULT_PROJECT_ID) {
        Telegram.send(chatId, "📁 Default project belum diset.\nGunakan <code>/projects</code>, <code>/project nama-project</code>, atau <code>/project new nama-project</code>.");
        return;
      }
      Telegram.send(chatId, "📁 Default project ID:\n<code>" + config.CLOCKIFY_DEFAULT_PROJECT_ID + "</code>");
      return;
    }

    if (query.trim().toLowerCase() === "clear") {
      props.deleteProperty("CLOCKIFY_DEFAULT_PROJECT_ID");
      Telegram.send(chatId, "✅ Default project dihapus. Task berikutnya tanpa project.");
      return;
    }

    if (query.trim().toLowerCase().indexOf("new ") === 0) {
      var newName = query.trim().substring(4).trim();
      if (!newName) {
        Telegram.send(chatId, "❌ Nama project kosong. Contoh: <code>/project new OpenSID</code>");
        return;
      }
      var created = createClockifyProject(newName);
      props.setProperty("CLOCKIFY_DEFAULT_PROJECT_ID", created.id);
      Telegram.send(chatId, "✅ Project dibuat dan jadi default:\n<b>" + created.name + "</b>\n<code>" + created.id + "</code>");
      return;
    }

    var project = findClockifyProject(query.trim());
    if (!project) {
      Telegram.send(chatId, "❌ Project tidak ditemukan: " + query + "\nCek <code>/projects</code> atau buat baru dengan <code>/project new " + query + "</code>.");
      return;
    }

    props.setProperty("CLOCKIFY_DEFAULT_PROJECT_ID", project.id);
    Telegram.send(chatId, "✅ Default project diset:\n<b>" + project.name + "</b>\n<code>" + project.id + "</code>");
  } catch (e) {
    Logger.log("handleProject error: " + e.message);
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
