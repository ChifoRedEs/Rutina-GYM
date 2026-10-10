/* Rutina Gym — cálculos de entrenamiento. Las series de calentamiento no cuentan
 * para volumen, récords, 1RM estimado ni sugerencias de progresión. */
'use strict';

const isWork = x => x.type !== 'warmup';
const isDoneWork = x => x.completed && isWork(x);
const completedSets = s => s.exercises.reduce((n, e) => n + e.sets.filter(x => x.completed).length, 0);
const totalSets = s => s.exercises.reduce((n, e) => n + e.sets.length, 0);
const progressPct = s => (totalSets(s) ? (completedSets(s) / totalSets(s)) * 100 : 0);
const setVolume = x => (isDoneWork(x) ? (num(x.weight) || 0) * (num(x.reps) || 0) : 0);
const exerciseVolume = e => e.sets.reduce((a, x) => a + setVolume(x), 0);
const sessionVolume = s => s.exercises.reduce((n, e) => n + exerciseVolume(e), 0);
const workingSetCount = s => s.exercises.reduce((n, e) => n + e.sets.filter(isDoneWork).length, 0);
const sessionDuration = s => (s.startedAt && s.finishedAt ? s.finishedAt - s.startedAt : null);

/* 1RM estimado (Epley). Poco fiable por encima de ~12 repeticiones, pero útil para ver tendencia. */
function e1rm(weight, reps) {
  const w = num(weight), r = num(reps);
  if (!w || !r || r < 1) return null;
  return r === 1 ? w : w * (1 + r / 30);
}

/* Última vez que se hizo un ejercicio con series efectivas completadas, anterior a esta sesión. */
function lastPerformance(exId, ref) {
  for (const s of sessions()) {
    if (ref && (s.id === ref.id || s.date > ref.date || (s.date === ref.date && (s.createdAt || 0) >= (ref.createdAt || 0)))) continue;
    const e = s.exercises.find(x => x.id === exId);
    if (e && e.sets.some(isDoneWork)) return { session: s, exercise: e };
  }
  return null;
}

/* Sugerencia de doble progresión a partir de la última vez:
 *  - todas las series efectivas en el máximo de reps con el RIR objetivo (o más) → subir peso
 *  - más de la mitad por debajo del mínimo → bajar peso
 *  - si no → mismo peso, intentar +1 rep */
function suggestion(def, prevEx) {
  if (!def || !prevEx) return null;
  const work = prevEx.sets.filter(x => isDoneWork(x) && num(x.reps) != null);
  if (!work.length) return null;
  const min = num(def.targetRepsMin) || 8, max = Math.max(min, num(def.targetRepsMax) || 12);
  const rirT = num(def.targetRIR) ?? 1, inc = incrementOf(def);
  const top = Math.max(...work.map(x => num(x.weight) || 0));
  const topSets = work.filter(x => (num(x.weight) || 0) === top);
  const reps = topSets.map(x => num(x.reps));
  const rirOk = topSets.every(x => num(x.rir) == null || num(x.rir) >= rirT);
  const fmtW = w => `${fmtNum(w)} kg`;

  if (reps.every(r => r >= max) && rirOk) {
    if (inc > 0 && top > 0) return { kind: 'up', weight: round(top + inc, 2), reps: min, text: `Sube a ${fmtW(top + inc)} y empieza en ${min} reps` };
    return { kind: 'up', weight: top || '', reps: Math.max(...reps) + 1, text: top ? `Mantén ${fmtW(top)} y busca ${Math.max(...reps) + 1} reps, o añade lastre` : `Busca ${Math.max(...reps) + 1} reps o añade lastre` };
  }
  if (reps.filter(r => r < min).length > reps.length / 2) {
    if (inc > 0 && top - inc > 0) return { kind: 'down', weight: round(top - inc, 2), reps: min, text: `Baja a ${fmtW(top - inc)}: no llegaste a ${min} reps` };
    return { kind: 'hold', weight: top || '', reps: min, text: `Repite e intenta llegar a ${min} reps` };
  }
  const goal = Math.min(max, Math.min(...reps) + 1);
  return { kind: 'reps', weight: top || '', reps: goal, text: top ? `Mantén ${fmtW(top)} y busca ${goal} reps (objetivo ${max})` : `Busca ${goal} reps (objetivo ${max})` };
}

