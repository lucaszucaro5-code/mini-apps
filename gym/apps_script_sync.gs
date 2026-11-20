/**
 * Google Apps Script — Puente Híbrido en vivo para Forma by Luxx (Gym + Pesajes/Medidas)
 *
 * Cómo actualizarlo / instalarlo (1 sola vez, ~2 minutos):
 * 1. Entrá a https://script.google.com con tu cuenta de Google.
 * 2. Abrí tu proyecto de sync existente (o creá uno nuevo) y pegá todo este archivo.
 * 3. Arriba a la derecha: "Implementar" -> "Administrar implementaciones" -> editar / nueva versión
 *    (o "Nueva implementación" si es la primera vez).
 *    - Tipo: "Aplicación web"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario"
 * 4. Autorizá permisos de Drive/Sheets si te lo pide.
 * 5. Listo: mantiene compatibilidad total con Gym Tracker y habilita sync bidireccional con Home/Registros.
 */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'full';
  try {
    if (action === 'pesajes') {
      return jsonOut_(readPesajesFromSistemaMaestro_());
    }
    const data = readLatestSistemaMaestro_();
    if (action === 'check') {
      return jsonOut_({
        ok: true,
        version: data.version,
        fileName: data.fileName,
        fileId: data.fileId,
        hash: data.hash,
        lastUpdated: data.lastUpdated
      });
    }
    if (action === 'bootstrap') {
      const pesajesData = readPesajesFromSistemaMaestro_();
      data.pesajes = pesajesData.rows;
      return jsonOut_(data);
    }
    return jsonOut_(data);
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : '{}';
    let body = {};
    try {
      body = JSON.parse(raw);
    } catch (_) {
      body = (e && e.parameter) ? e.parameter : {};
    }

    const action = body.action || 'upsert_daily_log';
    if (action === 'upsert_daily_log') {
      const result = upsertPesajeRow_(body);
      return jsonOut_(result);
    }
    if (action === 'batch_upsert_daily_logs' && Array.isArray(body.logs)) {
      const results = [];
      for (let i = 0; i < body.logs.length; i++) {
        results.push(upsertPesajeRow_(body.logs[i]));
      }
      return jsonOut_({ ok: true, updated: results.length, results: results });
    }
    return jsonOut_({ ok: false, error: 'Acción POST desconocida: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function findLatestSistemaMaestroFile_() {
  const files = DriveApp.searchFiles(
    "title contains 'Sistema Maestro v' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
  );
  let best = null;
  let bestScore = -1;
  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    const m = name.match(/v(\d+)(?:\.(\d+))?/i);
    const major = m ? parseInt(m[1], 10) : 0;
    const minor = m && m[2] ? parseInt(m[2], 10) : 0;
    const versionScore = major * 10000 + minor * 100;
    const tsScore = f.getLastUpdated().getTime() / 1e13;
    const score = versionScore + tsScore;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  if (!best) {
    throw new Error("No se encontró ninguna planilla 'Sistema Maestro v...' en Drive.");
  }
  return best;
}

function readLatestSistemaMaestro_() {
  const file = findLatestSistemaMaestroFile_();
  const fileName = file.getName();
  const vm = fileName.match(/v\d+(?:\.\d+)?/i);
  const version = vm ? vm[0].toLowerCase() : 'v7.1';

  const ss = SpreadsheetApp.openById(file.getId());
  const sheet = ss.getSheetByName('Rutina Gym, Postura y Cardio');
  if (!sheet) {
    throw new Error("La planilla '" + fileName + "' no tiene la pestaña 'Rutina Gym, Postura y Cardio'.");
  }

  const values = sheet.getDataRange().getDisplayValues();
  let startRow = -1;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().indexOf('Día/Bloque') === 0) {
      startRow = i + 1;
      break;
    }
  }
  if (startRow < 0) {
    throw new Error('No se encontró la fila de cabecera Día/Bloque.');
  }

  const days = { torso_a: [], pierna_a: [], torso_b: [], pierna_b: [] };
  for (let r = startRow; r < values.length; r++) {
    const dayRaw = String(values[r][0] || '').trim().toUpperCase();
    const order = String(values[r][1] || '').trim();
    const exercise = String(values[r][2] || '').trim();
    const setsReps = String(values[r][3] || '').trim();
    const weightObj = String(values[r][4] || '').trim();
    const notes = String(values[r][5] || '').trim();

    if (!dayRaw || !exercise) continue;

    let dayKey = null;
    if (dayRaw.indexOf('TORSO A') >= 0) dayKey = 'torso_a';
    else if (dayRaw.indexOf('PIERNA A') >= 0) dayKey = 'pierna_a';
    else if (dayRaw.indexOf('TORSO B') >= 0) dayKey = 'torso_b';
    else if (dayRaw.indexOf('PIERNA B') >= 0) dayKey = 'pierna_b';

    if (!dayKey) continue;

    days[dayKey].push({
      order: order,
      name: exercise,
      setsReps: setsReps,
      weightObj: weightObj,
      cue: notes
    });
  }

  const payloadStr = JSON.stringify({ version: version, days: days });
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, payloadStr, Utilities.Charset.UTF_8);
  const hash = digest.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');

  return {
    ok: true,
    version: version,
    fileName: fileName,
    fileId: file.getId(),
    lastUpdated: file.getLastUpdated().toISOString(),
    hash: hash,
    days: days
  };
}

