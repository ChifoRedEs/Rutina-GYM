/* Rutina Gym — monitor de errores en pantalla.
 * Captura errores JavaScript, promesas rechazadas, recursos que no cargan y console.error.
 * No sustituye ni bloquea el funcionamiento de la app: solo muestra información de diagnóstico.
 */
(function () {
  'use strict';
  const MAX_ERRORS = 30;
  const errors = [];
  let root, list, count, details, open = false;
  const seen = new Map();

  function describe(value) {
    if (value instanceof Error) return value.message || value.name || 'Error desconocido';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  function addError(kind, message, source, line, column, stack) {
    const msg = String(message || 'Error sin descripción');
    const key = [kind, msg, source || '', line || 0].join('|');
    const now = Date.now();
    if (seen.has(key) && now - seen.get(key) < 1500) return;
    seen.set(key, now);
    const item = {
      time: new Date().toLocaleTimeString(), kind, message: msg,
      source: source || '', line: line || 0, column: column || 0,
      stack: stack || ''
    };
    errors.unshift(item);
    if (errors.length > MAX_ERRORS) errors.length = MAX_ERRORS;
    renderErrors();
    if (root) root.dataset.hasErrors = 'true';
  }
  function renderErrors() {
    if (!root) return;
    count.textContent = String(errors.length);
    details.textContent = errors.length
      ? errors.length + (errors.length === 1 ? ' incidencia detectada' : ' incidencias detectadas')
      : 'Sin errores detectados desde que se abrió esta página.';
    list.replaceChildren();
    if (!errors.length) {
      const empty = document.createElement('p');
      empty.className = 'rgym-debug-empty';
      empty.textContent = 'Si el menú vuelve a fallar, deja este panel abierto y consulta las incidencias que aparezcan aquí.';
      list.append(empty);
      return;
    }
    errors.forEach((err, index) => {
      const card = document.createElement('article');
      card.className = 'rgym-debug-error';
      const heading = document.createElement('div');
      heading.className = 'rgym-debug-heading';
      heading.textContent = (index + 1) + '. [' + err.time + '] ' + err.kind;
      const message = document.createElement('pre');
      message.className = 'rgym-debug-message';
      message.textContent = err.message;
      card.append(heading, message);
      if (err.source) {
        const location = document.createElement('div');
        location.className = 'rgym-debug-source';
        location.textContent = err.source + (err.line ? ':' + err.line + (err.column ? ':' + err.column : '') : '');
        card.append(location);
      }
      if (err.stack) {
        const stack = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Ver detalle técnico';
        const pre = document.createElement('pre');
        pre.className = 'rgym-debug-message';
        pre.textContent = err.stack;
        stack.append(summary, pre);
        card.append(stack);
      }
      list.append(card);
    });
  }
  function makePanel() {
    if (root || !document.body) return;
    const style = document.createElement('style');
    style.textContent = `
      #rgym-error-monitor{position:fixed;z-index:99999;left:8px;right:8px;bottom:calc(76px + env(safe-area-inset-bottom));font:13px/1.4 system-ui,sans-serif;color:#f8fafc;pointer-events:none}
      #rgym-error-monitor *{box-sizing:border-box}
      #rgym-error-monitor .rgym-debug-toggle{pointer-events:auto;display:flex;align-items:center;gap:8px;border:1px solid #64748b;border-radius:999px;background:#172033;color:#fff;padding:8px 12px;box-shadow:0 4px 18px #0004;font:inherit;font-weight:700;max-width:100%}
      #rgym-error-monitor .rgym-debug-count{display:inline-grid;place-items:center;min-width:21px;height:21px;padding:0 5px;border-radius:99px;background:#64748b;color:#fff}
      #rgym-error-monitor[data-has-errors="true"] .rgym-debug-toggle{background:#7f1d1d;border-color:#f87171}
      #rgym-error-monitor[data-has-errors="true"] .rgym-debug-count{background:#fecaca;color:#7f1d1d}
      #rgym-error-monitor .rgym-debug-panel{pointer-events:auto;display:none;margin-top:7px;max-height:55vh;overflow:auto;border:1px solid #64748b;border-radius:12px;background:#111827;color:#f8fafc;box-shadow:0 8px 28px #0006;padding:10px}
      #rgym-error-monitor[data-open="true"] .rgym-debug-panel{display:block}
      #rgym-error-monitor .rgym-debug-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
      #rgym-error-monitor .rgym-debug-actions{display:flex;gap:6px}
      #rgym-error-monitor .rgym-debug-actions button{border:1px solid #64748b;border-radius:7px;background:#273449;color:#fff;padding:5px 8px;font:inherit}
      #rgym-error-monitor .rgym-debug-empty{margin:8px 0;color:#cbd5e1}
      #rgym-error-monitor .rgym-debug-error{border-top:1px solid #374151;padding:8px 0;overflow-wrap:anywhere}
      #rgym-error-monitor .rgym-debug-heading{font-weight:750;color:#fca5a5}
      #rgym-error-monitor .rgym-debug-message{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.4 ui-monospace,monospace;margin:5px 0;color:#fff}
      #rgym-error-monitor .rgym-debug-source{font-size:11px;color:#cbd5e1;overflow-wrap:anywhere}
      #rgym-error-monitor summary{cursor:pointer;color:#cbd5e1;margin-top:5px}
      @media(min-width:700px){#rgym-error-monitor{left:auto;right:14px;width:min(520px,calc(100vw - 28px))}}
    `;
    document.head.append(style);
    root = document.createElement('section');
    root.id = 'rgym-error-monitor';
    root.dataset.open = 'false';
    root.innerHTML = '<button type="button" class="rgym-debug-toggle" aria-expanded="false"><span>Diagnóstico de errores</span><span class="rgym-debug-count">0</span></button><div class="rgym-debug-panel"><div class="rgym-debug-top"><strong class="rgym-debug-summary"></strong><div class="rgym-debug-actions"><button type="button" data-action="copy">Copiar</button><button type="button" data-action="clear">Limpiar</button><button type="button" data-action="close">Cerrar</button></div></div><div class="rgym-debug-list"></div></div>';
    document.body.append(root);
    count = root.querySelector('.rgym-debug-count');
    details = root.querySelector('.rgym-debug-summary');
    list = root.querySelector('.rgym-debug-list');
    root.querySelector('.rgym-debug-toggle').addEventListener('click', () => {
      open = !open; root.dataset.open = String(open);
      root.querySelector('.rgym-debug-toggle').setAttribute('aria-expanded', String(open));
    });
    root.querySelector('[data-action="close"]').addEventListener('click', () => {
      open = false; root.dataset.open = 'false';
      root.querySelector('.rgym-debug-toggle').setAttribute('aria-expanded', 'false');
    });
    root.querySelector('[data-action="clear"]').addEventListener('click', () => {
      errors.length = 0; seen.clear(); delete root.dataset.hasErrors; renderErrors();
    });
    root.querySelector('[data-action="copy"]').addEventListener('click', async () => {
      const text = errors.map(e => `${e.time} | ${e.kind}\n${e.message}${e.source ? `\n${e.source}:${e.line}:${e.column}` : ''}${e.stack ? `\n${e.stack}` : ''}`).join('\n\n') || 'Sin errores registrados.';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
        else { const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); }
        details.textContent = 'Diagnóstico copiado.';
      } catch { details.textContent = 'No se pudo copiar; mantén pulsado el texto del error para copiarlo.'; }
    });
    renderErrors();
  }

  window.addEventListener('error', event => {
    if (event.target && event.target !== window) {
      const target = event.target;
      addError('Fallo al cargar archivo/recurso', target.src || target.href || target.outerHTML || 'Recurso no identificado');
      return;
    }
    addError('Error JavaScript', event.message || describe(event.error), event.filename, event.lineno, event.colno, event.error && event.error.stack);
  }, true);
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    addError('Promesa rechazada sin gestionar', describe(reason), '', 0, 0, reason && reason.stack);
  });

  // Registra también errores que la propia app captura y envía a console.error.
  const originalConsoleError = console.error.bind(console);
  console.error = function (...args) {
    originalConsoleError(...args);
    const first = args.find(value => value instanceof Error) || args.map(describe).join(' ');
    addError('console.error', describe(first), '', 0, 0, first instanceof Error ? first.stack : '');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makePanel, { once: true });
  else makePanel();
})();
