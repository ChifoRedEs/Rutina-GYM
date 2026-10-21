# Rutina Gym 4.0

Aplicación web para registrar entrenamientos de gimnasio desde el móvil o el ordenador. Funciona sin servidor, sin conexión y se puede instalar como app.

## Despliegue en GitHub Pages

1. Borra el contenido anterior del repositorio.
2. Sube **todo** el contenido de este ZIP a la raíz, manteniendo las carpetas:

```text
index.html
manifest.json
sw.js
README.md
css/
data/
icons/
js/
assets/        (imágenes en assets/exercises/img/, vídeos en assets/exercises/video/)
```

3. En el repositorio: **Settings → Pages → Deploy from a branch → main / (root)**.

No hace falta Node, npm ni ningún backend.

### Tus datos se conservan

Los entrenamientos se guardan en el navegador, no en el repositorio. Si publicas esta versión en la **misma dirección** de GitHub Pages, la app encontrará tus sesiones, ejercicios personalizados e imágenes de la v2.4 y las seguirá usando. Aun así, descarga una copia desde **Ajustes → Descargar copia** antes de actualizar, por si acaso. Si cambias de dirección o de navegador, restaura esa copia en **Ajustes → Restaurar una copia**.

## Qué hace

**Entrenar**
- Calendario mensual con colores por grupo (Empuje, Tracción, Pierna, Core).
- Sesión nueva eligiendo ejercicios en el orden en que los vas a hacer, con buscador y acceso a todos los grupos.
- Repetir una sesión anterior o empezar desde una plantilla guardada.
- Añadir, duplicar y eliminar series; marcar series de calentamiento (no cuentan para volumen, récords ni progresión).
- Reordenar y quitar ejercicios de la sesión; descanso ajustable por sesión.
- Sugerencia de progresión: con tu última sesión y los objetivos de la ficha, propone subir peso, mantenerlo y buscar más reps, o bajarlo. El peso y las reps sugeridos aparecen como pista y se rellenan solos al marcar la serie.
- Duración de la sesión (desde la primera serie marcada hasta «Finalizar»).
- Temporizador de descanso exacto aunque se bloquee la pantalla, con sonido, vibración, ±15 s, pausa y notificación opcional. Sigue visible al cambiar de pantalla y sobrevive a recargar la página.
- Pantalla siempre encendida durante la sesión (si el navegador lo permite).
- Vídeo animado de cada ejercicio en una ventana emergente (botón **🎬 Vídeo** en la tarjeta del ejercicio), para los ejercicios que ya tienen vídeo.

**Progreso**
- Volumen semanal de las últimas 12 semanas, sesiones por grupo y duración media.
- Evolución de cada ejercicio: 1RM estimado (Epley), peso máximo, volumen o repeticiones máximas.

**Biblioteca**
- Ficha por ejercicio con varias imágenes, vídeo de YouTube (se reproduce dentro de la app), enlace, instrucciones, notas, objetivos de reps y RIR, descanso e incremento de peso.
- Ejercicios personalizados.

**Calorías (pestaña Perfil)**
- Peso, altura, edad, sexo y % de grasa (opcional) para estimar el gasto con el método MET.
- Tipo de gasto (bruto o neto), referencia de 1 MET (estándar o según tu metabolismo basal), segundos por repetición y EPOC opcional.
- Intensidad por defecto según el material y, en la ficha de cada ejercicio, intensidad o MET propio.
- Cada ejercicio muestra sus kcal en cuanto marcas una serie (empieza el descanso); la cabecera de la sesión suma el total en vivo.
- Al finalizar la sesión aparece una ventana con las kcal totales y el desglose por ejercicio.
- Progreso → Calorías: semana, mes, media y mejor sesión, con gráfica por sesión, semana o mes. «Ejercicios» es desplegable.
- **Pesas, calistenia y core:** no dependen del reloj. Cada ejercicio tiene un MET según los músculos que mueve (piernas ≈ 7, pecho y espalda ≈ 6, hombro ≈ 5, aislamientos ≈ 3,6–4,5, gemelos ≈ 3,5, movilidad y suelo pélvico ≈ 1,5–2,5) que se ajusta por el RIR de cada serie (al fallo ×1,2; RIR 4 o más ×0,8) y se aplica a un tiempo teórico por serie (repeticiones × segundos por repetición + descanso de la ficha + 60 s de preparación). Cada ficha admite un MET propio.
- **Cardio:** si escribes las kcal de la máquina se usan tal cual; si no, se calcula con la velocidad (o la que sale de la distancia) y la inclinación, durante el tiempo del bloque.
- **Sesión:** la suma de sus ejercicios; la duración real no influye, así que esperar una máquina no suma gasto.
- **Ajuste personal (%)** en Perfil para calibrar contra tu reloj.
- Los datos viajan en las copias de seguridad. Es una estimación, no una medición.