function normalizeIsoDate_(raw) {
  const s = String(raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = ('0' + m[1]).slice(-2);
    const mo = ('0' + m[2]).slice(-2);
    return m[3] + '-' + mo + '-' + d;
  }
  return '';
}

function parseLocaleNum_(raw) {
  const s = String(raw === null || raw === undefined ? '' : raw).trim().replace('%', '').replace(',', '.');
  if (!s || s === '-') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function findPesajesHeaderRow_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === 'Fecha' && String(values[i][3] || '').indexOf('Peso') >= 0) {
      return { headerRowIndex: i, values: values };
    }
  }
  throw new Error("No se encontró la tabla 'BITÁCORA HISTÓRICA DE REGISTROS DIARIOS' en 'Pesajes, Medidas y Proyección'.");
}

function readPesajesFromSistemaMaestro_() {
  const file = findLatestSistemaMaestroFile_();
  const ss = SpreadsheetApp.openById(file.getId());
  const sheet = ss.getSheetByName('Pesajes, Medidas y Proyección');
  if (!sheet) {
    throw new Error("La planilla '" + file.getName() + "' no tiene la pestaña 'Pesajes, Medidas y Proyección'.");
  }

  const info = findPesajesHeaderRow_(sheet);
  const rows = [];
  for (let r = info.headerRowIndex + 1; r < info.values.length; r++) {
    const row = info.values[r];
    const dateIso = normalizeIsoDate_(row[0]);
    if (!dateIso) continue;
    rows.push({
      date: dateIso,
      dayName: String(row[1] || '').trim(),
      weekLabel: String(row[2] || '').trim(),
      weightKg: parseLocaleNum_(row[3]),
      waistCm: parseLocaleNum_(row[4]),
      bodyFatPct: parseLocaleNum_(row[5]),
      deltaKg: parseLocaleNum_(row[6]),
      note: String(row[7] || '').trim()
    });
  }

  return {
    ok: true,
    fileName: file.getName(),
    rows: rows
  };
}

function upsertPesajeRow_(entry) {
  const dateIso = normalizeIsoDate_(entry && entry.date);
  if (!dateIso) {
    throw new Error('Fecha inválida para guardar en Pesajes.');
  }

  const file = findLatestSistemaMaestroFile_();
  const ss = SpreadsheetApp.openById(file.getId());
  const sheet = ss.getSheetByName('Pesajes, Medidas y Proyección');
  if (!sheet) {
    throw new Error("No se encontró la pestaña 'Pesajes, Medidas y Proyección'.");
  }

  const info = findPesajesHeaderRow_(sheet);
  let targetRowOneBased = -1;
  let existingRowVals = null;

  for (let r = info.headerRowIndex + 1; r < info.values.length; r++) {
    const rowIso = normalizeIsoDate_(info.values[r][0]);
    if (rowIso === dateIso) {
      targetRowOneBased = r + 1;
      existingRowVals = info.values[r];
      break;
    }
  }

  const parts = dateIso.split('-').map(Number);
  const dtObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayName = dayNames[dtObj.getDay()];

  const anchor = new Date(2026, 8, 21); // 2026-09-21 = Inicio Sem 1
  const diffDays = Math.floor((dtObj.getTime() - anchor.getTime()) / 86400000);
  const weekNum = diffDays <= 0 ? 0 : Math.floor(diffDays / 7) + 1;
  const weekLabel = weekNum === 0 ? 'Sem 0 (Base)' : 'Sem ' + weekNum;

  const weightNum = parseLocaleNum_(entry.weightKg !== undefined ? entry.weightKg : (existingRowVals ? existingRowVals[3] : null));
  const waistNum = parseLocaleNum_(entry.waistCm !== undefined ? entry.waistCm : (existingRowVals ? existingRowVals[4] : null));
  const fatNum = parseLocaleNum_(entry.bodyFatPct !== undefined ? entry.bodyFatPct : (existingRowVals ? existingRowVals[5] : null));
  const deltaNum = weightNum !== null ? Math.round((weightNum - 76.5) * 100) / 100 : null;

  let noteStr = entry.note !== undefined && String(entry.note).trim()
    ? String(entry.note).trim()
    : (existingRowVals ? String(existingRowVals[7] || '').trim() : '');

  const stepsNum = parseLocaleNum_(entry.totalSteps);
  if (stepsNum !== null && stepsNum > 0 && noteStr.indexOf('pasos') < 0) {
    const stepsTag = 'NEAT: ' + Math.round(stepsNum) + ' pasos';
    noteStr = noteStr ? (noteStr + ' | ' + stepsTag) : stepsTag;
  }

  const rowValues = [
    dateIso,
    dayName,
    weekLabel,
    weightNum !== null ? weightNum : '-',
    waistNum !== null ? waistNum : '-',
    fatNum !== null ? (fatNum / 100) : '-',
    deltaNum !== null ? deltaNum : '-',
    noteStr || 'Registro sincronizado desde Forma by Luxx'
  ];

  if (targetRowOneBased > 0) {
    sheet.getRange(targetRowOneBased, 1, 1, 8).setValues([rowValues]);
    if (fatNum !== null) {
      sheet.getRange(targetRowOneBased, 6).setNumberFormat('0.00%');
    }
    return { ok: true, mode: 'updated', date: dateIso, row: targetRowOneBased };
  }

  sheet.appendRow(rowValues);
  const lastRow = sheet.getLastRow();
  if (fatNum !== null) {
    sheet.getRange(lastRow, 6).setNumberFormat('0.00%');
  }
  return { ok: true, mode: 'inserted', date: dateIso, row: lastRow };
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
