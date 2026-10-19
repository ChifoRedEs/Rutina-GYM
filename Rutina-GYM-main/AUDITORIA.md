# Auditoría técnica — Rutina Gym

## Cambios incluidos

### 1. Tipo de serie configurable por ejercicio
En el editor de ejercicios se ha añadido el selector:
- **Serie de Peso (kg, reps, RIR)**
- **Serie de Tiempo (temporizador)**

Al seleccionar tiempo, se ocultan los objetivos de repeticiones, RIR y progresión de peso. El descanso entre series permanece disponible. La selección se guarda en la ficha del ejercicio.

### 2. Ejercicios configurados como series de tiempo
Se ha asignado `tracking: "time"` a estos diez ejercicios:
- Plancha frontal
- Plancha lateral
- Hollow Body Hold
- Puente de glúteos
- Retroversión pélvica tumbado
- Kegel: contracciones lentas
- Kegel: contracciones rápidas
- Kegel: contracción escalonada
- Respiración diafragmática y relajación pélvica
- Clamshell

En estos ejercicios, cada serie muestra su propio contador en minutos y segundos, con botones Iniciar/Parar y un control para marcar la serie como completada. No se renderizan los campos de kg, reps ni RIR. El tiempo queda guardado por serie.

### 3. Copiar una sesión a otra fecha
En el menú de opciones de una sesión se incluye **Copiar en otra fecha**. Se valida la fecha de destino (`AAAA-MM-DD`) y se crea una sesión nueva, sin modificar la original ni marcar las series como completadas.

### 4. Compatibilidad y caché
- Las series guardan la duración en segundos.
- La selección de tipo de serie tiene prioridad sobre la detección automática por nombre.
- Se ha actualizado la versión de caché del service worker para que los navegadores instalen los archivos nuevos.

## Comprobaciones realizadas
- `node --check` ejecutado en todos los archivos JavaScript de `js/`, `data/` y `sw.js`: sin errores de sintaxis.
- Catálogo de ejercicios analizado como JSON: 103 ejercicios; los diez nombres anteriores figuran con `tracking: "time"`.
- Archivo ZIP comprobado por integridad tras generarse.

## Límites
No se ha podido completar una batería automatizada de interacción real en navegador (E2E). Por tanto, las comprobaciones confirman sintaxis, estructura de catálogo e inclusión de cambios, pero no permiten garantizar ausencia absoluta de cualquier error funcional o de código sin usar.