**Cardio (categoría amarilla)**
- Seis máquinas: cinta de correr, elíptica, bicicleta estática, bicicleta reclinada, remo y escaleras (portadas `C-01.webp` … `C-06.webp`).
- Sus ejercicios se pueden añadir a cualquier sesión desde el selector de ejercicios (chip «Cardio»).
- Cada serie es un bloque de tiempo con el mismo cronómetro de las planchas, más velocidad (cinta, elíptica y bicicletas en km/h; remo en min/500 m; escaleras en pisos/min) e inclinación (solo cinta).
- Las kcal usan esos datos: ecuaciones ACSM en la cinta y curvas aproximadas del Compendio en el resto; sin velocidad se usa la intensidad por defecto. Se suman al total de la sesión como cualquier ejercicio.

**Datos**
- Copia de seguridad JSON (incluye imágenes y plantillas) y exportación CSV para Excel.
- Restauración segura: valida la copia antes de tocar nada, descarga antes tus datos actuales y, si algo falla, lo deja todo como estaba.
- Recordatorio periódico para hacer copia.
- Tema claro, oscuro o automático.

## Imágenes

Al subir una imagen se redimensiona automáticamente al tamaño mínimo necesario:

| Uso | Tamaño | Por qué |
|---|---|---|
| Imagen completa | 1080 px en el lado largo | Ancho físico de una pantalla de móvil típica a pantalla completa |
| Miniatura | 240 × 240 px, recortada al centro | Se muestra a ≤ 80 px en pantallas de densidad 3 |

Se guardan en WebP (JPEG si el navegador no lo admite). Una foto de 12 MP de varios MB queda normalmente por debajo de 200 KB. Nunca se amplía una imagen pequeña. Máximo 8 imágenes por ejercicio.

### Portadas numeradas

Cada ejercicio del catálogo tiene un número (01–98) en `data/covers.js`, el mismo que en la lista de ejercicios. Para ponerle portada basta con subir la imagen a:

```text
assets/exercises/img/NN.webp     (01.webp, 02.webp … 98.webp)
```

No hay que tocar ningún archivo más. Al abrirse, la app comprueba qué números existen en esa carpeta y los muestra como portada en la biblioteca, al elegir ejercicios y en la sesión; los que todavía no existen no se muestran (nunca sale una imagen rota). El resultado se recuerda, así que también se ven sin conexión. Si la app está abierta, vuelve a comprobarlo al volver a ella pasados 5 minutos.

- El nombre distingue mayúsculas: `05.webp`, no `05.WEBP` ni `5.webp`.
- Para cambiar una portada, sube otra con el mismo nombre. GitHub Pages puede tardar unos minutos en servir la nueva.
- La portada va siempre primero; las imágenes subidas desde la ficha se muestran después en la galería.
- Si escribes una ruta en «Otra ruta de imagen en el repositorio» de la ficha, sustituye a la portada numerada de ese ejercicio.
- Las consultas a los números que aún no existen aparecen como 404 en la consola del navegador: es normal.

## Vídeos animados

Cada ejercicio puede tener un vídeo corto que se abre en una ventana emergente desde la sesión. El sistema es el mismo que el de las portadas: se sube el archivo y aparece solo.

### Cómo añadir un vídeo

Sube el archivo a:

```text
assets/exercises/video/NN.mp4     (01.mp4, 02.mp4 … 98.mp4)
assets/exercises/video/C-NN.mp4   (C-01.mp4 … C-06.mp4, para cardio)
```

La numeración es **la misma que la de las portadas** (`data/covers.js` y la lista de ejercicios): el vídeo `02.mp4` es el del ejercicio 02, Aperturas / Pec Deck en máquina. No hay que tocar ningún otro archivo.

### Qué ve el usuario

- En la tarjeta del ejercicio, dentro de la sesión, aparece el botón **🎬 Vídeo** solo si ese ejercicio tiene su archivo. Los que no lo tienen no muestran nada (nunca hay un botón que lleve a un vídeo inexistente).
- Al pulsarlo se abre una ventana emergente con el vídeo en bucle, sin sonido, con controles y adaptado a la pantalla (también en vertical). Se cierra con ✕, tocando fuera de la ventana o con Escape.
- Si el vídeo no se puede cargar, la ventana muestra un aviso en lugar de un recuadro negro.
- Es independiente del botón **▶ Tutorial** (enlace de YouTube de la ficha): pueden convivir los dos.

