/* Rutina Gym — temporizador de descanso.
 * Se basa en una hora de fin (endAt), no en contar tics: así sigue siendo exacto aunque
 * el móvil bloquee la pantalla o el navegador frene los intervalos en segundo plano.
 * Vive fuera de la pantalla actual y se guarda en localStorage, así que sobrevive a la
 * navegación y a recargar la página. */
'use strict';

let restTick = null, restDoneShownFor = null;

function restState() { return lsRead(K.timer, null); }
function restRemaining(st = restState()) {
  if (!st) return 0;
  return st.paused ? st.remaining : Math.max(0, (st.endAt - Date.now()) / 1000);
}
function startRest(seconds, label) {
  const total = Math.max(5, Math.round(num(seconds) || 90));
  lsWrite(K.timer, { endAt: Date.now() + total * 1000, total, label: label || 'Descanso', paused: false, remaining: total });
  restDoneShownFor = null;
  unlockAudio();
  scheduleRestNotification();
  runRest();
}
function adjustRest(delta) {
  const st = restState(); if (!st) return;
  if (st.paused) st.remaining = Math.max(1, st.remaining + delta);
  else st.endAt = Math.max(Date.now() + 1000, st.endAt + delta * 1000);
  st.total = Math.max(st.total, Math.ceil(restRemaining(st)));
  lsWrite(K.timer, st); scheduleRestNotification(); drawRest();
}
function toggleRestPause() {
  const st = restState(); if (!st) return;
  if (st.paused) { st.paused = false; st.endAt = Date.now() + st.remaining * 1000; }
  else { st.remaining = restRemaining(st); st.paused = true; }
  lsWrite(K.timer, st); scheduleRestNotification(); drawRest();
}
function stopRest() { lsRemove(K.timer); clearInterval(restTick); restTick = null; cancelRestNotification(); const bar = $('#restBar'); if (bar) { bar.classList.remove('show', 'done'); bar.innerHTML = ''; } }

function runRest() { clearInterval(restTick); drawRest(); restTick = setInterval(drawRest, 250); }
function drawRest() {
  const bar = $('#restBar'); const st = restState();
  if (!bar) return;
  if (!st) { stopRest(); return; }
  const rem = restRemaining(st);
  if (rem <= 0 && !st.paused) { finishRest(st); return; }
  const pct = Math.min(100, (1 - rem / st.total) * 100);
  if (!bar.classList.contains('show') || bar.dataset.mode !== 'run') {
    bar.dataset.mode = 'run';
    bar.innerHTML = `<div class="rest-fill"></div>
      <div class="rest-info"><span class="rest-label"></span><strong class="rest-clock" aria-live="off"></strong></div>
      <div class="rest-actions">
        <button type="button" class="chip" data-rest="-15" aria-label="Restar 15 segundos">−15</button>
        <button type="button" class="chip" data-rest="15" aria-label="Sumar 15 segundos">+15</button>
        <button type="button" class="chip" data-rest="pause"></button>
        <button type="button" class="chip" data-rest="stop" aria-label="Cerrar temporizador">✕</button>
      </div>`;
    $$('[data-rest]', bar).forEach(b => b.onclick = () => {
      const a = b.dataset.rest;
      if (a === 'stop') stopRest(); else if (a === 'pause') toggleRestPause(); else adjustRest(Number(a));
    });
    bar.classList.add('show'); bar.classList.remove('done');
  }
  $('.rest-label', bar).textContent = st.label;
  $('.rest-clock', bar).textContent = formatClock(Math.ceil(rem));
  $('.rest-fill', bar).style.width = `${pct}%`;
  $('[data-rest="pause"]', bar).textContent = st.paused ? 'Seguir' : 'Pausa';
}
function finishRest(st) {
  clearInterval(restTick); restTick = null;
  lsRemove(K.timer);
  const key = st.endAt;
  if (restDoneShownFor === key) return;
  restDoneShownFor = key;
  alertRestDone();
  const bar = $('#restBar');
  if (bar) {
    bar.dataset.mode = 'done';
    bar.innerHTML = `<div class="rest-info"><span class="rest-label">${esc(st.label)}</span><strong class="rest-clock">Descanso terminado</strong></div><div class="rest-actions"><button type="button" class="chip" data-close>OK</button></div>`;
    bar.classList.add('show', 'done');
    $('[data-close]', bar).onclick = stopRest;
    setTimeout(() => { if (bar.dataset.mode === 'done') stopRest(); }, 6000);
  }
}

/* ---------- aviso: sonido + vibración ---------- */
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) audioCtx = new AC(); }
    if (audioCtx?.state === 'suspended') audioCtx.resume();
  } catch { /* sin audio */ }
}
function beep(times = 3) {
  if (!audioCtx) return;
  try {
    const t0 = audioCtx.currentTime + 0.05;
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = t0 + i * 0.28;
      o.type = 'sine'; o.frequency.value = i === times - 1 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.24);
    }
  } catch { /* sin audio */ }
}
function alertRestDone() {
  const cfg = settings();
  if (cfg.sound) beep();
  if (cfg.vibrate && navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]);
}

/* ---------- notificación (opcional, útil con la pantalla bloqueada en Android) ---------- */
let restNotifyTimer = null;
function scheduleRestNotification() {
  cancelRestNotification();
  const st = restState();
  if (!st || st.paused || !settings().notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const ms = st.endAt - Date.now();
  restNotifyTimer = setTimeout(async () => {
    if (document.visibilityState === 'visible') return; // en primer plano ya avisan el sonido y la vibración
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const opts = { body: st.label, tag: 'rest', renotify: true, icon: 'icons/icon-192.png', vibrate: [250, 120, 250] };
      if (reg) reg.showNotification('Descanso terminado', opts); else new Notification('Descanso terminado', opts);
    } catch { /* no disponible */ }
  }, Math.max(0, ms));
}
function cancelRestNotification() { clearTimeout(restNotifyTimer); restNotifyTimer = null; }

/* ---------- pantalla siempre encendida durante el entreno ---------- */
let wakeLock = null, wantWakeLock = false;
async function setWakeLock(on) {
  wantWakeLock = on;
  if (!('wakeLock' in navigator)) return;
  try {
    if (on && settings().wakeLock && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if ((!on || !settings().wakeLock) && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (restState()) runRest();          // recalcula al volver; si terminó mientras tanto, avisa
    if (wantWakeLock) setWakeLock(true); // el sistema libera el bloqueo al ocultar la página
  }
});
/* El audio solo puede empezar tras un gesto del usuario: se desbloquea en el primer toque. */
document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
