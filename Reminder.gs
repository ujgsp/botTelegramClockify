/**
 * Reminder engine — work schedule, holidays, on-call dates, time-driven trigger.
 */

function getReminderConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    enabled: props.getProperty("REMINDER_ENABLED") === "true",
    chatId: props.getProperty("REMINDER_CHAT_ID") || "",
    workStart: props.getProperty("WORK_START") || "08:00",
    workEnd: props.getProperty("WORK_END") || "17:00",
    targetHours: parseFloat(props.getProperty("WORK_TARGET_HOURS") || "8"),
    piketDates: parseDateList_(props.getProperty("PIKET_DATES") || ""),
    liburDates: parseDateList_(props.getProperty("LIBUR_DATES") || "")
  };
}

function parseDateList_(value) {
  if (!value) return [];
  return value.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
}

function saveDateList_(key, dates) {
  PropertiesService.getScriptProperties().setProperty(key, dates.join(","));
}

function isValidDateString_(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr || "");
}

function minutesFromHHMM_(hhmm) {
  var parts = String(hhmm || "").split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function currentMinutesJakarta_() {
  var now = new Date();
  var hh = parseInt(Utilities.formatDate(now, getConfig().TIMEZONE, "HH"), 10);
  var mm = parseInt(Utilities.formatDate(now, getConfig().TIMEZONE, "mm"), 10);
  return hh * 60 + mm;
}

function todayJakarta_() {
  return Utilities.formatDate(new Date(), getConfig().TIMEZONE, "yyyy-MM-dd");
}

function isRegularWorkday_(date) {
  var dow = parseInt(Utilities.formatDate(date, getConfig().TIMEZONE, "u"), 10); // 1=Mon, 7=Sun
  return dow >= 1 && dow <= 5;
}

function isReminderWorkday_() {
  var cfg = getReminderConfig();
  var today = todayJakarta_();
  if (cfg.liburDates.indexOf(today) !== -1) return false;
  if (cfg.piketDates.indexOf(today) !== -1) return true;
  return isRegularWorkday_(new Date());
}

function addDateConfig_(key, dateStr) {
  if (!isValidDateString_(dateStr)) throw new Error("Format tanggal harus yyyy-mm-dd");
  var props = PropertiesService.getScriptProperties();
  var dates = parseDateList_(props.getProperty(key) || "");
  if (dates.indexOf(dateStr) === -1) dates.push(dateStr);
  dates.sort();
  saveDateList_(key, dates);
  return dates;
}

function removeDateConfig_(key, dateStr) {
  if (!isValidDateString_(dateStr)) throw new Error("Format tanggal harus yyyy-mm-dd");
  var props = PropertiesService.getScriptProperties();
  var dates = parseDateList_(props.getProperty(key) || "");
  dates = dates.filter(function (d) { return d !== dateStr; });
  saveDateList_(key, dates);
  return dates;
}

function getTodayTrackedMs_() {
  var entries = getTodayClockifyEntries();
  var total = 0;
  for (var i = 0; i < entries.length; i++) {
    var start = new Date(entries[i].timeInterval.start).getTime();
    var end = entries[i].timeInterval.end ? new Date(entries[i].timeInterval.end).getTime() : new Date().getTime();
    total += Math.max(0, end - start);
  }
  return total;
}

function shouldSendReminder_(key) {
  var cache = CacheService.getScriptCache();
  var fullKey = "rem_" + todayJakarta_() + "_" + key;
  if (cache.get(fullKey)) return false;
  cache.put(fullKey, "1", 60 * 60 * 3); // suppress same reminder for 3 hours
  return true;
}

function createReminderTrigger() {
  deleteReminderTriggers();
  ScriptApp.newTrigger("reminderTick").timeBased().everyMinutes(30).create();
}

function deleteReminderTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "reminderTick") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function reminderTick() {
  var cfg = getReminderConfig();
  if (!cfg.enabled || !cfg.chatId) return;
  if (!isReminderWorkday_()) return;

  var nowMin = currentMinutesJakarta_();
  var startMin = minutesFromHHMM_(cfg.workStart);
  var endMin = minutesFromHHMM_(cfg.workEnd);
  var active = getCurrentClockifyTimer();
  var totalMs = getTodayTrackedMs_();
  var totalText = formatDurationMs(totalMs);
  var targetMs = cfg.targetHours * 60 * 60 * 1000;

  if (nowMin >= startMin && nowMin <= startMin + 60 && !active && shouldSendReminder_("start")) {
    Telegram.send(cfg.chatId, "⏰ Reminder: belum ada timer aktif.\nMulai dengan <code>/task &lt;nama&gt;</code>.");
    return;
  }

  if (active) {
    var activeMs = new Date().getTime() - new Date(active.timeInterval.start).getTime();
    if (activeMs >= 3 * 60 * 60 * 1000 && shouldSendReminder_("longtask")) {
      Telegram.send(cfg.chatId, "⏳ Task sudah berjalan " + formatDurationMs(activeMs) + ":\n<b>" + (active.description || "-") + "</b>\nCek apakah perlu ganti task atau <code>/stop</code>.");
      return;
    }
  }

  if (nowMin >= endMin - 30 && nowMin <= endMin + 90 && active && shouldSendReminder_("stop")) {
    Telegram.send(cfg.chatId, "🏁 Reminder selesai kerja.\nTimer masih aktif: <b>" + (active.description || "-") + "</b>\nTotal hari ini: " + totalText + "\nGunakan <code>/stop</code> kalau sudah selesai.");
    return;
  }

  if (nowMin >= endMin && totalMs < targetMs && shouldSendReminder_("target")) {
    Telegram.send(cfg.chatId, "📊 Reminder target kerja.\nTotal hari ini: <b>" + totalText + "</b> dari target " + cfg.targetHours + " jam.");
  }
}