### Cómo se detectan

- Al abrirse, la app pregunta con una petición `HEAD` (sin descargar el vídeo) qué números tienen archivo en `assets/exercises/video/`, igual que hace con las portadas.
- El resultado se guarda en el navegador (`gym.videoIndex`) y los botones se muestran u ocultan sin repintar la sesión, así que no se pierde nada de lo que estés escribiendo.
- La primera vez que subes un vídeo nuevo, el botón puede tardar unos segundos en aparecer. Se vuelve a comprobar al volver a la app pasados 5 minutos. Para forzarlo, cierra y abre la app.
- Las consultas a los vídeos que aún no existen aparecen como 404 en la consola del navegador: es normal.

### Recomendaciones para los archivos

- Formato **MP4 con vídeo H.264**: es el que reproducen todos los móviles y navegadores.
- Vertical (por ejemplo 720 × 1280) y de pocos segundos: un vídeo de 10 s a 720 × 1280 ocupa unos 3,6 MB.
- El nombre distingue mayúsculas y ceros: `05.mp4`, no `5.mp4` ni `05.MP4`.
- Para cambiar un vídeo, sube otro con el mismo nombre. GitHub Pages puede tardar unos minutos en servir el nuevo.
- Los vídeos **no se guardan para el modo sin conexión**: hace falta conexión para verlos. El resto de la app sigue funcionando sin ella.

## Estructura del código

| Archivo | Contenido |
|---|---|
| `data/exercises.js` | Catálogo base de ejercicios y grupos |
| `data/covers.js` | Número de cada ejercicio: sirve para su portada (`assets/exercises/img/NN.webp`) y su vídeo (`assets/exercises/video/NN.mp4`) |
| `js/util.js` | Utilidades, fechas, avisos y diálogos |
| `js/store.js` | Almacenamiento (localStorage + IndexedDB para imágenes) y detección de portadas y vídeos del repositorio |
| `js/images.js` | Redimensionado de imágenes |
| `js/logic.js` | Volumen, 1RM estimado, récords y sugerencias de progresión |
| `js/timer.js` | Temporizador de descanso, sonido, vibración, pantalla encendida |
| `js/charts.js` | Gráficas SVG |
| `js/backup.js` | Copias de seguridad, CSV y borrado |
| `js/views-train.js` | Calendario, selección, sesión (incluida la ventana de vídeo) e historial |
| `js/views-manage.js` | Progreso, ajustes, biblioteca y editor |
| `js/app.js` | Navegación, arranque y comprobación en segundo plano de portadas y vídeos |
| `sw.js` | Service worker (funcionamiento sin conexión) |

### Publicar cambios

Cuando modifiques archivos, sube la versión en dos sitios para que los móviles descarguen lo nuevo:
- `APP_VERSION` en `js/util.js`
- `CACHE` en `sw.js`

Si añades un archivo JS o CSS nuevo, inclúyelo también en la lista `ASSETS` de `sw.js`.

### Ejercicios del catálogo

No cambies los `id` de `data/exercises.js`: el historial los usa para enlazar sesiones. Si mueves un ejercicio de grupo, súbelo también a `CATALOG_MOVES` con un `CATALOG_VERSION` nuevo, para que las fichas que el usuario ya había editado se muevan igual. Los cinco ejercicios de abdomen y lumbar que estaban duplicados entre Tracción y Core están marcados como `archived`: ya no se ofrecen al crear sesiones, pero el historial antiguo que los usa sigue funcionando. «Rotación de torso en máquina» y «Crunch con disco en banco declinado» pasan a Core.

## Limitaciones conocidas

- **iPhone:** Safari no permite vibración. Las notificaciones solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o posterior).
- **Pantalla bloqueada:** el navegador puede pausar la página. El temporizador sigue contando bien y avisa al volver; para un aviso con la pantalla bloqueada, activa la notificación en Ajustes (mejor en Android).
- **Vídeos:** no se guardan para el modo sin conexión; sin internet el botón **🎬 Vídeo** sigue visible pero el vídeo no cargará (se muestra un aviso). Al ser archivos pesados, súbelos en MP4 corto y comprimido.
- **Almacenamiento:** Safari puede borrar los datos de webs que no se usan en varias semanas. Instalar la app en la pantalla de inicio lo evita; aun así, haz copias.

