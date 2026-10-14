# Actualización del temporizador de series de tiempo

## Cambios
- Las series de tiempo ahora incluyen un campo editable **Tiempo deseado** en formato `MM:SS` (por ejemplo, `00:30` o `01:15`).
- Al pulsar **Iniciar**, el contador desciende desde el tiempo deseado hasta `00:00`.
- Al llegar a cero, se detiene automáticamente, marca la serie como completada, guarda los cambios y activa la señal sonora/descanso automático según los ajustes de la app.
- **Parar** pausa la cuenta; **Continuar** retoma el tiempo restante.
- Al modificar el tiempo objetivo antes de iniciar, la app valida el formato y ajusta el tiempo transcurrido para no superar el objetivo.
- Las nuevas series empiezan con un objetivo de 30 segundos, editable en cada serie.
- Se conserva la selección de tipo de serie para los diez ejercicios temporizados y para ejercicios personalizados configurados como tiempo.
- Migración de sesiones antiguas: los registros del cronómetro ascendente anterior no se interpretan como duración objetivo; las series ya completadas se mantienen completadas.
- Service worker actualizado a `rutina-gym-v3.5.0` para invalidar la caché anterior.

## Validaciones ejecutadas
- Comprobación de sintaxis con `node --check` para `js/views-train.js`, `js/store.js` y `sw.js`.
- Verificación estática de que el campo de objetivo, la función de parseo `MM:SS`, la cuenta regresiva, la parada automática y el guardado están presentes.
- Integridad del ZIP comprobada tras empaquetar.

## Límite
No se ha ejecutado una batería completa de pruebas end-to-end en un navegador real; las comprobaciones son de sintaxis y estructura.
