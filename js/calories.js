/* Rutina Gym — estimación de calorías.
 *
 * PESAS Y CALISTENIA (no dependen del reloj, solo de lo que haces en cada serie):
 *   kcal de la serie = 0,0215 × carga (kg) × recorrido (m) × repeticiones × intensidad relativa
 *                      + recuperación del descanso configurado (+ metabolismo basal en modo «bruto»)
 *   · carga: el peso de la serie; en calistenia, tu peso × la fracción que mueves (+ lastre).
 *   · 0,0215 kcal por kg·m: trabajo mecánico (9,81 J/kg·m) con un rendimiento global del 12 % al subir
 *     (incluye estabilización, isométrico y glucólisis) y coste de frenado excéntrico (trabajo ÷ 1,2).
 *     Calibrado para que 10 reps con 60 kg en un press de pecho ≈ 4 MET medios, como el Compendio.
 *   · intensidad relativa: 0,85 + 0,3 × %1RM de la serie (Epley, con las reps y el RIR de la serie).
 * CARDIO: kcal de la máquina si las escribes; si no, MET según velocidad (derivada de la distancia si
 *   falta) e inclinación × tiempo del bloque (el cronómetro solo corre cuando lo pones en marcha).
 * EJERCICIOS POR TIEMPO (plancha…) y MET propio: método MET clásico (Compendio de Actividades Físicas).
 * La suma de la sesión es la suma de sus ejercicios: no usa la duración real de la sesión.
 * Es una estimación: el error habitual ronda el ±20-30 %; «Ajuste personal» permite calibrarla.
 * Datos personales y ajustes se guardan en settings.body y settings.calc (solo en este dispositivo). */
'use strict';

