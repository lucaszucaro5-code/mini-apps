/**
 * Google Apps Script — Puente Híbrido Multi-Dispositivo para Forma by Luxx
 * (PC <-> iPhone sync vía Google Drive + Sheets, con Clave Privada)
 *
 * Cómo actualizarlo / instalarlo (1 sola vez, ~2 minutos):
 * 1. Entrá a https://script.google.com con tu cuenta de Google y abrí tu proyecto de sync.
 * 2. Reemplazá todo el código con este archivo.
 * 3. Cambiá SYNC_SECRET abajo por una clave privada tuya (ej: 'luxx-2026-clave').
 * 4. Arriba a la derecha: "Implementar" -> "Administrar implementaciones" ->
 *    Editar (lápiz) -> Versión: "Nueva versión" -> "Implementar".
 *    (Si es la primera vez: "Implementar" -> "Nueva implementación" -> Aplicación web ->
 *     Ejecutar como: "Yo" -> Acceso: "Cualquier usuario").
 * 5. En tu PC y en tu iPhone, abrí Forma by Luxx -> píldora superior derecha ->
 *    pegá esa misma Clave Privada -> "Sincronizar ahora".
 */

const SYNC_SECRET = 'CAMBIAR_POR_TU_CLAVE';
const CLOUD_STATE_FILENAME = 'forma_luxx_cloud_state.json';

function getConfiguredSecret_() {
  try {
    const prop = PropertiesService.getScriptProperties().getProperty('FORMA_SYNC_KEY');
    if (prop && String(prop).trim()) return String(prop).trim();
  } catch (_) {}
  return String(SYNC_SECRET || '').trim();
}

