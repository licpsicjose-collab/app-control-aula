# CHANGELOG — Control de Aula V8

## [V8.4.0] — Implementación de captura de métricas de negocio

### Contexto
Implementa la arquitectura **corregida** tras la auditoría técnica previa (que rechazó la propuesta original por dos riesgos de escalabilidad: un array sin límite de crecimiento y un contador compartido con riesgo de contención). Esta entrada implementa exclusivamente la versión aprobada.

### Agregado — `panel-docente.html`
- `registrarMetricaInicioClase()` — en `iniciarClase()`. Vía transacción sobre `metricas_docentes/{docenteUid}`: fija `primerUso` una sola vez (si el documento no existe), y siempre actualiza `escuela`, `ultimaActividad`, `ultimaClaseEn`, e incrementa `totalClases`.
- `registrarMetricaFinClase()` — en `finalizarClase()`. Actualiza `ultimaActividad` y agrega el grupo de la clase a `gruposVistos` (array, `arrayUnion`); registra cada alumno de la clase en la subcolección `metricas_docentes/{docenteUid}/alumnosVistos/{alumnoId}` (no como array — decisión de la auditoría, para no hacer crecer el documento principal).
- `docenteId` agregado a cada documento de alumno archivado en `historial/{id}/alumnos/{id}` (mismo write ya existente, sin costo adicional), para permitir en el futuro consultar "alumnos de este docente" sin escanear todo `historial`.
- `registrarMetricaOnboardingDocente()` — en `omitirRecorrido()`/`finalizarRecorrido()`. Escribe `onboardingDocente` (`"completado"`/`"omitido"`) y, si aplica, `onboardingDocentePasoOmitido`, una sola vez por docente (gateado por el propio `localStorage.tutorialVisto` ya existente — relanzar el tour manualmente nunca vuelve a escribir esto).

### Agregado — `panel-alumno.html`
- `registrarMetricaOnboardingAlumno()` — en `omitirGuiaAlumno()`/`finalizarGuiaAlumno()`. Crea un documento **independiente** (`db.collection("onboarding_alumno_eventos").add(...)`) con `tipo`, `paso`, `timestamp` — nunca un contador compartido, eliminando por completo el riesgo de contención de escritura identificado en la auditoría. Gateado por `localStorage.tutorialAlumnoVisto`, una sola vez por navegador de alumno.
- **Nota de hallazgo:** esta instrumentación no existía en un primer repaso del archivo (solo se había completado en `panel-docente.html`); se detectó y corrigió durante la verificación previa a esta entrega.

### Agregado — `firestore.rules`
- `metricas_docentes/{docenteUid}` — lectura/escritura exclusiva del propio docente autenticado, esquema cerrado de campos.
- `metricas_docentes/{docenteUid}/alumnosVistos/{alumnoId}` — misma restricción de dueño.
- `onboarding_alumno_eventos/{eventoId}` — creación pública (el alumno no se autentica), sin lectura desde el cliente, sin edición ni borrado, esquema cerrado de 3 campos y `tipo` restringido a dos valores enumerados.
- **Corrección propia detectada durante la implementación:** el diff propuesto en la auditoría anterior (`match /metricas_globales/onboarding_alumno_eventos/{eventoId}`) tenía una estructura de rutas inválida (le faltaba el nombre de una subcolección real entre el documento fijo y el ID del evento). Se corrigió como colección de nivel superior (`onboarding_alumno_eventos/{eventoId}`), más simple y sin el problema.

### NO implementado (explícitamente fuera de alcance)
- `panel-admin.html` — no se construyó, según instrucción.
- Sistema de pagos, Mercado Pago, Stripe, métricas de monetización reales, BigQuery.
- El array `alumnosVistos` y el contador compartido de onboarding de alumno — descartados por la auditoría de arquitectura antes de implementar.

### Archivos modificados
- `panel-docente.html`
- `panel-alumno.html`
- `firestore.rules`

### Impacto estimado en lecturas, escrituras y almacenamiento
Sobre la base ya calculada en la auditoría de almacenamiento previa (~3,116 lecturas / 1,569 escrituras por clase de 30 alumnos):

