/* Rutina Gym — pantallas de entrenamiento: calendario, día, selección, sesión e historial. */
'use strict';

let viewYear = new Date().getFullYear(), viewMonth = new Date().getMonth();
const GROUP_ORDER = () => Object.keys(GROUPS);

/* ---------- piezas comunes ---------- */
function setHeader(title, subtitle, back) {
  $('#pageTitle').textContent = title;
  $('#pageSubtitle').textContent = subtitle || '';
  $('#backBtn').classList.toggle('hidden', !back);
  document.title = title === 'Rutina Gym' ? 'Rutina Gym' : `${title} · Rutina Gym`;
}
function paint(html) { const el = $('#screen'); el.innerHTML = html; return el; }

let currentSheetClose = null;
function openSheet(html, { onClose } = {}) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-backdrop"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  const bd = $('.modal-backdrop', root);
  const close = () => { if (currentSheetClose !== close) return; currentSheetClose = null; root.innerHTML = ''; onClose?.(); };
  currentSheetClose = close;
  bd.addEventListener('click', e => { if (e.target === bd) close(); });
  $$('[data-close]', root).forEach(b => b.onclick = close);
  ($('[data-close]', root) || $('.sheet', root)).focus?.();
  return { root: $('.sheet', root), close };
}
/* Cierra sin disparar onClose (se usa al navegar). */
function closeSheet() { currentSheetClose = null; $('#modalRoot').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && currentSheetClose && !$('.dialog-backdrop')) currentSheetClose(); });

/* Menú de acciones. Resuelve con la clave elegida o null. */
function actionMenu(title, items) {
  return new Promise(resolve => {
    const { root, close } = openSheet(`<div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></div>
      <div class="menu-list">${items.map(i => `<button type="button" class="menu-item ${i.danger ? 'danger' : ''}" data-k="${esc(i.key)}">${esc(i.label)}</button>`).join('')}</div>`, { onClose: () => resolve(null) });
    $$('[data-k]', root).forEach(b => b.onclick = () => { closeSheet(); resolve(b.dataset.k); });
    void close;
  });
}

function openGallery(images, start = 0, title = '') {
  let i = start;
  const { root } = openSheet(`<div class="sheet-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></div>
    <div class="gallery"><img alt="${esc(title)}"><div class="gallery-nav ${images.length > 1 ? '' : 'hidden'}"><button type="button" class="btn" data-g="-1" aria-label="Anterior">‹</button><span></span><button type="button" class="btn" data-g="1" aria-label="Siguiente">›</button></div></div>`);
  const draw = () => { $('img', root).src = images[i].full; $('.gallery-nav span', root).textContent = `${i + 1} de ${images.length}`; };
  $$('[data-g]', root).forEach(b => b.onclick = () => { i = (i + Number(b.dataset.g) + images.length) % images.length; draw(); });
  draw();
}
function openTutorial(def) {
  const url = safeUrl(def.tutorialUrl), id = youtubeId(url);
  if (!id) { window.open(url, '_blank', 'noopener'); return; }
  openSheet(`<div class="sheet-head"><h3>${esc(def.name)}</h3><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></div>
    <div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="Tutorial: ${esc(def.name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
    <a class="btn full" href="${esc(url)}" target="_blank" rel="noopener">Abrir en YouTube</a>`);
}

function sortDefs(defs) {
  const g = GROUP_ORDER(), eq = Object.keys(EQUIP), idx = (a, v) => { const i = a.indexOf(v); return i < 0 ? 99 : i; };
  const pos = new Map(exerciseList().map((x, i) => [x.id, i]));
  return [...defs].sort((a, b) => idx(g, a.group) - idx(g, b.group) || idx(SUBGROUPS[a.group] || [], a.subgroup) - idx(SUBGROUPS[b.group] || [], b.subgroup) || idx(eq, a.equip) - idx(eq, b.equip) || pos.get(a.id) - pos.get(b.id));
}

/* Pide al navegador que no borre los datos (Safari los elimina tras días sin uso). */
async function requestPersist() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* no disponible */ }
}

function createAndOpen(s) {
  if (!saveSession(s)) return;
  requestPersist();
  closeSheet();
  go(`workout/${s.id}`, { replace: ['day', 'select'].includes(routeName()) });
}
function repeatSession(src, date) {
  const defs = src.exercises.map(e => exerciseById(e.id) || Object.assign({}, e));
  createAndOpen(newSession({ date, group: src.group, name: src.name, defs, copyFrom: src }));
}
function startTemplate(t, date) {
  const defs = t.exercises.map(e => exerciseById(e.id)).filter(Boolean);
  if (!defs.length) { toast('Los ejercicios de esta plantilla ya no existen.'); return; }
  createAndOpen(newSession({ date, group: t.group, name: t.name, defs, copyFrom: { exercises: t.exercises } }));
}

