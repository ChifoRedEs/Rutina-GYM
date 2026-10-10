/* Rutina Gym — copias de seguridad.
 * Restaurar es seguro: valida toda la copia antes de tocar nada, descarga antes una
 * copia de lo que hay y, si falla la escritura a mitad, deja los datos como estaban. */
'use strict';

async function buildBackup() {
  flushSaves();
  const media = (await mediaAll()).map(m => ({ id: m.id, images: m.images }));
  const cfg = settings(); delete cfg.lastBackup;
  return { app: 'Rutina Gym', version: APP_VERSION, exportedAt: new Date().toISOString(), sessions: sessions(), customExercises: customExercises(), overrides: overrides(), templates: templates(), settings: cfg, media };
}
async function exportBackup({ name } = {}) {
  const data = await buildBackup();
  download(JSON.stringify(data), name || `rutina-gym-copia-${todayStr()}.json`, 'application/json');
  setSetting('lastBackup', Date.now());
  return data;
}
function exportCSV() {
  flushSaves();
  const rows = [['Fecha', 'Sesión', 'Grupo', 'Ejercicio', 'Serie', 'Tipo', 'Peso kg', 'Reps', 'RIR', 'Volumen kg', '1RM estimado kg', 'Duración sesión min']];
  for (const s of [...sessions()].reverse()) {
    const dur = sessionDuration(s);
    for (const e of s.exercises) e.sets.forEach((x, i) => {
      if (!x.completed) return;
      const est = isWork(x) ? e1rm(x.weight, x.reps) : null;
      rows.push([s.date, s.name, groupLabel(s.group), e.name, i + 1, isWork(x) ? 'Efectiva' : 'Calentamiento', x.weight, x.reps, x.rir, setVolume(x), est ? round(est, 1) : '', dur ? Math.round(dur / 60000) : '']);
    });
  }
  const csv = '\ufeff' + rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
  download(csv, `rutina-gym-${todayStr()}.csv`, 'text/csv;charset=utf-8');
  toast('CSV exportado');
}

function validateBackup(d) {
  if (!d || typeof d !== 'object' || d.app !== 'Rutina Gym') throw new Error('El archivo no es una copia de Rutina Gym.');
  const raw = Array.isArray(d.sessions) ? d.sessions : [];
  const valid = [], seen = new Set();
  for (const s of raw) {
    const n = normalizeSession(JSON.parse(JSON.stringify(s ?? null)));
    if (n && !seen.has(n.id)) { seen.add(n.id); valid.push(n); }
  }
  const custom = (Array.isArray(d.customExercises) ? d.customExercises : []).filter(x => x && typeof x === 'object' && x.id && x.name);
  const ov = d.overrides && typeof d.overrides === 'object' && !Array.isArray(d.overrides) ? d.overrides : {};
  const tpl = (Array.isArray(d.templates) ? d.templates : []).filter(t => t && t.id && t.name && Array.isArray(t.exercises));
  const media = (Array.isArray(d.media) ? d.media : []).map(normalizeMedia).filter(m => m && m.images.length);
  const cfg = d.settings && typeof d.settings === 'object' ? d.settings : null;
  return { sessions: valid, invalid: raw.length - valid.length, custom, overrides: ov, templates: tpl, media, settings: cfg, exportedAt: d.exportedAt };
}

async function importBackup(file) {
  let data;
  try { data = validateBackup(JSON.parse(await file.text())); }
  catch (e) { toast(e instanceof SyntaxError ? 'El archivo está dañado: no es un JSON válido.' : e.message); return false; }
  if (!data.sessions.length && data.invalid) { toast('La copia no contiene ninguna sesión válida. No se ha cambiado nada.'); return false; }

  const when = data.exportedAt ? ` del ${formatDateLong(String(data.exportedAt).slice(0, 10))}` : '';
  let msg = `La copia${when} tiene ${data.sessions.length} sesiones. Reemplazará las ${sessions().length} que tienes ahora. Antes se descargará una copia de tus datos actuales.`;
  if (data.invalid) msg += ` ${data.invalid} sesiones de la copia están dañadas y se ignorarán.`;
  if (!(await ask(msg, { ok: 'Restaurar' }))) return false;

  if (sessions().length || customExercises().length) await exportBackup({ name: `rutina-gym-antes-de-restaurar-${todayStr()}.json` });

  // Instantánea para poder deshacer si algo falla a mitad.
  const snapshot = lsKeys('gym.').filter(k => k !== K.timer).map(k => [k, localStorage.getItem(k)]);
  const rollback = () => { lsKeys(K.session).forEach(lsRemove); snapshot.forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* nada */ } }); resetSessionCache(); resetExerciseCache(); };

  flushSaves();
  lsKeys(K.session).forEach(lsRemove);
  resetSessionCache(); resetExerciseCache();
  let ok = true;
  for (const s of data.sessions) if (!saveSession(s, { touch: false })) { ok = false; break; }
  ok = ok && lsWrite(K.custom, data.custom) && lsWrite(K.overrides, data.overrides) && lsWrite(K.templates, data.templates);
  if (!ok) { rollback(); toast('No había espacio para restaurar la copia. Tus datos siguen como estaban.'); return false; }
  if (data.settings) { const keep = settings().lastBackup; lsWrite(K.settings, Object.assign({}, DEFAULT_SETTINGS, data.settings, { lastBackup: keep })); applyTheme(); }

  await mediaClear();
  let mediaFail = 0;
  for (const m of data.media) if (!(await mediaSet(m.id, m.images))) mediaFail++;
  resetSessionCache(); resetExerciseCache();
  toast(mediaFail ? `Copia restaurada. ${mediaFail} fichas de imágenes no se pudieron guardar.` : 'Copia restaurada');
  return true;
}

async function wipeData() {
  if (!(await ask('Se borrarán todos los entrenamientos, plantillas, ejercicios personalizados, imágenes y ajustes de este navegador. No se puede deshacer.', { ok: 'Borrar todo', danger: true }))) return false;
  if (sessions().length && await ask('¿Quieres descargar una copia antes de borrar?', { ok: 'Descargar copia', cancel: 'No, borrar ya' })) await exportBackup();
  stopRest(); flushSaves();
  lsKeys('gym.').forEach(lsRemove);
  ['customExercises'].forEach(lsRemove);
  await mediaClear();
  resetSessionCache(); resetExerciseCache();
  toast('Datos borrados');
  return true;
}
