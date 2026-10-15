/**
 * ==============================================================================
 * ARTHANA WEDDING & EVENTS - GOOGLE APPS SCRIPT DATABASE SYNC
 * ==============================================================================
 * Petunjuk Pemasangan:
 * 1. Buat Google Sheet baru di Google Drive (misal: "Database Arthana Wedding")
 * 2. Klik menu: Extensions (Ekstensi) > Apps Script
 * 3. Hapus semua kode default di editor, lalu PASTE SELURUH KODE DI BAWAH INI.
 * 4. Klik icon Save (Simpan).
 * 5. Klik tombol biru di kanan atas: "Deploy" (Terapkan) > "New deployment" (Penerapan baru)
 * 6. Pilih type "Web app" (Aplikasi web) dengan pengaturan:
 *    - Description: "Arthana Wedding Database v1"
 *    - Execute as: "Me" (Saya / akun email Anda)
 *    - Who has access: "Anyone" (Siapa saja)  <-- PENTING agar Vercel bisa sync!
 * 7. Klik "Deploy" dan berikan izin akses (Authorize access).
 * 8. Salin "Web App URL" yang diberikan (berakhiran /exec).
 * 9. Masukkan URL tersebut ke .env.local dan Vercel Environment Variables:
 *    GOOGLE_SHEETS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
 * ==============================================================================
 */

// Ganti SECRET_KEY ini jika Anda ingin mengamankan request (harus sama dengan di Vercel .env)
const SECRET_KEY = ""; 

function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    if (SECRET_KEY && params.secret !== SECRET_KEY) {
      return responseJson({ error: "Unauthorized: Invalid secret key" }, 401);
    }

    const state = loadStateFromSheets();
    return responseJson({
      success: true,
      action: "getState",
      state: state
    });
  } catch (err) {
    return responseJson({ error: err.toString() }, 500);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJson({ error: "Missing post data payload" }, 400);
    }

    const bodyStr = e.postData.contents;
    const body = JSON.parse(bodyStr);

    if (SECRET_KEY && body.secret !== SECRET_KEY) {
      return responseJson({ error: "Unauthorized: Invalid secret key" }, 401);
    }

    if (!body.state) {
      return responseJson({ error: "Missing state payload" }, 400);
    }

    saveStateToSheets(body.state);

    // Otomatis sinkronkan jadwal acara ke Google Calendar + Atur Alarm & Reminder
    let calSynced = false;
    if (body.state.events && Array.isArray(body.state.events)) {
      try {
        calSynced = syncEventsToGoogleCalendar(body.state.events);
      } catch (calErr) {
        Logger.log("Google Calendar Sync Error: " + calErr.toString());
      }
    }

    return responseJson({
      success: true,
      message: "Data berhasil disimpan ke Google Sheets & Google Calendar",
      calendarSynced: Boolean(calSynced),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return responseJson({ error: err.toString() }, 500);
  }
}

