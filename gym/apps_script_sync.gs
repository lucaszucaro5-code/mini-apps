/**
 * Google Apps Script — Puente en vivo para Gym Tracker (MiniApps iPhone)
 *
 * Cómo instalarlo (1 sola vez, ~2 minutos):
 * 1. Entrá a https://script.google.com con tu cuenta de Google.
 * 2. Tocá "Nuevo proyecto", borrá el contenido y pegá todo este archivo.
 * 3. Arriba a la derecha: "Implementar" -> "Nueva implementación".
 *    - Tipo: "Aplicación web"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario" (el enlace largo es privado tuyo)
 * 4. Autorizá los permisos de Drive/Sheets y copiá la URL que termina en /exec.
 * 5. Pegala una sola vez en Gym Tracker -> botón "🔄 Sync".
 */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'full';
  try {
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
    return jsonOut_(data);
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

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
