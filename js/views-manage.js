/* Rutina Gym — progreso, ajustes, biblioteca y editor de ejercicios. */
'use strict';

/* ---------- progreso ---------- */
let statsQuery = '';
function viewStats() {
  setHeader('Progreso', 'Volumen, récords y evolución', false);
  const all = sessions();
  const cutoff = dateStr(new Date(Date.now() - 30 * 86400000));
  const last30 = all.filter(s => s.date >= cutoff);
  const weeks = weeklyVolume(12);
  const thisW = weeks[weeks.length - 1].volume, prevW = weeks[weeks.length - 2].volume;
  const durs = all.map(sessionDuration).filter(Boolean);
  const avgDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null;
  const prs = personalRecords();
  const byGroup = Object.keys(GROUPS).map(g => ({ g, n: last30.filter(s => s.group === g).length }));
  const maxG = Math.max(1, ...byGroup.map(x => x.n));
  const diff = prevW ? Math.round(((thisW - prevW) / prevW) * 100) : null;

  paint(`
    <div class="kpis">
      <div class="kpi"><b>${last30.length}</b><span>sesiones en 30 días</span></div>
      <div class="kpi"><b>${fmtNum(Math.round(thisW))} kg</b><span>volumen esta semana${diff !== null ? ` (${diff >= 0 ? '+' : ''}${diff} %)` : ''}</span></div>
      <div class="kpi"><b>${prs.length}</b><span>ejercicios con récord</span></div>
      <div class="kpi"><b>${avgDur ? formatDuration(avgDur) : '–'}</b><span>duración media</span></div>
    </div>
    <div class="card"><h3>Volumen semanal</h3><p class="small muted">Kilos × repeticiones de las series efectivas, últimas 12 semanas.</p>
      ${barChart(weeks.map(w => ({ label: formatDateShort(w.key), value: Math.round(w.volume), title: `Semana del ${formatDateShort(w.key)}: ${fmtNum(Math.round(w.volume))} kg en ${w.sessions} sesiones` })), { unit: 'kg' })}</div>
    <div class="card"><h3>Sesiones por grupo (30 días)</h3>
      ${byGroup.map(x => `<div class="hbar"><span>${esc(groupLabel(x.g))}</span><div><i style="width:${(x.n / maxG) * 100}%;background:${esc(groupColor(x.g))}"></i></div><b>${x.n}</b></div>`).join('')}</div>
    <div class="card"><h3>Ejercicios</h3><p class="small muted">Toca uno para ver su evolución.</p>
      <input id="statsSearch" type="search" placeholder="Buscar ejercicio" value="${esc(statsQuery)}" aria-label="Buscar ejercicio">
      <div class="list" id="prList"></div></div>`);

  const draw = () => {
    const q = statsQuery.toLowerCase();
    const rows = prs.filter(p => p.name.toLowerCase().includes(q)).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    $('#prList').innerHTML = rows.map(p => `<button type="button" class="list-item pr-row" data-ex="${esc(p.id)}" style="--gc:${esc(groupColor(exerciseById(p.id)?.group))}">
      <b>${esc(p.name)}</b>
      <span class="small muted">${p.weight ? `Mejor ${fmtNum(p.weight)} kg × ${p.reps}` : `Máximo ${p.reps} reps`}${p.e1rm ? ` · 1RM est. ${fmtNum(round(p.e1rm))} kg` : ''} · ${p.count} ${p.count === 1 ? 'sesión' : 'sesiones'}</span></button>`).join('') || '<div class="empty">Aún no hay series completadas.</div>';
    $$('#prList [data-ex]').forEach(b => b.onclick = () => go(`stats/${encodeURIComponent(b.dataset.ex)}`));
  };
  $('#statsSearch').oninput = e => { statsQuery = e.target.value.trim(); draw(); };
  draw();
}

