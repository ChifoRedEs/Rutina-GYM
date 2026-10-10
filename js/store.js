/* Rutina Gym — almacenamiento.
 * Sesiones, ejercicios, plantillas y ajustes: localStorage (mismas claves que la v2.4,
 * así los datos existentes se conservan al actualizar).
 * Imágenes: IndexedDB, con localStorage como último recurso. */
'use strict';

const BASE_EXERCISES = Array.isArray(DATA.EXERCISES) ? DATA.EXERCISES : [];
const K = {
  session: 'gym.session.',
  custom: 'gym.customExercises',
  overrides: 'gym.exerciseOverrides',
  templates: 'gym.templates',
  settings: 'gym.settings',
  timer: 'gym.timer',
  migrated: 'gym.migratedLegacy',
  media: 'gym.media.'
};

function lsRead(key, fallback = null) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } }
function lsWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.warn(e); toast('No se ha podido guardar: el almacenamiento del navegador está lleno. Exporta una copia y borra imágenes que no uses.'); return false; }
}
function lsRemove(key) { try { localStorage.removeItem(key); } catch { /* sin acceso */ } }
function lsKeys(prefix) { try { return Object.keys(localStorage).filter(k => k.startsWith(prefix)); } catch { return []; } }

/* ---------- ajustes ---------- */
const DEFAULT_SETTINGS = { theme: 'auto', sound: true, vibrate: true, wakeLock: true, autoRest: true, lastBackup: null, backupReminderDays: 7 };
function settings() { return Object.assign({}, DEFAULT_SETTINGS, lsRead(K.settings, {})); }
function setSetting(key, value) { const s = settings(); s[key] = value; lsWrite(K.settings, s); return s; }

/* ---------- sesiones (con caché en memoria) ---------- */
let sessionCache = null;   // Map id -> sesión
let sortedCache = null;

function normalizeSet(x, i) {
  return {
    id: x?.id || uid('set'),
    number: i + 1,
    type: x?.type === 'warmup' ? 'warmup' : 'working',
    weight: x?.weight ?? '',
    reps: x?.reps ?? '',
    rir: x?.rir ?? '',
    completed: Boolean(x?.completed),
    hintWeight: x?.hintWeight ?? '',
    hintReps: x?.hintReps ?? ''
  };
}
function normalizeSession(s) {
  if (!s || typeof s !== 'object' || !s.id || !isDate(s.date) || !Array.isArray(s.exercises)) return null;
  s.name = s.name || `Sesión ${groupLabel(s.group)}`;
  s.status = s.status || 'active';
  s.notes = s.notes || '';
  s.createdAt = s.createdAt || Date.now();
  s.exercises = s.exercises.filter(e => e && e.id).map(e => {
    e.sets = (Array.isArray(e.sets) ? e.sets : []).map(normalizeSet);
    e.notes = e.notes || '';
    return e;
  });
  return s;
}
function loadSessions() {
  if (sessionCache) return;
  sessionCache = new Map();
  for (const k of lsKeys(K.session)) { const s = normalizeSession(lsRead(k)); if (s) sessionCache.set(s.id, s); }
}
function sessions() {
  loadSessions();
  if (!sortedCache) sortedCache = [...sessionCache.values()].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  return sortedCache;
}
function getSession(id) { loadSessions(); return sessionCache.get(id) || null; }
function sessionsForDate(date) { return sessions().filter(s => s.date === date); }
function saveSession(s, { touch = true } = {}) {
  loadSessions();
  if (touch) s.updatedAt = Date.now();
  sessionCache.set(s.id, s); sortedCache = null;
  return lsWrite(K.session + s.date + '.' + s.id, s);
}
/* Guardado diferido para lo que se escribe tecla a tecla. */
const pendingSaves = new Map();
function scheduleSave(s) {
  loadSessions(); sessionCache.set(s.id, s); sortedCache = null;
  clearTimeout(pendingSaves.get(s.id)?.t);
  pendingSaves.set(s.id, { s, t: setTimeout(() => { pendingSaves.delete(s.id); saveSession(s); }, 400) });
}
function flushSaves() { for (const [id, p] of pendingSaves) { clearTimeout(p.t); saveSession(p.s); pendingSaves.delete(id); } }
function deleteSession(id) {
  const s = getSession(id); if (!s) return;
  clearTimeout(pendingSaves.get(id)?.t); pendingSaves.delete(id);
  lsRemove(K.session + s.date + '.' + s.id);
  sessionCache.delete(id); sortedCache = null;
}
function resetSessionCache() { sessionCache = null; sortedCache = null; }