/* Series de una sesión nueva: copia la estructura de la última vez y deja el peso y las reps
 * sugeridos como pista (placeholder). Se rellenan solos al marcar la serie como hecha. */
function buildSets(base, prevEx, sug) {
  if (!base || !base.sets?.length) return [0, 1, 2].map(i => normalizeSet({}, i));
  const prevWork = (prevEx?.sets || []).filter(isWork), prevWarm = (prevEx?.sets || []).filter(x => !isWork(x));
  let wi = 0, ci = 0;
  const pick = (...v) => v.find(x => x !== '' && x != null) ?? '';
  return base.sets.map((p, i) => {
    const work = isWork(p), ref = work ? prevWork[wi++] : prevWarm[ci++];
    return normalizeSet({
      type: p.type,
      hintWeight: work && sug ? sug.weight : pick(p.weight, p.hintWeight, ref?.weight),
      hintReps: work && sug ? sug.reps : pick(p.reps, p.hintReps, ref?.reps)
    }, i);
  });
}
function makeSessionExercise(def, ref, copyFrom = null) {
  const prev = lastPerformance(def.id, ref);
  const sug = suggestion(def, prev?.exercise);
  const base = copyFrom || prev?.exercise || null;
  return {
    id: def.id, name: def.name, primary: def.primary || '', secondary: def.secondary || '', subgroup: def.subgroup || '', equip: def.equip || '',
    restSeconds: num(def.restSeconds) ?? 90, notes: '', sets: buildSets(base, prev?.exercise, sug)
  };
}
function newSession({ date, group, name, defs, copyFrom = null }) {
  const s = { id: uid('session'), date, group, name: name || `Sesión ${groupLabel(group)}`, createdAt: Date.now(), updatedAt: Date.now(), status: 'active', notes: '', startedAt: null, finishedAt: null, exercises: [] };
  s.exercises = defs.map(d => makeSessionExercise(d, s, copyFrom?.exercises?.find(e => e.id === d.id) || null));
  return s;
}

/* Historial de un ejercicio, de más antiguo a más reciente. */
function exerciseHistory(exId) {
  const out = [];
  for (const s of sessions()) {
    const e = s.exercises.find(x => x.id === exId); if (!e) continue;
    const work = e.sets.filter(x => isDoneWork(x) && num(x.reps));
    if (!work.length) continue;
    let top = null, best = null;
    for (const x of work) {
      const w = num(x.weight) || 0, r = num(x.reps), est = e1rm(w, r);
      if (!top || w > top.w || (w === top.w && r > top.r)) top = { w, r };
      if (est && (!best || est > best)) best = est;
    }
    out.push({ date: s.date, sessionId: s.id, top, e1rm: best, volume: exerciseVolume(e), maxReps: Math.max(...work.map(x => num(x.reps))), sets: work });
  }
  return out.reverse();
}
function personalRecords() {
  const pr = {};
  for (const s of sessions()) for (const e of s.exercises) for (const x of e.sets) {
    if (!isDoneWork(x)) continue;
    const w = num(x.weight) || 0, r = num(x.reps) || 0, est = e1rm(w, r);
    const cur = pr[e.id] || (pr[e.id] = { id: e.id, name: e.name, weight: 0, reps: 0, date: s.date, e1rm: 0, e1rmDate: s.date, sessions: new Set() });
    cur.sessions.add(s.id);
    if (w > cur.weight || (w === cur.weight && r > cur.reps)) Object.assign(cur, { weight: w, reps: r, date: s.date });
    if (est && est > cur.e1rm) Object.assign(cur, { e1rm: est, e1rmDate: s.date });
  }
  return Object.values(pr).map(p => Object.assign(p, { count: p.sessions.size }));
}
/* Volumen por semana (lunes a domingo) de las últimas n semanas, incluidas las vacías. */
function weeklyVolume(n = 12) {
  const now = new Date(); const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(monday); d.setDate(d.getDate() - i * 7); weeks.push({ key: dateStr(d), volume: 0, sessions: 0 }); }
  const map = new Map(weeks.map(w => [w.key, w]));
  for (const s of sessions()) {
    const d = parseDate(s.date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const w = map.get(dateStr(d)); if (w) { w.volume += sessionVolume(s); w.sessions++; }
  }
  return weeks;
}