| Concepto | Adicional por clase | Nota |
|---|---|---|
| Lecturas | +1 (transacción de `iniciarClase`) | Insignificante (~0.03%) |
| Escrituras | +2 (transacción + `finalizarClase`) + ~30 (subcolección `alumnosVistos`, una por alumno, no deduplicadas en la escritura) | ~2% adicional por la subcolección; el resto es insignificante |
| Escrituras únicas (no recurrentes) | +1 por docente (onboarding docente), +1 por navegador de alumno (onboarding alumno) | Costo total, no mensual — insignificante en cualquier escala |
| Almacenamiento | Un documento pequeño por docente (`metricas_docentes`) + un documento diminuto por alumno distinto histórico (`alumnosVistos`) + un documento pequeño por evento de onboarding de alumno (`onboarding_alumno_eventos`, crece indefinidamente pero a bajo volumen) | Marginal en las tres escalas auditadas (100/500/5,000 docentes); ver riesgo pendiente sobre `onboarding_alumno_eventos` abajo |

**Costo adicional estimado, sumado al ya calculado:** +$0.01/mes (100 docentes), +$0.03/mes (500), +$0.30/mes (5,000) — imperceptible frente al costo ya dominante (respaldo periódico del alumno cada 60 segundos).

### Riesgos pendientes
1. **`onboarding_alumno_eventos` crece indefinidamente sin ningún mecanismo de purga**, igual que `historial`. A bajo volumen (un evento por alumno nuevo, no recurrente) esto no es un problema a las escalas auditadas, pero es el mismo patrón de "crecimiento sin techo" ya señalado para `historial` — mismo tipo de decisión de retención pendiente (ver recomendación abajo).
2. **El gate de "solo una vez" depende de `localStorage`** en ambos onboardings — un docente/alumno que borre datos del navegador puede generar un evento o una escritura de métrica duplicada. Riesgo de exactitud, no de seguridad.
3. **La subcolección `alumnosVistos` no deduplica en la escritura** (se sobreescribe el mismo documento si el alumno ya existía, lo cual es correcto y barato), pero si un mismo alumno real tiene múltiples IDs por typos de nombre (limitación ya documentada desde la auditoría de seguridad), el conteo de "alumnos distintos" seguirá inflado por esa causa raíz, no por este diseño de métricas en sí.
4. **Nada de esto es consultable todavía sin un panel-admin autenticado** — todas las reglas de lectura de las colecciones nuevas son `if false` o restringidas al propio docente; construir la agregación real (sumas, conteos vía `count()`) es trabajo pendiente, explícitamente fuera de esta entrega.

### Recomendaciones para V8.5
1. Construir `panel-admin.html` (ahora que la captura de datos ya existe) para poder finalmente leer y agregar `metricas_docentes`, `alumnosVistos` (vía `count()`) y `onboarding_alumno_eventos`.
2. Definir y aplicar una política de retención para `historial` **y** para `onboarding_alumno_eventos` (ver recomendación de retención abajo) antes de que el crecimiento sin techo de ambas colecciones se vuelva un problema real.
3. Evaluar si vale la pena instrumentar la métrica 3.4 de `METRICAS_NEGOCIO.md` (uso real de funciones, no solo estado final), que quedó pendiente por requerir un registro de eventos más amplio que el implementado aquí.

### Compatibilidad con V8.3.1
Confirmado mediante `diff`: `panel-docente.html` y `panel-alumno.html` conservan intactas todas las funciones de V8.3.1 (doble código, `activarRetardo()`, sensibilidad configurable, los 10 pasos del onboarding docente, los 5 pasos del onboarding alumno). `firestore.rules` conserva sin cambios el campo `'sensibilidad'` ya autorizado; el diff de esta entrega es puramente aditivo. `login.html`, `index.html` y los 3 manifests no se tocaron.

---

## [V8.3.1] — Revisión de implementación: restaurar dos códigos, cancelar retardo automático

### Contexto de la revisión
Retroalimentación de uso real reveló que el sistema de dos códigos (Normal/Retardo) no es solo una marca de tardanza: es un **mecanismo anti-suplantación** que evita que un alumno ausente al inicio de la clase obtenga el código normal por un compañero (WhatsApp, redes sociales, etc.) después de iniciada la sesión, y se registre como si hubiera asistido desde el principio. El "retardo automático por tiempo" de la entrega V8.3.0 anterior eliminaba esta protección (un código único, válido para cualquiera en cualquier momento, no distingue entre "llegó tarde honestamente" y "obtuvo el código de un compañero"). El problema real reportado por los docentes no era la existencia de los dos códigos, sino la falta de claridad sobre para qué sirve cada uno — es decir, un problema de **onboarding**, no de lógica de negocio.

