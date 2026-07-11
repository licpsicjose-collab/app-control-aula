# CHANGELOG — Control de Aula V7

## [V7.0.0] — Primer cambio oficial sobre Version_7_Desarrollo

### Cambiado
- **Umbral de detección de salidas de la aplicación**: reducido de `45000` ms (45 segundos) a `5000` ms (5 segundos).

### Archivos afectados
- `panel-alumno.html`
  - Detector de evento `focus` (línea ~445).
  - Detector de evento `visibilitychange` (línea ~462).

### Archivos explícitamente NO modificados
- `panel-docente.html` — no contenía ninguna ocurrencia del valor `45000`; se verificó y se dejó intacto.
- `Version_6_Congelada/` — se conserva como respaldo sin ningún cambio. Todo el trabajo de esta versión se realizó exclusivamente sobre `Version_7_Desarrollo/`.

### Alcance del cambio
Se localizaron y reemplazaron **únicamente** las dos ocurrencias del valor `45000` presentes en los detectores de salida (`window.addEventListener("focus", ...)` y `document.addEventListener("visibilitychange", ...)`). No se modificó ninguna otra función, campo, colección, evento, temporizador o consulta. Verificado mediante `diff` línea por línea contra `Version_6_Congelada`.

---

## Justificación pedagógica

El umbral de 45 segundos fue diseñado originalmente como una **tolerancia amplia** para evitar que interrupciones breves e involuntarias (una notificación, un cambio accidental de pantalla, un vistazo rápido a otra ventana) se registraran como una salida real de atención. Esa tolerancia priorizaba evitar falsos positivos sobre la sensibilidad de detección.

La reducción a 5 segundos responde a un cambio de criterio pedagógico: **45 segundos es tiempo suficiente para que un alumno revise varios mensajes, responda una conversación corta o navegue en otra aplicación sin que el sistema lo registre**, lo cual diluye el valor del indicador de atención como señal confiable para el docente. Un umbral de 5 segundos:

- Distingue con mayor precisión entre una interrupción verdaderamente momentánea (por ejemplo, un parpadeo de pantalla al recibir una llamada) y una salida intencional de la aplicación.
- Da al docente una métrica de permanencia neta y de conteo de salidas que refleja de forma más fiel el comportamiento real de atención durante la clase.
- Refuerza el propósito original del "Modo de Atención Activo": que el alumno permanezca genuinamente enfocado en la pantalla de la clase, no solo técnicamente conectado.

### Riesgo conocido de este cambio
Un umbral más estricto incrementa la probabilidad de registrar salidas por eventos verdaderamente accidentales y de muy corta duración (por ejemplo, ciertos gestos del sistema operativo que disparan brevemente `visibilitychange` sin que el alumno haya salido realmente de la app). Se recomienda observar el comportamiento en aula durante la primera semana de uso de V7 y evaluar si 5 segundos es el punto de equilibrio correcto, o si conviene ajustar a un valor intermedio en una futura versión.

### Estado
Cambio aplicado sobre `Version_7_Desarrollo`. Pendiente de validación en aula antes de considerar su congelación como V7 definitiva.