## Nota sobre ejercicios de suelo pélvico

Los ejercicios de Kegel se incluyen como opciones de control y fortalecimiento suave. No se recomienda practicarlos interrumpiendo el flujo de orina. Si hay dolor, tensión persistente, síntomas pélvicos o dificultad para relajar el suelo pélvico, conviene consultar con un profesional sanitario.

## Novedades 4.0

**Vídeos animados por ejercicio**
- Nuevo botón **🎬 Vídeo** en la tarjeta de cada ejercicio de la sesión, que abre el vídeo animado en una ventana emergente (bucle, sin sonido, con controles y adaptado a pantallas verticales).
- Nueva carpeta `assets/exercises/video/` para subir los vídeos: `01.mp4`, `02.mp4`… y `C-01.mp4`… para cardio. Misma numeración que las portadas.
- Detección automática: al subir un vídeo, su ejercicio muestra el botón sin tocar código ni listas. Los ejercicios sin vídeo no muestran nada.
- Primer vídeo incluido: **02 · Aperturas / Pec Deck en máquina** (`assets/exercises/video/02.mp4`).
- Si un vídeo no carga, aparece un aviso claro en lugar de una ventana vacía.
- El botón se muestra u oculta sin repintar la sesión, por lo que no interrumpe lo que estés anotando.

**Cambios técnicos**
- `js/store.js`: nuevas funciones `videoFile`, `videoPath`, `videoExists` y `probeVideos`, calcadas del sistema de portadas (índice guardado en `gym.videoIndex`).
- `js/views-train.js`: nuevas `openVideo` y `syncVideoButtons`, y botón en `exerciseCard`.
- `js/app.js`: `refreshCovers` también comprueba los vídeos.
- `css/app.css`: estilos de la ventana de vídeo.
- Versión de la app y de la caché del service worker subidas a 4.0.0 para que los móviles descarguen lo nuevo.
- Tus datos, sesiones e imágenes no cambian: no hace falta migración.

## Novedades 3.2

- Portadas automáticas: sube `assets/exercises/img/NN.webp` y aparece como portada del ejercicio número NN, sin tocar código.

## Novedades 3.1

**Catálogo reorganizado**
- Tracción queda para la espalda: Espalda (dorsales y espalda media), Trapecio, Deltoides posterior y Bíceps.
- Nueva zona **Glúteo y cadena posterior** en Pierna con las bisagras de cadera: peso muerto convencional, peso muerto rumano, buenos días, hiperextensiones a 45° y puente de glúteo. Femoral queda para los curls.
- Extensión lumbar en máquina sentada pasa a Core / Lumbar.
- Pájaros en máquina pasa de Empuje a Tracción / Deltoides posterior.
- 17 ejercicios nuevos de tracción, todos con instrucciones de técnica:
  - Espalda: jalón agarre neutro, jalón unilateral, remo unilateral en máquina, remo Pendlay, remo en T, remo en banco inclinado, pullover con mancuerna, dominadas agarre neutro, remo invertido.
  - Trapecio: encogimientos en máquina, con mancuernas y con barra; elevaciones en Y.
  - Deltoides posterior: face pull, cruces invertidos en polea, pájaros con mancuernas, aperturas con banda.
- Las sesiones antiguas no cambian: una sesión de Tracción con peso muerto sigue apareciendo igual en el historial y en el progreso.

## Novedades 3.0

**Corregido**
- El botón Atrás ya no deja una pantalla vacía («undefined») y el Atrás de Android vuelve a la pantalla anterior en lugar de cerrar la app.
- Restaurar una copia ya no puede borrar los datos si el archivo está dañado.
- El temporizador no se retrasa con la pantalla bloqueada, avisa con sonido y vibración, y no sigue contando oculto al cambiar de pantalla.
- «Borrar todos los datos» elimina también las imágenes.
- Ya no aparece «RIR NaN» en ejercicios sin RIR objetivo.
- Ya no aparecen miniaturas rotas ni botones de tutorial vacíos en ejercicios sin imagen o sin enlace.
- La fecha de «hoy» se actualiza si la app se queda abierta de un día para otro.
- Las imágenes ya no ocupan varios MB cada una.
- La app es instalable en Android (iconos en el manifiesto) y tiene icono en iOS.
- Se pide almacenamiento persistente para que el navegador no borre los datos.
- Eliminados 10 archivos que no se cargaban y daban error.
- El historial ya no se relee completo por cada ejercicio: la sesión abre al instante aunque tengas cientos de entrenamientos.