### Cancelado (revertido de V8.3.0)
- El **código único de acceso** — se restauran `codigoInicial` y `codigoRetardo` como dos campos distintos.
- El **retardo automático basado en tiempo** (`duracionEntradaNormal`, el selector "Tiempo de entrada normal", el indicador 🟢/🟠 con cuenta regresiva, y la función `actualizarIndicadorEntradaNormal()`) — eliminados por completo, sin dejar rastro en el código (verificado con `grep` en todo el proyecto).
- Se restauró `activarRetardo()` y el botón "Activar Retardo", y el manejo de `modo` en `actualizarUIModoYPausa()` y `verificarClaseActiva()`.
- Se restauró en `panel-alumno.html` la validación dual (`modoActual === "retardo" ? codigoRetardo : codigoInicial`) y el cálculo de `retardoManual` según qué código se usó (no según tiempo transcurrido).

### Conservado de V8.3.0
- **Sensibilidad de detección configurable por clase** (Alta=3s / Normal=5s, predeterminado / Baja=10s): selector en el formulario de creación de clase, campo `sensibilidad` en el documento de la clase, y `obtenerUmbralSalida()` en `panel-alumno.html` traduciéndolo a milisegundos en los dos detectores de salida. Sin cambios respecto a la entrega anterior.

### Agregado — Mejora de onboarding docente (en vez de cambiar la lógica)
Dos pasos nuevos insertados en `pasosRecorrido[]`, inmediatamente después de "Iniciar Clase" (el tour pasa de 8 a **10 pasos**):

1. **"¿Por qué existen dos códigos?"** (resalta `#linea-codigos`) — explica el propósito de cada código y el beneficio anti-suplantación, con el texto exacto solicitado.
2. **"¿Cuándo utilizar el modo retardo?"** (resalta `#btn-activar-retardo`) — explica cuándo usarlo y qué ocurre con el alumno que entra por esa vía, con el texto exacto solicitado.

Se cambió `tour-mensaje` de `innerText` a `innerHTML` para poder dar formato (negritas, saltos de línea) a estos dos pasos más extensos; es contenido fijo escrito por el desarrollador, no datos capturados de ningún usuario, por lo que no aplica ninguna consideración de sanitización adicional a las ya vigentes desde V7.3.

### firestore.rules — único ajuste autorizado
Se agregó **exclusivamente** `'sensibilidad'` a la lista `hasOnly([...])` de `clases/{docenteUid}`. `codigoRetardo` y `modo` ya estaban permitidos desde antes (nunca se habían quitado de las reglas, ya que en la entrega V8.3.0 no se había tocado este archivo). `duracionEntradaNormal` **no** se agregó, conforme a la instrucción ("la automatización del retardo deja de ser un requisito"). Verificado con `diff`: el cambio es de una línea de comentario y una palabra agregada a un arreglo, balance de llaves confirmado (15/15).

### Archivos modificados
- `panel-docente.html` — reversión de la caja de códigos, `verificarClaseActiva()`, `actualizarUIModoYPausa()`, restauración de `activarRetardo()`, reversión de `iniciarClase()`, y los 2 pasos nuevos de onboarding.
- `panel-alumno.html` — reversión de la validación en `entrar()` y del cálculo de `retardoManual`. `obtenerUmbralSalida()` sin cambios.
- `firestore.rules` — una línea agregada a `hasOnly`, según autorización explícita.

### Validación
- Sintaxis JavaScript de ambos archivos HTML verificada sin errores tras la reversión.
- `grep` en todo el proyecto confirma cero referencias remanentes a `duracionEntradaNormal` fuera de este changelog (registro histórico).
- Confirmado que `obtenerUmbralSalida()` y el selector de sensibilidad permanecen intactos.
- Confirmado que `pasosRecorrido[]` pasó de 8 a 10 elementos exactamente por los 2 pasos agregados.
- `diff` contra `Version_7_4_Estable` en `login.html`, `index.html` y los 3 manifests: cero diferencias.
- `firestore.rules`: balance de llaves 15/15, `diff` confirma un único campo agregado.

### Compatibilidad con V7.4
- `Version_6_Congelada`, `Version_7_3_Estable`, `Version_7_4_Estable`: no se tocaron.
- El sistema de dos códigos vuelve a comportarse exactamente como en V7.4/V8.0-V8.2; la única diferencia funcional neta de todo el ciclo V8.3 es la sensibilidad configurable, más un onboarding docente más completo (10 pasos en vez de 8).

---

## [V8.2.0] — Onboarding interactivo para alumnos

