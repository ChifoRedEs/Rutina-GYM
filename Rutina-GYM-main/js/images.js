/* Rutina Gym — redimensionado automático de imágenes.
 *
 * Tamaños mínimos necesarios para verse nítidas en la app:
 *  - Imagen completa: 1080 px en el lado largo. Es el ancho físico de una pantalla
 *    de móvil típica (≈390 px CSS × densidad 2,75–3), que es lo máximo que ocupa
 *    al abrirla a pantalla completa. Nunca se amplía una imagen más pequeña.
 *  - Miniatura: 240 × 240 px recortada al centro. Las miniaturas se muestran a
 *    ≤ 80 px CSS, así que 240 px cubre pantallas de densidad 3.
 * Formato WebP (calidad 0,82) y JPEG si el navegador no sabe codificar WebP. */
'use strict';

const IMG_FULL_MAX = 1080;
const IMG_THUMB = 240;
const IMG_QUALITY = 0.82;
const IMG_MAX_INPUT = 25 * 1024 * 1024;

let webpSupport = null;
function canEncodeWebp() {
  if (webpSupport === null) {
    try { const c = document.createElement('canvas'); c.width = c.height = 1; webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp'); }
    catch { webpSupport = false; }
  }
  return webpSupport;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Formato de imagen no compatible')); };
    img.src = url;
  });
}

/* Reduce a la mitad en pasos sucesivos: evita el dentado de un único escalado grande. */
function drawScaled(src, sx, sy, sw, sh, tw, th) {
  let canvas = document.createElement('canvas'), ctx;
  let cw = sw, ch = sh, source = src, ox = sx, oy = sy;
  while (cw / 2 >= tw && ch / 2 >= th) {
    const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
    const c = document.createElement('canvas'); c.width = nw; c.height = nh;
    ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, ox, oy, cw, ch, 0, 0, nw, nh);
    source = c; ox = 0; oy = 0; cw = nw; ch = nh;
  }
  canvas.width = tw; canvas.height = th;
  ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, tw, th); // fondo blanco para PNG transparentes en JPEG
  ctx.drawImage(source, ox, oy, cw, ch, 0, 0, tw, th);
  return canvas;
}
function encode(canvas) {
  const type = canEncodeWebp() ? 'image/webp' : 'image/jpeg';
  return canvas.toDataURL(type, IMG_QUALITY);
}
const dataUrlBytes = d => Math.round((d.length - d.indexOf(',') - 1) * 0.75);

async function processImageFile(file) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name}: no es una imagen`);
  if (file.size > IMG_MAX_INPUT) throw new Error(`${file.name}: supera 25 MB`);
  const img = await loadImage(file);
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  if (!w0 || !h0) throw new Error(`${file.name}: imagen vacía`);

  const scale = Math.min(1, IMG_FULL_MAX / Math.max(w0, h0));
  const fw = Math.round(w0 * scale), fh = Math.round(h0 * scale);
  const full = encode(drawScaled(img, 0, 0, w0, h0, fw, fh));

  const side = Math.min(w0, h0), t = Math.min(IMG_THUMB, side);
  const thumb = encode(drawScaled(img, (w0 - side) / 2, (h0 - side) / 2, side, side, t, t));

  return { id: uid('img'), full, thumb, w: fw, h: fh, bytes: dataUrlBytes(full) + dataUrlBytes(thumb), originalBytes: file.size, originalW: w0, originalH: h0 };
}
const fmtBytes = b => (b >= 1048576 ? `${round(b / 1048576, 1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