const CAL_LEVELS = { light: 'Ligera', moderate: 'Moderada', vigorous: 'Vigorosa' };
const CAL_MET = {
  maquina:    { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  libre:      { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  calistenia: { light: 3.8, moderate: 5.5, vigorous: 8.0 },
  tiempo:     { light: 2.3, moderate: 3.0, vigorous: 4.0 }
};
const CARDIO_TYPES = (window.GYM_DATA || {}).CARDIO_TYPES || {};
CAL_MET.cardio = { light: 4.0, moderate: 6.0, vigorous: 8.5 }; // sin velocidad registrada
const CAL_RANGES = { age: [10, 100], weight: [30, 300], height: [100, 250], bodyFat: [3, 60] };
const CAL_DEFAULTS = {
  body: { sex: '', age: '', weight: '', height: '', bodyFat: '' },
  calc: { mode: 'gross', metRef: 'standard', secPerRep: 3, epoc: 0, scale: 100, intensity: { maquina: 'auto', libre: 'auto', calistenia: 'auto', cardio: 'auto' } }
};

function calBodyRaw() { return Object.assign({}, CAL_DEFAULTS.body, settings().body || {}); }
function calConfig() {
  const c = settings().calc || {};
  return Object.assign({}, CAL_DEFAULTS.calc, c, { intensity: Object.assign({}, CAL_DEFAULTS.calc.intensity, c.intensity || {}) });
}
function calInRange(key, v) { const n = num(v), r = CAL_RANGES[key]; return n !== null && n >= r[0] && n <= r[1] ? n : null; }
/* Datos corporales ya validados (null si falta o está fuera de rango). */
function calBody() {
  const b = calBodyRaw();
  return {
    sex: b.sex === 'm' || b.sex === 'f' ? b.sex : '',
    age: calInRange('age', b.age), weight: calInRange('weight', b.weight),
    height: calInRange('height', b.height), bodyFat: calInRange('bodyFat', b.bodyFat)
  };
}
const calReady = () => calBody().weight !== null;

/* Metabolismo basal (kcal/día): Katch-McArdle si hay % de grasa; si no, Mifflin-St Jeor. */
function calBMR(b = calBody()) {
  if (!b.weight) return null;
  if (b.bodyFat !== null) return { kcal: 370 + 21.6 * b.weight * (1 - b.bodyFat / 100), method: 'Katch-McArdle' };
  if (b.height === null || b.age === null) return null;
  const sexTerm = b.sex === 'm' ? 5 : b.sex === 'f' ? -161 : -78; // sin sexo indicado: punto medio
  return { kcal: 10 * b.weight + 6.25 * b.height - 5 * b.age + sexTerm, method: 'Mifflin-St Jeor' };
}
/* kcal por kg y hora que equivalen a 1 MET. Estándar: 1,0. Personalizado: metabolismo basal / peso / 24 h. */
function calKcalPerMetKgH(b = calBody(), cfg = calConfig()) {
  if (cfg.metRef === 'personal') {
    const bmr = calBMR(b);
    if (bmr) return Math.min(1.6, Math.max(0.6, bmr.kcal / 24 / b.weight));
  }
  return 1;
}

const calIsTimed = def => (typeof isIsometricExercise === 'function' ? isIsometricExercise(def) : (def?.tracking === 'time' || def?.isometric === true));
const calIsCardio = def => Boolean(def?.cardio && CARDIO_TYPES[def.cardio]);
const calTable = def => CAL_MET[calIsCardio(def) ? 'cardio' : calIsTimed(def) ? 'tiempo' : (CAL_MET[def?.equip] ? def.equip : 'libre')];

/* Intensidad automática: RIR medio de las series hechas (o el RIR objetivo de la ficha). */
function calAutoLevel(def, sets = []) {
  const rirs = sets.filter(x => x.completed && x.type !== 'warmup').map(x => num(x.rir)).filter(n => n !== null);
  const rir = rirs.length ? rirs.reduce((a, n) => a + n, 0) / rirs.length : (num(def?.targetRIR) ?? 2);
  return rir <= 1.5 ? 'vigorous' : rir <= 3.5 ? 'moderate' : 'light';
}
/* Nivel y MET de un ejercicio. Prioridad: MET propio de la ficha > intensidad de la ficha > ajuste por material > automática. */
function calExerciseMet(def, sets = [], cfg = calConfig()) {
  const own = num(def?.met);
  if (own !== null && own >= 1 && own <= 15) return { met: own, level: 'custom' };
  let level = CAL_LEVELS[def?.intensity] ? def.intensity : cfg.intensity[calIsCardio(def) || calIsTimed(def) ? 'cardio' : def?.equip];
  if (!CAL_LEVELS[level]) level = calAutoLevel(def, sets);
  return { met: calTable(def)[level], level };
}
const calScale = cfg => Math.min(2, Math.max(0.5, (num(cfg.scale) ?? 100) / 100));
function calKcal(met, minutes, b = calBody(), cfg = calConfig()) {
  if (!b.weight || !(minutes > 0)) return 0;
  const base = calKcalPerMetKgH(b, cfg) * b.weight * (minutes / 60);
  const kcal = cfg.mode === 'net' ? Math.max(0, met - 1) * base : met * base;
  return kcal * (1 + (Number(cfg.epoc) || 0) / 100) * calScale(cfg);
}


/* ---------- Cardio: MET a partir de la velocidad (y la inclinación en la cinta) ----------
 * Cinta: ecuaciones ACSM de caminar y correr (VO2 = 0,1·v + 1,8·v·pendiente + 3,5 caminando;
 *        0,2·v + 0,9·v·pendiente + 3,5 corriendo, con v en m/min), mezcladas entre 6 y 8 km/h.
 * Bicicletas, elíptica, escaleras: curvas aproximadas del Compendio de Actividades Físicas.
 * Remo: el ritmo por 500 m se convierte en vatios (W = 2,80 / (s por metro)³) y de ahí a MET.
 * Son aproximaciones: una máquina concreta puede marcar otra cosa. */
const CAL_CARDIO_CURVES = {
  'eliptica': [[4, 3.5], [8, 5.0], [11, 7.0], [14, 9.0]],
  'bici-estatica': [[8, 3.0], [16, 4.0], [19, 6.0], [22, 8.0], [25.6, 10.0], [30, 12.0]],
  'bici-reclinada': [[8, 3.0], [16, 4.0], [19, 6.0], [22, 8.0], [25.6, 10.0], [30, 12.0]],
  'escaleras': [[2, 3.0], [5, 6.0], [8, 9.0], [12, 12.0], [16, 14.0]]
};
const CAL_ROW_WATTS = [[25, 2.8], [50, 3.5], [100, 7.0], [150, 8.5], [200, 12.0], [250, 14.0]];
function calInterp(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  }
  return pts[pts.length - 1][1];
}
function calTreadmillMet(kmh, inclinePct) {
  const S = kmh * 1000 / 60, G = Math.min(0.4, Math.max(0, (num(inclinePct) || 0) / 100));
  const walk = (0.1 * S + 1.8 * S * G + 3.5) / 3.5, run = (0.2 * S + 0.9 * S * G + 3.5) / 3.5;
  return kmh <= 6 ? walk : kmh >= 8 ? run : walk + (run - walk) * (kmh - 6) / 2;
}
/* Lo escrito en velocidad/ritmo → número válido (km/h, pisos/min o segundos por 500 m), o null. */
function calSpeedValue(def, raw) {
  const t = CARDIO_TYPES[def?.cardio]; if (!t) return null;
  const txt = String(raw ?? '').trim(); if (!txt) return null;
  if (t.speed.pace) {
    const m = txt.match(/^(\d{1,2}):(\d{1,2})$/);
    const sec = m ? Number(m[1]) * 60 + Number(m[2]) : (num(txt) !== null ? num(txt) * 60 : null);
    return sec !== null && sec >= 60 && sec <= 600 ? sec : null;
  }
  const v = num(txt);
  return v !== null && v > 0 && v <= (t.speed.max || 60) ? v : null;
}
/* MET de una serie de cardio según su velocidad e inclinación (null si no hay velocidad válida). */
function calCardioSetMet(def, x) {
  const v = calSpeedValue(def, x.speed); if (v === null) return null;
  let met;
  if (def.cardio === 'cinta') met = calTreadmillMet(v, x.incline);
  else if (def.cardio === 'remo') { const p = v / 500; met = calInterp(CAL_ROW_WATTS, 2.8 / (p * p * p)); }
  else met = calInterp(CAL_CARDIO_CURVES[def.cardio], v);
  return Math.min(15, Math.max(1.5, met));
}
/* Cardio. Prioridad por serie: kcal de la máquina > MET por velocidad (la escrita o la derivada de la distancia) > intensidad por defecto.
 * Cada serie es un bloque con su tiempo (cronómetro) y puede tener velocidad, inclinación, distancia y kcal propias.
 * El descanso entre bloques no cuenta. */
function calCardioDerivedSpeed(def, x, secs) {
  const dist = num(x.distance); if (dist === null || dist <= 0 || !(secs > 0)) return null;
  const t = CARDIO_TYPES[def.cardio];
  if (t.speed.pace) return secs / (dist / 500);          // segundos por 500 m (distancia en metros)
  if (def.cardio === 'escaleras') return dist / (secs / 60); // pisos por minuto
  return dist / (secs / 3600);                             // km/h
}
function calCardioKcal(e, def, cfg, b) {
  const done = (e.sets || []).filter(x => x.completed);
  const own = num(def.met), hasOwn = own !== null && own >= 1 && own <= 15, fb = calExerciseMet(def, e.sets, cfg);
  let secs = 0, metSecs = 0, kcal = 0, anySpeed = false, machine = 0, machineSecs = 0;
  for (const x of done) {
    const t = Number(x.duration) || Number(x.targetDuration) || 0, mk = num(x.kcalMachine);
    if (mk !== null && mk > 0 && mk <= 5000) { machine += mk; machineSecs += t; continue; }   // kcal de la máquina, tal cual
    let sm = null;
    if (!hasOwn) {
      if (calSpeedValue(def, x.speed) !== null) sm = calCardioSetMet(def, x);
      else {
        const d = calCardioDerivedSpeed(def, x, t);
        if (d !== null) sm = calCardioSetMet(def, { speed: CARDIO_TYPES[def.cardio].speed.pace ? `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}` : String(d), incline: x.incline });
      }
    }
    if (sm !== null) anySpeed = true;
    const met = hasOwn ? own : (sm ?? fb.met);
    secs += t; metSecs += met * t; if (b.weight) kcal += calKcal(met, t / 60, b, cfg);
  }
  const all = secs + machineSecs;
  return {
    kcal: b.weight ? kcal + machine : (machine || null), minutes: all / 60, met: secs ? metSecs / secs : fb.met,
    level: hasOwn ? 'custom' : anySpeed ? 'speed' : fb.level, method: machine && !secs ? 'machine' : 'cardio'
  };
}
/* Texto breve con el detalle de un resultado de calExerciseKcal. */
const calDetailText = r => {
  if (r.method === 'machine') return 'kcal de la máquina';
  if (r.method === 'mech') return `${r.sets} ${r.sets === 1 ? 'serie' : 'series'} · ${fmtNum(Math.round(r.volume))} kg·rep`;
  const mins = `${r.minutes < 1 ? '<1' : Math.round(r.minutes)} min`;
  return (r.level === 'custom' || r.level === 'speed') ? `${mins} · MET ${fmtNum(Math.round(r.met * 10) / 10)}` : `${mins} · intensidad ${CAL_LEVELS[r.level].toLowerCase()}`;
};

/* ---------- Pesas y calistenia: trabajo mecánico × intensidad relativa ---------- */
const CAL_KCAL_PER_KG_M = 0.0215;
/* Recorrido del movimiento en metros: el de la ficha (cm) o una aproximación por tipo de ejercicio. */
const CAL_ROM = [
  [/talones|gemelo/i, 0.10], [/encogimiento/i, 0.12], [/plancha|plank/i, 0.10], [/superman|tronco|lumbar/i, 0.30], [/curl/i, 0.40], [/extensi[oó]n de cu[aá]driceps/i, 0.45],
  [/sentadilla|prensa|hack|zancada|b[uú]lgara|goblet/i, 0.55], [/peso muerto|buenos d[ií]as|hiperextens|puente de gl[uú]teo|elevaci[oó]n de cadera/i, 0.45],
  [/press militar|press de hombros|arnold/i, 0.50], [/elevaciones|p[aá]jaros|aperturas|cruces|face pull|pec deck/i, 0.50],
  [/tr[ií]ceps|franc[eé]s/i, 0.40], [/press|flexion|fondos|dips/i, 0.45], [/jal[oó]n|dominada|chin|pull-?over/i, 0.60], [/remo/i, 0.45],
  [/aductor|abductor/i, 0.35], [/crunch|abdominal|rotaci[oó]n|elevaci[oó]n de (rodillas|piernas)|rueda|pallof|mountain|dead bug|bird dog|superman|lumbar|tronco|carry/i, 0.30]
];
const CAL_ROM_GROUP = { empuje: 0.45, traccion: 0.5, pierna: 0.5, core: 0.3, cardio: 0.3 };
function calRom(def) {
  const own = num(def?.rom); if (own !== null && own >= 3 && own <= 150) return own / 100;
  const hit = CAL_ROM.find(([re]) => re.test(def?.name || ''));
  return hit ? hit[1] : (CAL_ROM_GROUP[def?.group] ?? 0.45);
}
/* Fracción del peso corporal que se mueve en calistenia: la de la ficha (%) o una aproximación por ejercicio. */
const CAL_BW = [
  [/dominada|chin-?up|fondos|dips|talones/i, 1.0], [/flexion/i, 0.64], [/remo invertido/i, 0.6], [/colgado/i, 0.45],
  [/mountain|deslizante|hiperextens/i, 0.5], [/crunch inverso|superman/i, 0.3], [/dead bug|bird dog/i, 0.15], [/banda/i, 0.1]
];
function calBwFraction(def) {
  const own = num(def?.bw); if (own !== null && own >= 0 && own <= 150) return own / 100;
  const hit = CAL_BW.find(([re]) => re.test(def?.name || ''));
  return hit ? hit[1] : 0.5;
}
/* Mancuernas: el peso se anota por mancuerna, así que con dos a la vez la carga es el doble. */
const calDumbbellFactor = def => (/mancuernas/i.test(def?.name || '') && !/una mano|unilateral|alterno|una pierna|\bo (barra|disco)|o mancuernas/i.test(def?.name || '')) ? 2 : 1;
/* Intensidad relativa de una serie: 0,85 + 0,3 × %1RM (Epley con repeticiones + RIR). */
function calSetIntensity(def, x) {
  const rir = Math.min(6, Math.max(0, num(x.rir) ?? num(def?.targetRIR) ?? 2)), reps = num(x.reps) || 0;
  return 0.85 + 0.3 / (1 + (reps + rir) / 30);
}
function calStrengthKcal(e, def, cfg, b) {
  const done = (e.sets || []).filter(x => x.completed), rest = num(e.restSeconds) ?? num(def?.restSeconds) ?? 90;
  if (!b.weight) return { kcal: null, sets: done.length, volume: 0, minutes: 0, met: null, level: 'mech', method: 'mech' };
  const ref = calKcalPerMetKgH(b, cfg), rom = calRom(def), calis = def?.equip === 'calistenia', frac = calBwFraction(def), mult = calDumbbellFactor(def);
  let active = 0, recovery = 0, baseline = 0, volume = 0;
  for (const x of done) {
    const reps = num(x.reps) || 0, w = num(x.weight) || 0;   // en calistenia, un peso negativo es una ayuda (dominadas asistidas)
    const load = Math.max(0, calis ? b.weight * frac + w : w * mult);
    active += CAL_KCAL_PER_KG_M * load * rom * reps * calSetIntensity(def, x);
    recovery += 0.5 * ref * b.weight * rest / 3600;                         // el descanso mantiene el metabolismo elevado
    baseline += ref * b.weight * (reps * cfg.secPerRep + rest) / 3600;      // basal durante la serie y su descanso (solo modo bruto)
    volume += load * reps;
  }
  const kcal = (cfg.mode === 'net' ? active + recovery : active + recovery + baseline) * (1 + (Number(cfg.epoc) || 0) / 100) * calScale(cfg);
  return { kcal, sets: done.length, volume, minutes: 0, met: null, level: 'mech', method: 'mech' };
}

/* Segundos de un ejercicio por tiempo o con MET propio: series hechas + el descanso que sigue a cada una. */
function calExerciseSeconds(e, def = exerciseById(e.id) || e, cfg = calConfig()) {
  const rest = num(e.restSeconds) ?? num(def?.restSeconds) ?? 90;
  const done = (e.sets || []).filter(x => x.completed);
  if (!done.length) return 0;
  const timed = calIsTimed(def);
  const work = done.reduce((t, x) => t + (timed ? (Number(x.duration) || Number(x.targetDuration) || 0) : (num(x.reps) || 0) * cfg.secPerRep), 0);
  return work + done.length * rest;
}
/* Calorías de un ejercicio de una sesión: { kcal, method, minutes, met, level, sets, volume } (kcal = null si falta el peso). */
function calExerciseKcal(e, cfg = calConfig(), b = calBody()) {
  const def = exerciseById(e.id) || e;
  if (calIsCardio(def)) return calCardioKcal(e, def, cfg, b);
  const own = num(def.met);
  if (!calIsTimed(def) && !(own !== null && own >= 1 && own <= 15)) return calStrengthKcal(e, def, cfg, b);
  const secs = calExerciseSeconds(e, def, cfg), m = calExerciseMet(def, e.sets, cfg);
  return { kcal: b.weight ? calKcal(m.met, secs / 60, b, cfg) : null, minutes: secs / 60, met: m.met, level: m.level, method: 'met', sets: (e.sets || []).filter(x => x.completed).length, volume: 0 };
}
/* Calorías de una sesión: la suma de sus ejercicios. No usa la duración real, así que esperar una máquina no suma gasto. */
function calSessionKcal(s, cfg = calConfig(), b = calBody()) {
  const rows = s.exercises.map(e => Object.assign({ id: e.id, name: (exerciseById(e.id) || e).name }, calExerciseKcal(e, cfg, b)));
  const sets = rows.reduce((t, r) => t + (r.sets || 0), 0);
  if (!b.weight) return { total: rows.some(r => r.kcal) ? rows.reduce((t, r) => t + (r.kcal || 0), 0) : null, rows, sets };
  return { total: rows.reduce((t, r) => t + (r.kcal || 0), 0), rows, sets };
}
/* Referencias para la vista previa de Perfil. */
function calReference(b = calBody(), cfg = calConfig()) {
  const bench = { id: 'ref', name: 'Press de pecho convergente en máquina', group: 'empuje', equip: 'maquina', restSeconds: 90, targetRIR: 2 };
  const tread = { id: 'ref2', name: 'Cinta de Correr', group: 'cardio', cardio: 'cinta', tracking: 'time', equip: 'maquina' };
  const set = { completed: true, weight: '60', reps: '10', rir: '2', type: 'working' };
  const run = { completed: true, speed: '8', incline: '0', duration: 1200, targetDuration: 1200 };
  return {
    bench: calStrengthKcal({ id: 'ref', sets: [set] }, bench, cfg, b).kcal,
    treadmill: calCardioKcal({ id: 'ref2', sets: [run] }, tread, cfg, b).kcal
  };
}

/* Series para las gráficas de Progreso: modo 'session' (últimas n sesiones), 'week' (n semanas) o 'month' (n meses). */
function calSeries(mode, n = 12) {
  const cfg = calConfig(), b = calBody();
  const list = sessions().filter(s => completedSets(s) > 0).map(s => ({ s, kcal: calSessionKcal(s, cfg, b).total || 0 }));
  if (mode === 'session') {
    return list.slice(0, n).reverse().map(({ s, kcal }) => ({ key: s.id, label: formatDateShort(s.date), kcal, sessions: 1, title: `${s.name} · ${formatDateLong(s.date)}: ${fmtNum(Math.round(kcal))} kcal` }));
  }
  const buckets = [], now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    if (mode === 'week') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) - i * 7);
      buckets.push({ key: dateStr(d), label: formatDateShort(dateStr(d)), kcal: 0, sessions: 0, title: '' });
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: MONTHS_SHORT[d.getMonth()], kcal: 0, sessions: 0, title: '' });
    }
  }
  const map = new Map(buckets.map(x => [x.key, x]));
  for (const { s, kcal } of list) {
    let key;
    if (mode === 'week') { const d = parseDate(s.date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); key = dateStr(d); } else key = s.date.slice(0, 7);
    const x = map.get(key); if (x) { x.kcal += kcal; x.sessions++; }
  }
  buckets.forEach(x => { x.title = `${mode === 'week' ? 'Semana del ' + x.label : x.label}: ${fmtNum(Math.round(x.kcal))} kcal en ${x.sessions} ${x.sessions === 1 ? 'sesión' : 'sesiones'}`; });
  return buckets;
}
/* Resumen para las tarjetas de Progreso. */
function calStats() {
  const cfg = calConfig(), b = calBody();
  const list = sessions().filter(s => completedSets(s) > 0).map(s => ({ s, kcal: calSessionKcal(s, cfg, b).total || 0 }));
  const week = calSeries('week', 1)[0], month = calSeries('month', 1)[0];
  const best = list.reduce((m, x) => (!m || x.kcal > m.kcal ? x : m), null);
  const total = list.reduce((t, x) => t + x.kcal, 0);
  return { week: week.kcal, month: month.kcal, avg: list.length ? total / list.length : 0, total, count: list.length, best };
}