### Agregado
- **Guía interactiva de 5 pasos** en `panel-alumno.html`, con overlay oscuro y tarjeta centrada tematizada en oscuro (a diferencia del tour docente, ningún paso resalta un elemento específico de la interfaz, según la especificación).
- Persistencia en `localStorage` bajo la clave `tutorialAlumnoVisto` — independiente de `sesion_clase_activa` (recuperación de sesión) y de `tutorialVisto` (onboarding docente); no interfiere con ninguna de las dos.
- Enlace permanente **"❓ Ver guía nuevamente"** dentro del formulario de entrada del alumno, que relanza la guía bajo demanda sin alterar `tutorialAlumnoVisto`.
- Controles Siguiente / Anterior / Omitir / Finalizar, igual que el tour docente.
- Todos los mensajes son contenido fijo definido en el código (`mensajeHTML` en `pasosGuiaAlumno[]`), no provienen de ningún dato capturado por el usuario.

### Los 5 pasos (contenido exacto a la especificación)
1. 👋 Bienvenido a Control de Aula — propósito de la herramienta.
2. 🔒 Privacidad y funcionamiento — lista de 8 puntos de "no acceso/no modificación".
3. 📚 Uso académico del dispositivo — aclara que no es una herramienta de vigilancia.
4. 📝 Datos para ingresar — los 4 datos necesarios (Código Docente, Nombre, Grupo, Código de Acceso).
5. ✅ Todo listo — cierre, mencionando la recuperación automática de sesión ya existente.

### Diseño: sin necesidad de "spotlight"
A diferencia del onboarding docente, ningún paso de la guía del alumno resalta un elemento específico de la interfaz — los 5 pasos son puramente informativos. Por eso esta guía no incluye la lógica de spotlight/recorte de overlay del onboarding docente; solo overlay + tarjeta centrada, más simple y con menor huella de código. Esto se debe a que, en el momento en que un alumno ve esta guía (justo al cargar la pantalla de entrada), el único elemento interactivo disponible es el propio formulario de conexión.

### Cuándo se dispara
- Automáticamente 500ms después de cargar la pantalla de entrada, solo si `tutorialAlumnoVisto` no es `"true"` — igual de no-invasivo que el disparo del tour docente (700ms tras confirmar autenticación).
- Manualmente, en cualquier momento, desde el enlace "❓ Ver guía nuevamente" en el propio formulario.

### Explícitamente NO modificado
- Firebase, Firestore, `firestore.rules`, recuperación de contraseña, participaciones, evaluaciones, historial, exportación.
- Ninguna función de negocio del alumno (`entrar`, `comprobarSesionExistente`, `escucharClaseMaestro`, `escucharEstrellasTiempoReal`, `reportarAFirebase`, detección de salidas, `textoEvaluacion`, mitigación XSS ya integrada en V7.3).
- El onboarding docente (V8.0/V8.1) — confirmado sin cambios en `panel-docente.html` durante esta entrada.

### Archivos modificados
- `panel-alumno.html` — único archivo tocado. `diff` contra `Version_7_4_Estable` confirma **cero líneas eliminadas o modificadas** del código original; todo el contenido agregado es aditivo.

### Validación
- Sintaxis JavaScript verificada sin errores.
- Balance de llaves y paréntesis verificado (99/99, 208/208).
- `diff` línea por línea contra `Version_7_4_Estable/panel-alumno.html`: cero líneas eliminadas o modificadas, solo adiciones.
- Compatible con dispositivos móviles: tarjeta con `max-width: min(360px, 90vw)` y `max-height: 85vh` con scroll interno para el contenido más largo (Paso 2).

### Compatibilidad con V7.4
- `Version_6_Congelada`, `Version_7_3_Estable`, `Version_7_4_Estable`: no se tocaron.
- El onboarding docente (V8.0/V8.1) y todas las mejoras previas del lado del alumno permanecen funcionando exactamente igual.

---

## [V8.1.0] — Pantalla de privacidad y funcionamiento (previa al Paso 1 del onboarding docente)

### Agregado
- Nueva pantalla introductoria **"🔒 Privacidad y Funcionamiento"**, mostrada antes del Paso 1 del recorrido docente ya existente, con el texto exacto solicitado (propósito académico, lista de 8 puntos de "no acceso/no modificación", y aclaración de que no es una herramienta de vigilancia).
- Un único botón **"Continuar"** que cierra esta pantalla e inicia el recorrido normal de 8 pasos, sin alterarlo.