function responseJson(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------------------
// DATABASE STORAGE ENGINE
// ------------------------------------------------------------------------------

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#18202f");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function saveStateToSheets(state) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Simpan Full Raw JSON di sheet _RawState (dengan chunking agar tidak terkena limit 50.000 karakter per cell)
  const rawSheet = getOrCreateSheet(ss, "_RawState", ["Key", "Value", "UpdatedAt"]);
  const lastRowRaw = rawSheet.getLastRow();
  if (lastRowRaw > 1) {
    rawSheet.getRange(2, 1, lastRowRaw - 1, 3).clearContent();
  }

  const jsonStr = JSON.stringify(state);
  const CHUNK_SIZE = 45000; // Aman di bawah batas 50.000 karakter per cell Google Sheets
  const chunks = [];
  for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
    chunks.push(jsonStr.substring(i, i + CHUNK_SIZE));
  }

  const nowIso = new Date().toISOString();
  const rawRows = chunks.map(function(chunk, idx) {
    return [idx === 0 ? "wedding_state" : "wedding_state_chunk_" + idx, chunk, nowIso];
  });
  rawSheet.getRange(2, 1, rawRows.length, 3).setValues(rawRows);

  // 2. Format Sheet "Events" agar mudah dibaca manusia
  const eventHeaders = [
    "ID", "Client / Pengantin", "Nama Event", "Tanggal", "Jam Mulai", "Jam Selesai",
    "Layanan", "PIC", "WhatsApp", "Lokasi", "Status", "Actual Start", "Actual End", "Catatan", "Tim"
  ];
  const evSheet = getOrCreateSheet(ss, "Events", eventHeaders);
  const lastRowEv = evSheet.getLastRow();
  if (lastRowEv > 1) {
    evSheet.getRange(2, 1, lastRowEv - 1, eventHeaders.length).clearContent();
  }

  if (state.events && state.events.length > 0) {
    const evRows = state.events.map(function(ev) {
      return [
        ev.id,
        ev.client || "",
        ev.name || "",
        ev.date || "",
        ev.start || "",
        ev.end || "",
        ev.service || "",
        ev.pic || "",
        ev.phone ? "'" + ev.phone : "",
        ev.location || "",
        ev.status || "",
        ev.actualStart || "",
        ev.actualEnd || "",
        ev.notes || "",
        Array.isArray(ev.team) ? ev.team.map(function(n) {
          var r = (ev.teamRoles && ev.teamRoles[n]) ? ev.teamRoles[n] : "";
          return r ? n + " (" + r + ")" : n;
        }).join(", ") : (typeof ev.team === "string" ? ev.team : "")
      ];
    });
    evSheet.getRange(2, 1, evRows.length, eventHeaders.length).setValues(evRows);
  }

  // 3. Format Sheet "Clients"
  const clientHeaders = ["Nama Client", "WhatsApp"];
  const clSheet = getOrCreateSheet(ss, "Clients", clientHeaders);
  const lastRowCl = clSheet.getLastRow();
  if (lastRowCl > 1) {
    clSheet.getRange(2, 1, lastRowCl - 1, clientHeaders.length).clearContent();
  }
  if (state.clients && state.clients.length > 0) {
    const clRows = state.clients.map(function(c) {
      return [c.name || "", c.phone ? "'" + c.phone : ""];
    });
    clSheet.getRange(2, 1, clRows.length, clientHeaders.length).setValues(clRows);
  }

  // 4. Format Sheet "Team"
  const teamHeaders = ["ID", "Nama Anggota", "Role", "WhatsApp"];
  const tmSheet = getOrCreateSheet(ss, "Team", teamHeaders);
  const lastRowTm = tmSheet.getLastRow();
  if (lastRowTm > 1) {
    tmSheet.getRange(2, 1, lastRowTm - 1, teamHeaders.length).clearContent();
  }
  if (state.team && state.team.length > 0) {
    const tmRows = state.team.map(function(t) {
      return [t.id, t.name || "", t.role || "", t.phone ? "'" + t.phone : ""];
    });
    tmSheet.getRange(2, 1, tmRows.length, teamHeaders.length).setValues(tmRows);
  }

  // 5. Format Sheet "Tasks"
  const taskHeaders = ["ID", "Task", "Status", "Event ID"];
  const tkSheet = getOrCreateSheet(ss, "Tasks", taskHeaders);
  const lastRowTk = tkSheet.getLastRow();
  if (lastRowTk > 1) {
    tkSheet.getRange(2, 1, lastRowTk - 1, taskHeaders.length).clearContent();
  }
  if (state.tasks && state.tasks.length > 0) {
    const tkRows = state.tasks.map(function(k) {
      return [k.id, k.text || "", k.done ? "DONE" : "PENDING", k.eventId || ""];
    });
    tkSheet.getRange(2, 1, tkRows.length, taskHeaders.length).setValues(tkRows);
  }

  // 6. Format Sheet "Activity"
  const actHeaders = ["Waktu", "Aktivitas"];
  const actSheet = getOrCreateSheet(ss, "Activity", actHeaders);
  const lastRowAct = actSheet.getLastRow();
  if (lastRowAct > 1) {
    actSheet.getRange(2, 1, lastRowAct - 1, actHeaders.length).clearContent();
  }
  if (state.activity && state.activity.length > 0) {
    const actRows = state.activity.map(function(a) {
      return [a.time || "", a.text || ""];
    });
    actSheet.getRange(2, 1, actRows.length, actHeaders.length).setValues(actRows);
  }
}

function loadStateFromSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName("_RawState");
  if (!rawSheet || rawSheet.getLastRow() < 2) {
    return null;
  }

  const lastRow = rawSheet.getLastRow();
  const data = rawSheet.getRange(2, 1, lastRow - 1, 3).getValues();
  let fullJson = "";

  for (let i = 0; i < data.length; i++) {
    const key = String(data[i][0] || "");
    const val = String(data[i][1] || "");
    if (key.indexOf("wedding_state") === 0) {
      fullJson += val;
    }
  }

  if (fullJson) {
    try {
      return JSON.parse(fullJson);
    } catch (e) {
      Logger.log("Error parsing JSON state: " + e.toString());
    }
  }
  return null;
}

// ------------------------------------------------------------------------------
// GOOGLE CALENDAR AUTOMATIC SYNC & ALARM ENGINE
// ------------------------------------------------------------------------------

function getOrCreateArthanaCalendar() {
  const calName = "ARTHANA Wedding & Events";
  const cals = CalendarApp.getCalendarsByName(calName);
  if (cals && cals.length > 0) {
    return cals[0];
  }
  try {
    const newCal = CalendarApp.createCalendar(calName, {
      summary: "Kalender Resmi Jadwal & Operasional ARTHANA Wedding & Events",
      timeZone: "Asia/Jakarta"
    });
    return newCal;
  } catch (e) {
    return CalendarApp.getDefaultCalendar();
  }
}

