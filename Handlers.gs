/**
 * Command handlers
 */

function formatHelp() {
  return "📖 <b>Commands:</b>\n\n" +
    "/task &lt;nama&gt;  — Mulai task baru\n" +
    "/stop           — Stop task aktif\n" +
    "/status         — Lihat task aktif\n" +
    "/report [tgl] [tgl] — Ringkasan/filter tanggal\n" +
    "/last           — Task Clockify terakhir\n" +
    "/projects       — List project Clockify\n" +
    "/project &lt;nama/id&gt; — Set default project\n" +
    "/reminder on|off|status — Reminder kerja\n" +
    "/workhours 08:00 17:00 — Set jam kerja\n" +
    "/target 8      — Set target jam/hari\n" +
    "/piket yyyy-mm-dd — Tambah hari piket\n" +
    "/libur yyyy-mm-dd — Tambah hari libur\n" +
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
    var active = getCurrentClockifyTimer();
    if (active) {
      stopClockifyTimer(active.id, active.timeInterval.start, active.description, active.projectId);
    }

    var entry = startClockifyTimer(taskName.trim());

    var reply = "";
    if (active) {
      var prevDur = formatDuration(active.timeInterval.start, new Date().toISOString());
      reply += "⏹️ Selesai: <b>" + (active.description || "Task sebelumnya") + "</b> (" + prevDur + ")\n\n";
    }
    reply += "🟢 <b>Task aktif:</b>\n" + (entry.description || taskName.trim());
    Telegram.send(chatId, reply);
  } catch (e) {
    Logger.log("handleTask error: " + e.message + " " + e.stack);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleStop(chatId, userId) {
  try {
    var active = getCurrentClockifyTimer();
    if (!active) {
      Telegram.send(chatId, "💤 Tidak ada task aktif.\nKetik <code>/task &lt;nama&gt;</code> untuk mulai.");
      return;
    }

    var stopped = stopClockifyTimer(active.id, active.timeInterval.start, active.description, active.projectId);
    var endTime = stopped && stopped.timeInterval.end ? stopped.timeInterval.end : new Date().toISOString();
    var dur = formatDuration(active.timeInterval.start, endTime);
    Telegram.send(chatId, "⏹️ <b>Task selesai:</b>\n" + (active.description || "Task aktif") + "\n⏱️ Durasi: " + dur);
  } catch (e) {
    Logger.log("handleStop error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleStatus(chatId, userId) {
  var msgId = Telegram.sendLoading(chatId);
  try {
    var active = getCurrentClockifyTimer();
    if (!active) {
      Telegram.editMessage(chatId, msgId, "💤 Tidak ada task aktif.\nKetik <code>/task &lt;nama&gt;</code> untuk mulai.");
      return;
    }

    var dur = formatDuration(active.timeInterval.start, new Date().toISOString());
    Telegram.editMessage(chatId, msgId, "🔄 <b>Task aktif sekarang:</b>\n" + (active.description || "Task aktif") + "\n⏱️ Sudah berjalan: " + dur);
  } catch (e) {
    Logger.log("handleStatus error: " + e.message);
    Telegram.editMessage(chatId, msgId, "❌ Error: " + e.message);
  }
}

function parseReportRange_(arg) {
  var today = Utilities.formatDate(new Date(), getConfig().TIMEZONE, "yyyy-MM-dd");
  var text = String(arg || "").trim();
  if (!text) {
    return { start: today, end: today, label: "Hari Ini" };
  }

  var parts = text.split(/\s+/).filter(Boolean);
  var dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (parts.length === 1 && dateRe.test(parts[0])) {
    return { start: parts[0], end: parts[0], label: parts[0] };
  }
  if (parts.length >= 2 && dateRe.test(parts[0]) && dateRe.test(parts[1])) {
    var start = parts[0] <= parts[1] ? parts[0] : parts[1];
    var end = parts[0] <= parts[1] ? parts[1] : parts[0];
    return { start: start, end: end, label: start + " s/d " + end };
  }
  throw new Error("Format report: /report atau /report yyyy-mm-dd atau /report yyyy-mm-dd yyyy-mm-dd");
}

function handleReport(chatId, userId, arg) {
  var msgId = Telegram.sendLoading(chatId);
  try {
    var range = parseReportRange_(arg);
    var entries = getClockifyEntriesByDateRange(range.start, range.end);

    if (!entries || entries.length === 0) {
      Telegram.editMessage(chatId, msgId, "📭 Belum ada aktivitas untuk periode " + range.label + ".");
      return;
    }

    var msg = "📅 <b>Aktivitas " + range.label + "</b>\n\n";
    var totalMs = 0;
    var currentDate = "";
    var dayMs = 0;

    entries.sort(function (a, b) {
      return new Date(a.timeInterval.start).getTime() - new Date(b.timeInterval.start).getTime();
    });

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var startDate = new Date(entry.timeInterval.start);
      var endDate = entry.timeInterval.end ? new Date(entry.timeInterval.end) : new Date();
      var dateKey = Utilities.formatDate(startDate, getConfig().TIMEZONE, "yyyy-MM-dd");
      var dateLabel = Utilities.formatDate(startDate, getConfig().TIMEZONE, "EEE, dd MMM yyyy");

      if (currentDate && currentDate !== dateKey) {
        msg += "Subtotal: <b>" + formatDurationMs(dayMs) + "</b>\n\n";
        dayMs = 0;
      }

      if (currentDate !== dateKey) {
        currentDate = dateKey;
        msg += "📌 <b>" + dateLabel + "</b>\n";
      }

      var itemMs = endDate.getTime() - startDate.getTime();
      msg += "🕐 <b>" + formatTime(startDate) + " - " + (entry.timeInterval.end ? formatTime(endDate) : "sekarang") + "</b> (" + formatDurationMs(itemMs) + ")\n" + (entry.description || "-") + "\n\n";
      dayMs += itemMs;
      totalMs += itemMs;
    }

    if (currentDate) {
      msg += "Subtotal: <b>" + formatDurationMs(dayMs) + "</b>\n\n";
    }

    msg += "━━━━━━━━━━━━━━\n";
    msg += "⏱️ <b>Total periode: " + formatDurationMs(totalMs) + "</b>";
    Telegram.editMessage(chatId, msgId, msg);
  } catch (e) {
    Logger.log("handleReport error: " + e.message);
    Telegram.editMessage(chatId, msgId, "❌ Error: " + e.message);
  }
}

function handleLast(chatId) {
  var msgId = Telegram.sendLoading(chatId);
  try {
    var entries = getRecentClockifyEntries(1);
    if (!entries || entries.length === 0) {
      Telegram.editMessage(chatId, msgId, "📭 Belum ada entry Clockify.");
      return;
    }

    var entry = entries[0];
    var startDate = new Date(entry.timeInterval.start);
    var endDate = entry.timeInterval.end ? new Date(entry.timeInterval.end) : new Date();
    var status = entry.timeInterval.end ? "⏹️ Selesai" : "🟢 Aktif";
    var msg = status + "\n<b>" + (entry.description || "-") + "</b>\n" +
      "🕐 " + formatTime(startDate) + " - " + (entry.timeInterval.end ? formatTime(endDate) : "sekarang") + "\n" +
      "⏱️ " + formatDuration(entry.timeInterval.start, endDate.toISOString());
    Telegram.editMessage(chatId, msgId, msg);
  } catch (e) {
    Logger.log("handleLast error: " + e.message);
    Telegram.editMessage(chatId, msgId, "❌ Error: " + e.message);
  }
}

function handleDiag(chatId) {
  try {
    var config = getConfig();
    var active = getCurrentClockifyTimer();
    var allowed = (config.TELEGRAM_ALLOWED_USER_IDS || "").trim();
    var msg = "🧪 <b>Diagnostic</b>\n\n" +
      "Telegram token: " + (config.TELEGRAM_BOT_TOKEN ? "OK" : "MISSING") + "\n" +
      "Clockify key: " + (config.CLOCKIFY_API_KEY ? "OK" : "MISSING") + "\n" +
      "Workspace ID: " + (config.CLOCKIFY_WORKSPACE_ID ? "OK" : "MISSING") + "\n" +
      "User ID: " + (config.CLOCKIFY_USER_ID ? "OK" : "MISSING") + "\n" +
      "Default project: " + (config.CLOCKIFY_DEFAULT_PROJECT_ID ? "SET" : "none") + "\n" +
      "Whitelist active: " + (allowed ? "YES" : "NO") + "\n" +
      "Allowed Telegram user IDs: " + (allowed || "(empty)") + "\n" +
      "Reminder: " + (getReminderConfig().enabled ? "ON" : "OFF") + "\n" +
      "Active timer: " + (active ? (active.description || "-") : "none");
    Telegram.send(chatId, msg);
  } catch (e) {
    Logger.log("handleDiag error: " + e.message);
    Telegram.send(chatId, "❌ Diagnostic error: " + e.message);
  }
}

function handleProjects(chatId) {
  var msgId = Telegram.sendLoading(chatId);
  try {
    var config = getConfig();
    var projects = getClockifyProjects();
    if (!projects || projects.length === 0) {
      Telegram.editMessage(chatId, msgId, "📭 Tidak ada project aktif di Clockify.");
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
    Telegram.editMessage(chatId, msgId, msg);
  } catch (e) {
    Logger.log("handleProjects error: " + e.message);
    Telegram.editMessage(chatId, msgId, "❌ Error: " + e.message);
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

function handleReminder(chatId, arg) {
  try {
    var props = PropertiesService.getScriptProperties();
    var cfg = getReminderConfig();
    var cmd = String(arg || "status").trim().toLowerCase();
    props.setProperty("REMINDER_CHAT_ID", String(chatId));

    if (cmd === "on") {
      props.setProperty("REMINDER_ENABLED", "true");
      createReminderTrigger();
      cfg = getReminderConfig();
      Telegram.send(chatId, "✅ Reminder ON.\nJam kerja: " + cfg.workStart + " - " + cfg.workEnd + "\nTarget: " + cfg.targetHours + " jam/hari");
      return;
    }

    if (cmd === "off") {
      props.setProperty("REMINDER_ENABLED", "false");
      deleteReminderTriggers();
      Telegram.send(chatId, "✅ Reminder OFF.");
      return;
    }

    Telegram.send(chatId, "⏰ <b>Reminder status</b>\n" +
      "Status: " + (cfg.enabled ? "ON" : "OFF") + "\n" +
      "Jam kerja: " + cfg.workStart + " - " + cfg.workEnd + "\n" +
      "Target: " + cfg.targetHours + " jam/hari\n" +
      "Piket: " + (cfg.piketDates.length ? cfg.piketDates.join(", ") : "-") + "\n" +
      "Libur: " + (cfg.liburDates.length ? cfg.liburDates.join(", ") : "-"));
  } catch (e) {
    Logger.log("handleReminder error: " + e.message);
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleWorkhours(chatId, arg) {
  try {
    var parts = String(arg || "").trim().split(/\s+/);
    if (parts.length !== 2 || !/^\d{2}:\d{2}$/.test(parts[0]) || !/^\d{2}:\d{2}$/.test(parts[1])) {
      Telegram.send(chatId, "Format: <code>/workhours 08:00 17:00</code>");
      return;
    }
    var props = PropertiesService.getScriptProperties();
    props.setProperty("WORK_START", parts[0]);
    props.setProperty("WORK_END", parts[1]);
    Telegram.send(chatId, "✅ Jam kerja diset: " + parts[0] + " - " + parts[1]);
  } catch (e) {
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleTarget(chatId, arg) {
  try {
    var hours = parseFloat(String(arg || "").trim());
    if (!hours || hours <= 0 || hours > 24) {
      Telegram.send(chatId, "Format: <code>/target 8</code>");
      return;
    }
    PropertiesService.getScriptProperties().setProperty("WORK_TARGET_HOURS", String(hours));
    Telegram.send(chatId, "✅ Target kerja diset: " + hours + " jam/hari");
  } catch (e) {
    Telegram.send(chatId, "❌ Error: " + e.message);
  }
}

function handleDateListCommand(chatId, key, label, arg) {
  try {
    var value = String(arg || "").trim();
    var cfg = getReminderConfig();
    var current = key === "PIKET_DATES" ? cfg.piketDates : cfg.liburDates;

    if (!value) {
      Telegram.send(chatId, "📅 Daftar " + label + ":\n" + (current.length ? current.join("\n") : "-"));
      return;
    }

    if (value.toLowerCase().indexOf("clear ") === 0) {
      var dateToRemove = value.substring(6).trim();
      var removed = removeDateConfig_(key, dateToRemove);
      Telegram.send(chatId, "✅ Tanggal " + label + " dihapus: " + dateToRemove + "\nTotal: " + removed.length);
      return;
    }

    var added = addDateConfig_(key, value);
    Telegram.send(chatId, "✅ Tanggal " + label + " ditambahkan: " + value + "\nTotal: " + added.length);
  } catch (e) {
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