/* ---------- inicio: calendario ---------- */
function viewHome(openDate) {
  setHeader('Rutina Gym', 'Elige un día para entrenar', false);
  if (openDate && isDate(openDate)) { const d = parseDate(openDate); viewYear = d.getFullYear(); viewMonth = d.getMonth(); }
  const today = todayStr(), prefix = `${viewYear}-${pad(viewMonth + 1)}`;
  const dots = {};
  sessions().filter(s => s.date.startsWith(prefix)).forEach(s => (dots[s.date] ??= new Set()).add(s.group));
  const first = new Date(viewYear, viewMonth, 1), offset = (first.getDay() + 6) % 7, total = new Date(viewYear, viewMonth + 1, 0).getDate();
  let cells = '';
  for (let i = 0; i < offset; i++) cells += '<div class="day-cell empty" aria-hidden="true"></div>';
  for (let d = 1; d <= total; d++) {
    const ds = `${prefix}-${pad(d)}`, gs = [...(dots[ds] || [])];
    cells += `<button type="button" class="day-cell ${ds === today ? 'today' : ''} ${gs.length ? 'has-workout' : ''}" data-date="${ds}" aria-label="${esc(formatDateLong(ds))}${gs.length ? ', con entrenamiento' : ''}"><span>${d}</span><span class="day-dots">${gs.map(g => `<i class="dot" style="background:${esc(groupColor(g))}"></i>`).join('')}</span></button>`;
  }

  const active = sessions().find(s => s.status === 'active' && s.date === today && completedSets(s) > 0);
  const cfg = settings();
  const daysSince = cfg.lastBackup ? daysBetween(cfg.lastBackup, Date.now()) : null;
  const needBackup = cfg.backupReminderDays > 0 && sessions().length >= 3 && (daysSince === null || daysSince >= cfg.backupReminderDays) && !(cfg.backupSnoozeUntil > Date.now());
  const recent = sessions().slice(0, 3);

  paint(`
    ${active ? `<button type="button" class="resume" style="--gc:${esc(groupColor(active.group))}" data-open="${esc(active.id)}"><span><b>Entreno en curso</b><span class="small">${esc(active.name)}: ${completedSets(active)} de ${totalSets(active)} series</span></span><span class="resume-go">Continuar</span></button>` : ''}
    ${needBackup ? `<div class="card notice"><div><b>${daysSince === null ? 'Aún no has guardado ninguna copia' : `Tu última copia es de hace ${daysSince} días`}</b><p class="small muted">Los datos solo están en este navegador. Descarga una copia para no perderlos.</p></div><div class="notice-actions"><button type="button" class="btn primary" id="doBackup">Descargar copia</button><button type="button" class="btn ghost" id="snoozeBackup">Más tarde</button></div></div>` : ''}
    <div class="calendar-head"><button type="button" class="month-btn" id="prevMonth" aria-label="Mes anterior">‹</button><div class="month-label">${MONTHS[viewMonth]} ${viewYear}</div><button type="button" class="month-btn" id="nextMonth" aria-label="Mes siguiente">›</button></div>
    <div class="weekdays" aria-hidden="true">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div>
    <div class="days">${cells}</div>
    <div class="legend">${Object.entries(GROUPS).map(([, g]) => `<span><i style="background:${esc(g.color)}"></i>${esc(g.label)}</span>`).join('')}</div>
    <div class="home-actions"><button type="button" class="btn" id="todayBtn">Ir a hoy</button><button type="button" class="btn primary" id="trainToday">Entrenar hoy</button></div>
    <h3 class="section-title">Últimos entrenamientos</h3>
    ${recent.length ? `<div class="list">${recent.map(sessionItem).join('')}</div><button type="button" class="btn ghost full" id="viewHistory">Ver todo el historial</button>` : '<div class="empty">Toca un día del calendario o «Entrenar hoy» para registrar tu primera sesión.</div>'}`);

  $('#prevMonth').onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } viewHome(); };
  $('#nextMonth').onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } viewHome(); };
  $('#todayBtn').onclick = () => { const n = new Date(); viewYear = n.getFullYear(); viewMonth = n.getMonth(); viewHome(); };
  $('#trainToday').onclick = () => go(`day/${todayStr()}`);
  $('#viewHistory')?.addEventListener('click', () => go('history'));
  $('#doBackup')?.addEventListener('click', async () => { await exportBackup(); toast('Copia descargada'); viewHome(); });
  $('#snoozeBackup')?.addEventListener('click', () => { setSetting('backupSnoozeUntil', Date.now() + 3 * 86400000); viewHome(); });
  $$('[data-date]', $('#screen')).forEach(b => b.onclick = () => go(`day/${b.dataset.date}`));
  bindSessionItems($('#screen'));
  if (openDate) openDaySheet(openDate);
}

