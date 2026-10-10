/* Rutina Gym — gráficas SVG ligeras, sin librerías externas. Los colores salen del CSS. */
'use strict';

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, step0 = span / count, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || step0;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(round(v, 2));
  return { lo, hi, ticks };
}

/* points: [{ label, value, title }] en orden cronológico */
function lineChart(points, { unit = '', color = 'var(--accent)' } = {}) {
  if (!points.length) return '<p class="muted small">Sin datos todavía.</p>';
  const W = 400, H = 200, L = 42, R = 10, T = 12, B = 26;
  const vals = points.map(p => p.value);
  const { lo, hi, ticks } = niceTicks(Math.min(...vals), Math.max(...vals));
  const x = i => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo || 1));
  const grid = ticks.map(t => `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="ch-ylab" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${fmtNum(t)}</text>`).join('');
  const idx = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const xl = idx.map(i => `<text class="ch-xlab" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 && points.length > 1 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'middle'}">${esc(points[i].label)}</text>`).join('');
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `<path class="ch-area" d="${path} L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z" style="fill:${color}"/>` : '';
  const dots = points.map((p, i) => `<circle class="ch-dot${i === points.length - 1 ? ' last' : ''}" cx="${x(i)}" cy="${y(p.value)}" r="${i === points.length - 1 ? 5 : 3.5}" style="stroke:${color}${i === points.length - 1 ? `;fill:${color}` : ''}"><title>${esc(p.title || `${p.label}: ${fmtNum(p.value)} ${unit}`)}</title></circle>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica">${grid}${area}<path class="ch-line" d="${path}" style="stroke:${color}"/>${dots}${xl}</svg>`;
}

/* bars: [{ label, value, title }] */
function barChart(bars, { unit = '' } = {}) {
  if (!bars.some(b => b.value > 0)) return '<div class="empty">Sin series completadas en estas semanas.</div>';
  const W = 400, H = 170, L = 38, R = 4, T = 10, B = 24;
  const { hi, ticks } = niceTicks(0, Math.max(1, ...bars.map(b => b.value)));
  const bw = (W - L - R) / bars.length;
  const y = v => T + (H - T - B) * (1 - v / (hi || 1));
  const grid = ticks.map(t => `<line class="ch-grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="ch-ylab" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${t >= 1000 ? fmtNum(t / 1000) + 'k' : fmtNum(t)}</text>`).join('');
  const rects = bars.map((b, i) => {
    const h = Math.max(b.value ? 2 : 0, H - B - y(b.value));
    return `<rect class="ch-bar${i === bars.length - 1 ? ' last' : ''}" x="${L + i * bw + bw * 0.18}" y="${H - B - h}" width="${bw * 0.64}" height="${h}" rx="4"><title>${esc(b.title || `${b.label}: ${fmtNum(b.value)} ${unit}`)}</title></rect>`;
  }).join('');
  const every = Math.ceil(bars.length / 6);
  const xl = bars.map((b, i) => ((bars.length - 1 - i) % every === 0 ? `<text class="ch-xlab" x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(b.label)}</text>` : '')).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de barras">${grid}${rects}${xl}</svg>`;
}
