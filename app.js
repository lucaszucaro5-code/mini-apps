(function () {
  'use strict';

  // ==================== STORAGE KEYS ====================
  const KEYS = {
    logs: 'sm_neat_v7_2_logs',
    neatDraft: 'sm_neat_v7_2_today',
    neatSliders: 'sm_neat_v7_1_state',
    gymState: 'sm_gym_state_v1',
    gymHistory: 'sm_gym_history_v1',
    gymSync: 'sm_gym_sheets_sync_v1',
    seededFlag: 'forma_hist_seeded_v1',
    syncUrl: 'forma_sync_url_v1',
    syncToken: 'forma_sync_token_v1',
    syncQueue: 'forma_sync_queue_v1',
    cloudDirty: 'forma_cloud_dirty_v1',
    deletedLogs: 'forma_deleted_logs_v1',
    metaTs: 'forma_meta_timestamps_v1',
    lastSync: 'forma_last_sync_v1',
    lastSyncError: 'forma_last_sync_error_v1',
    factors: 'forma_cooking_factors_v1',
    customEq: 'forma_custom_equivalences_v1',
    mealExtras: 'forma_meals_extras_v1',
    mealsCalcState: 'forma_meals_calc_v1'
  };

  const DEFAULT_SYNC_URL = 'https://script.google.com/macros/s/AKfycbwrIMA7d8rYlb-4mR13eyxzkXSK2C9IJP2epB5H1GlKvkBiRzp9P6E0NjyuRP6By94DYg/exec';

  // Constantes Protocolo Sistema Maestro v7.1
  const PROTOCOL = {
    startWeightKg: 76.5,
    startWaistCm: 93.0,
    goalWeightKg: 70.7,
    goalWaistCm: 84.5,
    anchorDate: '2026-09-21',
    baseKcal: 2316,
    tdeeKcal: 2860,
    dailyDeficit: -544,
    weeklyDeficitTarget: -3808,
    baseProtG: 156.4
  };

  const fmtInt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const fmtDec1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtDec2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Datos históricos reales desde Pesajes, Medidas y Proyección (Sistema Maestro v7.1)
  const SEED_PESAJES = [
    { date: '2026-09-21', weightKg: 76.5, waistCm: 93.0, bodyFatPct: 23.2, note: 'Línea Base Absoluta (Grasa: 17,75 kg / Magra: 58,75 kg).' },
    { date: '2026-09-27', weightKg: 75.2, waistCm: null, bodyFatPct: 22.1, note: 'Fin Sem 1 · Descarga inicial.' },
    { date: '2026-10-05', weightKg: 74.7, waistCm: null, bodyFatPct: 21.6, note: 'Inicio Sem 3.' },
    { date: '2026-10-10', weightKg: 73.7, waistCm: 90.0, bodyFatPct: null, note: 'Fluctuación puntual baja · Cintura 90,0 cm.' },
    { date: '2026-10-12', weightKg: 74.3, waistCm: null, bodyFatPct: 21.0, note: 'Inicio Sem 4 — retención muscular total.' },
    { date: '2026-10-16', weightKg: 74.2, waistCm: null, bodyFatPct: null, note: 'Consolidación quincenal.' },
    { date: '2026-10-17', weightKg: 73.9, waistCm: 89.0, bodyFatPct: 21.1, note: 'Auditoría Semanal Oficial Sem 3.' },
    { date: '2026-10-18', weightKg: 73.6, waistCm: null, bodyFatPct: null, note: 'Fin Sem 3 · Mínimo puntual.' },
    { date: '2026-10-19', weightKg: 73.85, waistCm: null, bodyFatPct: null, note: 'Inicio Sem 5 · Estabilidad post-finde.' },
    { date: '2026-10-20', weightKg: 74.0, waistCm: null, bodyFatPct: null, note: 'Control actual consolidado · Día Pierna A.' },
    { date: '2026-10-21', weightKg: 74.0, waistCm: null, bodyFatPct: null, note: 'Estabilidad total post-Pierna A y puré de papas.' },
    { date: '2026-10-22', weightKg: 74.1, waistCm: null, bodyFatPct: null, note: 'Media móvil 7 días: 73,95 kg · Día Torso B.' },
    { date: '2026-10-26', weightKg: 73.85, waistCm: null, bodyFatPct: null, note: 'Inicio Sem 6.' },
    { date: '2026-10-27', weightKg: 73.5, waistCm: null, bodyFatPct: null, note: 'Quiebre de 74 kg consolidado · Día Pierna A.' },
    { date: '2026-10-28', weightKg: 73.55, waistCm: null, bodyFatPct: null, note: 'Estabilidad metabólica · Descanso activo.' },
    { date: '2026-10-30', weightKg: 73.2, waistCm: null, bodyFatPct: null, note: 'Nuevo mínimo absoluto de recomposición · Día Pierna B.' },
    { date: '2026-10-31', weightKg: 73.4, waistCm: 86.5, bodyFatPct: 19.1, note: 'Auditoría Sem 6 · Sub-20% GC y cintura 86,5 cm.' },
    { date: '2026-11-01', weightKg: 73.15, waistCm: null, bodyFatPct: null, note: 'Cierre Sem 6 · Semáforo Verde.' },
    { date: '2026-11-03', weightKg: 73.25, waistCm: null, bodyFatPct: null, note: 'Control diario Sem 7 · Día Pierna A.' },
    { date: '2026-11-04', weightKg: 73.15, waistCm: null, bodyFatPct: null, note: 'Pesaje miércoles Sem 7 · Descanso activo.' },
    { date: '2026-11-05', weightKg: 72.8, waistCm: null, bodyFatPct: null, note: 'Sub-73 kg consolidado · Día Torso B.' },
    { date: '2026-11-06', weightKg: 73.15, waistCm: null, bodyFatPct: null, note: 'Fluctuación normal post-Torso B · Día Pierna B.' },
    { date: '2026-11-07', weightKg: 73.0, waistCm: null, bodyFatPct: null, note: 'Descenso post-Pierna B.' },
    { date: '2026-11-08', weightKg: 73.05, waistCm: 85.0, bodyFatPct: 18.0, note: 'Auditoría Oficial Sem 7 · Cintura 85,0 cm (rango Hito 1).' },
    { date: '2026-11-09', weightKg: 72.9, waistCm: null, bodyFatPct: null, note: 'Inicio Sem 8 · Día Torso A.' },
    { date: '2026-11-11', weightKg: 72.65, waistCm: null, bodyFatPct: null, note: 'Nuevo mínimo histórico Sem 8.' },
    { date: '2026-11-12', weightKg: 72.75, waistCm: null, bodyFatPct: null, note: 'Día de descanso activo.' },
    { date: '2026-11-13', weightKg: 72.7, waistCm: null, bodyFatPct: null, note: 'Consolida zona sub-73 kg previo a Torso B.' },
    { date: '2026-11-14', weightKg: 72.35, waistCm: null, bodyFatPct: null, note: 'Quiebre firme de 72,6 kg · Día Pierna B.' },
    { date: '2026-11-15', weightKg: 72.55, waistCm: 85.5, bodyFatPct: null, note: 'Cierre Sem 8 / Auditoría Oficial (prom Sem 8: 72,65 kg).' },
    { date: '2026-11-16', weightKg: 72.45, waistCm: null, bodyFatPct: null, note: 'Inicio Sem 9 · Día Torso A.' },
    { date: '2026-11-17', weightKg: 72.7, waistCm: null, bodyFatPct: null, note: 'Fluctuación post-Torso A · Día Pierna A.' },
    { date: '2026-11-18', weightKg: 72.5, waistCm: null, bodyFatPct: null, note: 'Descarga post-Pierna A · Plan nutricional congelado 2.316 kcal.' },
    { date: '2026-11-19', weightKg: 72.3, waistCm: null, bodyFatPct: null, note: 'Nuevo mínimo absoluto (-4,20 kg) · Inicio Bisglicinato Magnesio.' },
    { date: '2026-11-20', weightKg: 72.3, waistCm: null, bodyFatPct: null, note: 'Empata mínimo histórico (-4,20 kg) · Día Torso B.' }
  ];

  // ==================== DATOS NUTRICIÓN v7.1 ====================
  const QUOTA_PRESETS = [
    { id: 'papa_pollo', label: 'Papa Pollo (330g)', grams: 330, dir: 'raw_to_cooked', factorId: 'papa_horno' },
    { id: 'papa_carne', label: 'Papa Carne (245g)', grams: 245, dir: 'raw_to_cooked', factorId: 'papa_horno' },
    { id: 'batata_pollo', label: 'Batata Pollo (300g)', grams: 300, dir: 'raw_to_cooked', factorId: 'batata_horno' },
    { id: 'calabaza_pollo', label: 'Calabaza (550g)', grams: 550, dir: 'raw_to_cooked', factorId: 'calabaza_horno' },
    { id: 'arroz_alm', label: 'Arroz Alm. (80g)', grams: 80, dir: 'raw_to_cooked', factorId: 'arroz_blanco' },
    { id: 'pollo_alm', label: 'Pollo Alm. (80g coc.)', grams: 80, dir: 'cooked_to_raw', factorId: 'pollo_pechuga' },
    { id: 'pollo_cena', label: 'Pollo Cena (100g coc.)', grams: 100, dir: 'cooked_to_raw', factorId: 'pollo_pechuga' },
    { id: 'carne_cena', label: 'Carne Cena (200g cruda)', grams: 200, dir: 'raw_to_cooked', factorId: 'carne_magra' },
    { id: 'custom', label: 'Cuota libre', grams: 150, dir: 'raw_to_cooked', factorId: 'papa_hervida_trozos' }
  ];

  const DEFAULT_FACTORS = [
    { id: 'papa_horno', name: 'Papa al horno / Airfryer', factor: 0.72, note: 'Merma ~28% por evaporación' },
    { id: 'papa_hervida_trozos', name: 'Papa hervida en trozos (sin piel)', factor: 0.90, note: 'Merma ~10%' },
    { id: 'papa_hervida_piel', name: 'Papa hervida entera (con piel)', factor: 0.95, note: 'Merma ~5%' },
    { id: 'papa_pure', name: 'Puré de papa base (sin leche/aceite)', factor: 0.92, note: 'Merma ~8%' },
    { id: 'batata_hervida', name: 'Batata hervida', factor: 0.92, note: 'Merma ~8%' },
    { id: 'batata_horno', name: 'Batata al horno / Airfryer', factor: 0.74, note: 'Merma ~26%' },
    { id: 'calabaza_horno', name: 'Calabaza al horno / Airfryer', factor: 0.62, note: 'Pierde mucha agua (~38%)' },
    { id: 'calabaza_hervida', name: 'Calabaza hervida', factor: 0.85, note: 'Merma ~15%' },
    { id: 'arroz_blanco', name: 'Arroz blanco largo fino', factor: 2.80, note: 'Hidrata ~2,8x peso seco' },
    { id: 'arroz_basmati', name: 'Arroz Basmati / Integral', factor: 2.65, note: 'Hidrata ~2,65x peso seco' },
    { id: 'fideos_semola', name: 'Fideos de sémola secos', factor: 2.35, note: 'Hidrata ~2,35x peso seco' },
    { id: 'lentejas_secas', name: 'Lentejas / Legumbres secas', factor: 2.40, note: 'Hidrata ~2,4x peso seco' },
    { id: 'pollo_pechuga', name: 'Pechuga de pollo (plancha / horno)', factor: 0.75, note: '80g cocidos ≈ 107g crudos' },
    { id: 'carne_magra', name: 'Carne vacuna magra (plancha)', factor: 0.73, note: '200g cruda ≈ 146g cocida' }
  ];

  const SWAP_BASES = [
    { id: 'avena', name: 'Avena instantánea (Merienda · 75 g)', quotaG: 75, kcalPer100: 369.33, protPer100: 13.5, carbsPer100: 66.0, fatPer100: 7.0 },
    { id: 'papa_pollo', name: 'Papa cruda — Cena Pollo (330 g)', quotaG: 330, kcalPer100: 77, protPer100: 2.0, carbsPer100: 17.5, fatPer100: 0.1 },
    { id: 'papa_carne', name: 'Papa cruda — Cena Carne (245 g)', quotaG: 245, kcalPer100: 77, protPer100: 2.0, carbsPer100: 17.5, fatPer100: 0.1 },
    { id: 'arroz', name: 'Arroz blanco seco — Almuerzo (80 g)', quotaG: 80, kcalPer100: 360, protPer100: 7.0, carbsPer100: 80.0, fatPer100: 0.6 },
    { id: 'pan', name: 'Pan integral — Desayuno (52 g)', quotaG: 52, kcalPer100: 245, protPer100: 9.0, carbsPer100: 43.0, fatPer100: 3.5 },
    { id: 'queso', name: 'Queso Port Salut — Desayuno (62 g)', quotaG: 62, kcalPer100: 270, protPer100: 24.0, carbsPer100: 1.5, fatPer100: 19.0 },
    { id: 'almendras', name: 'Almendras — Merienda (20 g)', quotaG: 20, kcalPer100: 579, protPer100: 21.2, carbsPer100: 21.6, fatPer100: 49.9 },
    { id: 'naranja', name: 'Naranja — Almuerzo / Noche (190 g)', quotaG: 190, kcalPer100: 47, protPer100: 0.9, carbsPer100: 11.8, fatPer100: 0.1 }
  ];

  const SWAP_ITEMS = [
    { id: 'turron', name: 'Turrón de maní (25 g)', unitLabel: 'Unidades (1 u = 25 g)', unitGrams: 25, kcal: 98, prot: 1.3, carbs: 19.0, fat: 1.8 },
    { id: 'galleta_arroz', name: 'Galleta de arroz sin sal (10 g)', unitLabel: 'Unidades (1 u = 10 g)', unitGrams: 10, kcal: 38, prot: 0.8, carbs: 8.2, fat: 0.2 },
    { id: 'choco_80', name: 'Chocolate 80% cacao (10 g)', unitLabel: 'Porciones (1 u = 10 g)', unitGrams: 10, kcal: 56, prot: 0.9, carbs: 3.2, fat: 4.3 },
    { id: 'barrita_cereal', name: 'Barrita de cereal clásica (22 g)', unitLabel: 'Unidades (1 u = 22 g)', unitGrams: 22, kcal: 86, prot: 1.5, carbs: 16.0, fat: 1.7 },
    { id: 'banana', name: 'Banana mediana (100 g)', unitLabel: 'Unidades (100 g netos)', unitGrams: 100, kcal: 89, prot: 1.1, carbs: 22.8, fat: 0.3 },
    { id: 'pasta_mani', name: 'Pasta de maní 100% (15 g)', unitLabel: 'Cucharadas (15 g)', unitGrams: 15, kcal: 88, prot: 3.9, carbs: 2.7, fat: 7.5 },
    { id: 'pan_masa_madre', name: 'Pan de masa madre (45 g)', unitLabel: 'Rebanadas (45 g)', unitGrams: 45, kcal: 115, prot: 3.8, carbs: 23.0, fat: 0.6 },
    { id: 'fajita', name: 'Fajita integral (45 g)', unitLabel: 'Unidades (1 u = 45 g)', unitGrams: 45, kcal: 130, prot: 4.0, carbs: 22.0, fat: 2.8 },
    { id: 'dulce', name: 'Mermelada / Dulce (20 g)', unitLabel: 'Cucharadas (20 g)', unitGrams: 20, kcal: 54, prot: 0.1, carbs: 13.5, fat: 0.0 },
    { id: 'custom', name: 'Otro alimento (carga manual)', unitLabel: 'Porciones', unitGrams: 1, kcal: 120, prot: 0, carbs: 20, fat: 2 }
  ];

  const OFFICIAL_MATRIX = [
    { group: 'Desayuno (Pan)', text: '52 g Pan integral = 1 Fajita integral = 45 g pan masa madre = 3 galletas arroz + 25 g avena' },
    { group: 'Desayuno (Queso)', text: '62 g Port Salut = 55 g Tybo magro = 40 g Port Salut + 30 g Jamón cocido = 100 g Ricota magra' },
    { group: 'Almuerzo (Proteína)', text: '80 g Pollo cocido = 80 g Solomillo cerdo = 80 g Peceto/Nalga cocido = 100 g Merluza = 80 g Atún' },
    { group: 'Almuerzo (Carbos)', text: '55 g Arroz seco = 55 g Fideos sémola = 55 g Arroz Basmati = 60 g Quinoa lavada (en menú base actual: 80 g arroz seco)' },
    { group: 'Almuerzo (Legumbres)', text: '50 g Lentejas = 50 g Garbanzos = 50 g Porotos = 60 g Choclo / Arvejas' },
    { group: 'Merienda (Grasas)', text: '20 g Almendras = 20 g Pasta de maní = 18 g Nueces = 22 g Semillas girasol/zapallo' },
    { group: 'Cena Pollo (Tubérculos)', text: '330 g Papa cruda = 295–300 g Batata cruda = 550 g Calabaza = Mix 165 g papa + 275 g calabaza' },
    { group: 'Cena Carne (Tubérculos)', text: '245 g Papa cruda = 230 g Batata cruda = 410 g Calabaza' },
    { group: 'Fruta / Nocturno', text: '190 g Naranja = 150 g Kiwi = 200 g Mandarina = 250 g Frutillas = 165 g Manzana' }
  ];

  const FIXED_MENU = [
    { time: '08:30 hs', title: 'Despertar y Regulación Autonómica', body: 'Luz solar directa + Respiración coherente (3 rondas Wim Hof solo en Semáforo Verde).', macros: 'Hábito' },
    { time: '09:30 hs', title: 'Desayuno Proteico Fortificado', body: 'Pan integral 50–53 g, Queso Port Salut 60–64 g, Café con leche 1% + 26 g Leche Protein (disolver leche en polvo en agua tibia antes).', macros: '450 kcal · 33g P · 42g C · 16g G' },
    { time: '13:00 hs', title: 'Almuerzo Pre-Entreno Aligerado', body: '80 g Pollo cocido (pechuga), 80 g Arroz seco, Ensalada, 5 g AOVE, 190 g Naranja.', macros: '579 kcal · 33,1g P · 90,2g C · 8,6g G' },
    { time: '14:00 hs', title: 'Descanso Neuro-Vegetativo', body: 'Protocolo NSDR · 20 min a oscuras, cuello neutro.', macros: 'Recuperación' },
    { time: '15:30 hs', title: 'Activación Pre-Entreno', body: 'Mate calibrado (45–50 g yerba, máx 300 ml agua). Corte estricto de cafeína 15:50 hs.', macros: 'Estimulación' },
    { time: '17:35 hs', title: 'Merienda Post-Entreno Anabólica', body: '75 g Avena instantánea (reposo 10 min con 30–40 ml agua), 250 g Yogur natural, 20 g Almendras picadas al final, 7 g Creatina. Sin leche en polvo, cacao ni canela.', macros: '544 kcal · 16g P · 55g C · 23g G' },
    { time: '21:30 hs', title: 'Cena Reparadora', body: 'Pollo (100 g cocido) + 330 g Papa cruda O Carne (200 g cruda) + 245 g Papa cruda, Verdura. 0 g AOVE en cena.', macros: '611 kcal (pollo) / 573 (carne) · 41g P · 58g C' },
    { time: '22:55 hs', title: 'Blindaje Nocturno Anti-Cortisol', body: '190 g Naranja (o 150 g Kiwi), Shot Bisglicinato de Magnesio (3,5 g en 50–70 ml agua). Cierre: Chocolate 80%.', macros: '90 kcal · 2g P · 22g C' }
  ];

  // ==================== STATE ====================
  let activeTab = 'home';
  let logFilter = 'all';
  let logs = {};
  let syncQueue = {};
  let deletedLogs = {};
  let metaTs = {};
  let factors = [];
  let customEquivalences = [];
  let mealExtras = {};
  let rcMode = 'witness';
  let selectedQuotaId = 'papa_pollo';
  let toastTimer = null;
  let swReady = false;
  let syncBusy = false;
  let syncQueuedWhileBusy = false;
  let syncDebounceTimer = null;
  let lastAutoPullMs = 0;
  const loadedFrames = { gym: false, neat: false };

  // ==================== HELPERS ====================
  function getTodayIso(d = new Date()) {
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
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${days[dt.getDay()]} ${d} ${months[m - 1]} ${y}`;
  }

  function formatShortDate(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '--';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  function calcWeekNum(dateIso = getTodayIso()) {
    const parts = dateIso.split('-').map(Number);
    if (parts.length !== 3) return 9;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    const anchor = new Date(2026, 8, 21); // 2026-09-21
    const diff = Math.floor((dt.getTime() - anchor.getTime()) / 86400000);
    return diff <= 0 ? 1 : Math.floor(diff / 7) + 1;
  }

  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJsonStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  function parseOptionalNum(raw, decimals = 2) {
    const clean = String(raw ?? '').trim().replace(',', '.');
    if (!clean) return null;
    const n = Number(clean);
    if (!Number.isFinite(n) || n <= 0) return null;
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  }

  function showToast(msg, ms = 2600) {
    const el = document.getElementById('forma-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), ms);
  }

  // ==================== STORAGE BOOT & SEEDING ====================
  function bootstrapLogs() {
    const stored = readJsonStorage(KEYS.logs, {});
    logs = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};

    if (!localStorage.getItem(KEYS.seededFlag)) {
      for (const s of SEED_PESAJES) {
        const prev = logs[s.date] || {};
        logs[s.date] = {
          date: s.date,
          items: Array.isArray(prev.items) ? prev.items : [],
          totalSteps: Number.isFinite(prev.totalSteps) ? prev.totalSteps : 0,
          totalKcalGross: Number.isFinite(prev.totalKcalGross) ? prev.totalKcalGross : 0,
          totalKcalNet: Number.isFinite(prev.totalKcalNet) ? prev.totalKcalNet : 0,
          totalMinutes: Number.isFinite(prev.totalMinutes) ? prev.totalMinutes : 0,
          totalKm: Number.isFinite(prev.totalKm) ? prev.totalKm : 0,
          weightKg: Number.isFinite(prev.weightKg) ? prev.weightKg : s.weightKg,
          waistCm: Number.isFinite(prev.waistCm) ? prev.waistCm : s.waistCm,
          bodyFatPct: Number.isFinite(prev.bodyFatPct) ? prev.bodyFatPct : s.bodyFatPct,
          note: prev.note || s.note,
          updatedAt: prev.updatedAt || `${s.date}T12:00:00.000Z`
        };
      }
      writeJsonStorage(KEYS.logs, logs);
      try { localStorage.setItem(KEYS.seededFlag, '1'); } catch (_) {}
    }
  }

  function loadAppData() {
    bootstrapLogs();
    const q = readJsonStorage(KEYS.syncQueue, {});
    syncQueue = q && typeof q === 'object' && !Array.isArray(q) ? q : {};

    const d = readJsonStorage(KEYS.deletedLogs, {});
    deletedLogs = d && typeof d === 'object' && !Array.isArray(d) ? d : {};

    const ts = readJsonStorage(KEYS.metaTs, {});
    metaTs = ts && typeof ts === 'object' && !Array.isArray(ts) ? ts : {};
    if (!metaTs.mealExtrasDates || typeof metaTs.mealExtrasDates !== 'object') {
      metaTs.mealExtrasDates = {};
    }

    const savedFactors = readJsonStorage(KEYS.factors, null);
    factors = Array.isArray(savedFactors) && savedFactors.length ? savedFactors : DEFAULT_FACTORS.map((x) => ({ ...x }));

    const savedEq = readJsonStorage(KEYS.customEq, null);
    customEquivalences = Array.isArray(savedEq) ? savedEq : [
      { id: 'eq_turron_avena', title: '1 Turrón maní (25 g) ↔ -27 g Avena', detail: 'Reemplazo parcial merienda: dejás 48 g de avena en balanza (98 kcal).' },
      { id: 'eq_galleta_avena', title: '2 Galletas arroz (20 g) ↔ -21 g Avena', detail: '76 kcal · Pesás 54 g de avena en merienda.' }
    ];

    const savedExtras = readJsonStorage(KEYS.mealExtras, {});
    mealExtras = savedExtras && typeof savedExtras === 'object' ? savedExtras : {};
  }

  function touchMetaTs(field, subDate = null) {
    const nowIso = new Date().toISOString();
    if (!metaTs || typeof metaTs !== 'object') metaTs = { mealExtrasDates: {} };
    if (!metaTs.mealExtrasDates) metaTs.mealExtrasDates = {};
    if (field === 'mealExtras' && subDate) {
      metaTs.mealExtrasDates[subDate] = nowIso;
    } else {
      metaTs[field] = nowIso;
    }
    writeJsonStorage(KEYS.metaTs, metaTs);
    return nowIso;
  }

  function getSyncToken() {
    try {
      return String(localStorage.getItem(KEYS.syncToken) || '').trim();
    } catch (_) {
      return '';
    }
  }

  function setSyncToken(tok) {
    try {
      localStorage.setItem(KEYS.syncToken, String(tok || '').trim());
    } catch (_) {}
  }

  function isCloudDirty() {
    try {
      return localStorage.getItem(KEYS.cloudDirty) === '1' || Object.keys(syncQueue).length > 0;
    } catch (_) {
      return Object.keys(syncQueue).length > 0;
    }
  }

  function markCloudDirty(changedDate = null) {
    try { localStorage.setItem(KEYS.cloudDirty, '1'); } catch (_) {}
    if (changedDate && /^\d{4}-\d{2}-\d{2}$/.test(changedDate) && logs[changedDate]) {
      syncQueue[changedDate] = {
        date: changedDate,
        weightKg: logs[changedDate].weightKg,
        waistCm: logs[changedDate].waistCm,
        bodyFatPct: logs[changedDate].bodyFatPct,
        totalSteps: logs[changedDate].totalSteps,
        note: logs[changedDate].note
      };
      writeJsonStorage(KEYS.syncQueue, syncQueue);
    }
  }

  function clearCloudDirty() {
    try { localStorage.setItem(KEYS.cloudDirty, '0'); } catch (_) {}
    syncQueue = {};
    writeJsonStorage(KEYS.syncQueue, syncQueue);
  }

  function getSyncUrl() {
    const customUrl = localStorage.getItem(KEYS.syncUrl);
    if (customUrl && customUrl.trim()) return customUrl.trim();
    const gymSync = readJsonStorage(KEYS.gymSync, null);
    if (gymSync && gymSync.url && gymSync.url.trim()) return gymSync.url.trim();
    return DEFAULT_SYNC_URL;
  }

  function setSyncUrl(url) {
    const clean = String(url || '').trim();
    try { localStorage.setItem(KEYS.syncUrl, clean); } catch (_) {}
    const gymSync = readJsonStorage(KEYS.gymSync, {});
    if (gymSync && typeof gymSync === 'object') {
      gymSync.url = clean || DEFAULT_SYNC_URL;
      writeJsonStorage(KEYS.gymSync, gymSync);
    }
  }

  function notifyOtherModules(eventType = 'forma-logs-updated') {
    const origin = location.origin === 'null' ? '*' : location.origin;
    if (loadedFrames.neat) {
      const f = document.getElementById('frame-neat');
      if (f && f.contentWindow) f.contentWindow.postMessage({ type: eventType }, origin);
    }
    if (loadedFrames.gym && eventType === 'forma-cloud-synced') {
      const fg = document.getElementById('frame-gym');
      if (fg && fg.contentWindow) fg.contentWindow.postMessage({ type: 'forma-cloud-synced' }, origin);
    }
  }

  // ==================== TAB NAVIGATION ====================
  function switchTab(tab) {
    if (!['home', 'gym', 'neat', 'meals'].includes(tab)) return;
    activeTab = tab;

    document.querySelectorAll('.tabbar-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.forma-view').forEach((v) => {
      v.classList.toggle('is-active', v.id === `view-${tab}`);
    });

    if (tab === 'gym' && !loadedFrames.gym) {
      document.getElementById('frame-gym').src = './gym/?embedded=1';
      loadedFrames.gym = true;
    }
    if (tab === 'neat' && !loadedFrames.neat) {
      document.getElementById('frame-neat').src = './neat/?embedded=1';
      loadedFrames.neat = true;
    }
    if (tab === 'home') {
      loadAppData();
      renderHome();
      if (isCloudDirty() && navigator.onLine && getSyncToken() && !syncBusy) {
        syncWithSheets(false);
      }
    }
    if (tab === 'meals') {
      renderMealsAll();
    }

    try { history.replaceState(null, '', `#${tab}`); } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // ==================== TODAY LIVE METRICS (HOME PILLARS) ====================
  function getTodayLiveSteps(todayIso) {
    const draft = readJsonStorage(KEYS.neatDraft, null);
    const saved = logs[todayIso];
    let draftSteps = 0;
    if (draft && draft.date === todayIso && Array.isArray(draft.items)) {
      draftSteps = draft.items.reduce((s, it) => s + (Math.round(Number(it.steps) || 0)), 0);
    }
    const savedSteps = saved ? (Math.round(Number(saved.totalSteps) || 0)) : 0;
    return Math.max(draftSteps, savedSteps);
  }

  function getTodayGymSummary() {
    const gymState = readJsonStorage(KEYS.gymState, null);
    const dayMap = {
      1: { key: 'torso_a', title: 'Torso A' },
      2: { key: 'pierna_a', title: 'Pierna A' },
      3: { key: 'rest', title: 'Descanso activo' },
      4: { key: 'torso_b', title: 'Torso B' },
      5: { key: 'pierna_b', title: 'Pierna B' },
      6: { key: 'rest', title: 'Cardio / Finde' },
      0: { key: 'rest', title: 'Auditoría Dom.' }
    };
    const dow = new Date().getDay();
    const scheduled = dayMap[dow];
    let activeKey = scheduled.key;
    let title = scheduled.title;
    let doneSets = 0;
    let totalSets = 0;
    let timerRunning = false;

    if (gymState && gymState.days) {
      timerRunning = !!(gymState.workoutTimer && gymState.workoutTimer.running);
      if (scheduled.key === 'rest' && gymState.activeDay && gymState.days[gymState.activeDay]) {
        const list = gymState.days[gymState.activeDay];
        const anyDone = list.some((ex) => (ex.sets || []).some((s) => s.done || s.doneL || s.doneR));
        if (anyDone) activeKey = gymState.activeDay;
      }
      if (gymState.days[activeKey]) {
        const list = gymState.days[activeKey];
        for (const ex of list) {
          for (const st of (ex.sets || [])) {
            totalSets += 1;
            if (st.done || (st.doneL && st.doneR)) doneSets += 1;
          }
        }
      }
    }

    return { title, doneSets, totalSets, timerRunning, isRest: activeKey === 'rest' };
  }

  // ==================== WEIGHT TREND SVG CHART ====================
  function renderWeightChart(weightEntriesAsc) {
    const svg = document.getElementById('home-weight-chart');
    if (!svg) return;

    const slice = weightEntriesAsc.slice(-14);
    if (slice.length < 2) {
      svg.innerHTML = `<text x="160" y="60" text-anchor="middle" fill="var(--label-3)" font-size="12">Agregá al menos 2 pesajes para ver la curva</text>`;
      return;
    }

    const W = 320;
    const H = 116;
    const padL = 34;
    const padR = 12;
    const padT = 14;
    const padB = 22;

    const weights = slice.map((e) => e.weightKg);
    const minVal = Math.min(...weights, PROTOCOL.goalWeightKg) - 0.35;
    const maxVal = Math.max(...weights) + 0.35;
    const span = Math.max(0.5, maxVal - minVal);

    const xAt = (i) => padL + (i / (slice.length - 1)) * (W - padL - padR);
    const yAt = (val) => padT + ((maxVal - val) / span) * (H - padT - padB);

    const goalY = yAt(PROTOCOL.goalWeightKg);
    const pts = slice.map((e, i) => `${xAt(i).toFixed(1)},${yAt(e.weightKg).toFixed(1)}`).join(' ');

    const lastIdx = slice.length - 1;
    const lastX = xAt(lastIdx);
    const lastY = yAt(slice[lastIdx].weightKg);
    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);

    svg.innerHTML = `
      <line x1="${padL}" y1="${goalY.toFixed(1)}" x2="${W - padR}" y2="${goalY.toFixed(1)}"
            stroke="var(--green)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7" />
      <text x="2" y="${(goalY + 3).toFixed(1)}" fill="var(--green)" font-size="10" font-weight="600">${fmtDec1.format(PROTOCOL.goalWeightKg)}</text>
      <text x="2" y="${padT + 4}" fill="var(--label-3)" font-size="10">${fmtDec1.format(maxW)}</text>
      <polyline fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
      ${slice.map((e, i) => {
        const cx = xAt(i).toFixed(1);
        const cy = yAt(e.weightKg).toFixed(1);
        const isLast = i === lastIdx;
        return `<circle cx="${cx}" cy="${cy}" r="${isLast ? 4 : 2.2}" fill="${isLast ? 'var(--accent)' : 'var(--surface)'}" stroke="var(--accent)" stroke-width="${isLast ? 2 : 1.5}" />`;
      }).join('')}
      <text x="${padL}" y="${H - 4}" fill="var(--label-3)" font-size="10">${formatShortDate(slice[0].date)}</text>
      <text x="${W - padR}" y="${H - 4}" text-anchor="end" fill="var(--label-2)" font-size="10" font-weight="600">${formatShortDate(slice[lastIdx].date)} · Mín ${fmtDec1.format(minW)}</text>
    `;

    document.getElementById('home-chart-range').textContent = `Últimos ${slice.length} pesajes`;
  }

  // ==================== RENDER HOME ====================
  function renderHome() {
    const todayIso = getTodayIso();
    const weekNum = calcWeekNum(todayIso);

    document.getElementById('home-greeting-title').textContent = 'Hoy';
    document.getElementById('home-subtitle').textContent =
      `${formatDateDisplay(todayIso)} · Plan Sistema Maestro v7.1 · Sem ${weekNum}`;

    const datesAsc = Object.keys(logs).sort();
    const datesDesc = [...datesAsc].reverse();

    const withWeightAsc = datesAsc.map((d) => logs[d]).filter((e) => Number.isFinite(e.weightKg));
    const withWaistAsc = datesAsc.map((d) => logs[d]).filter((e) => Number.isFinite(e.waistCm));

    const latestW = withWeightAsc.length ? withWeightAsc[withWeightAsc.length - 1] : null;
    const latestWaist = withWaistAsc.length ? withWaistAsc[withWaistAsc.length - 1] : null;

    if (latestW) {
      document.getElementById('home-cur-weight').textContent = fmtDec2.format(latestW.weightKg);
      const deltaTotal = latestW.weightKg - PROTOCOL.startWeightKg;
      const sign = deltaTotal > 0 ? '+' : '';
      const pill = document.getElementById('home-delta-pill');
      pill.textContent = `${sign}${fmtDec2.format(deltaTotal)} kg acum.`;
      pill.className = `pill tabular ${deltaTotal <= 0 ? 'pill-green' : 'pill-amber'}`;

      const totalToLose = PROTOCOL.startWeightKg - PROTOCOL.goalWeightKg; // 5.80
      const lostSoFar = Math.max(0, PROTOCOL.startWeightKg - latestW.weightKg);
      const pct = Math.min(100, Math.max(0, Math.round((lostSoFar / totalToLose) * 100)));
      const remaining = Math.max(0, latestW.weightKg - PROTOCOL.goalWeightKg);

      document.getElementById('home-goal-fill').style.width = `${pct}%`;
      document.getElementById('home-goal-pct').textContent = remaining > 0
        ? `${pct}% completado · Faltan ${fmtDec2.format(remaining)} kg`
        : 'Hito 1 alcanzado (15% GC)';
      document.getElementById('home-to-goal').textContent = `${fmtDec1.format(PROTOCOL.goalWeightKg)} kg`;
    } else {
      document.getElementById('home-cur-weight').textContent = '--';
      document.getElementById('home-delta-pill').textContent = 'Sin datos';
    }

    // Promedio 7 días de peso
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffIso = getTodayIso(cutoff);
    const recentW = withWeightAsc.filter((e) => e.date >= cutoffIso);
    const avgPool = recentW.length ? recentW : withWeightAsc.slice(-7);
    document.getElementById('home-avg-weight').textContent = avgPool.length
      ? `${fmtDec2.format(avgPool.reduce((s, e) => s + e.weightKg, 0) / avgPool.length)} kg`
      : '--';

    document.getElementById('home-cur-waist').textContent = latestWaist
      ? `${fmtDec1.format(latestWaist.waistCm)} cm`
      : '--';

    renderWeightChart(withWeightAsc);

    // 4 Pillar Tiles
    const todayLog = logs[todayIso];
    document.getElementById('tile-weight-val').textContent = (todayLog && Number.isFinite(todayLog.weightKg))
      ? `${fmtDec2.format(todayLog.weightKg)} kg`
      : (latestW ? `${fmtDec2.format(latestW.weightKg)} kg` : 'Cargar');
    document.getElementById('tile-weight-sub').textContent = (todayLog && Number.isFinite(todayLog.weightKg))
      ? `Cargado hoy${Number.isFinite(todayLog.waistCm) ? ` · ${fmtDec1.format(todayLog.waistCm)} cm` : ''}`
      : (latestW ? `Último: ${formatShortDate(latestW.date)} · Tocar para hoy` : 'Tocar para registrar hoy');

    const todaySteps = getTodayLiveSteps(todayIso);
    document.getElementById('tile-neat-val').textContent = `${fmtInt.format(todaySteps)} pasos`;
    document.getElementById('tile-neat-sub').textContent = todaySteps >= 10000
      ? 'Meta 10k alcanzada'
      : todaySteps >= 8000
        ? 'Piso 8k cumplido'
        : `Faltan ${fmtInt.format(Math.max(0, 8000 - todaySteps))} para 8k`;
    document.getElementById('dot-neat-active').classList.toggle('is-visible', todaySteps > 0);

    const todayExtrasList = Array.isArray(mealExtras[todayIso]) ? mealExtras[todayIso] : [];
    const extrasKcal = todayExtrasList.reduce((s, x) => s + (Number(x.kcal) || 0), 0);
    document.getElementById('tile-meals-val').textContent = `${fmtInt.format(PROTOCOL.baseKcal + extrasKcal)} kcal`;
    document.getElementById('tile-meals-sub').textContent = extrasKcal > 0
      ? `+${fmtInt.format(extrasKcal)} kcal extras hoy`
      : 'Plan estricto · Balanza lista';

    const gymInfo = getTodayGymSummary();
    document.getElementById('tile-gym-val').textContent = gymInfo.title;
    document.getElementById('tile-gym-sub').textContent = gymInfo.totalSets > 0
      ? `${gymInfo.doneSets}/${gymInfo.totalSets} series${gymInfo.timerRunning ? ' · En vivo' : ''}`
      : 'Tocar para abrir Gym Tracker';
    document.getElementById('dot-gym-active').classList.toggle('is-visible', gymInfo.timerRunning);

    renderHistoryList(datesDesc);
    updateSyncStatusUI();
  }

  function renderHistoryList(datesDesc) {
    const filtered = datesDesc.filter((d) => {
      const e = logs[d];
      if (!e) return false;
      if (logFilter === 'weight') return Number.isFinite(e.weightKg);
      if (logFilter === 'waist') return Number.isFinite(e.waistCm) || Number.isFinite(e.bodyFatPct);
      return true;
    });

    document.getElementById('home-history-count').textContent =
      filtered.length === 1 ? '1 día' : `${filtered.length} días`;

    const listEl = document.getElementById('home-history-list');
    if (!filtered.length) {
      listEl.innerHTML = `<div class="inset-row"><div class="inset-row-desc">No hay registros en este filtro. Cargá un registro arriba para empezar.</div></div>`;
      return;
    }

    listEl.innerHTML = filtered.slice(0, 40).map((d) => {
      const e = logs[d];
      const delta = Number.isFinite(e.weightKg) ? e.weightKg - PROTOCOL.startWeightKg : null;
      const badgeClass = Number.isFinite(e.waistCm)
        ? 'pill-blue'
        : (delta !== null && delta <= 0 ? 'pill-green' : 'pill-neutral');
      const badgeLabel = Number.isFinite(e.waistCm)
        ? 'Auditoría'
        : (delta !== null ? `${delta > 0 ? '+' : ''}${fmtDec2.format(delta)} kg` : `${fmtInt.format(e.totalSteps || 0)} p`);

      const chips = [];
      if (Number.isFinite(e.weightKg)) chips.push(`<span class="mini-chip tabular">${fmtDec2.format(e.weightKg)} kg</span>`);
      if (Number.isFinite(e.waistCm)) chips.push(`<span class="mini-chip tabular">${fmtDec1.format(e.waistCm)} cm</span>`);
      if (Number.isFinite(e.bodyFatPct)) chips.push(`<span class="mini-chip tabular">${fmtDec1.format(e.bodyFatPct)}% GC</span>`);
      if (e.totalSteps > 0) chips.push(`<span class="mini-chip tabular">${fmtInt.format(e.totalSteps)} pasos</span>`);

      const queuedBadge = syncQueue[d] ? `<span class="pill pill-amber" style="font-size:11px;padding:2px 7px;">Pendiente</span>` : '';

      return `
        <div class="inset-row">
          <div class="inset-row-top">
            <span class="inset-row-title">${escHtml(formatDateDisplay(d))}</span>
            <div style="display:flex;gap:5px;align-items:center;">
              ${queuedBadge}
              <span class="pill ${badgeClass} tabular">${badgeLabel}</span>
            </div>
          </div>
          <div class="log-metrics-line">${chips.join('')}</div>
          ${e.note ? `<div class="inset-row-desc">${escHtml(e.note)}</div>` : ''}
          <div class="btn-row" style="justify-content:flex-end;margin-top:8px;">
            <button type="button" class="btn btn-sm" data-edit-date="${escHtml(d)}">Editar</button>
            <button type="button" class="btn btn-sm btn-ghost-danger" data-del-date="${escHtml(d)}">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('button[data-edit-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.editDate;
        loadDateIntoHomeForm(d);
        document.getElementById('home-log-anchor').scrollIntoView({ behavior: 'smooth' });
        showToast(`Editando ${formatShortDate(d)}`);
      });
    });

    listEl.querySelectorAll('button[data-del-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.delDate;
        if (!window.confirm(`¿Eliminar el registro del ${formatDateDisplay(d)}?`)) return;
        delete logs[d];
        delete syncQueue[d];
        deletedLogs[d] = new Date().toISOString();
        writeJsonStorage(KEYS.logs, logs);
        writeJsonStorage(KEYS.syncQueue, syncQueue);
        writeJsonStorage(KEYS.deletedLogs, deletedLogs);
        if (document.getElementById('hl-date').value === d) {
          loadDateIntoHomeForm(d);
        }
        renderHome();
        notifyOtherModules('forma-logs-updated');
        scheduleCloudPush();
        showToast(`Registro del ${formatShortDate(d)} eliminado`);
      });
    });
  }

  function loadDateIntoHomeForm(dateIso) {
    const dateEl = document.getElementById('hl-date');
    const weightEl = document.getElementById('hl-weight');
    const waistEl = document.getElementById('hl-waist');
    const fatEl = document.getElementById('hl-fat');
    const stepsEl = document.getElementById('hl-steps');
    const noteEl = document.getElementById('hl-note');
    const statusEl = document.getElementById('log-form-status');

    dateEl.value = dateIso;
    const entry = logs[dateIso];
    if (entry) {
      weightEl.value = Number.isFinite(entry.weightKg) ? String(entry.weightKg) : '';
      waistEl.value = Number.isFinite(entry.waistCm) ? String(entry.waistCm) : '';
      fatEl.value = Number.isFinite(entry.bodyFatPct) ? String(entry.bodyFatPct) : '';
      const steps = entry.totalSteps > 0 ? entry.totalSteps : (dateIso === getTodayIso() ? getTodayLiveSteps(dateIso) : 0);
      stepsEl.value = steps > 0 ? String(steps) : '';
      noteEl.value = entry.note || '';
      statusEl.textContent = 'Registro existente (podés editar)';
    } else {
      weightEl.value = '';
      waistEl.value = '';
      fatEl.value = '';
      const liveSteps = dateIso === getTodayIso() ? getTodayLiveSteps(dateIso) : 0;
      stepsEl.value = liveSteps > 0 ? String(liveSteps) : '';
      noteEl.value = '';
      statusEl.textContent = 'Nueva fecha limpia';
    }
  }

  function handleSaveHomeLog() {
    const dateIso = document.getElementById('hl-date').value || getTodayIso();
    const w = parseOptionalNum(document.getElementById('hl-weight').value, 2);
    const waist = parseOptionalNum(document.getElementById('hl-waist').value, 1);
    const fat = parseOptionalNum(document.getElementById('hl-fat').value, 1);
    const stepsRaw = parseOptionalNum(document.getElementById('hl-steps').value, 0);
    const note = document.getElementById('hl-note').value.trim();

    if (w === null && waist === null && fat === null && stepsRaw === null && !note) {
      showToast('Ingresá al menos peso, cintura, pasos o nota.');
      return;
    }

    const prev = logs[dateIso] || {};
    const liveDraftSteps = dateIso === getTodayIso() ? getTodayLiveSteps(dateIso) : 0;
    const finalSteps = stepsRaw !== null ? Math.round(stepsRaw) : Math.max(prev.totalSteps || 0, liveDraftSteps);

    logs[dateIso] = {
      date: dateIso,
      items: Array.isArray(prev.items) ? prev.items : [],
      totalSteps: finalSteps,
      totalKcalGross: Number.isFinite(prev.totalKcalGross) ? prev.totalKcalGross : 0,
      totalKcalNet: Number.isFinite(prev.totalKcalNet) ? prev.totalKcalNet : 0,
      totalMinutes: Number.isFinite(prev.totalMinutes) ? prev.totalMinutes : 0,
      totalKm: Number.isFinite(prev.totalKm) ? prev.totalKm : 0,
      weightKg: w !== null ? w : (Number.isFinite(prev.weightKg) ? prev.weightKg : null),
      waistCm: waist !== null ? waist : (Number.isFinite(prev.waistCm) ? prev.waistCm : null),
      bodyFatPct: fat !== null ? fat : (Number.isFinite(prev.bodyFatPct) ? prev.bodyFatPct : null),
      note: note || prev.note || '',
      updatedAt: new Date().toISOString()
    };

    writeJsonStorage(KEYS.logs, logs);
    if (deletedLogs[dateIso]) {
      delete deletedLogs[dateIso];
      writeJsonStorage(KEYS.deletedLogs, deletedLogs);
    }

    loadDateIntoHomeForm(dateIso);
    renderHome();
    notifyOtherModules('forma-logs-updated');
    scheduleCloudPush(dateIso);

    if (navigator.onLine && getSyncToken()) {
      showToast(`Guardado local · Sincronizando ${formatShortDate(dateIso)}...`);
    } else if (!getSyncToken()) {
      showToast(`Guardado local (${formatShortDate(dateIso)}). Configurá tu Clave Privada para sync PC ↔ iPhone.`);
    } else {
      showToast(`Guardado offline (${formatShortDate(dateIso)}). Se sincronizará al volver internet.`);
    }
  }

  // ==================== CLOUD SYNC ENGINE (PC <-> IPHONE) ====================
  function toEpochMs(iso) {
    if (!iso) return 0;
    const t = Date.parse(String(iso));
    return Number.isNaN(t) ? 0 : t;
  }

  function mergeLogEntryClient(entryA, entryB) {
    if (!entryA) return entryB || null;
    if (!entryB) return entryA || null;
    const primary = toEpochMs(entryB.updatedAt) >= toEpochMs(entryA.updatedAt) ? entryB : entryA;
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
    if (!merged.note && secondary.note) merged.note = secondary.note;
    return merged;
  }

  function collectLocalCloudState() {
    const neatDraft = readJsonStorage(KEYS.neatDraft, null);
    const neatSlidersRaw = readJsonStorage(KEYS.neatSliders, null);
    const neatSliders = neatSlidersRaw && typeof neatSlidersRaw === 'object'
      ? { ...neatSlidersRaw, updatedAt: neatSlidersRaw.updatedAt || metaTs.neatSliders || '' }
      : null;

    const wrappedExtras = {};
    for (const [d, v] of Object.entries(mealExtras || {})) {
      if (Array.isArray(v)) {
        wrappedExtras[d] = { items: v, updatedAt: (metaTs.mealExtrasDates && metaTs.mealExtrasDates[d]) || '' };
      } else if (v && typeof v === 'object') {
        wrappedExtras[d] = v;
      }
    }

    const gymHistRaw = readJsonStorage(KEYS.gymHistory, null);
    const gymStateRaw = readJsonStorage(KEYS.gymState, null);

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      logs,
      deletedLogDates: deletedLogs,
      neatDraft,
      neatSliders,
      mealExtras: wrappedExtras,
      factors: { items: factors, updatedAt: metaTs.factors || '' },
      customEquivalences: { items: customEquivalences, updatedAt: metaTs.customEquivalences || '' },
      gymHistory: Array.isArray(gymHistRaw) ? { items: gymHistRaw, updatedAt: metaTs.gymHistory || '' } : null,
      gymState: gymStateRaw && typeof gymStateRaw === 'object' ? { data: gymStateRaw, updatedAt: metaTs.gymState || '' } : null
    };
  }

  function mergeRemoteCloudState(remoteState) {
    if (!remoteState || typeof remoteState !== 'object') return;

    // 1. Tombstones + logs diarios
    const remDel = (remoteState.deletedLogDates && typeof remoteState.deletedLogDates === 'object') ? remoteState.deletedLogDates : {};
    const mergedDel = { ...deletedLogs };
    for (const [d, ts] of Object.entries(remDel)) {
      if (toEpochMs(ts) >= toEpochMs(mergedDel[d])) mergedDel[d] = ts;
    }
    deletedLogs = mergedDel;
    writeJsonStorage(KEYS.deletedLogs, deletedLogs);

    const remLogs = (remoteState.logs && typeof remoteState.logs === 'object') ? remoteState.logs : {};
    const allDates = new Set([...Object.keys(logs), ...Object.keys(remLogs)]);
    const nextLogs = {};
    for (const d of allDates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      const cand = mergeLogEntryClient(logs[d], remLogs[d]);
      if (!cand) continue;
      if (toEpochMs(deletedLogs[d]) > toEpochMs(cand.updatedAt)) continue;
      nextLogs[d] = cand;
    }
    logs = nextLogs;
    writeJsonStorage(KEYS.logs, logs);

    // 2. NEAT Draft del día
    const localDraft = readJsonStorage(KEYS.neatDraft, null);
    const remDraft = remoteState.neatDraft;
    if (remDraft && remDraft.date) {
      let pickRemoteDraft = false;
      const localHasItems = localDraft && Array.isArray(localDraft.items) && localDraft.items.length > 0;
      const remHasItems = Array.isArray(remDraft.items) && remDraft.items.length > 0;
      if (!localDraft || !localDraft.date) pickRemoteDraft = true;
      else if (remDraft.date > localDraft.date) pickRemoteDraft = true;
      else if (remDraft.date === localDraft.date) {
        if (!localHasItems && !localDraft.explicitClear && remHasItems) {
          pickRemoteDraft = true;
        } else if (toEpochMs(remDraft.updatedAt) > toEpochMs(localDraft.updatedAt)) {
          pickRemoteDraft = true;
        }
      }
      if (pickRemoteDraft) writeJsonStorage(KEYS.neatDraft, remDraft);
    }

    // 3. NEAT Sliders
    const remSliders = remoteState.neatSliders;
    const localSliders = readJsonStorage(KEYS.neatSliders, null);
    const localSlidersTs = (localSliders && localSliders.updatedAt) || metaTs.neatSliders || '';
    if (remSliders && toEpochMs(remSliders.updatedAt) > toEpochMs(localSlidersTs)) {
      writeJsonStorage(KEYS.neatSliders, remSliders);
      metaTs.neatSliders = remSliders.updatedAt;
    }

    // 4. Factores y Equivalencias
    if (remoteState.factors && Array.isArray(remoteState.factors.items)) {
      if (toEpochMs(remoteState.factors.updatedAt) > toEpochMs(metaTs.factors)) {
        factors = remoteState.factors.items;
        metaTs.factors = remoteState.factors.updatedAt;
        writeJsonStorage(KEYS.factors, factors);
      }
    }
    if (remoteState.customEquivalences && Array.isArray(remoteState.customEquivalences.items)) {
      if (toEpochMs(remoteState.customEquivalences.updatedAt) > toEpochMs(metaTs.customEquivalences)) {
        customEquivalences = remoteState.customEquivalences.items;
        metaTs.customEquivalences = remoteState.customEquivalences.updatedAt;
        writeJsonStorage(KEYS.customEq, customEquivalences);
      }
    }

    // 5. Meal Extras por fecha
    if (remoteState.mealExtras && typeof remoteState.mealExtras === 'object') {
      if (!metaTs.mealExtrasDates) metaTs.mealExtrasDates = {};
      for (const [d, remObj] of Object.entries(remoteState.mealExtras)) {
        if (!remObj || !Array.isArray(remObj.items)) continue;
        const localExTs = metaTs.mealExtrasDates[d] || '';
        if (toEpochMs(remObj.updatedAt) > toEpochMs(localExTs)) {
          if (remObj.items.length) mealExtras[d] = remObj.items;
          else delete mealExtras[d];
          metaTs.mealExtrasDates[d] = remObj.updatedAt;
        }
      }
      writeJsonStorage(KEYS.mealExtras, mealExtras);
    }

    // 6. Gym History & Gym State (respetando reloj en curso)
    if (remoteState.gymHistory && Array.isArray(remoteState.gymHistory.items)) {
      if (toEpochMs(remoteState.gymHistory.updatedAt) > toEpochMs(metaTs.gymHistory)) {
        writeJsonStorage(KEYS.gymHistory, remoteState.gymHistory.items);
        metaTs.gymHistory = remoteState.gymHistory.updatedAt;
      }
    }
    if (remoteState.gymState && remoteState.gymState.data) {
      const localGym = readJsonStorage(KEYS.gymState, null);
      const timerActive = !!(localGym && localGym.workoutTimer && localGym.workoutTimer.running);
      if (!timerActive && toEpochMs(remoteState.gymState.updatedAt) > toEpochMs(metaTs.gymState)) {
        writeJsonStorage(KEYS.gymState, remoteState.gymState.data);
        metaTs.gymState = remoteState.gymState.updatedAt;
      }
    }

    writeJsonStorage(KEYS.metaTs, metaTs);
    loadDateIntoHomeForm(document.getElementById('hl-date').value || getTodayIso());
    notifyOtherModules('forma-cloud-synced');
    if (activeTab === 'meals') renderMealsAll();
  }

  function scheduleCloudPush(changedDate = null) {
    markCloudDirty(changedDate);
    updateSyncStatusUI();
    if (!navigator.onLine || !getSyncToken()) return;
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      syncDebounceTimer = null;
      syncWithSheets(false);
    }, 1200);
  }

  function updateSyncStatusUI() {
    const dot = document.getElementById('topbar-sync-dot');
    const label = document.getElementById('topbar-sync-label');
    const pendingCount = Object.keys(syncQueue).length;
    const dirty = isCloudDirty();
    const token = getSyncToken();
    const lastErr = String(localStorage.getItem(KEYS.lastSyncError) || '');
    const qBadge = document.getElementById('sync-queue-badge');
    const summary = document.getElementById('home-sync-summary');
    const sheetDetail = document.getElementById('sheet-sync-detail');

    const pendTotal = dirty ? Math.max(1, pendingCount) : pendingCount;
    qBadge.textContent = pendTotal === 1 ? '1 pendiente' : `${pendTotal} pendientes`;

    if (!navigator.onLine) {
      dot.className = 'sync-dot is-offline';
      label.textContent = pendTotal > 0 ? `Offline (${pendTotal})` : 'Sin conexión';
      summary.textContent = `Modo offline activo. Tus ${Object.keys(logs).length} días están a salvo en este dispositivo${pendTotal ? ' (hay cambios esperando señal)' : ''}.`;
    } else if (!token) {
      dot.className = 'sync-dot is-pending';
      label.textContent = 'Configurar clave';
      summary.textContent = 'Guardado local activo. Tocá la píldora superior derecha para ingresar tu Clave Privada y sincronizar PC ↔ iPhone.';
    } else if (lastErr === 'AUTH_INVALID') {
      dot.className = 'sync-dot is-offline';
      label.textContent = 'Revisar clave';
      summary.textContent = 'La clave privada en este dispositivo no coincide con SYNC_SECRET (revisá mayúsculas o espacios).';
    } else if (lastErr === 'AUTH_NOT_CONFIGURED') {
      dot.className = 'sync-dot is-offline';
      label.textContent = 'Falta SYNC_SECRET';
      summary.textContent = 'Falta cambiar SYNC_SECRET y publicar Nueva versión en Google Apps Script.';
    } else if (pendTotal > 0) {
      dot.className = 'sync-dot is-pending';
      label.textContent = `Pendiente (${pendTotal})`;
      summary.textContent = lastErr
        ? `Pendiente de sync (${lastErr}). Tocá Sincronizar con Sheets para reintentar.`
        : 'Cambios listos para sincronizar entre PC, iPhone y Google Sheets.';
    } else {
      dot.className = 'sync-dot';
      label.textContent = swReady ? 'Sincronizado' : 'En línea';
      const lastIso = localStorage.getItem(KEYS.lastSync);
      summary.textContent = lastIso
        ? `PC ↔ iPhone y respaldo al día · Último sync: ${new Date(lastIso).toLocaleString('es-AR')}.`
        : 'Base local + sync automático listos. Tocá Sincronizar para traer datos del otro dispositivo.';
    }

    if (sheetDetail) {
      const lastIso = localStorage.getItem(KEYS.lastSync);
      if (!token) {
        sheetDetail.textContent = 'Falta ingresar la Clave Privada en este dispositivo.';
      } else if (lastErr === 'AUTH_INVALID') {
        sheetDetail.textContent = 'Error: Clave Privada incorrecta (revisá mayúsculas o espacios).';
      } else if (lastErr === 'AUTH_NOT_CONFIGURED') {
        sheetDetail.textContent = 'Error: SYNC_SECRET no configurado en Apps Script.';
      } else if (lastErr) {
        sheetDetail.textContent = `Último intento fallido (${lastErr}). Reintentando al sincronizar.`;
      } else {
        sheetDetail.textContent = lastIso
          ? `Clave configurada · Último sync: ${new Date(lastIso).toLocaleString('es-AR')}`
          : 'Clave configurada · Listo para sincronizar.';
      }
    }
  }

  async function syncWithSheets(manual = false) {
    if (syncBusy) {
      syncQueuedWhileBusy = true;
      return;
    }
    if (!navigator.onLine) {
      if (manual) showToast('Sin conexión. Tus datos siguen seguros offline.');
      updateSyncStatusUI();
      return;
    }

    const url = getSyncUrl();
    if (!url) {
      if (manual) showToast('Configurá la URL del Apps Script en Respaldos.');
      return;
    }

    const token = getSyncToken();
    if (!token) {
      updateSyncStatusUI();
      if (manual) {
        document.getElementById('sync-endpoint-input').value = url;
        document.getElementById('sync-token-input').value = '';
        document.getElementById('sync-sheet').classList.add('is-open');
        document.getElementById('sync-token-input').focus();
        showToast('Ingresá tu Clave Privada para activar sync PC ↔ iPhone.');
      }
      return;
    }

    syncBusy = true;
    lastAutoPullMs = Date.now();
    try {
      const shouldPush = manual || isCloudDirty();
      let resData = null;

      if (shouldPush) {
        const changedDates = Object.keys(syncQueue);
        const payload = {
          action: 'cloud_sync',
          token,
          changedDates,
          state: collectLocalCloudState()
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        resData = await res.json().catch(() => null);
      } else {
        const sep = url.includes('?') ? '&' : '?';
        const res = await fetch(`${url}${sep}action=cloud_pull&token=${encodeURIComponent(token)}`);
        resData = await res.json().catch(() => null);
      }

      if (!resData) {
        try { localStorage.setItem(KEYS.lastSyncError, 'Respuesta inválida del servidor'); } catch (_) {}
        if (manual) showToast('Respuesta inválida del servidor. Verificá la implementación de Apps Script.');
        return;
      }

      if (resData.error === 'AUTH_NOT_CONFIGURED') {
        try { localStorage.setItem(KEYS.lastSyncError, 'AUTH_NOT_CONFIGURED'); } catch (_) {}
        if (manual) showToast('Editá SYNC_SECRET en script.google.com y publicá una Nueva versión.');
        return;
      }
      if (resData.error === 'AUTH_INVALID') {
        try { localStorage.setItem(KEYS.lastSyncError, 'AUTH_INVALID'); } catch (_) {}
        if (manual) showToast('Clave Privada incorrecta (revisá mayúsculas o espacios).');
        return;
      }

      if (resData.ok && resData.state) {
        try { localStorage.removeItem(KEYS.lastSyncError); } catch (_) {}
        mergeRemoteCloudState(resData.state);
        if (shouldPush) clearCloudDirty();
        try { localStorage.setItem(KEYS.lastSync, resData.syncedAt || new Date().toISOString()); } catch (_) {}
        if (manual) {
          const sheetsNote = resData.sheetsUpdated ? ` · ${resData.sheetsUpdated} fila(s) en Sheet` : '';
          showToast(`Sincronizado PC ↔ iPhone${sheetsNote}`);
        }
      } else {
        try { localStorage.setItem(KEYS.lastSyncError, String(resData.error || 'Versión Apps Script desactualizada')); } catch (_) {}
        if (manual) showToast('Actualizá tu Apps Script con gym/apps_script_sync.gs (Nueva versión).');
      }
    } catch (_) {
      try { localStorage.setItem(KEYS.lastSyncError, 'Error de red o CORS'); } catch (_) {}
      if (manual) showToast('No se pudo conectar con Apps Script. Revisá internet o la URL.');
    } finally {
      syncBusy = false;
      renderHome();
      if (syncQueuedWhileBusy) {
        syncQueuedWhileBusy = false;
        setTimeout(() => syncWithSheets(false), 200);
      }
    }
  }

  // ==================== EXPORT / BACKUP HELPERS ====================
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

  function exportCsv() {
    const dates = Object.keys(logs).sort();
    if (!dates.length) {
      showToast('No hay registros para exportar.');
      return;
    }
    const header = ['Fecha', 'Peso_kg', 'Cintura_cm', 'Grasa_pct', 'Delta_kg', 'Pasos_NEAT', 'Extras_kcal', 'Nota'];
    const escCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [header.join(',')];
    for (const d of dates) {
      const e = logs[d];
      const delta = Number.isFinite(e.weightKg) ? (Math.round((e.weightKg - PROTOCOL.startWeightKg) * 100) / 100) : '';
      const extrasList = Array.isArray(mealExtras[d]) ? mealExtras[d] : [];
      const exKcal = extrasList.reduce((s, x) => s + (Number(x.kcal) || 0), 0);
      rows.push([
        d,
        Number.isFinite(e.weightKg) ? e.weightKg : '',
        Number.isFinite(e.waistCm) ? e.waistCm : '',
        Number.isFinite(e.bodyFatPct) ? e.bodyFatPct : '',
        delta,
        e.totalSteps || 0,
        exKcal || 0,
        e.note || ''
      ].map(escCsv).join(','));
    }
    downloadFile(`forma_luxx_planilla_${getTodayIso()}.csv`, '\uFEFF' + rows.join('\n'), 'text/csv;charset=utf-8');
    showToast('Planilla CSV descargada');
  }

  function exportJson() {
    const payload = {
      app: 'Forma by Luxx',
      exportedAt: new Date().toISOString(),
      logs,
      factors,
      customEquivalences,
      mealExtras
    };
    downloadFile(`forma_luxx_backup_${getTodayIso()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    showToast('Backup JSON descargado');
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const incomingLogs = parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : parsed;
        let count = 0;
        if (incomingLogs && !Array.isArray(incomingLogs)) {
          for (const [k, v] of Object.entries(incomingLogs)) {
            if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v === 'object') {
              logs[k] = v;
              count += 1;
            }
          }
          writeJsonStorage(KEYS.logs, logs);
        }
        if (Array.isArray(parsed.factors)) {
          factors = parsed.factors;
          writeJsonStorage(KEYS.factors, factors);
        }
        if (Array.isArray(parsed.customEquivalences)) {
          customEquivalences = parsed.customEquivalences;
          writeJsonStorage(KEYS.customEq, customEquivalences);
        }
        if (parsed.mealExtras && typeof parsed.mealExtras === 'object') {
          mealExtras = parsed.mealExtras;
          writeJsonStorage(KEYS.mealExtras, mealExtras);
        }
        loadDateIntoHomeForm(document.getElementById('hl-date').value || getTodayIso());
        renderHome();
        renderMealsAll();
        notifyOtherModules();
        showToast(`${count} registro(s) restaurados`);
      } catch (err) {
        showToast('Error al importar JSON: ' + err.message, 4000);
      }
    };
    reader.readAsText(file);
  }

  function copySheetsRows() {
    const dates = Object.keys(logs).sort().reverse().slice(0, 14);
    const lines = dates.map((d) => {
      const e = logs[d];
      const delta = Number.isFinite(e.weightKg) ? (Math.round((e.weightKg - PROTOCOL.startWeightKg) * 100) / 100) : '';
      return [
        d,
        Number.isFinite(e.weightKg) ? String(e.weightKg).replace('.', ',') : '-',
        Number.isFinite(e.waistCm) ? String(e.waistCm).replace('.', ',') : '-',
        Number.isFinite(e.bodyFatPct) ? `${String(e.bodyFatPct).replace('.', ',')}%` : '-',
        delta !== '' ? String(delta).replace('.', ',') : '-',
        `${e.totalSteps || 0} pasos`,
        e.note || ''
      ].join('\t');
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines.join('\n'))
        .then(() => showToast('Últimos 14 días listos para pegar en Google Sheets'))
        .catch(() => showToast('No se pudo copiar automáticamente; usá Planilla CSV.'));
    } else {
      showToast('Usá Exportar Planilla CSV en este navegador.');
    }
  }

  // ==================== MEALS MODULE ====================
  function renderQuotaChips() {
    const container = document.getElementById('rc-quota-chips');
    container.innerHTML = QUOTA_PRESETS.map((q) => `
      <button type="button" class="chip-btn ${q.id === selectedQuotaId ? 'is-active' : ''}" data-quota-id="${q.id}">
        ${escHtml(q.label)}
      </button>
    `).join('');

    container.querySelectorAll('button[data-quota-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = QUOTA_PRESETS.find((x) => x.id === btn.dataset.quotaId);
        if (!q) return;
        selectedQuotaId = q.id;
        document.getElementById('rc-target-grams').value = q.grams;
        document.getElementById('rc-direction').value = q.dir;
        if (q.factorId && factors.some((f) => f.id === q.factorId)) {
          document.getElementById('rc-factor-select').value = q.factorId;
        }
        renderQuotaChips();
        calcRawCooked();
      });
    });
  }

  function renderFactorsSelect() {
    const sel = document.getElementById('rc-factor-select');
    const prev = sel.value;
    sel.innerHTML = factors.map((f) => `
      <option value="${escHtml(f.id)}">${escHtml(f.name)} (${fmtDec2.format(f.factor)}x)</option>
    `).join('');
    if (prev && factors.some((f) => f.id === prev)) {
      sel.value = prev;
    }
  }

  function getCurrentCookingFactor() {
    if (rcMode === 'witness') {
      const wRaw = parseOptionalNum(document.getElementById('rc-witness-raw').value, 2);
      const wCooked = parseOptionalNum(document.getElementById('rc-witness-cooked').value, 2);
      if (!wRaw || !wCooked) return null;
      return wCooked / wRaw;
    }
    const selId = document.getElementById('rc-factor-select').value;
    const found = factors.find((f) => f.id === selId);
    return found ? found.factor : 0.76;
  }

  function calcRawCooked() {
    const dir = document.getElementById('rc-direction').value;
    const target = parseOptionalNum(document.getElementById('rc-target-grams').value, 1) || 0;
    const targetLabel = document.getElementById('rc-target-label');
    targetLabel.textContent = dir === 'raw_to_cooked' ? 'Tu cuota en crudo (g)' : 'Tu cuota en cocido (g)';

    const factor = getCurrentCookingFactor();
    const outMain = document.getElementById('rc-out-main');
    const outExplain = document.getElementById('rc-out-explain');
    const outKicker = document.getElementById('rc-out-kicker');
    const pill = document.getElementById('rc-factor-pill');
    const plateIn = parseOptionalNum(document.getElementById('rc-plate-check').value, 1);
    const plateRes = document.getElementById('rc-plate-result');

    if (!factor || factor <= 0 || target <= 0) {
      outMain.textContent = '-- g';
      pill.textContent = 'Factor --';
      outExplain.textContent = 'Ingresá pesos válidos en crudo y cocido.';
      plateRes.textContent = '--';
      return;
    }

    const pctDiff = Math.round((factor - 1) * 100);
    const pctLabel = pctDiff >= 0 ? `+${pctDiff}% hidratación` : `${pctDiff}% merma`;
    pill.textContent = `Factor ${fmtDec2.format(factor)}x`;

    let expectedCooked = target;
    let expectedRaw = target;

    if (dir === 'raw_to_cooked') {
      expectedCooked = Math.round(target * factor);
      expectedRaw = target;
      outKicker.textContent = 'Servite en el plato';
      outMain.textContent = `${fmtInt.format(expectedCooked)} g cocidos`;
      outExplain.textContent = `Para cubrir ${fmtInt.format(target)} g crudos (${pctLabel}).`;
    } else {
      expectedRaw = Math.round(target / factor);
      expectedCooked = target;
      outKicker.textContent = 'Pesá en crudo antes de cocinar';
      outMain.textContent = `${fmtInt.format(expectedRaw)} g crudos`;
      outExplain.textContent = `Para lograr ${fmtInt.format(target)} g cocidos (${pctLabel}).`;
    }

    if (plateIn && plateIn > 0) {
      const equivRaw = Math.round(plateIn / factor);
      const diffCooked = expectedCooked - plateIn;
      const diffTxt = Math.abs(diffCooked) <= 3
        ? 'justo en cuota'
        : (diffCooked > 0 ? `te faltan ${fmtInt.format(diffCooked)} g cocidos` : `te pasaste ${fmtInt.format(Math.abs(diffCooked))} g cocidos`);
      plateRes.textContent = `= ${fmtInt.format(equivRaw)} g crudos (${diffTxt})`;
    } else {
      plateRes.textContent = 'Ingresá gramos cocidos del plato';
    }
  }

  function handleSaveFactor() {
    const factor = getCurrentCookingFactor();
    if (!factor || factor <= 0) {
      showToast('Calculá primero un factor válido.');
      return;
    }
    const name = window.prompt('Nombre para guardar este factor de cocción:', 'Papa testigo hoy');
    if (!name || !name.trim()) return;
    const item = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      factor: Math.round(factor * 1000) / 1000,
      note: 'Calibrado con testigo real'
    };
    factors.unshift(item);
    writeJsonStorage(KEYS.factors, factors);
    touchMetaTs('factors');
    renderFactorsSelect();
    document.getElementById('rc-factor-select').value = item.id;
    scheduleCloudPush();
    showToast(`Factor guardado: ${item.name} (${fmtDec2.format(item.factor)}x)`);
  }

  // ==================== PARTIAL SWAPS & EQUIVALENCES ====================
  function renderSwapSelects() {
    const baseSel = document.getElementById('swap-base-select');
    const itemSel = document.getElementById('swap-item-select');
    if (!baseSel.options.length) {
      baseSel.innerHTML = SWAP_BASES.map((b) => `<option value="${b.id}">${escHtml(b.name)}</option>`).join('');
    }
    if (!itemSel.options.length) {
      itemSel.innerHTML = SWAP_ITEMS.map((it) => `<option value="${it.id}">${escHtml(it.name)}</option>`).join('');
    }
  }

  function calcPartialSwap() {
    const baseId = document.getElementById('swap-base-select').value;
    const itemId = document.getElementById('swap-item-select').value;
    const qty = parseOptionalNum(document.getElementById('swap-qty').value, 2) || 0;
    const mode = document.getElementById('swap-mode').value;

    const base = SWAP_BASES.find((b) => b.id === baseId) || SWAP_BASES[0];
    const itemObj = SWAP_ITEMS.find((i) => i.id === itemId) || SWAP_ITEMS[0];

    const customRow = document.getElementById('swap-custom-item-row');
    customRow.style.display = itemId === 'custom' ? 'grid' : 'none';
    document.getElementById('swap-qty-label').textContent = itemObj.unitLabel;

    const baseTotalKcal = Math.round((base.quotaG / 100) * base.kcalPer100);
    document.getElementById('swap-base-target-readonly').textContent = `${base.quotaG} g · ${baseTotalKcal} kcal`;

    let addedKcal = itemObj.kcal * qty;
    let addedCarbs = itemObj.carbs * qty;
    let addedName = itemObj.name.split(' (')[0];

    if (itemId === 'custom') {
      const cName = document.getElementById('swap-custom-name').value.trim() || 'Extra';
      const cKcal = parseOptionalNum(document.getElementById('swap-custom-kcal').value, 1) || 0;
      addedKcal = cKcal * qty;
      addedCarbs = addedKcal / 4;
      addedName = cName;
    }

    let discountG = 0;
    if (mode === 'carbs' && base.carbsPer100 > 0) {
      discountG = Math.round(addedCarbs / (base.carbsPer100 / 100));
    } else {
      discountG = Math.round(addedKcal / (base.kcalPer100 / 100));
    }

    const remainingG = Math.max(0, base.quotaG - discountG);
    const shortBaseName = base.name.split(' (')[0].split(' —')[0];
    const remainingKcal = Math.round((remainingG / 100) * base.kcalPer100);

    document.getElementById('swap-out-main').textContent = `${fmtInt.format(remainingG)} g de ${shortBaseName}`;
    const pill = document.getElementById('swap-discount-pill');
    if (discountG > base.quotaG) {
      pill.textContent = `Excede cuota (+${fmtInt.format(Math.round(addedKcal - baseTotalKcal))} kcal)`;
      pill.className = 'pill pill-amber tabular';
    } else {
      pill.textContent = `Descontás ${fmtInt.format(discountG)} g`;
      pill.className = 'pill pill-green tabular';
    }

    document.getElementById('swap-out-explain').textContent =
      `Sumás ${qty} × ${addedName} (${fmtInt.format(addedKcal)} kcal) y pesás ${fmtInt.format(remainingG)} g de ${shortBaseName} (${fmtInt.format(remainingKcal)} kcal).`;
  }

  function handleSaveSwapAsEquivalence() {
    const titleMain = document.getElementById('swap-out-main').textContent;
    const pillTxt = document.getElementById('swap-discount-pill').textContent;
    const explain = document.getElementById('swap-out-explain').textContent;
    const title = `${pillTxt} → ${titleMain}`;
    customEquivalences.unshift({
      id: `eq_${Date.now()}`,
      title,
      detail: explain
    });
    writeJsonStorage(KEYS.customEq, customEquivalences);
    touchMetaTs('customEquivalences');
    renderCustomEquivalences();
    scheduleCloudPush();
    showToast('Guardado en Mis Equivalencias');
  }

  function renderOfficialMatrix() {
    const el = document.getElementById('official-matrix-list');
    el.innerHTML = OFFICIAL_MATRIX.map((row) => `
      <div class="inset-row">
        <div class="inset-row-top">
          <span class="inset-row-title">${escHtml(row.group)}</span>
        </div>
        <div class="inset-row-desc">${escHtml(row.text)}</div>
      </div>
    `).join('');
  }

  function renderCustomEquivalences() {
    const el = document.getElementById('custom-eq-list');
    if (!customEquivalences.length) {
      el.innerHTML = `<div class="inset-row"><div class="inset-row-desc">Todavía no guardaste equivalencias personalizadas.</div></div>`;
      return;
    }
    el.innerHTML = customEquivalences.map((eq) => `
      <div class="inset-row">
        <div class="inset-row-top">
          <span class="inset-row-title">${escHtml(eq.title)}</span>
          <button type="button" class="btn btn-sm btn-ghost-danger" data-del-eq="${escHtml(eq.id)}">Quitar</button>
        </div>
        ${eq.detail ? `<div class="inset-row-desc">${escHtml(eq.detail)}</div>` : ''}
      </div>
    `).join('');

    el.querySelectorAll('button[data-del-eq]').forEach((btn) => {
      btn.addEventListener('click', () => {
        customEquivalences = customEquivalences.filter((x) => x.id !== btn.dataset.delEq);
        writeJsonStorage(KEYS.customEq, customEquivalences);
        touchMetaTs('customEquivalences');
        renderCustomEquivalences();
        scheduleCloudPush();
      });
    });
  }

  // ==================== WEEKEND EXTRAS ====================
  function renderExtras() {
    const dateEl = document.getElementById('ex-date');
    const dateIso = dateEl.value || getTodayIso();
    document.getElementById('extras-date-label').textContent = formatShortDate(dateIso);

    const list = Array.isArray(mealExtras[dateIso]) ? mealExtras[dateIso] : [];
    const dayExtrasKcal = list.reduce((s, x) => s + (Number(x.kcal) || 0), 0);
    const totalDay = PROTOCOL.baseKcal + dayExtrasKcal;
    document.getElementById('ex-day-total').textContent = `${fmtInt.format(totalDay)} kcal`;

    // Últimos 7 días extras vs déficit objetivo (-3.808 kcal/sem)
    const dtParts = dateIso.split('-').map(Number);
    const refDt = new Date(dtParts[0], dtParts[1] - 1, dtParts[2]);
    let weekExtrasKcal = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(refDt);
      d.setDate(refDt.getDate() - i);
      const iso = getTodayIso(d);
      const dayItems = Array.isArray(mealExtras[iso]) ? mealExtras[iso] : [];
      weekExtrasKcal += dayItems.reduce((s, x) => s + (Number(x.kcal) || 0), 0);
    }
    const netWeekBalance = PROTOCOL.weeklyDeficitTarget + weekExtrasKcal;
    const wkEl = document.getElementById('ex-week-deficit');
    wkEl.textContent = `${netWeekBalance > 0 ? '+' : ''}${fmtInt.format(Math.round(netWeekBalance))} kcal`;
    wkEl.style.color = netWeekBalance <= -1500 ? 'var(--green)' : (netWeekBalance <= 0 ? 'var(--amber)' : 'var(--red)');

    const listEl = document.getElementById('ex-list');
    if (!list.length) {
      listEl.innerHTML = `<div class="inset-row"><div class="inset-row-desc">Sin extras cargados para el ${formatShortDate(dateIso)}. Día al 100% del plan (${fmtInt.format(PROTOCOL.baseKcal)} kcal).</div></div>`;
      return;
    }

    listEl.innerHTML = list.map((item) => `
      <div class="inset-row">
        <div class="inset-row-top">
          <span class="inset-row-title">${escHtml(item.name)}</span>
          <div style="display:flex;gap:6px;align-items:center;">
            <span class="pill pill-amber tabular">+${fmtInt.format(item.kcal)} kcal</span>
            <button type="button" class="btn btn-sm btn-ghost-danger" data-del-extra="${escHtml(item.id)}">✕</button>
          </div>
        </div>
        <div class="inset-row-desc tabular">P: ${item.prot || 0} g · C: ${item.carbs || 0} g · G: ${item.fat || 0} g</div>
      </div>
    `).join('');

    listEl.querySelectorAll('button[data-del-extra]').forEach((btn) => {
      btn.addEventListener('click', () => {
        mealExtras[dateIso] = (mealExtras[dateIso] || []).filter((x) => x.id !== btn.dataset.delExtra);
        if (!mealExtras[dateIso].length) delete mealExtras[dateIso];
        writeJsonStorage(KEYS.mealExtras, mealExtras);
        touchMetaTs('mealExtras', dateIso);
        renderExtras();
        renderHome();
        scheduleCloudPush();
      });
    });
  }

  function renderFixedMenu() {
    const el = document.getElementById('fixed-menu-list');
    if (!el || el.children.length) return;
    el.innerHTML = FIXED_MENU.map((m) => `
      <div class="menu-meal-row">
        <div class="menu-meal-head">
          <span>${escHtml(m.time)} · ${escHtml(m.title)}</span>
          <span class="sub-label tabular">${escHtml(m.macros)}</span>
        </div>
        <div class="menu-meal-body">${escHtml(m.body)}</div>
      </div>
    `).join('');
  }

  function renderMealsAll() {
    renderQuotaChips();
    renderFactorsSelect();
    calcRawCooked();
    renderSwapSelects();
    calcPartialSwap();
    renderOfficialMatrix();
    renderCustomEquivalences();
    renderExtras();
    renderFixedMenu();
  }

  // ==================== PHOTO UI (LOCAL PREVIEW ONLY) ====================
  function setupPhotoMockUI() {
    const pickBtn = document.getElementById('btn-pick-meal-photo');
    const clearBtn = document.getElementById('btn-clear-meal-photo');
    const fileIn = document.getElementById('in-meal-photo');
    const previewWrap = document.getElementById('meal-photo-preview-wrap');
    const emptyText = document.getElementById('meal-photo-empty-text');
    let currentObjUrl = null;

    pickBtn.addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      if (currentObjUrl) URL.revokeObjectURL(currentObjUrl);
      currentObjUrl = URL.createObjectURL(f);
      previewWrap.innerHTML = '';
      const img = document.createElement('img');
      img.className = 'photo-preview-img';
      img.alt = 'Vista previa de comida';
      img.src = currentObjUrl;
      previewWrap.appendChild(img);
      emptyText.style.display = 'none';
      clearBtn.style.display = 'inline-flex';
      showToast('Foto cargada en vista previa (IA pendiente de conectar)');
    });
    clearBtn.addEventListener('click', () => {
      if (currentObjUrl) URL.revokeObjectURL(currentObjUrl);
      currentObjUrl = null;
      fileIn.value = '';
      previewWrap.innerHTML = '';
      emptyText.style.display = 'block';
      clearBtn.style.display = 'none';
    });
  }

  // ==================== SERVICE WORKER & CACHE RESET ====================
  async function clearCacheAndReload() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) {}
    location.replace(location.pathname.replace(/index\.html$/, '') + '?updated=' + Date.now());
  }

  function initServiceWorker() {
    if (new URLSearchParams(location.search).get('reset') === '1') {
      clearCacheAndReload();
      return;
    }
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:')) {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          swReady = true;
          updateSyncStatusUI();
        })
        .catch(() => updateSyncStatusUI());
    } else {
      updateSyncStatusUI();
    }
  }

  // ==================== EVENT BINDINGS ====================
  function bindEvents() {
    // Bottom tabbar
    document.querySelectorAll('.tabbar-item').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Home pillar jumps
    document.querySelectorAll('[data-jump-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.jumpTab;
        if (target === 'home-log') {
          document.getElementById('home-log-anchor').scrollIntoView({ behavior: 'smooth' });
          document.getElementById('hl-weight').focus();
        } else {
          switchTab(target);
        }
      });
    });

    // Home log form
    document.getElementById('hl-date').addEventListener('change', (e) => {
      if (e.target.value) loadDateIntoHomeForm(e.target.value);
    });
    document.getElementById('btn-save-home-log').addEventListener('click', handleSaveHomeLog);
    document.getElementById('btn-new-home-log').addEventListener('click', () => {
      document.getElementById('hl-weight').value = '';
      document.getElementById('hl-waist').value = '';
      document.getElementById('hl-fat').value = '';
      document.getElementById('hl-note').value = '';
      document.getElementById('log-form-status').textContent = 'Campos limpiados';
      showToast('Campos limpiados para carga nueva');
    });

    // History filters
    document.querySelectorAll('[data-log-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        logFilter = btn.dataset.logFilter;
        document.querySelectorAll('[data-log-filter]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        renderHistoryList(Object.keys(logs).sort().reverse());
      });
    });

    // Export & Sync
    document.getElementById('btn-sync-now').addEventListener('click', () => syncWithSheets(true));
    document.getElementById('btn-export-csv').addEventListener('click', exportCsv);
    document.getElementById('btn-export-json').addEventListener('click', exportJson);

    const syncSheet = document.getElementById('sync-sheet');
    const tokenIn = document.getElementById('sync-token-input');
    const toggleTokenBtn = document.getElementById('btn-toggle-sync-token');
    toggleTokenBtn.addEventListener('click', () => {
      const hidden = tokenIn.type === 'password';
      tokenIn.type = hidden ? 'text' : 'password';
      toggleTokenBtn.textContent = hidden ? 'Ocultar' : 'Ver';
    });
    document.getElementById('btn-open-sync-sheet').addEventListener('click', () => {
      document.getElementById('sync-endpoint-input').value = getSyncUrl();
      tokenIn.value = getSyncToken();
      updateSyncStatusUI();
      syncSheet.classList.add('is-open');
    });
    document.getElementById('btn-close-sync-sheet').addEventListener('click', () => {
      syncSheet.classList.remove('is-open');
    });
    syncSheet.addEventListener('click', (e) => {
      if (e.target === syncSheet) syncSheet.classList.remove('is-open');
    });
    document.getElementById('btn-sheet-save-url').addEventListener('click', () => {
      setSyncUrl(document.getElementById('sync-endpoint-input').value);
      setSyncToken(tokenIn.value);
      updateSyncStatusUI();
      showToast('Configuración de sync guardada');
    });
    document.getElementById('btn-sheet-sync-now').addEventListener('click', () => {
      setSyncUrl(document.getElementById('sync-endpoint-input').value);
      setSyncToken(tokenIn.value);
      updateSyncStatusUI();
      syncWithSheets(true);
    });
    document.getElementById('btn-sheet-csv').addEventListener('click', exportCsv);
    document.getElementById('btn-sheet-copy').addEventListener('click', copySheetsRows);
    document.getElementById('btn-sheet-json-out').addEventListener('click', exportJson);
    document.getElementById('btn-sheet-json-in').addEventListener('click', () => {
      document.getElementById('in-sheet-import-json').click();
    });
    document.getElementById('in-sheet-import-json').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importJson(e.target.files[0]);
        e.target.value = '';
      }
    });
    document.getElementById('btn-force-app-update').addEventListener('click', clearCacheAndReload);

    // Meals: Raw <-> Cooked
    document.querySelectorAll('[data-rc-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        rcMode = btn.dataset.rcMode;
        document.querySelectorAll('[data-rc-mode]').forEach((b) => b.classList.toggle('is-active', b === btn));
        document.getElementById('rc-witness-panel').style.display = rcMode === 'witness' ? 'block' : 'none';
        document.getElementById('rc-saved-panel').style.display = rcMode === 'saved' ? 'block' : 'none';
        calcRawCooked();
      });
    });
    ['rc-target-grams', 'rc-direction', 'rc-witness-raw', 'rc-witness-cooked', 'rc-factor-select', 'rc-plate-check']
      .forEach((id) => {
        document.getElementById(id).addEventListener('input', calcRawCooked);
        document.getElementById(id).addEventListener('change', calcRawCooked);
      });
    document.getElementById('btn-save-factor').addEventListener('click', handleSaveFactor);

    // Meals: Partial Swap & Equivalences
    document.querySelectorAll('[data-eq-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.eqTab;
        document.querySelectorAll('[data-eq-tab]').forEach((b) => b.classList.toggle('is-active', b === btn));
        document.getElementById('eq-panel-calc').style.display = t === 'calc' ? 'block' : 'none';
        document.getElementById('eq-panel-matrix').style.display = t === 'matrix' ? 'block' : 'none';
        document.getElementById('eq-panel-custom').style.display = t === 'custom' ? 'block' : 'none';
      });
    });
    ['swap-base-select', 'swap-item-select', 'swap-qty', 'swap-mode', 'swap-custom-name', 'swap-custom-kcal']
      .forEach((id) => {
        document.getElementById(id).addEventListener('input', calcPartialSwap);
        document.getElementById(id).addEventListener('change', calcPartialSwap);
      });
    document.getElementById('btn-save-custom-eq').addEventListener('click', handleSaveSwapAsEquivalence);
    document.getElementById('btn-add-custom-eq').addEventListener('click', () => {
      const title = document.getElementById('new-eq-title').value.trim();
      const detail = document.getElementById('new-eq-detail').value.trim();
      if (!title) {
        showToast('Escribí el título de la equivalencia.');
        return;
      }
      customEquivalences.unshift({ id: `eq_${Date.now()}`, title, detail });
      writeJsonStorage(KEYS.customEq, customEquivalences);
      touchMetaTs('customEquivalences');
      document.getElementById('new-eq-title').value = '';
      document.getElementById('new-eq-detail').value = '';
      renderCustomEquivalences();
      scheduleCloudPush();
      showToast('Equivalencia agregada');
    });

    // Meals: Weekend Extras
    document.getElementById('ex-date').addEventListener('change', renderExtras);
    document.getElementById('ex-preset-select').addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      const [name, kcal, p, c, g] = val.split('|');
      document.getElementById('ex-name').value = name || '';
      document.getElementById('ex-kcal').value = kcal || '';
      document.getElementById('ex-prot').value = p || '';
      document.getElementById('ex-carbs').value = c || '';
      document.getElementById('ex-fat').value = g || '';
    });
    document.getElementById('btn-add-extra-food').addEventListener('click', () => {
      const dateIso = document.getElementById('ex-date').value || getTodayIso();
      const name = document.getElementById('ex-name').value.trim();
      const kcal = parseOptionalNum(document.getElementById('ex-kcal').value, 0);
      if (!name || !kcal) {
        showToast('Ingresá nombre y calorías del extra.');
        return;
      }
      const prot = parseOptionalNum(document.getElementById('ex-prot').value, 1) || 0;
      const carbs = parseOptionalNum(document.getElementById('ex-carbs').value, 1) || 0;
      const fat = parseOptionalNum(document.getElementById('ex-fat').value, 1) || 0;

      if (!Array.isArray(mealExtras[dateIso])) mealExtras[dateIso] = [];
      mealExtras[dateIso].unshift({
        id: `ex_${Date.now()}`,
        name,
        kcal,
        prot,
        carbs,
        fat
      });
      writeJsonStorage(KEYS.mealExtras, mealExtras);
      touchMetaTs('mealExtras', dateIso);

      document.getElementById('ex-preset-select').value = '';
      document.getElementById('ex-name').value = '';
      document.getElementById('ex-kcal').value = '';
      document.getElementById('ex-prot').value = '';
      document.getElementById('ex-carbs').value = '';
      document.getElementById('ex-fat').value = '';
      renderExtras();
      renderHome();
      scheduleCloudPush();
      showToast(`Extra sumado (+${fmtInt.format(kcal)} kcal)`);
    });

    setupPhotoMockUI();

    // Online / Offline & cross-frame sync
    window.addEventListener('online', () => {
      updateSyncStatusUI();
      if (getSyncToken()) syncWithSheets(false);
    });
    window.addEventListener('offline', updateSyncStatusUI);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine && getSyncToken()) {
        if (Date.now() - lastAutoPullMs > 15000) {
          syncWithSheets(false);
        }
      }
    });

    window.addEventListener('storage', () => {
      loadAppData();
      if (activeTab === 'home') renderHome();
    });

    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === 'forma-logs-updated' || e.data.type === 'forma-gym-updated') {
        loadAppData();
        renderHome();
        scheduleCloudPush(e.data.date || null);
      }
    });
  }

  // ==================== INIT ====================
  function init() {
    loadAppData();
    const todayIso = getTodayIso();
    document.getElementById('ex-date').value = todayIso;
    loadDateIntoHomeForm(todayIso);

    bindEvents();
    renderHome();
    renderMealsAll();
    initServiceWorker();

    const hashTab = (location.hash || '').replace('#', '').toLowerCase();
    if (['home', 'gym', 'neat', 'meals'].includes(hashTab) && hashTab !== 'home') {
      switchTab(hashTab);
    }

    if (navigator.onLine && getSyncToken()) {
      setTimeout(() => syncWithSheets(false), 350);
    }
  }

  init();
})();