function sessionItem(s) {
  const dur = sessionDuration(s);
  return `<div class="list-item session-item" style="--gc:${esc(groupColor(s.group))}">
    <button type="button" class="session-main" data-open="${esc(s.id)}">
      <b>${esc(s.name)}</b>
      <span class="small muted">${esc(formatDateLong(s.date))}</span>
      <span class="stat-line small">${completedSets(s)}/${totalSets(s)} series · ${fmtNum(Math.round(sessionVolume(s)))} kg${dur ? ` · ${formatDuration(dur)}` : ''}${s.status === 'active' ? ' · <em>en curso</em>' : ''}</span>
    </button>
    <button type="button" class="icon-btn" data-more="${esc(s.id)}" aria-label="Más opciones">⋯</button>
  </div>`;
}
function bindSessionItems(root) {
  $$('[data-open]', root).forEach(b => b.onclick = () => go(`workout/${b.dataset.open}`));
  $$('[data-more]', root).forEach(b => b.onclick = async () => {
    const s = getSession(b.dataset.more); if (!s) return;
    const k = await actionMenu(s.name, [
      { key: 'open', label: 'Abrir' },
      { key: 'repeat', label: 'Repetir hoy' },
      { key: 'copyDate', label: 'Copiar en otra fecha' },
      { key: 'delete', label: 'Eliminar sesión', danger: true }
    ]);
    if (!k && routeName() === 'day') return render();
    if (k === 'open') go(`workout/${s.id}`);
    if (k === 'repeat') repeatSession(s, todayStr());
    if (k === 'copyDate') {
      const date = await ask('Fecha de destino (AAAA-MM-DD)', { ok: 'Copiar', input: todayStr() });
      if (date && isDate(date) && dateStr(parseDate(date)) === date) repeatSession(s, date);
      else if (date) toast('Fecha no válida. Usa el formato AAAA-MM-DD.');
    }
    if (k === 'delete') confirmDeleteSession(s, () => render());
  });
}
async function confirmDeleteSession(s, after) {
  if (!(await ask(`¿Eliminar «${s.name}» del ${formatDateLong(s.date)}? Se perderán sus ${completedSets(s)} series registradas.`, { ok: 'Eliminar', danger: true }))) return;
  const backup = JSON.parse(JSON.stringify(s));
  deleteSession(s.id);
  toast('Sesión eliminada', { action: 'Deshacer', onAction: () => { saveSession(backup, { touch: false }); render(); } });
  after?.();
}

/* ---------- hoja de un día ---------- */
function openDaySheet(date) {
  const list = sessionsForDate(date);
  const lastByGroup = GROUP_ORDER().map(g => sessions().find(s => s.group === g && s.date <= date && s.exercises.length)).filter(Boolean);
  const tpl = templates();
  const { root } = openSheet(`
    <div class="sheet-head"><h2>${esc(formatDateLong(date))}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></div>
    ${list.length ? `<h3 class="section-title">Entrenamientos de este día</h3><div class="list">${list.map(sessionItem).join('')}</div>` : ''}
    <h3 class="section-title">Nuevo entrenamiento</h3>
    <div class="group-grid">${Object.entries(GROUPS).map(([k, g]) => `<button type="button" class="group-btn" data-new-group="${k}" style="--gc:${esc(g.color)}"><b>${esc(g.label)}</b><span class="small">${esc(g.sub)}</span></button>`).join('')}</div>
    ${lastByGroup.length ? `<h3 class="section-title">Repetir una sesión anterior</h3><div class="list">${lastByGroup.map(s => `<button type="button" class="list-item quick" data-repeat="${esc(s.id)}" style="--gc:${esc(groupColor(s.group))}"><b>${esc(s.name)}</b><span class="small muted">${esc(formatDateShort(s.date))} · ${s.exercises.length} ejercicios</span></button>`).join('')}</div>` : ''}
    ${tpl.length ? `<h3 class="section-title">Plantillas</h3><div class="list">${tpl.map(t => `<button type="button" class="list-item quick" data-tpl="${esc(t.id)}" style="--gc:${esc(groupColor(t.group))}"><b>${esc(t.name)}</b><span class="small muted">${t.exercises.length} ejercicios</span></button>`).join('')}</div>` : ''}`,
  { onClose: () => { if (routeName() === 'day') goBack(); } });
  bindSessionItems(root);
  $$('[data-new-group]', root).forEach(b => b.onclick = () => { closeSheet(); go(`select/${date}/${b.dataset.newGroup}`, { replace: true }); });
  $$('[data-repeat]', root).forEach(b => b.onclick = () => repeatSession(getSession(b.dataset.repeat), date));
  $$('[data-tpl]', root).forEach(b => b.onclick = () => startTemplate(templates().find(t => t.id === b.dataset.tpl), date));
}

