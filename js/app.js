/* Rutina Gym — navegación y arranque.
 * Cada pantalla tiene su propia URL (#/workout/<id>, #/stats/<id>…) y usa el historial
 * del navegador, así que el botón Atrás (también el de Android) funciona como se espera. */
'use strict';

const TOP_LEVEL = ['', 'history', 'stats', 'settings'];
let leaveHandlers = [], lastPath = null, lastDay = todayStr();

function currentParts() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
function routeName() { return currentParts()[0] || ''; }
function onLeave(fn) { leaveHandlers.push(fn); }

function go(path, { replace = false } = {}) {
  flushSaves();
  const depth = history.state?.depth || 0;
  const url = '#/' + path;
  if (replace) history.replaceState({ depth }, '', url);
  else if (location.hash !== url) history.pushState({ depth: depth + 1 }, '', url);
  render();
}
function parentOf(parts) {
  const [a, b] = parts;
  if (a === 'stats' && b) return 'stats';
  if (a === 'library' && b) return 'library';
  if (a === 'library') return 'settings';
  return '';
}
function goBack() {
  if ((history.state?.depth || 0) > 0) history.back();
  else go(parentOf(currentParts()), { replace: true });
}

function render() {
  const parts = currentParts(), [r, a, b] = parts, path = parts.join('/');
  leaveHandlers.forEach(f => { try { f(); } catch { /* nada */ } }); leaveHandlers = [];
  closeSheet(); flushSaves(); setWakeLock(false);
  const keepScroll = path === lastPath ? window.scrollY : 0;
  lastPath = path;
  const tab = TOP_LEVEL.includes(r || '') ? (r || '') : (r === 'stats' ? 'stats' : r === 'library' ? 'settings' : r === 'history' ? 'history' : '');
  $$('.bottom-nav button').forEach(btn => { const on = btn.dataset.route === tab; btn.classList.toggle('active', on); btn.setAttribute('aria-current', on ? 'page' : 'false'); });
  try {
    switch (r || '') {
      case '': viewHome(); break;
      case 'day': if (!isDate(a)) return go('', { replace: true }); viewHome(a); break;
      case 'select': if (a === 'edit') viewSelect({ editId: b }); else if (isDate(a)) viewSelect({ date: a, group: b }); else return go('', { replace: true }); break;
      case 'workout': viewWorkout({ id: a }); break;
      case 'history': viewHistory(); break;
      case 'stats': if (a) viewExerciseStats({ id: a }); else viewStats(); break;
      case 'settings': viewSettings(); break;
      case 'library': if (a) viewEditor({ id: a }); else viewLibrary(); break;
      default: return go('', { replace: true });
    }
  } catch (e) {
    console.error(e);
    setHeader('Error', 'Esta pantalla no se ha podido cargar', true);
    paint(`<div class="card"><h2>Algo ha fallado</h2><p class="muted">${esc(e.message || e)}</p><p class="small muted">Tus datos no se han tocado. Vuelve al inicio y, si se repite, descarga una copia desde Ajustes.</p><button type="button" class="btn primary" id="reloadHome">Volver al inicio</button></div>`);
    $('#reloadHome').onclick = () => go('', { replace: true });
  }
  window.scrollTo(0, keepScroll);
}

function applyTheme() {
  const t = settings().theme;
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141824' : '#f5f7fb');
}

/* ---------- eventos globales ---------- */
window.addEventListener('popstate', render);
$('#backBtn').addEventListener('click', goBack);
$$('.bottom-nav button').forEach(btn => btn.addEventListener('click', () => {
  const target = btn.dataset.route;
  if (routeName() === target && currentParts().length <= 1) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  go(target, { replace: TOP_LEVEL.includes(routeName()) });
}));
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { flushSaves(); return; }
  if (todayStr() !== lastDay) { lastDay = todayStr(); if (['', 'day'].includes(routeName())) render(); }
});
window.addEventListener('pagehide', flushSaves);
window.addEventListener('error', e => console.error(e.error || e.message));
window.addEventListener('unhandledrejection', e => console.error(e.reason));

/* ---------- arranque ---------- */
(async function start() {
  applyTheme();
  migrateLegacy();
  migrateCatalog();
  try { await mediaLoadAll(); } catch (e) { console.warn('Imágenes no disponibles', e); }
  if (!history.state) history.replaceState({ depth: 0 }, '', location.hash || '#/');
  render();
  if (restState()) runRest();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) toast('Hay una versión nueva de la app.', { action: 'Recargar', onAction: () => { flushSaves(); location.reload(); } });
    });
    navigator.serviceWorker.register('./sw.js').catch(() => { /* la app funciona igual sin él */ });
  }
})();