### Cómo se integró (sin tocar el tour ya implementado)
- `iniciarRecorrido(forzado)` ahora llama a `mostrarPantallaPrivacidad()` en vez de saltar directo al Paso 1. Es el único cambio de comportamiento en una función ya existente, y es estrictamente un cambio de secuencia (qué se muestra primero), no de lógica interna.
- `pasosRecorrido[]`, `mostrarPasoRecorrido()`, `siguientePasoRecorrido()`, `pasoAnteriorRecorrido()`, `omitirRecorrido()`, `finalizarRecorrido()`: **sin ningún cambio**. El Paso 1 sigue siendo exactamente el mismo Paso 1 de la versión anterior.
- La pantalla de privacidad se muestra en ambos puntos de entrada del tour (disparo automático la primera vez, y el botón "❓ Ver recorrido nuevamente").

### Validación
- Sintaxis JavaScript verificada sin errores tras el cambio.
- Confirmado que `pasosRecorrido[]` conserva sus 8 pasos, sin alteración.
- `diff` contra la entrega anterior de V8 muestra únicamente adiciones; la única línea marcada como "eliminada" (`pasoActualRecorrido = 0;`) en realidad fue reubicada a `continuarDesdePrivacidad()`, no borrada.

---

## [V8.0.0] — Onboarding interactivo para docentes

### Contexto de versionado
- `Version_7_4_Estable` se congeló como copia de solo lectura (permisos 444/555) del contenido final de V7.4.
- `Version_8_Desarrollo` se creó a partir de esa copia; todo el trabajo de esta entrada ocurrió exclusivamente ahí.

### Agregado
- **Recorrido interactivo de 8 pasos** en `panel-docente.html`, con overlay oscuro, "spotlight" (recorte) alrededor del elemento resaltado, y tarjeta de mensaje con controles Anterior / Siguiente / Omitir tutorial / Finalizar.
- Persistencia en `localStorage` bajo la clave `tutorialVisto` (independiente de `config_docente_previa`, que ya usaba la app) — el recorrido se autoejecuta únicamente si esa clave no es `"true"`.
- Botón permanente **"❓ Ver recorrido nuevamente"** en el encabezado del panel, que relanza el tour bajo demanda sin alterar el estado de `tutorialVisto`.
- `id="btn-exportar-csv"` agregado al botón de exportación existente (única adición de atributo; no cambia su comportamiento), necesario para poder resaltarlo durante el paso 7.

### Pasos implementados (exactos a la especificación)
1. Bienvenida a Control de Aula.
2. Código Docente → resalta `#txt-codigo-maestro`.
3. Iniciar Clase → resalta `#btn-control-clase`.
4. Panel de alumnos → resalta `#contenedor-alumnos`.
5. Participaciones → resalta dinámicamente `.acciones-alumno` del primer alumno conectado, si existe.
6. Evaluaciones → mismo contenedor dinámico que el paso 5, mensaje distinto.
7. Exportar CSV → resalta `#btn-exportar-csv`.
8. Mensaje final de cierre.

### Decisión de diseño importante: elementos no visibles en el primer acceso
Varios elementos de los pasos 2, 4, 5, 6 y 7 viven dentro de `#zona-codigos`, que permanece `display:none` hasta que el docente inicia su primera clase. En vez de forzar el inicio de una clase o modificar esa lógica, se implementó un modo de **respaldo (fallback) seguro**: si el elemento objetivo de un paso no está actualmente visible (`offsetParent === null`), ese paso se muestra igual, como una tarjeta centrada sin recorte de overlay, en vez de intentar resaltar algo invisible o romper el recorrido.

### Explícitamente NO modificado (en esta entrada original)
- Firebase, Firestore, `firestore.rules`, autenticación.
- Ninguna función de negocio.
- `login.html`, `panel-alumno.html`, `index.html`, los 3 manifests, `firestore.rules`.

### Archivos modificados
- `panel-docente.html` — único archivo tocado. `diff` contra `Version_7_4_Estable` mostró exclusivamente: (a) el HTML/CSS/JS del onboarding agregado, (b) el `<div id="info-usuario">` envuelto en un contenedor flex para alojar el nuevo botón de recorrido, y (c) un atributo `id` agregado al botón de exportar ya existente.

### Validación
- Sintaxis JavaScript verificada sin errores.
- Balance de llaves y paréntesis verificado (178/178, 336/336).
- Compatible con dispositivos móviles: la tarjeta usa `max-width: min(340px, 90vw)`, y el spotlight se reposiciona automáticamente en el evento `resize` (rotación de pantalla).
- Sin impacto de rendimiento: motor JavaScript vanilla sin dependencias externas.

### Compatibilidad con V7.4
- `Version_6_Congelada`, `Version_7_3_Estable`, `Version_7_4_Estable`: no se tocaron.
- Todas las mejoras previas permanecen funcionando exactamente igual.