/* ---------- selección de ejercicios ---------- */
function viewSelect({ date, group, editId }) {
  const editing = editId ? getSession(editId) : null;
  if (editId && !editing) { toast('No se ha encontrado la sesión.'); return go('', { replace: true }); }
  group = editing ? editing.group : group;
  if (!GROUPS[group]) return go('', { replace: true });
  const st = { selected: editing ? editing.exercises.map(e => e.id) : [], view: group, q: '' };

  setHeader(editing ? 'Editar ejercicios' : `Nueva sesión de ${groupLabel(group)}`, formatDateLong(editing ? editing.date : date), true);
  paint(`
    <div class="group-banner" style="--gc:${esc(groupColor(group))}"><div><h2>${esc(groupLabel(group))}</h2><p class="small muted">Toca los ejercicios en el orden en que los vas a hacer. Luego podrás reordenarlos.</p></div><b id="selCount" class="count-pill"></b></div>
    <div class="filter-bar"><input id="selSearch" type="search" placeholder="Buscar ejercicio" aria-label="Buscar ejercicio">
      <div class="chips" role="tablist">${Object.entries(GROUPS).map(([k, g]) => `<button type="button" class="chip ${k === group ? 'on' : ''}" data-view="${k}" style="--gc:${esc(g.color)}">${esc(g.label)}</button>`).join('')}</div></div>
    <div id="selectionList"></div>
    <div class="sticky-actions"><button type="button" class="btn" id="selCancel">Cancelar</button><button type="button" class="btn primary" id="selSave">${editing ? 'Guardar cambios' : 'Empezar sesión'}</button></div>`);

  const draw = () => {
    const q = st.q.toLowerCase();
    let defs = exerciseList().filter(x => (!x.archived || st.selected.includes(x.id)) && (q ? (x.name + ' ' + x.primary + ' ' + (x.secondary || '')).toLowerCase().includes(q) : x.group === st.view));
    defs = sortDefs(defs);
    let lastHead = '', html = '';
    for (const ex of defs) {
      const head = `${q ? groupLabel(ex.group) + ' · ' : ''}${ex.subgroup || 'Otros'} · ${EQUIP[ex.equip] || ex.equip || ''}`;
      if (head !== lastHead) { html += `<div class="section-label">${esc(head)}</div>`; lastHead = head; }
      const n = st.selected.indexOf(ex.id) + 1, img = mainImage(ex);
      html += `<button type="button" class="selection-row ${n ? 'checked' : ''}" data-id="${esc(ex.id)}" aria-pressed="${n ? 'true' : 'false'}" style="--gc:${esc(groupColor(ex.group))}">
        <span class="checkbox">${n || ''}</span>
        ${img ? `<img class="sel-thumb" src="${esc(img.thumb)}" alt="" loading="lazy">` : ''}
        <span class="sel-text"><b>${esc(ex.name)}</b><span class="small muted">${esc(ex.primary)}${ex.secondary ? ', ' + esc(ex.secondary) : ''}</span></span></button>`;
    }
    $('#selectionList').innerHTML = html || '<div class="empty">No hay ejercicios que coincidan.</div>';
    $('#selCount').textContent = `${st.selected.length} elegidos`;
    $$('#selectionList [data-id]').forEach(b => b.onclick = () => {
      const i = st.selected.indexOf(b.dataset.id);
      if (i >= 0) st.selected.splice(i, 1); else st.selected.push(b.dataset.id);
      draw();
    });
  };
  $$('[data-view]', $('#screen')).forEach(b => b.onclick = () => { st.view = b.dataset.view; st.q = ''; $('#selSearch').value = ''; $$('[data-view]', $('#screen')).forEach(c => c.classList.toggle('on', c === b)); draw(); });
  $('#selSearch').oninput = e => { st.q = e.target.value.trim(); draw(); };
  $('#selCancel').onclick = () => goBack();
  $('#selSave').onclick = async () => {
    if (!st.selected.length) { toast('Elige al menos un ejercicio.'); return; }
    const defs = st.selected.map(id => exerciseById(id) || editing?.exercises.find(e => e.id === id)).filter(Boolean);
    if (!editing) { createAndOpen(newSession({ date, group, defs })); return; }
    const removed = editing.exercises.filter(e => !st.selected.includes(e.id) && e.sets.some(x => x.completed));
    if (removed.length && !(await ask(`Vas a quitar ${removed.map(e => e.name).join(', ')}, que ya tiene series hechas. ¿Continuar?`, { ok: 'Quitar', danger: true }))) return;
    const kept = editing.exercises.filter(e => st.selected.includes(e.id));
    const added = defs.filter(d => !kept.some(e => e.id === d.id)).map(d => makeSessionExercise(d, editing));
    editing.exercises = [...kept, ...added];
    saveSession(editing);
    goBack();
  };
  draw();
}