let statsMetric = 'e1rm';
function viewExerciseStats({ id }) {
  const h = exerciseHistory(id);
  const def = exerciseById(id) || { id, name: h[0] ? sessions().find(s => s.id === h[0].sessionId)?.exercises.find(e => e.id === id)?.name : 'Ejercicio' };
  setHeader(def.name || 'Ejercicio', 'Evolución', true);
  const hasWeight = h.some(x => x.top.w > 0);
  if (!hasWeight && statsMetric !== 'reps') statsMetric = 'reps';
  const metrics = [
    ...(hasWeight ? [{ k: 'e1rm', label: '1RM estimado', unit: 'kg', v: x => x.e1rm }, { k: 'top', label: 'Peso máximo', unit: 'kg', v: x => x.top.w }, { k: 'vol', label: 'Volumen', unit: 'kg', v: x => x.volume }] : []),
    { k: 'reps', label: 'Reps máximas', unit: 'reps', v: x => x.maxReps }];
  const m = metrics.find(x => x.k === statsMetric) || metrics[0];
  const pts = h.filter(x => m.v(x) != null).map(x => ({ label: formatDateShort(x.date), value: round(m.v(x), 1), title: `${formatDateLong(x.date)}: ${fmtNum(round(m.v(x), 1))} ${m.unit}` }));
  const bestW = h.reduce((b, x) => (!b || x.top.w > b.top.w || (x.top.w === b.top.w && x.top.r > b.top.r) ? x : b), null);
  const bestE = h.reduce((b, x) => (x.e1rm && (!b || x.e1rm > b.e1rm) ? x : b), null);
  const color = groupColor(def.group);

  paint(`
    <div class="chips">${metrics.map(x => `<button type="button" class="chip ${x.k === m.k ? 'on' : ''}" data-m="${x.k}">${x.label}</button>`).join('')}</div>
    <div class="card">${pts.length >= 1 ? lineChart(pts, { unit: m.unit, color }) : '<div class="empty">Completa alguna serie de este ejercicio para ver su evolución.</div>'}
      ${m.k === 'e1rm' ? '<p class="small muted">1RM estimado con la fórmula de Epley: peso × (1 + reps / 30). Sirve para comparar sesiones con distintas repeticiones.</p>' : ''}</div>
    ${h.length ? `<div class="kpis">
      ${bestW && hasWeight ? `<div class="kpi"><b>${fmtNum(bestW.top.w)} kg × ${bestW.top.r}</b><span>mejor serie (${esc(formatDateShort(bestW.date))})</span></div>` : ''}
      ${bestE ? `<div class="kpi"><b>${fmtNum(round(bestE.e1rm))} kg</b><span>mejor 1RM estimado</span></div>` : ''}
      <div class="kpi"><b>${h.length}</b><span>sesiones</span></div>
      <div class="kpi"><b>${esc(formatDateShort(h[h.length - 1].date))}</b><span>última vez</span></div></div>
    <div class="card"><h3>Últimas sesiones</h3><div class="table">${[...h].reverse().slice(0, 12).map(x => `<button type="button" class="trow" data-open="${esc(x.sessionId)}"><span>${esc(formatDateShort(x.date))}</span><span>${x.sets.map(z => `${fmtNum(num(z.weight) || 0)}×${esc(z.reps)}`).join(' · ')}</span><b>${x.e1rm ? fmtNum(round(x.e1rm)) + ' kg' : ''}</b></button>`).join('')}</div></div>` : ''}
    ${exerciseById(id) ? '<button type="button" class="btn full" id="editEx">Editar ficha del ejercicio</button>' : ''}`);
  $$('[data-m]').forEach(b => b.onclick = () => { statsMetric = b.dataset.m; viewExerciseStats({ id }); });
  $$('[data-open]').forEach(b => b.onclick = () => go(`workout/${b.dataset.open}`));
  $('#editEx')?.addEventListener('click', () => go(`library/${encodeURIComponent(id)}`));
}

