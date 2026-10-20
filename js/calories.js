/* Rutina Gym — estimación de calorías con el método MET.
 *
 *   kcal = MET × (kcal por kg y hora de 1 MET) × peso (kg) × horas
 *
 * Los MET de partida salen del Compendio de Actividades Físicas (pesas: 3,5 ligera y 6,0 vigorosa;
 * calistenia: 3,8 ligera y 8,0 vigorosa). Los valores intermedios y los de ejercicios por tiempo
 * son aproximaciones. Es una estimación: el error habitual ronda el ±20-30 %.
 * Datos personales y ajustes se guardan en settings.body y settings.calc (solo en este dispositivo). */
'use strict';

const CAL_LEVELS = { light: 'Ligera', moderate: 'Moderada', vigorous: 'Vigorosa' };
const CAL_MET = {
  maquina:    { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  libre:      { light: 3.5, moderate: 5.0, vigorous: 6.0 },
  calistenia: { light: 3.8, moderate: 5.5, vigorous: 8.0 },
  tiempo:     { light: 2.3, moderate: 3.0, vigorous: 4.0 }
};
const CAL_RANGES = { age: [10, 100], weight: [30, 300], height: [100, 250], bodyFat: [3, 60] };
const CAL_DEFAULTS = {
  body: { sex: '', age: '', weight: '', height: '', bodyFat: '' },
  calc: { mode: 'gross', metRef: 'standard', secPerRep: 3, epoc: 0, intensity: { maquina: 'auto', libre: 'auto', calistenia: 'auto' } }
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
const calTable = def => CAL_MET[calIsTimed(def) ? 'tiempo' : (CAL_MET[def?.equip] ? def.equip : 'libre')];

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
  let level = CAL_LEVELS[def?.intensity] ? def.intensity : cfg.intensity[def?.equip];
  if (!CAL_LEVELS[level]) level = calAutoLevel(def, sets);
  return { met: calTable(def)[level], level };
}
function calKcal(met, minutes, b = calBody(), cfg = calConfig()) {
  if (!b.weight || !(minutes > 0)) return 0;
  const base = calKcalPerMetKgH(b, cfg) * b.weight * (minutes / 60);
  const kcal = cfg.mode === 'net' ? Math.max(0, met - 1) * base : met * base;
  return kcal * (1 + (Number(cfg.epoc) || 0) / 100);
}

/* Segundos que dura un ejercicio: series hechas + el descanso que sigue a cada una. */
function calExerciseSeconds(e, def = exerciseById(e.id) || e, cfg = calConfig()) {
  const rest = num(e.restSeconds) ?? num(def?.restSeconds) ?? 90;
  const done = (e.sets || []).filter(x => x.completed);
  if (!done.length) return 0;
  const timed = calIsTimed(def);
  const work = done.reduce((t, x) => t + (timed ? (Number(x.duration) || Number(x.targetDuration) || 0) : (num(x.reps) || 0) * cfg.secPerRep), 0);
  return work + done.length * rest; // cada serie hecha arranca su descanso
}
/* Calorías de un ejercicio de una sesión: { kcal, minutes, met, level } (kcal = null si falta el peso). */
function calExerciseKcal(e, cfg = calConfig(), b = calBody()) {
  const def = exerciseById(e.id) || e, secs = calExerciseSeconds(e, def, cfg), m = calExerciseMet(def, e.sets, cfg);
  return { kcal: b.weight ? calKcal(m.met, secs / 60, b, cfg) : null, minutes: secs / 60, met: m.met, level: m.level };
}
/* Calorías de una sesión.
 * rows: gasto de cada ejercicio (series + descansos entre series, igual que en su tarjeta).
 * extra: si la sesión duró más que la suma de sus ejercicios (cambios de máquina, pausas), ese tiempo se suma
 * al MET medio de la sesión. endAt permite calcularlo en vivo (por defecto, la hora de fin guardada). */
function calSessionKcal(s, cfg = calConfig(), b = calBody(), endAt = s.finishedAt) {
  const rows = s.exercises.map(e => Object.assign({ id: e.id, name: (exerciseById(e.id) || e).name }, calExerciseKcal(e, cfg, b)));
  const sumMin = rows.reduce((t, r) => t + r.minutes, 0);
  if (!b.weight) return { total: null, rows, minutes: sumMin, avgMet: null, extra: 0, extraMinutes: 0 };
  if (!sumMin) return { total: 0, rows, minutes: 0, avgMet: null, extra: 0, extraMinutes: 0 };
  const avgMet = rows.reduce((t, r) => t + r.met * r.minutes, 0) / sumMin;
  const real = s.startedAt && endAt ? (endAt - s.startedAt) / 60000 : 0;
  const extraMinutes = real > sumMin ? real - sumMin : 0;
  const extra = calKcal(avgMet, extraMinutes, b, cfg);
  const total = rows.reduce((t, r) => t + r.kcal, 0) + extra;
  return { total, rows, minutes: sumMin + extraMinutes, avgMet, extra, extraMinutes };
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
