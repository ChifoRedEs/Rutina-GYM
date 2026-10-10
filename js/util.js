/* Rutina Gym — utilidades comunes (sin dependencias). */
'use strict';

const APP_VERSION = '3.0.0';
const DATA = window.GYM_DATA || {};
const GROUPS = DATA.GROUPS || {};
const SUBGROUPS = DATA.SUBGROUPS || {};
const EQUIP = DATA.EQUIP || { maquina: 'Máquina', libre: 'Peso libre', calistenia: 'Peso corporal' };
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const pad = n => String(n).padStart(2, '0');
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/* Siempre calculado en el momento: la app puede quedarse abierta de un día para otro. */
const todayStr = () => dateStr(new Date());
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const fmtNum = n => (n == null ? '–' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 1 }));
const groupColor = g => GROUPS[g]?.color || '#7c5cff';
const groupLabel = g => GROUPS[g]?.label || g || '';

function parseDate(ds) { const [y, m, d] = ds.split('-').map(Number); return new Date(y, m - 1, d); }
function formatDateLong(ds) {
  if (!isDate(ds)) return ds || '';
  const dt = parseDate(ds);
  return `${WEEKDAYS[(dt.getDay() + 6) % 7]}, ${dt.getDate()} de ${MONTHS[dt.getMonth()]} de ${dt.getFullYear()}`;
}
function formatDateShort(ds) {
  if (!isDate(ds)) return ds || '';
  const dt = parseDate(ds);
  return `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`;
}
function formatDuration(ms) {
  if (!ms || ms < 0) return '–';
  const t = Math.round(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h ? `${h} h ${pad(m)} min` : `${m}:${pad(s)}`;
}
function formatClock(sec) { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

function safeUrl(v) {
  if (!String(v ?? '').trim()) return '';
  try { const u = new URL(String(v || ''), document.baseURI); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; }
  catch { return ''; }
}
function imageSrc(v) {
  const x = String(v || '');
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(x)) return x;
  return safeUrl(x);
}
/* Devuelve el ID de un vídeo de YouTube (watch, youtu.be, shorts, embed) o ''. */
function youtubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.searchParams.get('v')) id = u.searchParams.get('v');
      else { const m = u.pathname.match(/\/(shorts|embed|live)\/([^/?#]+)/); if (m) id = m[2]; }
    }
    return /^[\w-]{11}$/.test(id) ? id : '';
  } catch { return ''; }
}

function toast(message, opts = {}) {
  const el = $('#toast'); if (!el) return;
  el.innerHTML = `<span>${esc(message)}</span>${opts.action ? `<button type="button">${esc(opts.action)}</button>` : ''}`;
  el.classList.add('show');
  if (opts.action) $('button', el).onclick = () => { el.classList.remove('show'); opts.onAction?.(); };
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), opts.duration || (opts.action ? 6000 : 2800));
}

/* Diálogo de confirmación propio (los confirm() nativos se bloquean en algunas PWA). */
function ask(message, { ok = 'Aceptar', cancel = 'Cancelar', danger = false, input = null } = {}) {
  return new Promise(resolve => {
    const root = document.createElement('div');
    root.className = 'dialog-backdrop';
    root.innerHTML = `<div class="dialog" role="dialog" aria-modal="true">
      <p>${esc(message)}</p>
      ${input !== null ? `<input id="dialogInput" value="${esc(input)}" maxlength="80">` : ''}
      <div class="dialog-actions"><button type="button" class="btn" data-r="0">${esc(cancel)}</button>
      <button type="button" class="btn ${danger ? 'danger-solid' : 'primary'}" data-r="1">${esc(ok)}</button></div></div>`;
    document.body.append(root);
    const field = $('#dialogInput', root);
    const done = r => { root.remove(); resolve(input !== null ? (r ? field.value.trim() : null) : r); };
    $$('[data-r]', root).forEach(b => b.onclick = () => done(b.dataset.r === '1'));
    root.addEventListener('click', e => { if (e.target === root) done(false); });
    root.addEventListener('keydown', e => { if (e.key === 'Escape') done(false); if (e.key === 'Enter' && field) done(true); });
    (field || $('[data-r="1"]', root)).focus();
    field?.select();
  });
}

function download(content, name, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}