/* ---------- ajustes ---------- */
function viewSettings() {
  setHeader('Ajustes', `Versión ${APP_VERSION}`, false);
  const c = settings(), tpl = templates();
  const toggle = (k, label, hint) => `<label class="switch"><span><b>${label}</b>${hint ? `<span class="small muted">${hint}</span>` : ''}</span><input type="checkbox" data-set="${k}" ${c[k] ? 'checked' : ''}><i aria-hidden="true"></i></label>`;
  paint(`
    <button type="button" class="card settings-hero" id="manageExercises"><span><b>Biblioteca de ejercicios</b><span class="small muted">Imágenes, tutoriales, objetivos, descanso e incremento de peso de cada ejercicio.</span></span><span class="go">›</span></button>

    <div class="card"><h3>Apariencia</h3>
      <div class="segmented" role="radiogroup" aria-label="Tema">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${c.theme === k}" class="${c.theme === k ? 'on' : ''}" data-theme="${k}">${l}</button>`).join('')}</div></div>

    <div class="card"><h3>Durante el entreno</h3>
      ${toggle('autoRest', 'Descanso automático', 'Arranca el temporizador al marcar una serie.')}
      ${toggle('sound', 'Sonido al terminar el descanso')}
      ${toggle('vibrate', 'Vibración al terminar el descanso', 'Solo en móviles que lo admiten (no en iPhone).')}
      ${toggle('notify', 'Notificación al terminar el descanso', 'Útil si sales de la app. Funciona en Android; en iPhone solo con la app instalada.')}
      ${toggle('wakeLock', 'Mantener la pantalla encendida', 'Mientras tienes una sesión abierta.')}</div>

    <div class="card"><h3>Plantillas</h3>
      ${tpl.length ? `<div class="list">${tpl.map(t => `<div class="list-item tpl-row" style="--gc:${esc(groupColor(t.group))}"><span><b>${esc(t.name)}</b><span class="small muted">${esc(groupLabel(t.group))} · ${t.exercises.length} ejercicios</span></span><button type="button" class="icon-btn" data-tpl="${esc(t.id)}" aria-label="Opciones de la plantilla">⋯</button></div>`).join('')}</div>` : '<p class="small muted">Guarda una sesión como plantilla desde la pantalla del entreno («Guardar como plantilla»). Aparecerá al elegir un día.</p>'}</div>

    <div class="card"><h3>Copias de seguridad</h3>
      <p class="small muted">${c.lastBackup ? `Última copia: ${esc(formatDateLong(dateStr(new Date(c.lastBackup))))}.` : 'Todavía no has descargado ninguna copia.'} Tus datos solo se guardan en este navegador.</p>
      <div class="grid-2"><button type="button" class="btn primary" id="exportBackup">Descargar copia</button><button type="button" class="btn" id="exportCSV">Exportar CSV</button></div>
      <label class="file-btn btn full">Restaurar una copia<input id="importFile" type="file" accept="application/json,.json"></label>
      <label>Recordarme hacer copia<select id="reminder">${[[7, 'Cada 7 días'], [14, 'Cada 14 días'], [30, 'Cada 30 días'], [0, 'Nunca']].map(([v, l]) => `<option value="${v}" ${Number(c.backupReminderDays) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>

    <div class="card"><h3>Almacenamiento</h3>
      <p class="small" id="persistInfo">Comprobando…</p>
      <p class="small muted" id="usageInfo"></p>
      <button type="button" class="btn danger full" id="wipe">Borrar todos los datos</button></div>
    <p class="small muted center">Rutina Gym ${APP_VERSION}</p>`);

  $('#manageExercises').onclick = () => go('library');
  $$('[data-theme]').forEach(b => b.onclick = () => { setSetting('theme', b.dataset.theme); applyTheme(); viewSettings(); });
  $$('[data-set]').forEach(i => i.onchange = async () => {
    const k = i.dataset.set;
    if (k === 'notify' && i.checked) {
      if (!('Notification' in window)) { toast('Este navegador no admite notificaciones.'); i.checked = false; return; }
      const p = await Notification.requestPermission();
      if (p !== 'granted') { toast('Permiso de notificaciones denegado. Puedes activarlo en los ajustes del navegador.'); i.checked = false; return; }
    }
    setSetting(k, i.checked);
    if (k === 'sound' && i.checked) { unlockAudio(); beep(1); }
    if (k === 'vibrate' && i.checked && navigator.vibrate) navigator.vibrate(150);
  });
  $$('[data-tpl]').forEach(b => b.onclick = async () => {
    const arr = templates(), t = arr.find(x => x.id === b.dataset.tpl); if (!t) return;
    const k = await actionMenu(t.name, [{ key: 'today', label: 'Empezar hoy' }, { key: 'rename', label: 'Renombrar' }, { key: 'delete', label: 'Eliminar plantilla', danger: true }]);
    if (k === 'today') startTemplate(t, todayStr());
    if (k === 'rename') { const n = await ask('Nombre de la plantilla', { ok: 'Guardar', input: t.name }); if (n) { t.name = n; saveTemplates(arr); viewSettings(); } }
    if (k === 'delete' && await ask(`¿Eliminar la plantilla «${t.name}»?`, { ok: 'Eliminar', danger: true })) { saveTemplates(arr.filter(x => x.id !== t.id)); viewSettings(); }
  });
  $('#exportBackup').onclick = async () => { await exportBackup(); toast('Copia descargada'); viewSettings(); };
  $('#exportCSV').onclick = exportCSV;
  $('#importFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f && await importBackup(f)) go('', { replace: true }); };
  $('#reminder').onchange = e => setSetting('backupReminderDays', Number(e.target.value));
  $('#wipe').onclick = async () => { if (await wipeData()) { applyTheme(); go('', { replace: true }); } };

  (async () => {
    const el = $('#persistInfo'), us = $('#usageInfo');
    try {
      const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
      if (!el) return;
      el.innerHTML = persisted ? '✓ Almacenamiento persistente: el navegador no borrará tus datos por falta de espacio o de uso.' : 'El navegador podría borrar los datos si no usas la app en un tiempo (sobre todo Safari). Instalar la app en la pantalla de inicio lo evita. <button type="button" class="link" id="askPersist">Pedir almacenamiento persistente</button>';
      $('#askPersist')?.addEventListener('click', async () => { await requestPersist(); viewSettings(); });
      if (navigator.storage?.estimate && us) { const e = await navigator.storage.estimate(); us.textContent = `En uso: ${fmtBytes(e.usage || 0)} de ${fmtBytes(e.quota || 0)} disponibles.`; }
    } catch { if (el) el.textContent = ''; }
  })();
}

/* ---------- biblioteca ---------- */
let libGroup = 'all', libQuery = '';
function viewLibrary() {
  setHeader('Biblioteca', 'Ejercicios', true);
  paint(`
    <button type="button" class="btn primary full" id="newExercise">+ Nuevo ejercicio</button>
    <div class="filter-bar"><input id="libSearch" type="search" placeholder="Buscar ejercicio" value="${esc(libQuery)}" aria-label="Buscar ejercicio">
      <div class="chips"><button type="button" class="chip ${libGroup === 'all' ? 'on' : ''}" data-g="all">Todos</button>${Object.entries(GROUPS).map(([k, g]) => `<button type="button" class="chip ${libGroup === k ? 'on' : ''}" data-g="${k}" style="--gc:${esc(g.color)}">${esc(g.label)}</button>`).join('')}</div></div>
    <div id="libList" class="list"></div>`);
  const draw = () => {
    const q = libQuery.toLowerCase();
    const defs = sortDefs(exerciseList().filter(x => !x.archived && (libGroup === 'all' || x.group === libGroup) && (x.name + ' ' + x.primary).toLowerCase().includes(q)));
    $('#libList').innerHTML = defs.map(x => {
      const img = mainImage(x), n = mediaImages(x.id).length;
      return `<button type="button" class="list-item lib-row" data-edit="${esc(x.id)}" style="--gc:${esc(groupColor(x.group))}">
        ${img ? `<img class="lib-thumb" src="${esc(img.thumb)}" alt="" loading="lazy">` : '<span class="lib-thumb empty-thumb" aria-hidden="true">+</span>'}
        <span class="lib-text"><b>${esc(x.name)}</b><span class="small muted">${esc(groupLabel(x.group))} · ${esc(x.subgroup || '')} · ${esc(EQUIP[x.equip] || '')}</span>
        <span class="tags">${n ? `<span class="tag">${n} ${n === 1 ? 'imagen' : 'imágenes'}</span>` : '<span class="tag dim">Sin imagen</span>'}${x.tutorialUrl ? '<span class="tag">Tutorial</span>' : ''}${x.builtin ? '' : '<span class="tag">Personalizado</span>'}</span></span></button>`;
    }).join('') || '<div class="empty">No hay ejercicios que coincidan.</div>';
    $$('#libList [data-edit]').forEach(b => b.onclick = () => go(`library/${encodeURIComponent(b.dataset.edit)}`));
  };
  $('#newExercise').onclick = () => go('library/new');
  $('#libSearch').oninput = e => { libQuery = e.target.value.trim(); draw(); };
  $$('[data-g]').forEach(b => b.onclick = () => { libGroup = b.dataset.g; $$('[data-g]').forEach(c => c.classList.toggle('on', c === b)); draw(); });
  draw();
}

/* ---------- editor de ejercicio ---------- */
const MAX_IMAGES = 8;
function viewEditor({ id }) {
  const isNew = id === 'new';
  const existing = isNew ? { id: uid('custom'), name: '', group: libGroup !== 'all' ? libGroup : 'empuje', subgroup: '', equip: 'maquina', primary: '', secondary: '', restSeconds: 90, targetRepsMin: 8, targetRepsMax: 12, targetRIR: 1, increment: 2.5, tutorialUrl: '', externalUrl: '', instructions: '', notes: '', imagePath: '' } : exerciseById(id);
  if (!existing) { toast('No se ha encontrado el ejercicio.'); return go('library', { replace: true }); }
  const ex = existing;
  let images = mediaImages(ex.id).slice();
  const originalIds = images.map(i => i.id).join();
  const hasOverride = !isNew && ex.builtin && Boolean(overrides()[ex.id]);
  setHeader(isNew ? 'Nuevo ejercicio' : 'Editar ejercicio', isNew ? 'Ficha del ejercicio' : ex.name, true);

  paint(`
    <div class="card"><h3>Imágenes</h3>
      <p class="small muted">Se optimizan solas al subirlas: máximo 1080 px en el lado largo y miniatura de 240 px, en WebP. La primera es la principal.</p>
      <div class="img-grid" id="imgGrid"></div>
      <div class="grid-2">
        <label class="file-btn btn">Añadir imágenes<input id="imgFiles" type="file" accept="image/*" multiple></label>
        <label class="file-btn btn">Hacer foto<input id="imgCamera" type="file" accept="image/*" capture="environment"></label>
      </div>
      <p class="small muted" id="imgStatus" aria-live="polite"></p>
      <label>Ruta de imagen en el repositorio (opcional)<input id="exImagePath" value="${esc(ex.imagePath || '')}" placeholder="assets/exercises/press-banca.webp"></label>
      <p class="small muted">Se usa solo si el ejercicio no tiene imágenes subidas. Útil para que la imagen viaje con el repositorio de GitHub.</p></div>

    <div class="card"><h3>Tutorial y enlaces</h3>
      <label>Vídeo de YouTube<input id="exTutorial" type="url" inputmode="url" value="${esc(ex.tutorialUrl || '')}" placeholder="https://www.youtube.com/watch?v=…"></label>
      <div id="tutorialPreview"></div>
      <label>Otro enlace<input id="exExternal" type="url" inputmode="url" value="${esc(ex.externalUrl || '')}" placeholder="https://…"></label>
      <label>Cómo se hace<textarea id="exInstructions" placeholder="Pasos y puntos clave de la técnica">${esc(ex.instructions || '')}</textarea></label>
      <label>Notas<textarea id="exNotes">${esc(ex.notes || '')}</textarea></label></div>

    <div class="card"><h3>Datos del ejercicio</h3>
      <label>Nombre<input id="exName" value="${esc(ex.name)}" maxlength="90"></label>
      <div class="grid-2"><label>Grupo<select id="exGroup">${Object.entries(GROUPS).map(([k, g]) => `<option value="${k}" ${ex.group === k ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select></label>
      <label>Material<select id="exEquip">${Object.entries(EQUIP).map(([k, v]) => `<option value="${k}" ${ex.equip === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label></div>
      <label>Zona<select id="exSubgroup"></select></label>
      <div class="grid-2"><label>Músculo principal<input id="exPrimary" value="${esc(ex.primary)}"></label><label>Secundarios<input id="exSecondary" value="${esc(ex.secondary || '')}"></label></div></div>

    <div class="card"><h3>Objetivos y progresión</h3>
      <div class="grid-2"><label>Reps mínimas<input id="exMin" type="number" inputmode="numeric" min="1" value="${esc(ex.targetRepsMin ?? 8)}"></label><label>Reps máximas<input id="exMax" type="number" inputmode="numeric" min="1" value="${esc(ex.targetRepsMax ?? 12)}"></label></div>
      <div class="grid-2"><label>RIR objetivo<input id="exRIR" type="number" inputmode="numeric" min="0" max="10" value="${esc(ex.targetRIR ?? 1)}"></label><label>Descanso (segundos)<input id="exRest" type="number" inputmode="numeric" min="0" step="5" value="${esc(ex.restSeconds ?? 90)}"></label></div>
      <label>Incremento de peso (kg)<input id="exInc" type="text" inputmode="decimal" value="${esc(incrementOf(ex))}"></label>
      <p class="small muted">Cuando completes todas las series en las reps máximas con el RIR objetivo, la app te sugerirá subir este peso. Pon 0 en ejercicios de peso corporal.</p></div>

    <div class="sticky-actions"><button type="button" class="btn" id="cancelEdit">Cancelar</button><button type="button" class="btn primary" id="saveEdit">Guardar</button></div>
    ${hasOverride ? '<button type="button" class="btn full" id="restoreEx">Restaurar datos originales</button>' : ''}
    ${!isNew && !ex.builtin ? '<button type="button" class="btn danger full" id="deleteExercise">Eliminar ejercicio</button>' : ''}`);

  const drawImages = () => {
    $('#imgGrid').innerHTML = images.map((im, i) => `<figure class="img-tile ${i === 0 ? 'main' : ''}">
      <button type="button" class="img-open" data-view="${i}" aria-label="Ver imagen ${i + 1}"><img src="${esc(im.thumb || im.full)}" alt=""></button>
      ${i === 0 ? '<span class="img-badge">Principal</span>' : `<button type="button" class="img-act left" data-main="${i}" aria-label="Hacer principal">★</button>`}
      <button type="button" class="img-act" data-del="${i}" aria-label="Eliminar imagen">✕</button>
      <figcaption>${im.w ? `${im.w}×${im.h}` : ''}${im.bytes ? ` · ${fmtBytes(im.bytes)}` : ''}</figcaption></figure>`).join('') || '<div class="img-empty">Sin imágenes todavía</div>';
    $$('[data-view]').forEach(b => b.onclick = () => openGallery(images, Number(b.dataset.view), $('#exName').value || ex.name));
    $$('[data-main]').forEach(b => b.onclick = () => { const [im] = images.splice(Number(b.dataset.main), 1); images.unshift(im); drawImages(); });
    $$('[data-del]').forEach(b => b.onclick = () => { images.splice(Number(b.dataset.del), 1); drawImages(); });
  };
  const addFiles = async files => {
    const list = Array.from(files || []); if (!list.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) { toast(`Máximo ${MAX_IMAGES} imágenes por ejercicio.`); return; }
    const status = $('#imgStatus'); let last = null, errors = [];
    for (const [i, f] of list.slice(0, room).entries()) {
      status.textContent = `Optimizando ${i + 1} de ${Math.min(list.length, room)}…`;
      try { last = await processImageFile(f); images.push(last); drawImages(); } catch (e) { errors.push(e.message); }
    }
    status.textContent = [last ? `Última imagen: ${last.originalW}×${last.originalH} (${fmtBytes(last.originalBytes)}) → ${last.w}×${last.h} (${fmtBytes(last.bytes)}).` : '', list.length > room ? `Solo caben ${MAX_IMAGES} imágenes.` : '', ...errors].filter(Boolean).join(' ');
  };
  $('#imgFiles').onchange = e => { addFiles(e.target.files).then(() => { e.target.value = ''; }); };
  $('#imgCamera').onchange = e => { addFiles(e.target.files).then(() => { e.target.value = ''; }); };
  drawImages();

  const refreshSub = () => {
    const g = $('#exGroup').value, opts = [...(SUBGROUPS[g] || [])];
    if (ex.subgroup && ex.group === g && !opts.includes(ex.subgroup)) opts.push(ex.subgroup);
    $('#exSubgroup').innerHTML = opts.map(x => `<option ${ex.subgroup === x ? 'selected' : ''}>${esc(x)}</option>`).join('');
  };
  refreshSub(); $('#exGroup').onchange = refreshSub;
  $('#exEquip').onchange = () => { if ($('#exEquip').value === 'calistenia' && num($('#exInc').value) === 2.5) $('#exInc').value = '0'; };

  const previewTutorial = () => {
    const v = $('#exTutorial').value.trim(), u = safeUrl(v), yid = youtubeId(u), el = $('#tutorialPreview');
    el.innerHTML = yid ? `<div class="yt-preview"><img src="https://i.ytimg.com/vi/${yid}/mqdefault.jpg" alt="" loading="lazy"><span class="small">Vídeo de YouTube detectado. Se verá dentro de la app.</span></div>`
      : v && !u ? '<p class="small warn">Este enlace no es válido. Debe empezar por https://</p>' : v ? '<p class="small muted">Se abrirá en una pestaña nueva.</p>' : '';
  };
  $('#exTutorial').oninput = previewTutorial; previewTutorial();

  $('#cancelEdit').onclick = () => goBack();
  $('#saveEdit').onclick = async () => {
    const name = $('#exName').value.trim(), primary = $('#exPrimary').value.trim();
    if (!name || !primary) { toast('Escribe el nombre y el músculo principal.'); (name ? $('#exPrimary') : $('#exName')).focus(); return; }
    const tut = $('#exTutorial').value.trim(), ext = $('#exExternal').value.trim();
    if ((tut && !safeUrl(tut)) || (ext && !safeUrl(ext))) { toast('Revisa los enlaces: deben empezar por https://'); return; }
    let min = Math.max(1, Math.round(num($('#exMin').value) || 8)), max = Math.max(1, Math.round(num($('#exMax').value) || 12));
    if (min > max) [min, max] = [max, min];
    const obj = Object.assign({}, ex, {
      name, primary, group: $('#exGroup').value, subgroup: $('#exSubgroup').value, equip: $('#exEquip').value, secondary: $('#exSecondary').value.trim(),
      imagePath: $('#exImagePath').value.trim(), tutorialUrl: safeUrl(tut), externalUrl: safeUrl(ext),
      instructions: $('#exInstructions').value.trim(), notes: $('#exNotes').value.trim(),
      restSeconds: Math.max(0, Math.round(num($('#exRest').value) ?? 90)), targetRIR: Math.min(10, Math.max(0, Math.round(num($('#exRIR').value) ?? 1))),
      targetRepsMin: min, targetRepsMax: max, increment: Math.max(0, num($('#exInc').value) ?? 2.5)
    });
    saveExercise(obj);
    if (images.map(i => i.id).join() !== originalIds || images.length !== mediaImages(obj.id).length) {
      if (!(await mediaSet(obj.id, images))) return;
    }
    toast('Ficha guardada');
    goBack();
  };
  $('#restoreEx')?.addEventListener('click', async () => {
    if (!(await ask('Se perderán los cambios de texto, objetivos y enlaces de este ejercicio. Las imágenes se mantienen.', { ok: 'Restaurar' }))) return;
    const ov = overrides(); delete ov[ex.id]; lsWrite(K.overrides, ov); resetExerciseCache(); toast('Datos originales restaurados'); viewEditor({ id: ex.id });
  });
  $('#deleteExercise')?.addEventListener('click', async () => {
    if (!(await ask(`¿Eliminar «${ex.name}»? Las sesiones antiguas lo conservan en el historial.`, { ok: 'Eliminar', danger: true }))) return;
    deleteCustomExercise(ex.id); await mediaDelete(ex.id); toast('Ejercicio eliminado'); goBack();
  });
}