/* ---------- sesión de entrenamiento ---------- */
function viewWorkout({ id }) {
  const s = getSession(id);
  if (!s) { toast('No se ha encontrado el entrenamiento.'); return go('', { replace: true }); }
  setHeader(s.name, formatDateLong(s.date), true);
  setWakeLock(s.status === 'active');
  const done = s.status === 'completed';

  paint(`
    <div class="card session-top" style="--gc:${esc(groupColor(s.group))}">
      <div class="row"><b id="progressText"></b><span class="small muted" id="durText"></span></div>
      <div class="progress"><div id="progressFill"></div></div>
      <div class="row small muted"><span id="volText"></span>${done ? '<span class="badge ok">Finalizado</span>' : ''}</div>
      <div class="row small"><b id="kcalText"></b></div>
    </div>
    <div id="exerciseList"></div>
    <div class="card">
      <label>Notas de la sesión<textarea id="sessionNotes" placeholder="Sensaciones, dolor, energía…">${esc(s.notes)}</textarea></label>
      <div class="option-grid">
        <button type="button" class="btn" id="renameSession">Renombrar</button>
        <button type="button" class="btn" id="saveTemplate">Guardar como plantilla</button>
        ${done ? '<button type="button" class="btn" id="reopenSession">Reabrir sesión</button>' : ''}
        <button type="button" class="btn danger" id="deleteSessionBtn">Eliminar sesión</button>
      </div>
    </div>
    <div class="sticky-actions"><button type="button" class="btn" id="editSelection">+ Ejercicios</button><button type="button" class="btn primary" id="finishWorkout">${done ? 'Guardar' : 'Finalizar'}</button></div>`);

  const update = () => {
    $('#progressText').textContent = `${completedSets(s)} de ${totalSets(s)} series`;
    $('#progressFill').style.width = `${progressPct(s)}%`;
    $('#volText').textContent = `${fmtNum(Math.round(sessionVolume(s)))} kg de volumen`;
    const dur = s.startedAt ? (s.finishedAt || Date.now()) - s.startedAt : null;
    $('#durText').textContent = dur ? `⏱ ${formatDuration(dur)}` : 'Empieza al marcar la primera serie';
    const kt = $('#kcalText');
    if (kt) {
      const k = calReady() ? calSessionKcal(s, calConfig(), calBody(), s.finishedAt || Date.now()).total : null;
      kt.textContent = k ? `🔥 ≈ ${fmtNum(Math.round(k))} kcal en la sesión` : '';
    }
  };
  const tick = setInterval(() => { if ($('#durText')) update(); }, 1000);
  onLeave(() => clearInterval(tick));

  const drawList = () => {
    const list = $('#exerciseList'); list.innerHTML = '';
    if (!s.exercises.length) list.innerHTML = '<div class="empty">Esta sesión no tiene ejercicios. Usa «+ Ejercicios» para añadirlos.</div>';
    s.exercises.forEach((e, idx) => list.append(exerciseCard(s, e, idx, { update, redraw: drawList })));
    update();
  };
  drawList();

  $('#sessionNotes').oninput = ev => { s.notes = ev.target.value; scheduleSave(s); };
  $('#editSelection').onclick = () => { flushSaves(); go(`select/edit/${s.id}`); };
  $('#renameSession').onclick = async () => { const n = await ask('Nombre de la sesión', { ok: 'Guardar', input: s.name }); if (n) { s.name = n; saveSession(s); setHeader(s.name, formatDateLong(s.date), true); } };
  $('#saveTemplate').onclick = async () => {
    const n = await ask('Nombre de la plantilla', { ok: 'Guardar plantilla', input: s.name }); if (!n) return;
    const arr = templates(); arr.push({ id: uid('tpl'), name: n, group: s.group, createdAt: Date.now(), exercises: s.exercises.map(e => ({ id: e.id, sets: e.sets.map(x => ({ type: x.type })) })) });
    if (saveTemplates(arr)) toast(`Plantilla «${n}» guardada`);
  };
  $('#reopenSession')?.addEventListener('click', () => { s.status = 'active'; saveSession(s); viewWorkout({ id }); });
  $('#deleteSessionBtn').onclick = () => confirmDeleteSession(s, () => go('', { replace: true }));
  $('#finishWorkout').onclick = async () => {
    flushSaves();
    if (!done) {
      if (!completedSets(s) && !(await ask('No has marcado ninguna serie como hecha. ¿Finalizar igualmente?', { ok: 'Finalizar' }))) return;
      s.status = 'completed';
      if (s.startedAt && !s.finishedAt) s.finishedAt = Date.now();
      saveSession(s); stopRest(); setWakeLock(false);
      const dur = sessionDuration(s);
      if (completedSets(s)) { if ((await showSessionSummary(s)) === 'profile') return go('profile', { replace: true }); }
      else toast(`Entrenamiento guardado${dur ? ` · ${formatDuration(dur)}` : ''}`);
    } else saveSession(s);
    go('', { replace: true });
  };
}

/* Ventana al finalizar: calorías de la sesión y desglose por ejercicio. Resuelve al cerrarla. */
function showSessionSummary(s) {
  return new Promise(resolve => {
    const b = calBody(), cfg = calConfig(), dur = sessionDuration(s);
    let content;
    if (!b.weight) {
      content = `<p class="muted">Para calcular las calorías necesito tu peso corporal. Añádelo en Perfil y las próximas sesiones mostrarán su gasto.</p>
        <button type="button" class="btn primary full" data-profile>Ir a Perfil</button>`;
    } else {
      const r = calSessionKcal(s, cfg, b), rows = r.rows.filter(x => x.minutes > 0);
      content = `<div class="kcal-hero"><b>${fmtNum(Math.round(r.total))}</b><span>kcal quemadas (estimación)</span></div>
        <div class="kpis">
          <div class="kpi"><b>${dur ? formatDuration(dur) : '–'}</b><span>duración</span></div>
          <div class="kpi"><b>${r.avgMet ? fmtNum(round(r.avgMet, 1)) : '–'}</b><span>MET medio</span></div>
        </div>
        <div class="kcal-list">${rows.map(x => `<div class="kcal-row"><span>${esc(x.name)}<small class="muted">${x.minutes < 1 ? '<1' : Math.round(x.minutes)} min · ${calLevelText(x).replace('intensidad ', '')}</small></span><b>${fmtNum(Math.round(x.kcal))} kcal</b></div>`).join('')}
          ${r.extra > 0.5 ? `<div class="kcal-row"><span>Pausas y cambios entre ejercicios<small class="muted">${Math.round(r.extraMinutes)} min</small></span><b>${fmtNum(Math.round(r.extra))} kcal</b></div>` : ''}
          <div class="kcal-row total"><span>Total de la sesión</span><b>${fmtNum(Math.round(r.total))} kcal</b></div></div>
        <p class="small muted">Calculado con el método MET y los datos de tu Perfil. Es una aproximación: el error habitual ronda el ±20–30 %.</p>`;
    }
    const { root } = openSheet(`<div class="sheet-head"><h3>Sesión finalizada</h3><button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button></div>
      ${content}<button type="button" class="btn ${b.weight ? 'primary' : ''} full" data-close style="margin-top:10px">Cerrar</button>`, { onClose: () => resolve() });
    $('[data-profile]', root)?.addEventListener('click', () => { closeSheet(); resolve('profile'); });
  });
}

