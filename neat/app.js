(function () {
  'use strict';

  const STORAGE_KEY = 'sm_neat_v7_1_state';
  const DRAFT_KEY = 'sm_neat_v7_2_today';
  const LOGS_KEY = 'sm_neat_v7_2_logs';
  const DEFAULT_WEIGHT = 72.7;
  const DEFAULT_STREET_SPEED = 5.0;
  const DEFAULT_BIKE_SPEED = 20;

  const fmtInt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const fmtDec = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtSpeed = (v) => (Number.isInteger(v) ? fmtInt.format(v) : fmtDec.format(v));

  const PRESETS = {
    gym: { street: 20, inclineMin: 35, grade: 6, bike: 0 },
    rest: { street: 30, inclineMin: 40, grade: 6, bike: 0 },
    incline: { street: 0, inclineMin: 55, grade: 6, bike: 0 },
    bike: { street: 0, inclineMin: 0, grade: 6, bike: 45, bikeSpeed: 20 }
  };

  const weightEl = document.getElementById('in-weight');
  const streetEl = document.getElementById('in-street');
  const streetSpeedEl = document.getElementById('in-street-speed');
  const inclineMinEl = document.getElementById('in-incline-min');
  const gradeEl = document.getElementById('in-grade');
  const bikeEl = document.getElementById('in-bike');
  const bikeSpeedEl = document.getElementById('in-bike-speed');
  const presetBtns = document.querySelectorAll('.lumi-segmented-btn');
  const stepBtns = document.querySelectorAll('.step-btn');

  const todayDateEl = document.getElementById('today-date');
  const closeWeightEl = document.getElementById('close-weight');
  const closeWaistEl = document.getElementById('close-waist');
  const closeNoteEl = document.getElementById('close-note');

  const measDateEl = document.getElementById('meas-date');
  const measWeightEl = document.getElementById('meas-weight');
  const measWaistEl = document.getElementById('meas-waist');
  const measNoteEl = document.getElementById('meas-note');

  let activeDate = getLocalTodayIso();
  let draft = { date: activeDate, items: [] };
  let logs = {};
  let stalePastDraft = null;
  let toastTimer = null;

  function getLocalTodayIso(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateDisplay(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '--';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${days[dt.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  function formatShortDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '--';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseOptionalNumber(raw) {
    const s = String(raw ?? '').trim().replace(',', '.');
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
  }

  function showToast(msg, ms = 2800) {
    const el = document.getElementById('neat-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
    }, ms);
  }

  // ==================== FÍSICA NEAT v7.1 ====================
  function calcStreetWalkRate(weight, speedKmh) {
    const scale = weight / 72.5;
    const restKcalPerMin = (3.5 * weight) / 200;
    const extraSpeed = Math.max(0, speedKmh - 5.0);
    const kcalPerMin = restKcalPerMin + scale * (0.66425 * speedKmh + 0.14 * extraSpeed * extraSpeed);
    const mets = restKcalPerMin > 0 ? kcalPerMin / restKcalPerMin : 0;
    return { kcalPerMin, mets };
  }

  function calcMtbBikeRate(weight, speedKmh) {
    // MTB en terreno mixto (ciudad, campo y ruta): Crr=0.008, CdA=0.50 m², bici+equipo=13 kg, transmisión 96% + ecuación ACSM
    const v = speedKmh / 3.6;
    const totalMass = weight + 13.0;
    const pRoll = 0.008 * totalMass * 9.81 * v;
    const pAero = 0.5 * 1.225 * 0.50 * (v * v * v);
    const watts = (pRoll + pAero) / 0.96;
    const kcalPerMin = (7.0 * weight + 10.8 * watts) / 200.0;
    return { watts, kcalPerMin };
  }

  function calcActivityMetrics(type, weight, params) {
    const scale = weight / 72.5;
    const restKcalPerMin = (3.5 * weight) / 200;
    const target10kKcal = 418 * scale;

    if (type === 'street') {
      const minutes = params.minutes || 0;
      const speedKmh = params.speedKmh || DEFAULT_STREET_SPEED;
      const rate = calcStreetWalkRate(weight, speedKmh);
      const kcalGross = minutes * rate.kcalPerMin;
      const kcalNet = Math.max(0, kcalGross - minutes * restKcalPerMin);
      const km = (minutes * speedKmh) / 60;
      const steps = Math.round((kcalGross / target10kKcal) * 10000);
      return {
        type: 'street',
        label: `Calle ${fmtSpeed(speedKmh)} km/h`,
        detail: `${minutes} min · ${fmtDec.format(km)} km`,
        minutes,
        km,
        speedKmh,
        kcalGross,
        kcalNet,
        steps
      };
    }

    if (type === 'incline') {
      const minutes = params.minutes || 0;
      const grade = params.grade || 6;
      const rate = (4.59 + 0.415 * grade) * scale;
      const kcalGross = minutes * rate;
      const kcalNet = Math.max(0, kcalGross - minutes * restKcalPerMin);
      const km = (minutes * 5) / 60;
      const steps = Math.round((kcalGross / target10kKcal) * 10000);
      return {
        type: 'incline',
        label: `Cinta ${grade}%`,
        detail: `${minutes} min · 5 km/h · ${fmtDec.format(km)} km`,
        minutes,
        km,
        grade,
        kcalGross,
        kcalNet,
        steps
      };
    }

    if (type === 'bike') {
      const minutes = params.minutes || 0;
      const speedKmh = params.speedKmh || DEFAULT_BIKE_SPEED;
      const rate = calcMtbBikeRate(weight, speedKmh);
      const kcalGross = minutes * rate.kcalPerMin;
      const kcalNet = Math.max(0, kcalGross - minutes * restKcalPerMin);
      const km = (minutes * speedKmh) / 60;
      const steps = Math.round((kcalGross / target10kKcal) * 10000);
      return {
        type: 'bike',
        label: `Bici MTB ${fmtSpeed(speedKmh)} km/h`,
        detail: `${minutes} min · ${fmtDec.format(km)} km · ~${fmtInt.format(Math.round(rate.watts))} W`,
        minutes,
        km,
        speedKmh,
        watts: Math.round(rate.watts),
        kcalGross,
        kcalNet,
        steps
      };
    }

    const extraSteps = Math.max(0, Math.round(params.steps || 0));
    const kcalGross = (extraSteps / 10000) * target10kKcal;
    return {
      type: 'extra',
      label: 'Pasos extra / reloj',
      detail: 'Carga directa',
      minutes: 0,
      km: 0,
      kcalGross,
      kcalNet: kcalGross,
      steps: extraSteps
    };
  }

  function clampToInput(el, value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    const min = parseFloat(el.min);
    const max = parseFloat(el.max);
    const step = parseFloat(el.step);
    const clamped = Math.min(max, Math.max(min, n));
    const snapped = min + Math.round((clamped - min) / step) * step;
    return step < 1 ? Math.round(snapped * 10) / 10 : Math.round(snapped);
  }

  function detectActivePreset(streetMin, inclineMin, grade, bikeMin, bikeSpeed) {
    for (const [key, p] of Object.entries(PRESETS)) {
      if (
        p.street === streetMin &&
        p.inclineMin === inclineMin &&
        p.grade === grade &&
        p.bike === bikeMin &&
        (p.bikeSpeed === undefined || p.bikeSpeed === bikeSpeed)
      ) {
        return key;
      }
    }
    return null;
  }

  function syncPresetButtons(activeKey) {
    presetBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.preset === activeKey);
    });
  }

  // ==================== PERSISTENCIA LOCAL ====================
  function saveSliderState(activePreset) {
    const state = {
      weight: parseFloat(weightEl.value),
      street: parseFloat(streetEl.value),
      streetSpeed: parseFloat(streetSpeedEl.value),
      inclineMin: parseFloat(inclineMinEl.value),
      grade: parseFloat(gradeEl.value),
      bike: parseFloat(bikeEl.value),
      bikeSpeed: parseFloat(bikeSpeedEl.value),
      preset: activePreset
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function loadSliderState() {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (_) {
      saved = null;
    }

    if (saved && typeof saved === 'object') {
      weightEl.value = clampToInput(weightEl, saved.weight, DEFAULT_WEIGHT);
      streetSpeedEl.value = clampToInput(streetSpeedEl, saved.streetSpeed, DEFAULT_STREET_SPEED);
      bikeSpeedEl.value = clampToInput(bikeSpeedEl, saved.bikeSpeed, DEFAULT_BIKE_SPEED);

      if (saved.preset && PRESETS[saved.preset]) {
        const p = PRESETS[saved.preset];
        streetEl.value = p.street;
        inclineMinEl.value = p.inclineMin;
        gradeEl.value = p.grade;
        bikeEl.value = p.bike;
        if (p.streetSpeed !== undefined) streetSpeedEl.value = p.streetSpeed;
        if (p.bikeSpeed !== undefined) bikeSpeedEl.value = p.bikeSpeed;
      } else {
        streetEl.value = clampToInput(streetEl, saved.street, PRESETS.gym.street);
        inclineMinEl.value = clampToInput(inclineMinEl, saved.inclineMin, PRESETS.gym.inclineMin);
        gradeEl.value = clampToInput(gradeEl, saved.grade, PRESETS.gym.grade);
        bikeEl.value = clampToInput(bikeEl, saved.bike, PRESETS.gym.bike);
      }
    } else {
      weightEl.value = DEFAULT_WEIGHT;
      streetEl.value = PRESETS.gym.street;
      streetSpeedEl.value = DEFAULT_STREET_SPEED;
      inclineMinEl.value = PRESETS.gym.inclineMin;
      gradeEl.value = PRESETS.gym.grade;
      bikeEl.value = PRESETS.gym.bike;
      bikeSpeedEl.value = DEFAULT_BIKE_SPEED;
    }
  }

  function loadLogs() {
    try {
      const raw = localStorage.getItem(LOGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      logs = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      logs = {};
    }
  }

  function saveLogs() {
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch (_) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'forma-logs-updated' }, location.origin);
      }
    } catch (_) {}
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (_) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'forma-logs-updated' }, location.origin);
      }
    } catch (_) {}
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'forma-logs-updated') return;
    loadLogs();
    syncCloseDayInputsFromDate(activeDate);
    syncMeasureInputsFromDate(measDateEl.value);
    renderToday();
    renderLogs();
  });

  function loadInitialDayState() {
    const todayIso = getLocalTodayIso();
    activeDate = todayIso;
    todayDateEl.value = todayIso;
    measDateEl.value = todayIso;

    let savedDraft = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) savedDraft = JSON.parse(raw);
    } catch (_) {
      savedDraft = null;
    }

    if (savedDraft && savedDraft.date && Array.isArray(savedDraft.items)) {
      if (savedDraft.date === todayIso) {
        draft = savedDraft;
      } else if (savedDraft.items.length > 0) {
        const existingOld = logs[savedDraft.date];
        const oldChanged = !existingOld || JSON.stringify(existingOld.items || []) !== JSON.stringify(savedDraft.items);
        if (oldChanged) {
          stalePastDraft = savedDraft;
        }
        draft = {
          date: todayIso,
          items: logs[todayIso] ? cloneItems(logs[todayIso].items) : []
        };
      } else {
        draft = {
          date: todayIso,
          items: logs[todayIso] ? cloneItems(logs[todayIso].items) : []
        };
      }
    } else {
      draft = {
        date: todayIso,
        items: logs[todayIso] ? cloneItems(logs[todayIso].items) : []
      };
    }

    saveDraft();
    syncCloseDayInputsFromDate(activeDate);
    syncMeasureInputsFromDate(measDateEl.value);
  }

  function cloneItems(items) {
    return Array.isArray(items) ? items.map((x) => ({ ...x })) : [];
  }

  function getLatestMeasures(excludeDate) {
    const dates = Object.keys(logs).sort().reverse();
    let lastWeight = null;
    let lastWaist = null;
    for (const d of dates) {
      if (excludeDate && d === excludeDate) continue;
      const entry = logs[d];
      if (lastWeight === null && Number.isFinite(entry.weightKg)) lastWeight = entry.weightKg;
      if (lastWaist === null && Number.isFinite(entry.waistCm)) lastWaist = entry.waistCm;
      if (lastWeight !== null && lastWaist !== null) break;
    }
    return { lastWeight, lastWaist };
  }

  function syncCloseDayInputsFromDate(dateIso) {
    const entry = logs[dateIso];
    const latest = getLatestMeasures(dateIso);
    closeWeightEl.value = entry && Number.isFinite(entry.weightKg) ? String(entry.weightKg) : '';
    closeWaistEl.value = entry && Number.isFinite(entry.waistCm) ? String(entry.waistCm) : '';
    closeNoteEl.value = entry && entry.note ? entry.note : '';
    closeWeightEl.placeholder = latest.lastWeight ? `Último: ${fmtDec.format(latest.lastWeight)}` : `Ej. ${fmtDec.format(parseFloat(weightEl.value))}`;
    closeWaistEl.placeholder = latest.lastWaist ? `Última: ${fmtDec.format(latest.lastWaist)}` : 'Ej. 88,0';
  }

  function syncMeasureInputsFromDate(dateIso) {
    const entry = logs[dateIso];
    const latest = getLatestMeasures(dateIso);
    measWeightEl.value = entry && Number.isFinite(entry.weightKg) ? String(entry.weightKg) : '';
    measWaistEl.value = entry && Number.isFinite(entry.waistCm) ? String(entry.waistCm) : '';
    measNoteEl.value = entry && entry.note ? entry.note : '';
    measWeightEl.placeholder = latest.lastWeight ? `Último: ${fmtDec.format(latest.lastWeight)}` : 'Ej. 72,7';
    measWaistEl.placeholder = latest.lastWaist ? `Última: ${fmtDec.format(latest.lastWaist)}` : 'Ej. 88,0';
  }

  // ==================== RENDER SIMULADOR ====================
  function applyGoalBadge(el, steps, emptyText) {
    if (steps === 0 && emptyText) {
      el.textContent = emptyText;
      el.style.background = 'var(--surface-dim)';
      el.style.color = 'var(--on-surface-variant)';
      return;
    }
    if (steps >= 10000) {
      el.textContent = 'Meta 10k alcanzada';
      el.style.background = 'var(--positive-container)';
      el.style.color = 'var(--positive)';
    } else if (steps >= 8000) {
      el.textContent = 'Piso 8k alcanzado';
      el.style.background = 'var(--accent-container)';
      el.style.color = 'var(--primary)';
    } else {
      el.textContent = `Faltan ${fmtInt.format(8000 - steps)} para 8k`;
      el.style.background = 'var(--error-container)';
      el.style.color = 'var(--error)';
    }
  }

  function updateCalc(persist = true) {
    const weight = parseFloat(weightEl.value);
    const streetMin = parseFloat(streetEl.value);
    const streetSpeed = parseFloat(streetSpeedEl.value);
    const inclineMin = parseFloat(inclineMinEl.value);
    const grade = parseFloat(gradeEl.value);
    const bikeMin = parseFloat(bikeEl.value);
    const bikeSpeed = parseFloat(bikeSpeedEl.value);

    const scale = weight / 72.5;
    const restKcalPerMin = (3.5 * weight) / 200;

    const streetMetrics = calcStreetWalkRate(weight, streetSpeed);
    const streetKcal = streetMin * streetMetrics.kcalPerMin;
    const inclineRate = (4.59 + 0.415 * grade) * scale;
    const inclineKcal = inclineMin * inclineRate;
    const bikeMetrics = calcMtbBikeRate(weight, bikeSpeed);
    const bikeKcal = bikeMin * bikeMetrics.kcalPerMin;

    const totalKcal = streetKcal + inclineKcal + bikeKcal;
    const totalMin = streetMin + inclineMin + bikeMin;
    const netKcal = Math.max(0, totalKcal - (totalMin * restKcalPerMin));

    const target10kKcal = 418 * scale;
    const eqSteps = Math.round((totalKcal / target10kKcal) * 10000);
    const totalKm = (streetMin * streetSpeed + inclineMin * 5 + bikeMin * bikeSpeed) / 60;

    document.getElementById('val-weight').textContent = `${fmtDec.format(weight)} kg`;
    document.getElementById('val-street').textContent = `${streetMin} min`;
    document.getElementById('val-street-speed').textContent = `${fmtSpeed(streetSpeed)} km/h`;
    document.getElementById('leg-street-speed').textContent = fmtSpeed(streetSpeed);
    document.getElementById('hint-street-rate').textContent = `${fmtDec.format(streetMetrics.kcalPerMin)} kcal/min · ${fmtDec.format(streetMetrics.mets)} METs`;
    document.getElementById('val-incline-min').textContent = `${inclineMin} min`;
    document.getElementById('val-grade').textContent = `${grade}%`;
    document.getElementById('val-bike').textContent = `${bikeMin} min`;
    document.getElementById('val-bike-speed').textContent = `${fmtSpeed(bikeSpeed)} km/h`;
    document.getElementById('leg-bike-speed').textContent = fmtSpeed(bikeSpeed);
    document.getElementById('hint-bike-rate').textContent = `~${fmtInt.format(Math.round(bikeMetrics.watts))} W · ${fmtDec.format(bikeMetrics.kcalPerMin)} kcal/min`;

    document.getElementById('out-steps').textContent = fmtInt.format(eqSteps);
    document.getElementById('out-kcal').textContent = `${fmtInt.format(totalKcal)} kcal`;
    document.getElementById('out-net').textContent = `Neto extra: ${fmtInt.format(netKcal)} kcal`;
    document.getElementById('out-time').textContent = `${totalMin} min`;
    document.getElementById('out-dist').textContent = `Recorrido: ${fmtDec.format(totalKm)} km`;

    applyGoalBadge(document.getElementById('out-badge'), eqSteps);

    document.getElementById('leg-street').textContent = `${fmtInt.format(streetKcal)} kcal`;
    document.getElementById('leg-incline').textContent = `${fmtInt.format(inclineKcal)} kcal`;
    document.getElementById('leg-bike').textContent = `${fmtInt.format(bikeKcal)} kcal`;

    const segS = document.getElementById('seg-street');
    const segI = document.getElementById('seg-incline');
    const segB = document.getElementById('seg-bike');

    if (totalKcal > 0) {
      const pS = Math.round((streetKcal / totalKcal) * 100);
      const pI = Math.round((inclineKcal / totalKcal) * 100);
      const pB = Math.max(0, 100 - pS - pI);
      segS.style.width = `${pS}%`;
      segS.textContent = pS >= 10 ? `${pS}%` : '';
      segI.style.width = `${pI}%`;
      segI.textContent = pI >= 10 ? `${pI}%` : '';
      segB.style.width = `${pB}%`;
      segB.textContent = pB >= 10 ? `${pB}%` : '';
    } else {
      [segS, segI, segB].forEach((s) => { s.style.width = '0%'; s.textContent = ''; });
    }

    // Actualizar botones "+ Sumar a hoy" por actividad
    const stSteps = Math.round((streetKcal / target10kKcal) * 10000);
    const inSteps = Math.round((inclineKcal / target10kKcal) * 10000);
    const bkSteps = Math.round((bikeKcal / target10kKcal) * 10000);

    const btnStreet = document.getElementById('btn-add-street');
    const btnIncline = document.getElementById('btn-add-incline');
    const btnBike = document.getElementById('btn-add-bike');
    const btnAll = document.getElementById('btn-add-all');

    btnStreet.disabled = streetMin <= 0;
    btnStreet.textContent = streetMin > 0 ? `+ Sumar (+${fmtInt.format(stSteps)})` : '+ Sumar a hoy';

    btnIncline.disabled = inclineMin <= 0;
    btnIncline.textContent = inclineMin > 0 ? `+ Sumar (+${fmtInt.format(inSteps)})` : '+ Sumar a hoy';

    btnBike.disabled = bikeMin <= 0;
    btnBike.textContent = bikeMin > 0 ? `+ Sumar (+${fmtInt.format(bkSteps)})` : '+ Sumar a hoy';

    btnAll.disabled = totalMin <= 0;
    btnAll.textContent = totalMin > 0
      ? `+ Agregar todo lo calculado a hoy (+${fmtInt.format(eqSteps)} pasos)`
      : '+ Agregar todo lo calculado a hoy';

    const activePreset = detectActivePreset(streetMin, inclineMin, grade, bikeMin, bikeSpeed);
    syncPresetButtons(activePreset);
    if (persist) saveSliderState(activePreset);
  }

  // ==================== ACUMULADO DEL DÍA ====================
  function summarizeItems(items) {
    return items.reduce((acc, item) => {
      acc.steps += Math.round(Number(item.steps) || 0);
      acc.kcalGross += Number(item.kcalGross) || 0;
      acc.kcalNet += Number(item.kcalNet) || 0;
      acc.minutes += Number(item.minutes) || 0;
      acc.km += Number(item.km) || 0;
      return acc;
    }, { steps: 0, kcalGross: 0, kcalNet: 0, minutes: 0, km: 0 });
  }

  function addActivityToDraft(item) {
    if (!item || item.steps <= 0) return;
    draft.items.push({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...item
    });
    saveDraft();
    renderToday();
    showToast(`+${fmtInt.format(item.steps)} pasos sumados (${item.label})`);
  }

  function removeActivityFromDraft(itemId) {
    draft.items = draft.items.filter((x) => x.id !== itemId);
    saveDraft();
    renderToday();
  }

  function renderToday() {
    const banner = document.getElementById('unsaved-past-banner');
    if (stalePastDraft && stalePastDraft.items.length > 0) {
      const pastTotals = summarizeItems(stalePastDraft.items);
      banner.style.display = 'flex';
      document.getElementById('unsaved-past-text').textContent =
        `Tenés ${fmtInt.format(pastTotals.steps)} pasos sin guardar del ${formatShortDate(stalePastDraft.date)}.`;
    } else {
      banner.style.display = 'none';
    }

    const totals = summarizeItems(draft.items);
    document.getElementById('today-steps').textContent = fmtInt.format(totals.steps);
    document.getElementById('today-kcal').textContent =
      `${fmtInt.format(totals.kcalGross)} kcal brutas · ${fmtInt.format(totals.kcalNet)} netas`;
    document.getElementById('today-time-dist').textContent =
      `${Math.round(totals.minutes)} min · ${fmtDec.format(totals.km)} km`;

    const badge = document.getElementById('today-goal-badge');
    applyGoalBadge(badge, totals.steps, 'Sin actividades aún');

    const fill = document.getElementById('today-progress-fill');
    const pct = Math.min(100, Math.round((totals.steps / 10000) * 100));
    fill.style.width = `${pct}%`;
    fill.style.background = totals.steps >= 10000
      ? 'var(--positive)'
      : totals.steps >= 8000
        ? 'var(--primary)'
        : '#d97706';

    const savedBadge = document.getElementById('today-saved-badge');
    if (logs[activeDate]) {
      savedBadge.style.display = 'inline-block';
      savedBadge.style.background = 'var(--positive-container)';
      savedBadge.style.color = 'var(--positive)';
      savedBadge.textContent = 'En historial ✓';
    } else {
      savedBadge.style.display = 'none';
    }

    const listEl = document.getElementById('today-activities-list');
    const clearBtn = document.getElementById('btn-clear-today');
    if (!draft.items.length) {
      listEl.innerHTML = `<div class="activity-empty">Todavía no sumaste actividades para esta fecha. Elegí una abajo y tocá <strong>+ Sumar a hoy</strong>.</div>`;
      clearBtn.style.display = 'none';
    } else {
      clearBtn.style.display = 'inline-flex';
      listEl.innerHTML = draft.items.map((item) => `
        <div class="activity-item">
          <div class="activity-info">
            <div class="activity-name">${escHtml(item.label)}</div>
            <div class="activity-meta">${escHtml(item.detail)} · ${fmtInt.format(item.kcalGross)} kcal</div>
          </div>
          <div class="activity-right">
            <span class="activity-steps-pill">+${fmtInt.format(item.steps)}</span>
            <button type="button" class="btn-icon-remove" data-remove-id="${escHtml(item.id)}" aria-label="Quitar actividad">×</button>
          </div>
        </div>
      `).join('');

      listEl.querySelectorAll('button[data-remove-id]').forEach((btn) => {
        btn.addEventListener('click', () => removeActivityFromDraft(btn.dataset.removeId));
      });
    }
  }

  function upsertDailyLog(dateIso, { items, weightKg, waistCm, note, mergeExistingItems = false }) {
    const prev = logs[dateIso] || {};
    const finalItems = mergeExistingItems ? cloneItems(prev.items) : cloneItems(items !== undefined ? items : prev.items);
    const totals = summarizeItems(finalItems);

    const resolvedWeight = weightKg !== undefined ? weightKg : (Number.isFinite(prev.weightKg) ? prev.weightKg : null);
    const resolvedWaist = waistCm !== undefined ? waistCm : (Number.isFinite(prev.waistCm) ? prev.waistCm : null);
    const resolvedNote = note !== undefined ? note : (prev.note || '');

    logs[dateIso] = {
      date: dateIso,
      items: finalItems,
      totalSteps: totals.steps,
      totalKcalGross: Math.round(totals.kcalGross),
      totalKcalNet: Math.round(totals.kcalNet),
      totalMinutes: Math.round(totals.minutes),
      totalKm: Math.round(totals.km * 10) / 10,
      weightKg: resolvedWeight,
      waistCm: resolvedWaist,
      note: resolvedNote,
      updatedAt: new Date().toISOString()
    };
    saveLogs();

    if (Number.isFinite(resolvedWeight)) {
      weightEl.value = clampToInput(weightEl, resolvedWeight, parseFloat(weightEl.value));
      updateCalc(true);
    }
  }

  function handleSaveDay() {
    const dateIso = todayDateEl.value || activeDate || getLocalTodayIso();
    activeDate = dateIso;
    draft.date = dateIso;

    const prev = logs[dateIso] || {};
    const parsedW = parseOptionalNumber(closeWeightEl.value);
    const parsedWaist = parseOptionalNumber(closeWaistEl.value);
    const noteText = closeNoteEl.value.trim();

    const finalWeight = parsedW !== null ? parsedW : (Number.isFinite(prev.weightKg) ? prev.weightKg : null);
    const finalWaist = parsedWaist !== null ? parsedWaist : (Number.isFinite(prev.waistCm) ? prev.waistCm : null);

    if (draft.items.length === 0 && finalWeight === null && finalWaist === null && !noteText) {
      showToast('Sumá al menos una actividad o ingresá peso/cintura para guardar.');
      return;
    }

    upsertDailyLog(dateIso, {
      items: draft.items,
      weightKg: finalWeight,
      waistCm: finalWaist,
      note: noteText,
      mergeExistingItems: false
    });

    if (measDateEl.value === dateIso) {
      syncMeasureInputsFromDate(dateIso);
    }
    syncCloseDayInputsFromDate(dateIso);
    renderToday();
    renderLogs();
    showToast(`Día ${formatShortDate(dateIso)} guardado (${fmtInt.format(logs[dateIso].totalSteps)} pasos)`);
  }

  // ==================== REGISTROS DIARIOS ====================
  function handleSaveMeasures() {
    const dateIso = measDateEl.value || getLocalTodayIso();
    const w = parseOptionalNumber(measWeightEl.value);
    const waist = parseOptionalNumber(measWaistEl.value);
    const note = measNoteEl.value.trim();

    if (w === null && waist === null && !note) {
      showToast('Ingresá peso, cintura o una nota para guardar.');
      return;
    }

    const prev = logs[dateIso] || {};
    upsertDailyLog(dateIso, {
      weightKg: w !== null ? w : (Number.isFinite(prev.weightKg) ? prev.weightKg : null),
      waistCm: waist !== null ? waist : (Number.isFinite(prev.waistCm) ? prev.waistCm : null),
      note: note || prev.note || '',
      mergeExistingItems: true
    });

    if (dateIso === activeDate) {
      syncCloseDayInputsFromDate(dateIso);
      renderToday();
    }
    renderLogs();
    showToast(`Medidas del ${formatShortDate(dateIso)} guardadas`);
  }

  function formatDelta(cur, prev, unit) {
    if (!Number.isFinite(cur) || !Number.isFinite(prev)) return 'Primer registro';
    const diff = Math.round((cur - prev) * 10) / 10;
    if (diff === 0) return 'Sin cambios vs previo';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${fmtDec.format(diff)} ${unit} vs previo`;
  }

  function renderLogs() {
    const sortedDates = Object.keys(logs).sort().reverse();
    document.getElementById('logs-count-badge').textContent = String(sortedDates.length);
    document.getElementById('logs-total-label').textContent =
      sortedDates.length === 1 ? '1 día' : `${sortedDates.length} días`;

    // KPIs de resumen
    const today = new Date();
    const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const cutoffIso = getLocalTodayIso(sevenDaysAgo);

    const recentWithSteps = sortedDates
      .map((d) => logs[d])
      .filter((e) => e.date >= cutoffIso && (e.totalSteps > 0 || (e.items && e.items.length > 0)));

    if (recentWithSteps.length > 0) {
      const avg = Math.round(recentWithSteps.reduce((s, e) => s + e.totalSteps, 0) / recentWithSteps.length);
      const ge8k = recentWithSteps.filter((e) => e.totalSteps >= 8000).length;
      document.getElementById('stat-avg-steps').textContent = fmtInt.format(avg);
      document.getElementById('stat-days-8k').textContent = `${ge8k}/${recentWithSteps.length} días ≥ 8k`;
    } else {
      document.getElementById('stat-avg-steps').textContent = '--';
      document.getElementById('stat-days-8k').textContent = 'Sin días activos';
    }

    const withWeight = sortedDates.map((d) => logs[d]).filter((e) => Number.isFinite(e.weightKg));
    if (withWeight.length > 0) {
      const curW = withWeight[0].weightKg;
      const prevW = withWeight[1] ? withWeight[1].weightKg : null;
      document.getElementById('stat-last-weight').textContent = `${fmtDec.format(curW)} kg`;
      document.getElementById('stat-weight-delta').textContent = formatDelta(curW, prevW, 'kg');
    } else {
      document.getElementById('stat-last-weight').textContent = '--';
      document.getElementById('stat-weight-delta').textContent = 'Sin registros';
    }

    const withWaist = sortedDates.map((d) => logs[d]).filter((e) => Number.isFinite(e.waistCm));
    if (withWaist.length > 0) {
      const curWa = withWaist[0].waistCm;
      const prevWa = withWaist[1] ? withWaist[1].waistCm : null;
      document.getElementById('stat-last-waist').textContent = `${fmtDec.format(curWa)} cm`;
      document.getElementById('stat-waist-delta').textContent = formatDelta(curWa, prevWa, 'cm');
    } else {
      document.getElementById('stat-last-waist').textContent = '--';
      document.getElementById('stat-waist-delta').textContent = 'Sin registros';
    }

    const listEl = document.getElementById('logs-list');
    if (!sortedDates.length) {
      listEl.innerHTML = `<div class="activity-empty">Todavía no guardaste registros diarios. Sumá actividades en <strong>Calculadora &amp; Hoy</strong> y tocá <strong>Guardar día</strong>, o registrá tu peso y cintura arriba.</div>`;
      return;
    }

    listEl.innerHTML = sortedDates.map((d) => {
      const e = logs[d];
      const hasSteps = e.totalSteps > 0 || (e.items && e.items.length > 0);
      let badgeBg = 'var(--surface-bright)';
      let badgeCol = 'var(--on-surface-variant)';
      let badgeTxt = 'Solo medidas';

      if (hasSteps) {
        if (e.totalSteps >= 10000) {
          badgeBg = 'var(--positive-container)';
          badgeCol = 'var(--positive)';
          badgeTxt = 'Meta 10k';
        } else if (e.totalSteps >= 8000) {
          badgeBg = 'var(--accent-container)';
          badgeCol = 'var(--primary)';
          badgeTxt = 'Piso 8k';
        } else {
          badgeBg = 'var(--error-container)';
          badgeCol = 'var(--error)';
          badgeTxt = '< 8k';
        }
      }

      const chips = [];
      if (hasSteps) {
        chips.push(`<span class="log-chip"><strong>${fmtInt.format(e.totalSteps)}</strong> pasos</span>`);
        chips.push(`<span class="log-chip">${fmtInt.format(e.totalKcalGross)} kcal · ${e.totalMinutes} min · ${fmtDec.format(e.totalKm)} km</span>`);
      }
      if (Number.isFinite(e.weightKg)) {
        chips.push(`<span class="log-chip">Peso: <strong>${fmtDec.format(e.weightKg)} kg</strong></span>`);
      }
      if (Number.isFinite(e.waistCm)) {
        chips.push(`<span class="log-chip">Cintura: <strong>${fmtDec.format(e.waistCm)} cm</strong></span>`);
      }

      const actsHtml = (e.items && e.items.length)
        ? `<div class="log-activities-chips">${e.items.map((it) =>
            `<span class="log-act-chip">${escHtml(it.label)} (${it.minutes > 0 ? `${it.minutes}m` : `+${fmtInt.format(it.steps)}`})</span>`
          ).join('')}</div>`
        : '';

      const noteHtml = e.note ? `<div class="log-note">${escHtml(e.note)}</div>` : '';

      return `
        <div class="log-entry-card">
          <div class="log-entry-top">
            <span class="log-date">${escHtml(formatDateDisplay(e.date))}</span>
            <span class="status-pill" style="background:${badgeBg};color:${badgeCol};">${badgeTxt}</span>
          </div>
          <div class="log-metrics-grid">${chips.join('')}</div>
          ${actsHtml}
          ${noteHtml}
          <div class="log-actions">
            <button type="button" class="btn btn-sm" data-edit-log="${escHtml(e.date)}">Editar en Hoy</button>
            <button type="button" class="btn btn-danger-ghost btn-sm" data-del-log="${escHtml(e.date)}">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('button[data-edit-log]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.editLog;
        switchToDateInToday(d);
        switchMainTab('today');
        showToast(`Editando registro del ${formatShortDate(d)}`);
      });
    });

    listEl.querySelectorAll('button[data-del-log]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.delLog;
        if (!window.confirm(`¿Eliminar el registro del ${formatDateDisplay(d)}?`)) return;
        delete logs[d];
        saveLogs();
        if (d === activeDate) {
          syncCloseDayInputsFromDate(d);
          renderToday();
        }
        renderLogs();
        showToast(`Registro del ${formatShortDate(d)} eliminado`);
      });
    });
  }

  function switchToDateInToday(dateIso) {
    if (!dateIso) return;
    activeDate = dateIso;
    todayDateEl.value = dateIso;
    draft = {
      date: dateIso,
      items: logs[dateIso] ? cloneItems(logs[dateIso].items) : []
    };
    saveDraft();
    syncCloseDayInputsFromDate(dateIso);
    renderToday();
  }

  function switchMainTab(tabName) {
    document.querySelectorAll('.main-tab-btn').forEach((btn) => {
      const act = btn.dataset.tab === tabName;
      btn.classList.toggle('is-active', act);
      btn.setAttribute('aria-selected', act ? 'true' : 'false');
    });
    document.getElementById('panel-today').classList.toggle('is-active', tabName === 'today');
    document.getElementById('panel-logs').classList.toggle('is-active', tabName === 'logs');
  }

  // ==================== EXPORTACIÓN Y RESPALDO ====================
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copyLogsSummary() {
    const dates = Object.keys(logs).sort().reverse().slice(0, 14);
    if (!dates.length) {
      showToast('No hay registros para copiar.');
      return;
    }
    const lines = ['NEAT & Medidas — Sistema Maestro v7.2', ''];
    for (const d of dates) {
      const e = logs[d];
      const parts = [formatDateDisplay(d)];
      parts.push(`${fmtInt.format(e.totalSteps)} pasos`);
      if (Number.isFinite(e.weightKg)) parts.push(`${fmtDec.format(e.weightKg)} kg`);
      if (Number.isFinite(e.waistCm)) parts.push(`${fmtDec.format(e.waistCm)} cm`);
      if (e.note) parts.push(`"${e.note}"`);
      lines.push('• ' + parts.join(' | '));
    }
    const text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Resumen copiado al portapapeles'))
        .catch(() => showToast('No se pudo acceder al portapapeles.'));
    } else {
      showToast('Copiá desde Exportar CSV/JSON en este navegador.');
    }
  }

  function exportCsv() {
    const dates = Object.keys(logs).sort();
    if (!dates.length) {
      showToast('No hay registros para exportar.');
      return;
    }
    const header = ['Fecha', 'Pasos', 'Kcal_Brutas', 'Kcal_Netas', 'Minutos', 'Km', 'Peso_kg', 'Cintura_cm', 'Actividades', 'Nota'];
    const escCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [header.join(',')];
    for (const d of dates) {
      const e = logs[d];
      const acts = (e.items || []).map((i) => `${i.label} (${i.minutes > 0 ? i.minutes + 'm' : '+' + i.steps})`).join(' + ');
      rows.push([
        e.date,
        e.totalSteps,
        e.totalKcalGross,
        e.totalKcalNet,
        e.totalMinutes,
        e.totalKm,
        Number.isFinite(e.weightKg) ? e.weightKg : '',
        Number.isFinite(e.waistCm) ? e.waistCm : '',
        acts,
        e.note || ''
      ].map(escCsv).join(','));
    }
    downloadFile(`neat_registros_${getLocalTodayIso()}.csv`, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
    showToast('CSV exportado');
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: '7.2',
      logs
    };
    downloadFile(`neat_backup_${getLocalTodayIso()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    showToast('Respaldo JSON descargado');
  }

  function importJsonFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const incoming = parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : parsed;
        if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
          throw new Error('Formato JSON inválido');
        }
        let importedCount = 0;
        for (const [k, v] of Object.entries(incoming)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
            logs[k] = v;
            importedCount += 1;
          }
        }
        saveLogs();
        syncCloseDayInputsFromDate(activeDate);
        syncMeasureInputsFromDate(measDateEl.value);
        renderToday();
        renderLogs();
        showToast(`${importedCount} día(s) importados`);
      } catch (err) {
        showToast('Error importando JSON: ' + err.message, 4000);
      }
    };
    reader.readAsText(file);
  }

  // ==================== EVENTOS ====================
  document.querySelectorAll('.main-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchMainTab(btn.dataset.tab));
  });

  todayDateEl.addEventListener('change', () => {
    if (!todayDateEl.value) return;
    switchToDateInToday(todayDateEl.value);
  });

  measDateEl.addEventListener('change', () => {
    if (!measDateEl.value) return;
    syncMeasureInputsFromDate(measDateEl.value);
  });

  document.getElementById('btn-save-past-draft').addEventListener('click', () => {
    if (!stalePastDraft) return;
    upsertDailyLog(stalePastDraft.date, {
      items: stalePastDraft.items,
      mergeExistingItems: false
    });
    const savedDate = stalePastDraft.date;
    stalePastDraft = null;
    renderToday();
    renderLogs();
    showToast(`Borrador del ${formatShortDate(savedDate)} guardado`);
  });

  document.getElementById('btn-discard-past-draft').addEventListener('click', () => {
    stalePastDraft = null;
    renderToday();
  });

  document.getElementById('btn-add-street').addEventListener('click', () => {
    const w = parseFloat(weightEl.value);
    const m = parseFloat(streetEl.value);
    const sp = parseFloat(streetSpeedEl.value);
    if (m <= 0) return;
    addActivityToDraft(calcActivityMetrics('street', w, { minutes: m, speedKmh: sp }));
  });

  document.getElementById('btn-add-incline').addEventListener('click', () => {
    const w = parseFloat(weightEl.value);
    const m = parseFloat(inclineMinEl.value);
    const g = parseFloat(gradeEl.value);
    if (m <= 0) return;
    addActivityToDraft(calcActivityMetrics('incline', w, { minutes: m, grade: g }));
  });

  document.getElementById('btn-add-bike').addEventListener('click', () => {
    const w = parseFloat(weightEl.value);
    const m = parseFloat(bikeEl.value);
    const sp = parseFloat(bikeSpeedEl.value);
    if (m <= 0) return;
    addActivityToDraft(calcActivityMetrics('bike', w, { minutes: m, speedKmh: sp }));
  });

  document.getElementById('btn-add-all').addEventListener('click', () => {
    const w = parseFloat(weightEl.value);
    const st = parseFloat(streetEl.value);
    const stSp = parseFloat(streetSpeedEl.value);
    const inc = parseFloat(inclineMinEl.value);
    const gr = parseFloat(gradeEl.value);
    const bk = parseFloat(bikeEl.value);
    const sp = parseFloat(bikeSpeedEl.value);
    const added = [];
    if (st > 0) added.push(calcActivityMetrics('street', w, { minutes: st, speedKmh: stSp }));
    if (inc > 0) added.push(calcActivityMetrics('incline', w, { minutes: inc, grade: gr }));
    if (bk > 0) added.push(calcActivityMetrics('bike', w, { minutes: bk, speedKmh: sp }));
    if (!added.length) return;
    for (const item of added) {
      draft.items.push({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...item
      });
    }
    const totalAdded = added.reduce((s, x) => s + x.steps, 0);
    saveDraft();
    renderToday();
    showToast(`+${fmtInt.format(totalAdded)} pasos agregados a hoy`);
  });

  document.getElementById('btn-add-extra-steps').addEventListener('click', () => {
    const inp = document.getElementById('in-extra-steps');
    const val = Math.round(Number(inp.value));
    if (!Number.isFinite(val) || val <= 0) {
      showToast('Ingresá una cantidad válida de pasos extra.');
      return;
    }
    const w = parseFloat(weightEl.value);
    addActivityToDraft(calcActivityMetrics('extra', w, { steps: val }));
    inp.value = '';
  });

  document.getElementById('btn-clear-today').addEventListener('click', () => {
    if (!draft.items.length) return;
    if (!window.confirm('¿Limpiar las actividades cargadas en este borrador del día?')) return;
    draft.items = [];
    saveDraft();
    renderToday();
    showToast('Actividades del borrador limpiadas');
  });

  document.getElementById('btn-save-day').addEventListener('click', handleSaveDay);
  document.getElementById('btn-save-measures').addEventListener('click', handleSaveMeasures);

  document.getElementById('btn-copy-summary').addEventListener('click', copyLogsSummary);
  document.getElementById('btn-export-csv').addEventListener('click', exportCsv);
  document.getElementById('btn-export-json').addEventListener('click', exportJson);
  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('in-import-json').click();
  });
  document.getElementById('in-import-json').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      importJsonFile(e.target.files[0]);
      e.target.value = '';
    }
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.preset];
      streetEl.value = p.street;
      inclineMinEl.value = p.inclineMin;
      gradeEl.value = p.grade;
      bikeEl.value = p.bike;
      if (p.streetSpeed !== undefined) streetSpeedEl.value = p.streetSpeed;
      if (p.bikeSpeed !== undefined) bikeSpeedEl.value = p.bikeSpeed;
      updateCalc(true);
    });
  });

  [weightEl, streetEl, streetSpeedEl, inclineMinEl, gradeEl, bikeEl, bikeSpeedEl].forEach((el) => {
    el.addEventListener('input', () => updateCalc(true));
  });

  stepBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const dir = Number(btn.dataset.dir);
      const step = parseFloat(input.step);
      const current = parseFloat(input.value);
      input.value = clampToInput(input, current + dir * step, current);
      updateCalc(true);
    });
  });

  // ==================== OFFLINE / SERVICE WORKER ====================
  const offlineText = document.getElementById('offline-text');
  const offlineDot = document.getElementById('offline-dot');
  let swReadyState = false;

  function updateOfflineIndicator() {
    if (!navigator.onLine) {
      offlineText.textContent = 'Offline';
      offlineDot.style.background = '#d97706';
    } else if (swReadyState) {
      offlineText.textContent = 'Offline listo';
      offlineDot.style.background = 'var(--positive)';
    } else {
      offlineText.textContent = 'En línea';
      offlineDot.style.background = 'var(--positive)';
    }
  }

  window.addEventListener('online', updateOfflineIndicator);
  window.addEventListener('offline', updateOfflineIndicator);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
    navigator.serviceWorker.register('../sw.js', { scope: '../' })
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        swReadyState = true;
        updateOfflineIndicator();
      })
      .catch(() => updateOfflineIndicator());
  } else {
    updateOfflineIndicator();
  }

  // ==================== INICIALIZACIÓN ====================
  loadSliderState();
  loadLogs();
  loadInitialDayState();
  updateCalc(false);
  renderToday();
  renderLogs();
})();