/* ---------- ejercicios ---------- */
let exerciseCache = null;
function customExercises() { return lsRead(K.custom, []) || []; }
function overrides() { return lsRead(K.overrides, {}) || {}; }
function exerciseList() {
  if (exerciseCache) return exerciseCache;
  const ov = overrides(), custom = customExercises();
  const base = BASE_EXERCISES.map(x => Object.assign({}, x, ov[x.id] || {}, { builtin: true }));
  exerciseCache = base.concat(custom.filter(c => c && c.id && !BASE_EXERCISES.some(b => b.id === c.id)).map(c => Object.assign({}, c, { builtin: false })));
  return exerciseCache;
}
function exerciseById(id) { return exerciseList().find(x => x.id === id) || null; }
function saveExercise(obj) {
  const clean = Object.assign({}, obj); delete clean.builtin;
  if (BASE_EXERCISES.some(x => x.id === obj.id)) { const ov = overrides(); ov[obj.id] = clean; lsWrite(K.overrides, ov); }
  else { const arr = customExercises(); const i = arr.findIndex(x => x.id === obj.id); if (i >= 0) arr[i] = clean; else arr.push(clean); lsWrite(K.custom, arr); }
  exerciseCache = null;
}
function deleteCustomExercise(id) { lsWrite(K.custom, customExercises().filter(x => x.id !== id)); exerciseCache = null; }
function resetExerciseCache() { exerciseCache = null; }
const incrementOf = def => { const n = num(def?.increment); return n != null ? Math.max(0, n) : (def?.equip === 'calistenia' ? 0 : 2.5); };

/* ---------- plantillas ---------- */
function templates() { return lsRead(K.templates, []) || []; }
function saveTemplates(arr) { return lsWrite(K.templates, arr); }

/* ---------- imágenes (IndexedDB) ----------
 * Registro: { id: <id ejercicio>, images: [{ id, full, thumb, w, h, bytes }], updatedAt }
 * La v2.4 guardaba { id, dataUrl }: se convierte al leer. */
let mediaDBPromise = null;
const mediaCache = new Map();
let mediaLoaded = false;

