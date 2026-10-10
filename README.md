# Rutina Gym 3.1

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
assets/
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

**Progreso**
- Volumen semanal de las últimas 12 semanas, sesiones por grupo y duración media.
- Evolución de cada ejercicio: 1RM estimado (Epley), peso máximo, volumen o repeticiones máximas.

**Biblioteca**
- Ficha por ejercicio con varias imágenes, vídeo de YouTube (se reproduce dentro de la app), enlace, instrucciones, notas, objetivos de reps y RIR, descanso e incremento de peso.
- Ejercicios personalizados.

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

También puedes poner una imagen en `assets/exercises/` y escribir su ruta en la ficha (por ejemplo `assets/exercises/press-banca.webp`). Se usa si el ejercicio no tiene imágenes subidas y viaja con el repositorio.

## Estructura del código

| Archivo | Contenido |
|---|---|
| `data/exercises.js` | Catálogo base de ejercicios y grupos |
| `js/util.js` | Utilidades, fechas, avisos y diálogos |
| `js/store.js` | Almacenamiento (localStorage + IndexedDB para imágenes) |
| `js/images.js` | Redimensionado de imágenes |
| `js/logic.js` | Volumen, 1RM estimado, récords y sugerencias de progresión |
| `js/timer.js` | Temporizador de descanso, sonido, vibración, pantalla encendida |
| `js/charts.js` | Gráficas SVG |
| `js/backup.js` | Copias de seguridad, CSV y borrado |
| `js/views-train.js` | Calendario, selección, sesión e historial |
| `js/views-manage.js` | Progreso, ajustes, biblioteca y editor |
| `js/app.js` | Navegación y arranque |
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
- **Almacenamiento:** Safari puede borrar los datos de webs que no se usan en varias semanas. Instalar la app en la pantalla de inicio lo evita; aun así, haz copias.

## Nota sobre ejercicios de suelo pélvico

Los ejercicios de Kegel se incluyen como opciones de control y fortalecimiento suave. No se recomienda practicarlos interrumpiendo el flujo de orina. Si hay dolor, tensión persistente, síntomas pélvicos o dificultad para relajar el suelo pélvico, conviene consultar con un profesional sanitario.

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
