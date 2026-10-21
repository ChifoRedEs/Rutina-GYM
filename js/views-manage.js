/* Rutina Gym — progreso, perfil, ajustes, biblioteca y editor de ejercicios. */
'use strict';

/* ---------- progreso ---------- */
let statsQuery = '', statsExOpen = false, calMode = 'week';
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
    ${caloriesStatsHTML()}
    <details class="card fold" id="exFold" ${statsExOpen || statsQuery ? 'open' : ''}>
      <summary><h3>Ejercicios</h3><span class="small muted">${prs.length} con series</span></summary>
      <p class="small muted">Toca uno para ver su evolución.</p>
      <input id="statsSearch" type="search" placeholder="Buscar ejercicio" value="${esc(statsQuery)}" aria-label="Buscar ejercicio">
      <div class="list" id="prList"></div></details>`);
  bindCaloriesStats();
  $('#exFold').addEventListener('toggle', ev => { statsExOpen = ev.target.open; });

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

/* ---------- progreso: calorías ---------- */
function caloriesStatsHTML() {
  if (!calReady()) {
    return `<div class="card"><h3>Calorías</h3><p class="small muted">Añade tu peso corporal en Perfil para estimar las calorías de cada sesión, semana y mes.</p><button type="button" class="btn primary full" id="calGoProfile">Ir a Perfil</button></div>`;
  }
  const st = calStats();
  return `<div class="card" id="calStats"><h3>Calorías</h3>
    <p class="small muted">Estimación con el método MET y los datos de tu Perfil, recalculada con tu peso actual.</p>
    <div class="kpis">
      <div class="kpi"><b>${fmtNum(Math.round(st.week))} kcal</b><span>esta semana</span></div>
      <div class="kpi"><b>${fmtNum(Math.round(st.month))} kcal</b><span>este mes</span></div>
      <div class="kpi"><b>${st.count ? fmtNum(Math.round(st.avg)) + ' kcal' : '–'}</b><span>media por sesión</span></div>
      <div class="kpi"><b>${st.best ? fmtNum(Math.round(st.best.kcal)) + ' kcal' : '–'}</b><span>${st.best ? `mejor sesión (${esc(formatDateShort(st.best.s.date))})` : 'mejor sesión'}</span></div>
    </div>
    <div class="chips" id="calChips">${[['session', 'Por sesión'], ['week', 'Por semana'], ['month', 'Por mes']].map(([k, l]) => `<button type="button" class="chip ${calMode === k ? 'on' : ''}" data-cal-mode="${k}">${l}</button>`).join('')}</div>
    <div id="calChart"></div>
    <p class="small muted">Acumulado: ${fmtNum(Math.round(st.total))} kcal en ${st.count} ${st.count === 1 ? 'sesión' : 'sesiones'}.</p></div>`;
}
function bindCaloriesStats() {
  $('#calGoProfile')?.addEventListener('click', () => go('profile'));
  const box = $('#calChart'); if (!box) return;
  const titles = { session: 'Últimas 12 sesiones', week: 'Últimas 12 semanas', month: 'Últimos 12 meses' };
  const draw = () => {
    const bars = calSeries(calMode, 12).map(x => ({ label: x.label, value: Math.round(x.kcal), title: x.title }));
    box.innerHTML = `<p class="small muted" style="margin:4px 0 0">${titles[calMode]}</p>${barChart(bars, { unit: 'kcal' })}`;
    $$('[data-cal-mode]').forEach(b => b.classList.toggle('on', b.dataset.calMode === calMode));
  };
  $$('[data-cal-mode]').forEach(b => b.onclick = () => { calMode = b.dataset.calMode; draw(); });
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
  $$('[data-m]', $('#screen')).forEach(b => b.onclick = () => { statsMetric = b.dataset.m; viewExerciseStats({ id }); });
  $$('[data-open]', $('#screen')).forEach(b => b.onclick = () => go(`workout/${b.dataset.open}`));
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
      <p class="small muted">Elige el modo general y personaliza los colores de las pantallas. Los cambios se guardan en este dispositivo.</p>
      <div class="segmented" role="radiogroup" aria-label="Tema">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${c.theme === k}" class="${c.theme === k ? 'on' : ''}" data-theme-mode="${k}">${l}</button>`).join('')}</div>
      <div class="theme-color-grid">
        <label class="theme-color-option"><span><b>Fondo general</b><span class="small muted">Detrás de las tarjetas y secciones</span></span><input type="color" data-theme-color="bg" value="${esc((c.themeColors || {}).bg || (c.theme === 'dark' ? '#141824' : '#f5f7fb'))}" aria-label="Color del fondo general"></label>
        <label class="theme-color-option"><span><b>Fondo de tarjetas</b><span class="small muted">Ventanas, bloques y paneles</span></span><input type="color" data-theme-color="surface" value="${esc((c.themeColors || {}).surface || (c.theme === 'dark' ? '#1c2130' : '#ffffff'))}" aria-label="Color de las tarjetas"></label>
        <label class="theme-color-option"><span><b>Color principal</b><span class="small muted">Botones y elementos destacados</span></span><input type="color" data-theme-color="accent" value="${esc((c.themeColors || {}).accent || (c.theme === 'dark' ? '#9a82ff' : '#7c5cff'))}" aria-label="Color principal"></label>
      </div>
      <button type="button" class="btn full" id="resetThemeColors">Restablecer colores predeterminados</button>
    </div>

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
  const scr = $('#screen');
  $$('[data-theme-mode]', scr).forEach(b => b.onclick = () => { setSetting('theme', b.dataset.themeMode); applyTheme(); viewSettings(); });
  $$('[data-theme-color]', scr).forEach(i => i.oninput = () => {
    const key = i.dataset.themeColor, colors = Object.assign({}, settings().themeColors || {});
    colors[key] = i.value; setSetting('themeColors', colors); applyTheme();
  });
  $('#resetThemeColors').onclick = () => { setSetting('themeColors', {}); applyTheme(); viewSettings(); };
  $$('[data-set]', scr).forEach(i => i.onchange = async () => {
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
  $$('[data-tpl]', scr).forEach(b => b.onclick = async () => {
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

/* ---------- perfil ---------- */
function viewProfile() {
  setHeader('Perfil', 'Tus datos y el cálculo de calorías', false);
  paint(caloriesCardHTML());
  bindCaloriesCard($('#screen'));
}

/* ---------- perfil: datos corporales y gasto calórico ---------- */
function caloriesCardHTML() {
  const b = calBodyRaw(), cfg = calConfig();
  const opt = (v, cur, l) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;
  const field = (k, label, ph, extra = '') => `<label>${label}<input type="text" inputmode="decimal" data-body="${k}" value="${esc(b[k] ?? '')}" placeholder="${ph}" ${extra}></label>`;
  const lvl = (k, label) => `<label>${label}<select data-cal-int="${k}">${opt('auto', cfg.intensity[k], 'Automática (según RIR)')}${Object.entries(CAL_LEVELS).map(([v, l]) => opt(v, cfg.intensity[k], l)).join('')}</select></label>`;
  return `<div class="card" id="calCard"><h3>Perfil y gasto calórico</h3>
    <p class="small muted">Sirve para estimar las calorías con el método MET. Cuantos más datos pongas, mejor la aproximación. Se guardan solo en este dispositivo y viajan en tus copias de seguridad.</p>
    <div class="grid-2">
      <label>Sexo<select data-body="sex">${opt('', b.sex, 'Sin indicar')}${opt('m', b.sex, 'Hombre')}${opt('f', b.sex, 'Mujer')}</select></label>
      ${field('age', 'Edad (años)', '10–100')}
    </div>
    <div class="grid-2">${field('weight', 'Peso corporal (kg)', 'Ej. 72,5')}${field('height', 'Altura (cm)', 'Ej. 175')}</div>
    ${field('bodyFat', '% de grasa corporal (opcional)', '3–60')}
    <p class="small muted">El peso es imprescindible. Sexo, edad y altura afinan tu metabolismo basal; si indicas el % de grasa se usa una fórmula más precisa.</p>

    <h3 style="margin-top:14px">Cómo se calcula</h3>
    <label>Tipo de gasto<select data-cal="mode">${opt('gross', cfg.mode, 'Bruto: incluye tu metabolismo basal')}${opt('net', cfg.mode, 'Neto: solo el extra por entrenar')}</select></label>
    <label>Referencia de 1 MET<select data-cal="metRef">${opt('standard', cfg.metRef, 'Estándar (1 kcal por kg y hora)')}${opt('personal', cfg.metRef, 'Personalizada con mi metabolismo basal')}</select></label>
    <div class="grid-2">
      <label>Segundos por repetición (tiempo teórico de la serie)<input type="text" inputmode="decimal" data-cal="secPerRep" value="${esc(cfg.secPerRep)}" placeholder="3"></label>
      <label>Efecto postejercicio (EPOC)<select data-cal="epoc">${opt(0, cfg.epoc, 'No sumar')}${opt(5, cfg.epoc, '+5 %')}${opt(10, cfg.epoc, '+10 %')}</select></label>
    </div>

    <label>Ajuste personal (%)<input type="text" inputmode="numeric" data-cal="scale" value="${esc(cfg.scale)}" placeholder="100"></label>
    <p class="small muted">Multiplica todas las estimaciones (50–200 %). Si tu reloj marca de forma sistemática más o menos calorías que la app, súbelo o bájalo. No afecta a las kcal que escribes desde una máquina.</p>

    <h3 style="margin-top:14px">Intensidad por defecto</h3>
    ${lvl('cardio', 'Cardio sin velocidad y ejercicios por tiempo')}
    <p class="small muted">Pesas y calistenia se calculan con la carga, el recorrido y las repeticiones de cada serie, no con una intensidad fija. En el cardio, las kcal de la máquina tienen prioridad, luego la velocidad (o la distancia) y la inclinación. En la ficha de cada ejercicio puedes ajustar el recorrido, el peso corporal que mueves, la intensidad o un MET propio.</p>
    <div class="cal-preview small" id="calPreview" aria-live="polite"></div></div>`;
}
function bindCaloriesCard(scr) {
  const card = $('#calCard', scr); if (!card) return;
  const refresh = () => {
    const b = calBody(), cfg = calConfig(), el = $('#calPreview', card);
    if (!b.weight) { el.innerHTML = '<span class="muted">Indica tu peso corporal para ver una estimación.</span>'; return; }
    const ref = calReference(b, cfg), bmr = calBMR(b), kk = calKcalPerMetKgH(b, cfg);
    el.innerHTML = `<b>Con estos datos:</b><br>· 1 serie de 10 repeticiones con 60 kg en el press de pecho en máquina ≈ ${fmtNum(round(ref.bench, 1))} kcal.<br>· 20 min de cinta a 8 km/h sin inclinación ≈ ${fmtNum(Math.round(ref.treadmill))} kcal.<br>` +
      `<span class="muted">1 MET = ${fmtNum(round(kk * b.weight, 1))} kcal/h.${bmr ? ` Metabolismo basal estimado: ${fmtNum(Math.round(bmr.kcal))} kcal/día (${bmr.method}).` : ' Añade altura y edad (o % de grasa) para calcular tu metabolismo basal.'}${cfg.metRef === 'personal' && !bmr ? ' La referencia personalizada necesita esos datos; mientras tanto se usa la estándar.' : ''}</span>`;
  };
  $$('[data-body]', card).forEach(i => {
    const k = i.dataset.body;
    const save = loud => {
      const body = Object.assign({}, calBodyRaw());
      if (k === 'sex') body.sex = i.value;
      else {
        const raw = i.value.trim(), n = num(raw);
        if (!raw) body[k] = '';
        else if (calInRange(k, raw) === null) { if (loud) { toast(`Valor fuera de rango (${CAL_RANGES[k][0]}–${CAL_RANGES[k][1]}).`); i.value = body[k] ?? ''; } return; }
        else body[k] = n;
      }
      setSetting('body', body); refresh();
    };
    if (i.tagName === 'SELECT') i.onchange = () => save(true); else { i.oninput = () => save(false); i.onchange = () => save(true); }
  });
  $$('[data-cal]', card).forEach(i => {
    const k = i.dataset.cal;
    const save = loud => {
      const cfg = calConfig(); let v = i.value;
      if (k === 'secPerRep') { const n = num(v); if (n === null || n < 1 || n > 10) { if (loud) { toast('Pon entre 1 y 10 segundos por repetición.'); i.value = cfg.secPerRep; } return; } v = n; }
      if (k === 'scale') { const n = num(v); if (n === null || n < 50 || n > 200) { if (loud) { toast('El ajuste debe estar entre 50 y 200 %.'); i.value = cfg.scale; } return; } v = n; }
      if (k === 'epoc') v = Number(v);
      setSetting('calc', Object.assign({}, cfg, { [k]: v })); refresh();
    };
    if (i.tagName === 'SELECT') i.onchange = () => save(true); else { i.oninput = () => save(false); i.onchange = () => save(true); }
  });
  $$('[data-cal-int]', card).forEach(i => i.onchange = () => {
    const cfg = calConfig(); cfg.intensity[i.dataset.calInt] = i.value; setSetting('calc', cfg); refresh();
  });
  refresh();
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
      const img = mainImage(x), n = exerciseImages(x).length;
      return `<button type="button" class="list-item lib-row" data-edit="${esc(x.id)}" style="--gc:${esc(groupColor(x.group))}">
        ${img ? `<img class="lib-thumb" src="${esc(img.thumb)}" alt="" loading="lazy">` : '<span class="lib-thumb empty-thumb" aria-hidden="true">+</span>'}
        <span class="lib-text"><b>${esc(x.name)}</b><span class="small muted">${esc(groupLabel(x.group))} · ${esc(x.subgroup || '')} · ${esc(EQUIP[x.equip] || '')}</span>
        <span class="tags">${n ? `<span class="tag">${n} ${n === 1 ? 'imagen' : 'imágenes'}</span>` : '<span class="tag dim">Sin imagen</span>'}${x.tutorialUrl ? '<span class="tag">Tutorial</span>' : ''}${x.builtin ? '' : '<span class="tag">Personalizado</span>'}</span></span></button>`;
    }).join('') || '<div class="empty">No hay ejercicios que coincidan.</div>';
    $$('#libList [data-edit]').forEach(b => b.onclick = () => go(`library/${encodeURIComponent(b.dataset.edit)}`));
  };
  $('#newExercise').onclick = () => go('library/new');
  $('#libSearch').oninput = e => { libQuery = e.target.value.trim(); draw(); };
  $$('[data-g]', $('#screen')).forEach(b => b.onclick = () => { libGroup = b.dataset.g; $$('[data-g]', $('#screen')).forEach(c => c.classList.toggle('on', c === b)); draw(); });
  draw();
}

/* ---------- editor de ejercicio ---------- */
const MAX_IMAGES = 8;
function viewEditor({ id }) {
  const isNew = id === 'new';
  const existing = isNew ? { id: uid('custom'), name: '', group: libGroup !== 'all' ? libGroup : 'empuje', subgroup: '', equip: 'maquina', primary: '', secondary: '', restSeconds: 90, tracking: 'weight', targetRepsMin: 8, targetRepsMax: 12, targetRIR: 1, increment: 2.5, tutorialUrl: '', externalUrl: '', instructions: '', notes: '', imagePath: '' } : exerciseById(id);
  if (!existing) { toast('No se ha encontrado el ejercicio.'); return go('library', { replace: true }); }
  const ex = existing;
  let images = mediaImages(ex.id).slice();
  const originalIds = images.map(i => i.id).join();
  const hasOverride = !isNew && ex.builtin && Boolean(overrides()[ex.id]);
  setHeader(isNew ? 'Nuevo ejercicio' : 'Editar ejercicio', isNew ? 'Ficha del ejercicio' : ex.name, true);

  paint(`
    <div class="card"><h3>Imágenes</h3>
      <p class="small muted">Se optimizan solas al subirlas: máximo 1080 px en el lado largo y miniatura de 240 px, en WebP. Si el ejercicio tiene portada en el repositorio, esa es la principal; si no, la primera subida.</p>
      ${coverNumber(ex) ? `<p class="small muted cover-info">Portada del repositorio: <code>${esc(coverPath(ex))}</code> · ${coverExists(ex) ? 'encontrada' : 'aún no subida'}</p>` : ''}
      <div class="img-grid" id="imgGrid"></div>
      <div class="grid-2">
        <label class="file-btn btn">Añadir imágenes<input id="imgFiles" type="file" accept="image/*" multiple></label>
        <label class="file-btn btn">Hacer foto<input id="imgCamera" type="file" accept="image/*" capture="environment"></label>
      </div>
      <p class="small muted" id="imgStatus" aria-live="polite"></p>
      <label>Otra ruta de imagen en el repositorio (opcional)<input id="exImagePath" value="${esc(ex.imagePath || '')}" placeholder="${esc(coverPath(ex) || 'assets/exercises/press-banca.webp')}"></label>
      <p class="small muted">${coverNumber(ex) ? 'Déjalo vacío para usar la portada numerada. Si escribes una ruta, sustituye a la portada.' : 'Se muestra como portada. Útil para que la imagen viaje con el repositorio de GitHub.'}</p></div>

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
      <label>Tipo de serie<select id="exTracking"><option value="weight" ${ex.tracking !== 'time' ? 'selected' : ''}>Serie de Peso (kg, reps, RIR)</option><option value="time" ${ex.tracking === 'time' ? 'selected' : ''}>Serie de Tiempo (temporizador)</option></select></label>
      <div class="grid-2"><label>Músculo principal<input id="exPrimary" value="${esc(ex.primary)}"></label><label>Secundarios<input id="exSecondary" value="${esc(ex.secondary || '')}"></label></div></div>

    <div class="card"><h3>Descanso</h3><label>Descanso entre series (segundos)<input id="exRest" type="number" inputmode="numeric" min="0" step="5" value="${esc(ex.restSeconds ?? 90)}"></label></div>
    <div class="card"><h3>Gasto calórico</h3>
      <label>Recorrido del movimiento (cm, opcional)<input id="exRom" type="text" inputmode="decimal" value="${esc(ex.rom ?? '')}" placeholder="${Math.round(calRom(ex) * 100)} (estimado)"></label>
      <label>Peso corporal que mueves (%, solo calistenia)<input id="exBw" type="text" inputmode="decimal" value="${esc(ex.bw ?? '')}" placeholder="${Math.round(calBwFraction(ex) * 100)} (estimado)"></label>
      <label>Intensidad (solo cardio y ejercicios por tiempo)<select id="exIntensity"><option value="" ${!ex.intensity ? 'selected' : ''}>Según Ajustes</option>${Object.entries(CAL_LEVELS).map(([k, l]) => `<option value="${k}" ${ex.intensity === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>MET propio (opcional)<input id="exMet" type="text" inputmode="decimal" value="${esc(ex.met ?? '')}" placeholder="Ej. 5,5"></label>
      <p class="small muted">Las pesas se calculan con carga × recorrido × repeticiones; el recorrido y el % de peso corporal afinan la estimación de este ejercicio. Un MET propio (1–15) sustituye al método y pasa a calcular con tiempo teórico.</p></div>
    <div class="card" id="exerciseGoals"><h3>Objetivos y progresión</h3>
      <div class="grid-2"><label>Reps mínimas<input id="exMin" type="number" inputmode="numeric" min="1" value="${esc(ex.targetRepsMin ?? 8)}"></label><label>Reps máximas<input id="exMax" type="number" inputmode="numeric" min="1" value="${esc(ex.targetRepsMax ?? 12)}"></label></div>
      <label>RIR objetivo<input id="exRIR" type="number" inputmode="numeric" min="0" max="10" value="${esc(ex.targetRIR ?? 1)}"></label>
      <label>Incremento de peso (kg)<input id="exInc" type="text" inputmode="decimal" value="${esc(incrementOf(ex))}"></label>
      <p class="small muted">Cuando completes todas las series en las reps máximas con el RIR objetivo, la app te sugerirá subir este peso. Pon 0 en ejercicios de peso corporal.</p></div>

    <div class="sticky-actions"><button type="button" class="btn" id="cancelEdit">Cancelar</button><button type="button" class="btn primary" id="saveEdit">Guardar</button></div>
    ${hasOverride ? '<button type="button" class="btn full" id="restoreEx">Restaurar datos originales</button>' : ''}
    ${!isNew && !ex.builtin ? '<button type="button" class="btn danger full" id="deleteExercise">Eliminar ejercicio</button>' : ''}`);

  const repo = isNew ? null : repoImage(ex);
  const drawImages = () => {
    const off = repo ? 1 : 0, all = (repo ? [repo] : []).concat(images);
    $('#imgGrid').innerHTML = (repo ? `<figure class="img-tile main">
      <button type="button" class="img-open" data-view="0" aria-label="Ver portada"><img src="${esc(repo.thumb)}" alt=""></button>
      <span class="img-badge">Portada</span>
      <figcaption>Repositorio</figcaption></figure>` : '') + images.map((im, i) => `<figure class="img-tile ${i === 0 && !repo ? 'main' : ''}">
      <button type="button" class="img-open" data-view="${i + off}" aria-label="Ver imagen ${i + 1}"><img src="${esc(im.thumb || im.full)}" alt=""></button>
      ${i === 0 ? (repo ? '' : '<span class="img-badge">Principal</span>') : `<button type="button" class="img-act left" data-main="${i}" aria-label="Poner primera">★</button>`}
      <button type="button" class="img-act" data-del="${i}" aria-label="Eliminar imagen">✕</button>
      <figcaption>${im.w ? `${im.w}×${im.h}` : ''}${im.bytes ? ` · ${fmtBytes(im.bytes)}` : ''}</figcaption></figure>`).join('') || '<div class="img-empty">Sin imágenes todavía</div>';
    $$('[data-view]', $('#imgGrid')).forEach(b => b.onclick = () => openGallery(all, Number(b.dataset.view), $('#exName').value || ex.name));
    $$('[data-main]', $('#imgGrid')).forEach(b => b.onclick = () => { const [im] = images.splice(Number(b.dataset.main), 1); images.unshift(im); drawImages(); });
    $$('[data-del]', $('#imgGrid')).forEach(b => b.onclick = () => { images.splice(Number(b.dataset.del), 1); drawImages(); });
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
  const refreshTrackingFields = () => { $('#exerciseGoals').classList.toggle('hidden', $('#exTracking').value === 'time'); };
  $('#exTracking').onchange = refreshTrackingFields; refreshTrackingFields();
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
    const metRaw = $('#exMet').value.trim(), metVal = num(metRaw), romRaw = $('#exRom').value.trim(), romVal = num(romRaw), bwRaw = $('#exBw').value.trim(), bwVal = num(bwRaw);
    if (romRaw && (romVal === null || romVal < 3 || romVal > 150)) { toast('El recorrido debe estar entre 3 y 150 cm.'); $('#exRom').focus(); return; }
    if (bwRaw && (bwVal === null || bwVal < 0 || bwVal > 150)) { toast('El peso corporal que mueves debe estar entre 0 y 150 %.'); $('#exBw').focus(); return; }
    if (metRaw && (metVal === null || metVal < 1 || metVal > 15)) { toast('El MET debe estar entre 1 y 15.'); $('#exMet').focus(); return; }
    let min = Math.max(1, Math.round(num($('#exMin').value) || 8)), max = Math.max(1, Math.round(num($('#exMax').value) || 12));
    if (min > max) [min, max] = [max, min];
    const obj = Object.assign({}, ex, {
      name, primary, group: $('#exGroup').value, subgroup: $('#exSubgroup').value, equip: $('#exEquip').value, tracking: $('#exTracking').value === 'time' ? 'time' : 'weight', secondary: $('#exSecondary').value.trim(),
      imagePath: $('#exImagePath').value.trim(), tutorialUrl: safeUrl(tut), externalUrl: safeUrl(ext),
      instructions: $('#exInstructions').value.trim(), notes: $('#exNotes').value.trim(),
      intensity: $('#exIntensity').value, met: metRaw ? metVal : '', rom: romRaw ? romVal : '', bw: bwRaw ? bwVal : '',
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