function isIsometricExercise(def) {
  // El tipo elegido en la ficha prevalece; la detección por nombre solo cubre ejercicios antiguos sin tipo.
  if (def?.tracking === 'time' || def?.isometric === true) return true;
  if (def?.tracking === 'weight') return false;
  return /plancha|plank|wall\s*sit|sentadilla\s*isom|isom[eé]tric|hollow\s*hold|dead\s*hang|l[- ]?sit|superman\s*est[aá]tic/i.test(`${def?.name || ''} ${def?.instructions || ''}`);
}
function formatHold(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function parseHold(value) {
  const raw = String(value ?? '').trim();
  if (/^\d{1,3}:\d{1,2}$/.test(raw)) {
    const [m, sec] = raw.split(':').map(Number);
    if (sec > 59) return null;
    return m * 60 + sec;
  }
  if (/^\d+$/.test(raw)) return Number(raw);
  return null;
}
function exerciseCard(s, e, idx, { update, redraw }) {
  const def = exerciseById(e.id) || e;
  const timed = isIsometricExercise(def);
  const ct = calIsCardio(def) ? CARDIO_TYPES[def.cardio] : null, cardio = Boolean(ct);
  const imgs = exerciseImages(def), img = imgs[0] || null;
  const prev = timed ? null : lastPerformance(e.id, s);
  const sug = timed ? null : suggestion(def, prev?.exercise);
  const min = num(def.targetRepsMin) || 8, max = num(def.targetRepsMax) || 12, rir = num(def.targetRIR) ?? 1;
  const rest = num(e.restSeconds) ?? num(def.restSeconds) ?? 90;
  const tutorial = safeUrl(def.tutorialUrl), external = safeUrl(def.externalUrl);

  const card = document.createElement('article');
  card.className = 'card exercise';
  card.style.setProperty('--gc', groupColor(def.group || s.group));
  card.innerHTML = `
    <div class="ex-head">
      ${img ? `<button type="button" class="ex-thumb" data-gallery aria-label="Ver imágenes de ${esc(e.name)}"><img src="${esc(img.thumb)}" alt="">${imgs.length > 1 ? `<span>${imgs.length}</span>` : ''}</button>` : ''}
      <div class="ex-title"><h3>${esc(e.name)}</h3><span class="small muted">${esc(e.primary)}${e.secondary ? ', ' + esc(e.secondary) : ''}</span></div>
      <button type="button" class="icon-btn" data-exmenu aria-label="Opciones del ejercicio">⋯</button>
    </div>
    <div class="ex-meta small"><span>${cardio ? `Cardio · tiempo, ${ct.speed.label.toLowerCase()}${ct.incline ? ' e inclinación' : ''}` : timed ? 'Series por tiempo · cronómetro individual' : `Objetivo ${min}–${max} reps · RIR ${rir}`}</span><span>Descanso ${formatClock(rest)}</span></div>
    ${!timed ? (prev ? `<p class="small muted prev">Última vez (${esc(formatDateShort(prev.session.date))}): ${prev.exercise.sets.filter(isDoneWork).map(x => `${fmtNum(num(x.weight) || 0)}×${esc(x.reps)}`).join(' · ')}</p>` : '<p class="small muted prev">Primera vez con este ejercicio.</p>') : ''}
    ${!timed && sug ? `<p class="suggest ${sug.kind}">${esc(sug.text)}</p>` : ''}
    ${def.instructions || tutorial || external ? `<div class="ex-links">
      ${def.instructions ? `<details><summary>Cómo se hace</summary><p class="small exercise-instructions">${esc(def.instructions)}</p></details>` : ''}
      ${tutorial ? '<button type="button" class="btn small-btn" data-tutorial>▶ Tutorial</button>' : ''}
      ${external ? `<a class="btn small-btn" href="${esc(external)}" target="_blank" rel="noopener">Más información</a>` : ''}</div>` : ''}
    <div class="sets" role="table" aria-label="Series de ${esc(e.name)}">
      <div class="set-row set-head ${timed ? 'timed' : ''}" role="row"><span>Serie</span>${timed ? '<span>Deseado</span><span>Restante</span><span></span><span></span>' : '<span>kg</span><span>Reps</span><span>RIR</span><span></span>'}</div>
      <div class="set-body"></div>
    </div>
    <p class="ex-kcal hidden" data-kcal aria-live="polite"></p>
    <div class="ex-foot"><button type="button" class="btn small-btn" data-addset>+ Serie</button><button type="button" class="btn small-btn" data-rest>Descanso ${formatClock(rest)}</button></div>
    <input class="ex-note" data-note value="${esc(e.notes)}" placeholder="Notas del ejercicio" aria-label="Notas del ejercicio">`;

  const body = $('.set-body', card);
  const drawKcal = () => {
    const el = $('[data-kcal]', card); if (!el) return;
    if (!e.sets.some(x => x.completed)) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (!calReady()) {
      el.innerHTML = '🔥 Indica tu peso en <button type="button" class="link" data-profile>Perfil</button> para ver las calorías.';
      $('[data-profile]', el).onclick = () => { flushSaves(); go('profile'); };
      return;
    }
    const r = calExerciseKcal(e);
    el.innerHTML = `<b>🔥 ≈ ${fmtNum(Math.round(r.kcal))} kcal</b> <span class="muted">· ${r.minutes < 1 ? '<1' : Math.round(r.minutes)} min · ${calLevelText(r)}</span>`;
  };
  const cardioFields = x => !cardio ? '' : `<div class="cardio-fields${ct.incline ? '' : ' one'}"><label>${esc(ct.speed.label)} (${esc(ct.speed.unit)})<input data-f="speed" type="text" inputmode="${ct.speed.pace ? 'numeric' : 'decimal'}" autocomplete="off" value="${esc(x.speed)}" placeholder="${esc(ct.speed.ph)}" aria-label="${esc(ct.speed.label)} en ${esc(ct.speed.unit)}"></label>${ct.incline ? `<label>Inclinación (%)<input data-f="incline" type="text" inputmode="decimal" autocomplete="off" value="${esc(x.incline)}" placeholder="0" aria-label="Inclinación en porcentaje"></label>` : ''}</div>`;
  const drawSets = () => { drawSetsBase(); drawKcal(); };
  const drawSetsBase = () => {
    let w = 0;
    body.innerHTML = e.sets.map(x => {
      const warm = x.type === 'warmup'; if (!warm) w++;
      return `<div class="set-row ${timed ? 'timed' : ''} ${warm ? 'warmup' : ''} ${x.completed ? 'done' : ''}" data-set="${esc(x.id)}" role="row">
        <button type="button" class="set-num" data-setmenu aria-label="${warm ? 'Serie de calentamiento' : `Serie ${w}`}: opciones">${warm ? 'C' : w}</button>
        ${timed ? `<input class="hold-target" data-target-time value="${formatHold(x.targetDuration)}" placeholder="00:30" inputmode="numeric" aria-label="Tiempo deseado en minutos y segundos" ${x._running ? 'disabled' : ''}><span class="hold-clock" data-hold-clock>${formatHold(Math.max(0, x.targetDuration - x.duration))}</span><button type="button" class="btn small-btn" data-hold-toggle>${x._running ? 'Parar' : (x.duration > 0 && x.duration < x.targetDuration ? 'Continuar' : 'Iniciar')}</button><button type="button" class="check" data-check aria-pressed="${x.completed}" aria-label="Marcar serie como hecha">✓</button>${cardioFields(x)}` : `<input data-f="weight" type="text" inputmode="decimal" autocomplete="off" value="${esc(x.weight)}" placeholder="${esc(x.hintWeight !== '' ? x.hintWeight : 'kg')}" aria-label="Peso en kg">
        <input data-f="reps" type="text" inputmode="numeric" autocomplete="off" value="${esc(x.reps)}" placeholder="${esc(x.hintReps !== '' ? x.hintReps : 'reps')}" aria-label="Repeticiones">
        <input data-f="rir" type="text" inputmode="numeric" autocomplete="off" value="${esc(x.rir)}" placeholder="${rir}" aria-label="RIR">
        <button type="button" class="check" data-check aria-pressed="${x.completed}" aria-label="Marcar serie como hecha">✓</button>`}</div>`;
    }).join('');
    $$('.set-row', body).forEach(row => {
      const x = e.sets.find(z => z.id === row.dataset.set); if (!x) return;
      $$('input', row).forEach(input => input.oninput = () => { x[input.dataset.f] = input.value.trim(); scheduleSave(s); update(); drawKcal(); });
      if (timed) {
        const targetInput = $('[data-target-time]', row);
        targetInput.onchange = () => {
          if (x._running) return;
          const target = parseHold(targetInput.value);
          if (target === null || target < 1 || target > 5999) {
            targetInput.value = formatHold(x.targetDuration);
            toast('Introduce un tiempo válido en formato mm:ss (máximo 99:59).');
            return;
          }
          x.targetDuration = target;
          x.duration = Math.min(Number(x.duration) || 0, target);
          if (x.duration < target) { x.completed = false; x.doneAt = 0; }
          saveSession(s); drawSets(); update();
        };
        const toggle = $('[data-hold-toggle]', row);
        toggle.onclick = () => {
          if (x._running) {
            x.duration = Math.min(x.targetDuration, (x._baseDuration || 0) + Math.floor((Date.now() - x._startedAt) / 1000));
            x._running = false; delete x._startedAt; delete x._baseDuration;
            saveSession(s); drawSets();
          } else {
            if (x.duration >= x.targetDuration) { x.duration = 0; x.completed = false; x.doneAt = 0; }
            x._baseDuration = Number(x.duration) || 0; x._startedAt = Date.now(); x._running = true;
            const timer = setInterval(() => {
              if (!x._running) { clearInterval(timer); return; }
              const elapsed = (x._baseDuration || 0) + Math.floor((Date.now() - x._startedAt) / 1000);
              x.duration = Math.min(x.targetDuration, elapsed);
              if (!row.isConnected) {
                x._running = false; delete x._startedAt; delete x._baseDuration;
                saveSession(s); clearInterval(timer); return;
              }
              const clock = $('[data-hold-clock]', row);
              if (clock) clock.textContent = formatHold(Math.max(0, x.targetDuration - x.duration));
              if (x.duration >= x.targetDuration) {
                x._running = false; x.completed = true; x.doneAt = Date.now(); delete x._startedAt; delete x._baseDuration;
                if (!s.startedAt) s.startedAt = Date.now();
                saveSession(s); clearInterval(timer); drawSets(); update();
                if (settings().sound) beep(3);
                if (settings().autoRest) startRest(rest, e.name);
                return;
              }
              scheduleSave(s);
            }, 200);
            toggle.textContent = 'Parar';
          }
        };
      }
      $('[data-check]', row).onclick = () => {
        if (timed && x._running) {
          x.duration = Math.min(x.targetDuration, (x._baseDuration || 0) + Math.floor((Date.now() - x._startedAt) / 1000));
          x._running = false; delete x._startedAt; delete x._baseDuration;
        }
        x.completed = !x.completed;
        x.doneAt = x.completed ? Date.now() : 0;
        if (x.completed) {
          if (!timed && x.weight === '' && x.hintWeight !== '') x.weight = String(x.hintWeight);
          if (!timed && x.reps === '' && x.hintReps !== '') x.reps = String(x.hintReps);
          if (!s.startedAt) s.startedAt = Date.now();
          if (s.status === 'completed' && s.finishedAt && Date.now() - s.finishedAt < 30 * 60000) s.finishedAt = Math.max(s.finishedAt, Date.now());
          if (settings().autoRest) startRest(rest, e.name);
        }
        saveSession(s); drawSets(); update();
      };
      $('[data-setmenu]', row).onclick = async () => {
        const k = await actionMenu('Serie', [
          { key: 'type', label: x.type === 'warmup' ? 'Marcar como serie efectiva' : 'Marcar como calentamiento' },
          { key: 'dup', label: 'Duplicar serie' },
          { key: 'del', label: 'Eliminar serie', danger: true }]);
        const i = e.sets.indexOf(x);
        if (k === 'type') x.type = x.type === 'warmup' ? 'working' : 'warmup';
        if (k === 'dup') e.sets.splice(i + 1, 0, normalizeSet(Object.assign({}, x, { id: null, completed: false, doneAt: 0 }), 0));
        if (k === 'del') e.sets.splice(i, 1);
        if (k) { e.sets = e.sets.map(normalizeSet); saveSession(s); drawSets(); update(); }
      };
    });
  };
  drawSets();

  $('[data-addset]', card).onclick = () => {
    const last = e.sets[e.sets.length - 1];
    e.sets.push(normalizeSet({ type: 'working', duration: 0, targetDuration: cardio ? (last?.targetDuration || 1200) : 30, speed: cardio && last ? last.speed : '', incline: cardio && last ? last.incline : '', hintWeight: timed ? '' : (last ? (last.weight || last.hintWeight) : ''), hintReps: timed ? '' : (last ? (last.reps || last.hintReps) : '') }, e.sets.length));
    saveSession(s); drawSets(); update();
    if (!timed) $$('.set-row input[data-f="weight"]', body).pop()?.focus();
  };
  $('[data-rest]', card).onclick = () => startRest(rest, e.name);
  $('[data-note]', card).oninput = ev => { e.notes = ev.target.value; scheduleSave(s); };
  $('[data-gallery]', card)?.addEventListener('click', () => openGallery(imgs, 0, e.name));
  $('[data-tutorial]', card)?.addEventListener('click', () => openTutorial(def));
  $('[data-exmenu]', card).onclick = async () => {
    const items = [];
    if (idx > 0) items.push({ key: 'up', label: 'Subir' });
    if (idx < s.exercises.length - 1) items.push({ key: 'down', label: 'Bajar' });
    items.push({ key: 'rest', label: 'Cambiar descanso de esta sesión' }, { key: 'stats', label: 'Ver progreso del ejercicio' }, { key: 'edit', label: 'Editar ficha del ejercicio' }, { key: 'remove', label: 'Quitar de la sesión', danger: true });
    const k = await actionMenu(e.name, items);
    if (k === 'up' || k === 'down') { const j = k === 'up' ? idx - 1 : idx + 1; [s.exercises[idx], s.exercises[j]] = [s.exercises[j], s.exercises[idx]]; saveSession(s); redraw(); }
    if (k === 'rest') { const v = await ask('Descanso en segundos', { ok: 'Guardar', input: String(rest) }); if (v !== null && num(v) != null) { e.restSeconds = Math.max(0, Math.round(num(v))); saveSession(s); redraw(); } }
    if (k === 'stats') go(`stats/${encodeURIComponent(e.id)}`);
    if (k === 'edit') go(`library/${encodeURIComponent(e.id)}`);
    if (k === 'remove') {
      if (e.sets.some(x => x.completed) && !(await ask(`«${e.name}» tiene series hechas. ¿Quitarlo de la sesión?`, { ok: 'Quitar', danger: true }))) return;
      s.exercises.splice(idx, 1); saveSession(s); redraw();
    }
  };
  return card;
}

/* ---------- historial ---------- */
let historyFilter = 'all';
function viewHistory() {
  setHeader('Historial', `${sessions().length} entrenamientos`, false);
  const list = sessions().filter(s => historyFilter === 'all' || s.group === historyFilter);
  let html = '', lastMonth = '';
  for (const s of list) {
    const m = s.date.slice(0, 7);
    if (m !== lastMonth) { const d = parseDate(s.date); html += `<h3 class="section-title month">${MONTHS[d.getMonth()]} ${d.getFullYear()}</h3>`; lastMonth = m; }
    html += sessionItem(s);
  }
  paint(`<div class="chips scroll"><button type="button" class="chip ${historyFilter === 'all' ? 'on' : ''}" data-f="all">Todos</button>${Object.entries(GROUPS).map(([k, g]) => `<button type="button" class="chip ${historyFilter === k ? 'on' : ''}" data-f="${k}" style="--gc:${esc(g.color)}">${esc(g.label)}</button>`).join('')}</div>
    <div class="list">${html || '<div class="empty">No hay entrenamientos todavía. Empieza uno desde el calendario.</div>'}</div>`);
  $$('[data-f]', $('#screen')).forEach(b => b.onclick = () => { historyFilter = b.dataset.f; viewHistory(); });
  bindSessionItems($('#screen'));
}