function verifySyncToken_(token) {
  const configured = getConfiguredSecret_();
  if (!configured || configured === 'CAMBIAR_POR_TU_CLAVE') {
    return { ok: false, error: 'AUTH_NOT_CONFIGURED' };
  }
  if (!token || String(token).trim() !== configured) {
    return { ok: false, error: 'AUTH_INVALID' };
  }
  return { ok: true };
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'full';
  const token = e && e.parameter ? e.parameter.token : '';
  try {
    if (action === 'pesajes') {
      const auth = verifySyncToken_(token);
      if (!auth.ok) return jsonOut_(auth);
      return jsonOut_(readPesajesFromSistemaMaestro_());
    }
    if (action === 'cloud_pull') {
      const auth = verifySyncToken_(token);
      if (!auth.ok) return jsonOut_(auth);
      return jsonOut_(handleCloudPull_());
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
      const auth = verifySyncToken_(token);
      if (!auth.ok) return jsonOut_(auth);
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

    const auth = verifySyncToken_(body.token || (e && e.parameter && e.parameter.token));
    if (!auth.ok) {
      return jsonOut_(auth);
    }

    const action = body.action || 'upsert_daily_log';
    if (action === 'cloud_sync') {
      return jsonOut_(handleCloudSync_(body));
    }
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

// ==================== CLOUD STATE FILE & MERGE ENGINE ====================

function getOrCreateCloudStateFile_() {
  const iter = DriveApp.searchFiles(
    "title = '" + CLOUD_STATE_FILENAME + "' and trashed = false"
  );
  if (iter.hasNext()) {
    return iter.next();
  }

  let parentFolder = null;
  try {
    const smFile = findLatestSistemaMaestroFile_();
    const parents = smFile.getParents();
    if (parents.hasNext()) parentFolder = parents.next();
  } catch (_) {}

  const initialJson = JSON.stringify({
    version: 1,
    updatedAt: '',
    logs: {},
    deletedLogDates: {},
    neatDraft: null,
    neatSliders: null,
    mealExtras: {},
    factors: null,
    customEquivalences: null,
    gymHistory: null,
    gymState: null
  });

  if (parentFolder) {
    return parentFolder.createFile(CLOUD_STATE_FILENAME, initialJson, MimeType.PLAIN_TEXT);
  }
  return DriveApp.createFile(CLOUD_STATE_FILENAME, initialJson, MimeType.PLAIN_TEXT);
}

function readCloudState_() {
  const file = getOrCreateCloudStateFile_();
  const txt = file.getBlob().getDataAsString('UTF-8');
  let parsed = {};
  try {
    parsed = JSON.parse(txt || '{}');
  } catch (_) {
    parsed = {};
  }
  return {
    file: file,
    state: normalizeCloudStateShape_(parsed)
  };
}

function writeCloudState_(file, stateObj) {
  file.setContent(JSON.stringify(stateObj));
}

function normalizeCloudStateShape_(raw) {
  const s = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  return {
    version: 1,
    updatedAt: String(s.updatedAt || ''),
    logs: (s.logs && typeof s.logs === 'object' && !Array.isArray(s.logs)) ? s.logs : {},
    deletedLogDates: (s.deletedLogDates && typeof s.deletedLogDates === 'object' && !Array.isArray(s.deletedLogDates)) ? s.deletedLogDates : {},
    neatDraft: (s.neatDraft && typeof s.neatDraft === 'object') ? s.neatDraft : null,
    neatSliders: (s.neatSliders && typeof s.neatSliders === 'object') ? s.neatSliders : null,
    mealExtras: (s.mealExtras && typeof s.mealExtras === 'object' && !Array.isArray(s.mealExtras)) ? s.mealExtras : {},
    factors: (s.factors && typeof s.factors === 'object') ? s.factors : null,
    customEquivalences: (s.customEquivalences && typeof s.customEquivalences === 'object') ? s.customEquivalences : null,
    gymHistory: (s.gymHistory && typeof s.gymHistory === 'object') ? s.gymHistory : null,
    gymState: (s.gymState && typeof s.gymState === 'object') ? s.gymState : null
  };
}

function toEpochMs_(iso) {
  if (!iso) return 0;
  const t = Date.parse(String(iso));
  return isNaN(t) ? 0 : t;
}

function mergeLogEntry_(entryA, entryB) {
  if (!entryA) return entryB || null;
  if (!entryB) return entryA || null;
  const tsA = toEpochMs_(entryA.updatedAt);
  const tsB = toEpochMs_(entryB.updatedAt);
  const primary = tsB >= tsA ? entryB : entryA;
  const secondary = primary === entryB ? entryA : entryB;

  const merged = JSON.parse(JSON.stringify(primary));
  const primHasSteps = (Number(merged.totalSteps) > 0) || (Array.isArray(merged.items) && merged.items.length > 0);
  const secHasSteps = (Number(secondary.totalSteps) > 0) || (Array.isArray(secondary.items) && secondary.items.length > 0);
  if (!primHasSteps && secHasSteps && !merged.explicitClearSteps) {
    merged.items = Array.isArray(secondary.items) ? secondary.items : [];
    merged.totalSteps = Number(secondary.totalSteps) || 0;
    merged.totalKcalGross = Number(secondary.totalKcalGross) || 0;
    merged.totalKcalNet = Number(secondary.totalKcalNet) || 0;
    merged.totalMinutes = Number(secondary.totalMinutes) || 0;
    merged.totalKm = Number(secondary.totalKm) || 0;
  }
  if ((merged.weightKg === null || merged.weightKg === undefined) && secondary.weightKg !== null && secondary.weightKg !== undefined) {
    merged.weightKg = secondary.weightKg;
  }
  if ((merged.waistCm === null || merged.waistCm === undefined) && secondary.waistCm !== null && secondary.waistCm !== undefined) {
    merged.waistCm = secondary.waistCm;
  }
  if ((merged.bodyFatPct === null || merged.bodyFatPct === undefined) && secondary.bodyFatPct !== null && secondary.bodyFatPct !== undefined) {
    merged.bodyFatPct = secondary.bodyFatPct;
  }
  if (!merged.note && secondary.note) {
    merged.note = secondary.note;
  }
  return merged;
}

function pickNewerBlock_(blockA, blockB) {
  if (!blockA) return blockB || null;
  if (!blockB) return blockA || null;
  return toEpochMs_(blockB.updatedAt) >= toEpochMs_(blockA.updatedAt) ? blockB : blockA;
}

function mergeDraft_(draftA, draftB) {
  if (!draftA) return draftB || null;
  if (!draftB) return draftA || null;
  const dateA = String(draftA.date || '');
  const dateB = String(draftB.date || '');
  if (dateA && dateB && dateA !== dateB) {
    return dateB > dateA ? draftB : draftA;
  }
  return toEpochMs_(draftB.updatedAt) >= toEpochMs_(draftA.updatedAt) ? draftB : draftA;
}

function mergeCloudStates_(rawCloud, rawIncoming) {
  const cloud = normalizeCloudStateShape_(rawCloud);
  const incoming = normalizeCloudStateShape_(rawIncoming);

  // 1. Tombstones (borrados de logs)
  const deletedDates = {};
  const allDelKeys = {};
  Object.keys(cloud.deletedLogDates).forEach(function (k) { allDelKeys[k] = true; });
  Object.keys(incoming.deletedLogDates).forEach(function (k) { allDelKeys[k] = true; });
  Object.keys(allDelKeys).forEach(function (d) {
    const tA = toEpochMs_(cloud.deletedLogDates[d]);
    const tB = toEpochMs_(incoming.deletedLogDates[d]);
    deletedDates[d] = tB >= tA ? incoming.deletedLogDates[d] : cloud.deletedLogDates[d];
  });

  // 2. Logs diarios por fecha
  const mergedLogs = {};
  const allLogDates = {};
  Object.keys(cloud.logs).forEach(function (k) { allLogDates[k] = true; });
  Object.keys(incoming.logs).forEach(function (k) { allLogDates[k] = true; });

  Object.keys(allLogDates).forEach(function (d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    const candidate = mergeLogEntry_(cloud.logs[d], incoming.logs[d]);
    if (!candidate) return;
    const delTs = toEpochMs_(deletedDates[d]);
    const logTs = toEpochMs_(candidate.updatedAt);
    if (delTs > logTs) {
      return; // El borrado es más reciente que el último guardado
    }
    mergedLogs[d] = candidate;
  });

  // 3. Meal Extras por fecha
  const mergedExtras = {};
  const allExDates = {};
  Object.keys(cloud.mealExtras).forEach(function (k) { allExDates[k] = true; });
  Object.keys(incoming.mealExtras).forEach(function (k) { allExDates[k] = true; });
  Object.keys(allExDates).forEach(function (d) {
    const picked = pickNewerBlock_(cloud.mealExtras[d], incoming.mealExtras[d]);
    if (picked) mergedExtras[d] = picked;
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    logs: mergedLogs,
    deletedLogDates: deletedDates,
    neatDraft: mergeDraft_(cloud.neatDraft, incoming.neatDraft),
    neatSliders: pickNewerBlock_(cloud.neatSliders, incoming.neatSliders),
    mealExtras: mergedExtras,
    factors: pickNewerBlock_(cloud.factors, incoming.factors),
    customEquivalences: pickNewerBlock_(cloud.customEquivalences, incoming.customEquivalences),
    gymHistory: pickNewerBlock_(cloud.gymHistory, incoming.gymHistory),
    gymState: pickNewerBlock_(cloud.gymState, incoming.gymState)
  };
}

function hydrateStateWithSheetPesajes_(stateObj) {
  try {
    const sheetData = readPesajesFromSistemaMaestro_();
    const rows = sheetData.rows || [];
    let touched = false;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.date) continue;
      if (stateObj.deletedLogDates && stateObj.deletedLogDates[r.date]) continue;
      if (!stateObj.logs[r.date]) {
        stateObj.logs[r.date] = {
          date: r.date,
          items: [],
          totalSteps: 0,
          totalKcalGross: 0,
          totalKcalNet: 0,
          totalMinutes: 0,
          totalKm: 0,
          weightKg: r.weightKg,
          waistCm: r.waistCm,
          bodyFatPct: r.bodyFatPct,
          note: r.note || '',
          updatedAt: r.date + 'T12:00:00.000Z'
        };
        touched = true;
      }
    }
    return touched;
  } catch (_) {
    return false;
  }
}

function handleCloudPull_() {
  const readRes = readCloudState_();
  const stateObj = readRes.state;
  const hydrated = hydrateStateWithSheetPesajes_(stateObj);
  if (hydrated) {
    writeCloudState_(readRes.file, stateObj);
  }
  return {
    ok: true,
    syncedAt: new Date().toISOString(),
    state: stateObj
  };
}

function handleCloudSync_(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(12000);
  try {
    const readRes = readCloudState_();
    const cloud = readRes.state;
    hydrateStateWithSheetPesajes_(cloud);

    const incoming = body && body.state ? body.state : {};
    const merged = mergeCloudStates_(cloud, incoming);
    writeCloudState_(readRes.file, merged);

    let sheetsUpdated = 0;
    const changedDates = Array.isArray(body.changedDates) ? body.changedDates : [];
    for (let i = 0; i < changedDates.length; i++) {
      const d = changedDates[i];
      if (merged.logs[d]) {
        try {
          upsertPesajeRow_(merged.logs[d]);
          sheetsUpdated += 1;
        } catch (_) {}
      }
    }

    return {
      ok: true,
      syncedAt: merged.updatedAt,
      sheetsUpdated: sheetsUpdated,
      state: merged
    };
  } finally {
    lock.releaseLock();
  }
}

// ==================== GOOGLE SHEETS HELPERS ====================

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
  if (stepsNum !== null && stepsNum > 0) {
    noteStr = noteStr.replace(/\s*\|\s*NEAT:\s*\d+\s*pasos/i, '').replace(/^NEAT:\s*\d+\s*pasos$/i, '').trim();
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
