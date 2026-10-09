# Rutina Gym V2.4

Aplicación web estática para gestionar entrenamientos desde móvil o PC.

## Novedades V2.4

- Nuevo diseño claro, colorido y de bajo contraste agresivo para reducir fatiga visual.
- Colores diferenciados para Empuje, Tracción, Pierna y Core.
- Calendario mensual como pantalla inicial.
- Nuevo grupo **Core**.
- 24 ejercicios Core incluidos, organizados en:
  - Abdomen
  - Lumbar
  - Pelvis / suelo pélvico
  - Estabilidad
- Incluye variantes de trabajo abdominal, lumbar, estabilidad pélvica y ejercicios básicos de suelo pélvico/Kegel.
- Registro por series de peso, repeticiones, RIR y estado completado.
- Temporizador de descanso.
- Historial y progreso.
- Biblioteca de ejercicios con imagen, YouTube, enlaces, instrucciones y objetivos.
- Copias de seguridad JSON y exportación CSV.
- PWA con Service Worker versionado.

## Despliegue en GitHub Pages

Sube **todo el contenido de este ZIP** a la raíz del repositorio manteniendo las carpetas:

```text
index.html
manifest.json
sw.js
css/
js/
data/
assets/
```

No es necesario Node, npm ni ningún backend.

## Imágenes

Las imágenes cargadas desde Ajustes se guardan localmente en el navegador mediante IndexedDB. Si quieres que una imagen forme parte permanente del repositorio, colócala en `assets/exercises/` y asigna su ruta en la ficha del ejercicio.

## Datos

Los entrenamientos y personalizaciones se almacenan localmente en el navegador. Utiliza **Ajustes → Copia JSON** para guardar una copia antes de cambiar de dispositivo o navegador.

## Nota sobre ejercicios de suelo pélvico

Los ejercicios de Kegel se incluyen como opciones de control y fortalecimiento suave. No se recomienda practicar Kegel interrumpiendo el flujo de orina. Si existe dolor, tensión persistente, síntomas pélvicos o dificultad para relajar el suelo pélvico, conviene consultar con un profesional sanitario.