function syncEventsToGoogleCalendar(events) {
  if (!events || !events.length) return false;
  const cal = getOrCreateArthanaCalendar();
  if (!cal) return false;

  // Rentang pencarian: 1 bulan ke belakang s/d 2 tahun ke depan
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const rangeEnd = new Date(now.getFullYear() + 2, 11, 31);
  const existingCalEvents = cal.getEvents(rangeStart, rangeEnd);

  // Buat mapping event yang sudah ada berdasarkan tag ID
  const eventMap = {};
  for (let i = 0; i < existingCalEvents.length; i++) {
    const ce = existingCalEvents[i];
    const tag = ce.getTag("arthana_id");
    if (tag) {
      eventMap[tag] = ce;
    }
  }

  // Buat set ID event yang aktif saat ini untuk deteksi event yang dihapus
  const activeEventIds = {};

  events.forEach(function(ev) {
    if (!ev || !ev.date) return;
    const evIdStr = String(ev.id);
    activeEventIds[evIdStr] = true;

    // Parsing tanggal & jam
    const dateParts = String(ev.date).split("-");
    if (dateParts.length !== 3) return;
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const startStr = ev.start || "08:00";
    const startTimeParts = startStr.split(":");
    const startHour = parseInt(startTimeParts[0] || "8", 10);
    const startMin = parseInt(startTimeParts[1] || "0", 10);
    const startDate = new Date(year, month, day, startHour, startMin, 0);

    const endStr = ev.end || (startHour + 2) + ":" + (startTimeParts[1] || "00");
    const endTimeParts = endStr.split(":");
    let endHour = parseInt(endTimeParts[0] || String(startHour + 2), 10);
    const endMin = parseInt(endTimeParts[1] || "0", 10);
    let endDate = new Date(year, month, day, endHour, endMin, 0);

    if (endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 2 * 3600000); // default 2 jam jika jam selesai invalid
    }

    const nameLower = (ev.name || "").toLowerCase();
    const serviceLower = (ev.service || "").toLowerCase();
    const isMeeting = nameLower.indexOf("meeting") !== -1 ||
                      nameLower.indexOf("temu") !== -1 ||
                      nameLower.indexOf("briefing") !== -1 ||
                      nameLower.indexOf("konsultasi") !== -1 ||
                      nameLower.indexOf("survey") !== -1 ||
                      serviceLower.indexOf("meeting") !== -1;

    const eventPrefix = isMeeting ? "🤝 MEETING CLIENT: " : "💍 ";
    const title = eventPrefix + (ev.name ? ev.name : "Acara") + " — " + (ev.client ? ev.client : "Client");

    const teamStr = Array.isArray(ev.team) ? ev.team.map(function(n) {
      const r = (ev.teamRoles && ev.teamRoles[n]) ? ev.teamRoles[n] : "";
      return r ? n + " (" + r + ")" : n;
    }).join(", ") : (typeof ev.team === "string" ? ev.team : "-");

    const description = [
      (isMeeting ? "🤝 JADWAL KETEMU / MEETING CLIENT" : "💍 JADWAL ACARA WEDDING"),
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "👰 Client / Pengantin: " + (ev.client || "-"),
      "🎉 Nama Event: " + (ev.name || "-"),
      "📋 Layanan: " + (ev.service || "-"),
      "👑 Lead PIC: " + (ev.pic || "-"),
      "📞 WhatsApp: " + (ev.phone || "-"),
      "📍 Lokasi: " + (ev.location || "-"),
      "👥 Tim Bertugas: " + teamStr,
      "⚡ Status: " + (ev.status || "PLANNING"),
      "📝 Catatan: " + (ev.notes || "-"),
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      (isMeeting 
        ? "⏰ Alarm Meeting: H-1 Hari, H-3 Jam, H-1 Jam, H-30 Menit, H-10 Menit" 
        : "⏰ Alarm Wedding: H-30 Hari, H-15 Hari, H-1 Minggu, H-1 Hari, H-30 Menit"),
      "--- Disinkronkan otomatis oleh Dashboard ARTHANA Wedding ---"
    ].join("\n");

    const options = {
      description: description,
      location: ev.location || ""
    };

    let calEvent = eventMap[evIdStr];

    if (calEvent) {
      // Perbarui event kalender yang sudah ada
      calEvent.setTitle(title);
      calEvent.setTime(startDate, endDate);
      calEvent.setDescription(description);
      calEvent.setLocation(ev.location || "");
    } else {
      // Buat event kalender baru
      calEvent = cal.createEvent(title, startDate, endDate, options);
      calEvent.setTag("arthana_id", evIdStr);
    }

    // PASANG ALARM PENGINGAT (untuk event baru maupun event yang diupdate):
    applyEventReminders(calEvent, isMeeting);
  });

  // Hapus event kalender jika acara sudah dihapus dari dashboard
  for (let idKey in eventMap) {
    if (!activeEventIds[idKey]) {
      try {
        eventMap[idKey].deleteEvent();
      } catch (delErr) {}
    }
  }

  return true;
}

function applyEventReminders(calEvent, isMeeting) {
  try {
    calEvent.removeAllReminders();

    if (isMeeting) {
      // 5 ALARM KHUSUS KETEMU CLIENT:
      // 1. H-1 Hari (1.440 menit) - Pengingat besok ada jadwal meeting
      // 2. H-3 Jam (180 menit) - Siapkan materi, rundown & konfirmasi client
      // 3. H-1 Jam (60 menit) - Bersiap / dalam perjalanan ke venue meeting
      // 4. H-30 Menit (30 menit) - Menjelang meeting
      // 5. H-10 Menit (10 menit) - Standby di meja / tempat meeting
      const meetingAlarms = [1440, 180, 60, 30, 10];
      meetingAlarms.forEach(function(mins) {
        try { calEvent.addPopupReminder(mins); } catch (e) {}
      });
    } else {
      // 5 ALARM JADWAL ACARA / WEDDING (H-30, H-15, H-1 Minggu, H-1 Hari, H-30 Menit):
      // Catatan: Batas maksimal Google Calendar API adalah 40.320 menit (~4 minggu / 28 hari)
      const weddingAlarms = [40320, 21600, 10080, 1440, 30];
      weddingAlarms.forEach(function(mins) {
        try { calEvent.addPopupReminder(mins); } catch (e) {}
      });
    }
  } catch (err) {
    Logger.log("Error setting reminders: " + err.toString());
  }
}
