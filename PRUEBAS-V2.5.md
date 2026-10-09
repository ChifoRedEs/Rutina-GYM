# Informe de pruebas — Rutina Gym V2.5

Pruebas ejecutadas sobre una copia local de la aplicación en Chromium headless, con almacenamiento local simulado para aislar los datos de prueba.

| Prueba | Resultado |
|---|---|
| Carga inicial y calendario | Correcto |
| Selección de grupo Core | 24 ejercicios visibles |
| Crear y abrir sesión | Correcto |
| Registro de peso, repeticiones y RIR | Correcto |
| Marcar series y actualizar progreso/volumen | Correcto |
| Añadir serie | Correcto |
| Quitar serie con confirmación | Correcto |
| Abrir y cerrar evolución del ejercicio | Correcto |
| Mantener series completadas al editar selección | Correcto |
| Finalizar sesión | Correcto |
| Repetir última sesión copiando los valores y dejando las series sin completar | Correcto |
| Historial | Correcto |
| Biblioteca y formulario de edición | Correcto |
| Crear ejercicio personalizado con enlace tutorial | Correcto |
| Pantalla Progreso y KPIs | Correcto |
| Acceso a copia JSON | Correcto |
| Sugerencia de aumento de carga al alcanzar el objetivo de repeticiones/RIR | Correcto |
| Errores JavaScript detectados por el navegador durante el flujo probado | 0 |

Además se ha ejecutado `node --check` sobre `js/app.js`, `data/exercises.js` y `sw.js`.

## Alcance y limitaciones

Las pruebas automatizadas cubren los flujos principales descritos en la tabla, no todos los dispositivos, navegadores, permisos de almacenamiento ni todos los casos posibles. Las imágenes cargadas desde archivos se almacenan en el navegador y requieren pruebas manuales adicionales en el dispositivo real para verificar permisos y cuotas.