function mediaDB() {
  if (mediaDBPromise) return mediaDBPromise;
  if (!('indexedDB' in window)) return (mediaDBPromise = Promise.resolve(null));
  mediaDBPromise = new Promise(resolve => {
    try {
      const r = indexedDB.open('rutina-gym-media-v3', 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('media')) r.result.createObjectStore('media', { keyPath: 'id' }); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return mediaDBPromise;
}
function normalizeMedia(r) {
  if (!r || !r.id) return null;
  let images = Array.isArray(r.images) ? r.images : [];
  if (!images.length && r.dataUrl) images = [{ id: 'img-legacy', full: r.dataUrl, thumb: r.dataUrl, w: 0, h: 0, bytes: r.dataUrl.length * 0.75 }];
  images = images.filter(i => i && imageSrc(i.full));
  return { id: r.id, images, updatedAt: r.updatedAt || Date.now() };
}
async function mediaLoadAll() {
  if (mediaLoaded) return;
  const db = await mediaDB();
  let rows = [];
  if (!db) rows = lsKeys(K.media).map(k => lsRead(k)).filter(Boolean);
  else rows = await new Promise(res => { try { const r = db.transaction('media').objectStore('media').getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); } catch { res([]); } });
  rows.map(normalizeMedia).filter(Boolean).forEach(m => mediaCache.set(m.id, m));
  mediaLoaded = true;
}
function mediaImages(id) { return mediaCache.get(id)?.images || []; }
/* Imagen principal de un ejercicio: la primera subida o, si no hay, la ruta del repositorio. */
function mainImage(def) {
  const imgs = mediaImages(def?.id);
  if (imgs.length) return { full: imgs[0].full, thumb: imgs[0].thumb || imgs[0].full };
  const p = imageSrc(def?.imagePath || '');
  return p ? { full: p, thumb: p } : null;
}
async function mediaSet(id, images) {
  const rec = { id, images, updatedAt: Date.now() };
  const db = await mediaDB();
  if (!images.length) { await mediaDelete(id); return true; }
  if (!db) { const ok = lsWrite(K.media + id, rec); if (ok) mediaCache.set(id, rec); return ok; }
  return new Promise(res => {
    try {
      const t = db.transaction('media', 'readwrite');
      t.objectStore('media').put(rec);
      t.oncomplete = () => { mediaCache.set(id, rec); res(true); };
      t.onerror = () => { toast('No se ha podido guardar la imagen.'); res(false); };
    } catch { res(false); }
  });
}
async function mediaDelete(id) {
  mediaCache.delete(id);
  const db = await mediaDB();
  if (!db) { lsRemove(K.media + id); return; }
  await new Promise(res => { try { const t = db.transaction('media', 'readwrite'); t.objectStore('media').delete(id); t.oncomplete = res; t.onerror = res; } catch { res(); } });
}
async function mediaAll() { await mediaLoadAll(); return [...mediaCache.values()]; }
async function mediaClear() {
  mediaCache.clear(); lsKeys(K.media).forEach(lsRemove);
  const db = await mediaDB(); if (!db) return;
  await new Promise(res => { try { const t = db.transaction('media', 'readwrite'); t.objectStore('media').clear(); t.oncomplete = res; t.onerror = res; } catch { res(); } });
}

/* ---------- migración desde versiones anteriores ---------- */
function migrateLegacy() {
  if (lsRead(K.migrated, false)) return;
  try {
    const legacyCustom = lsRead('customExercises', null);
    if (Array.isArray(legacyCustom) && legacyCustom.length) {
      const merged = customExercises();
      legacyCustom.forEach(x => { if (x?.id && !merged.some(c => c.id === x.id)) merged.push(x); });
      lsWrite(K.custom, merged);
    }
    for (const k of lsKeys('workout:')) {
      const raw = lsRead(k); const date = k.slice(8);
      if (!raw || !raw.group || !isDate(date)) continue;
      const ex = (raw.exercises || []).map(e => ({
        id: e.id, name: e.name, primary: e.primary || '', secondary: e.secondary || '', subgroup: e.subgroup || '', equip: e.equip || '', restSeconds: 90, notes: '',
        sets: [normalizeSet({ weight: e.peso ?? '', reps: e.reps ?? '', completed: Boolean(e.checked) }, 0)]
      }));
      if (ex.length) saveSession({ id: uid('legacy'), date, group: raw.group, name: `Sesión ${groupLabel(raw.group)}`, createdAt: raw.updatedAt || Date.now(), status: 'completed', notes: '', exercises: ex });
      lsRemove(k);
    }
  } catch (e) { console.warn('Migración antigua fallida', e); }
  lsWrite(K.migrated, true);
}

/* Si otra pestaña cambia los datos, se descarta la caché para no pisar sus cambios. */
window.addEventListener('storage', e => {
  if (e.key === null || e.key.startsWith('gym.')) { resetSessionCache(); resetExerciseCache(); }
});
