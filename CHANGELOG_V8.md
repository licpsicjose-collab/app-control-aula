# CHANGELOG — Control de Aula V8

## [V8.2.0] — Onboarding interactivo para alumnos

### Agregado
- **Guía interactiva de 5 pasos** en `panel-alumno.html`, con overlay oscuro y tarjeta centrada (a diferencia del tour docente, ningún paso resalta un elemento específico de la interfaz, según la especificación).
- Persistencia en `localStorage` bajo la clave `tutorialAlumnoVisto` — independiente de `sesion_clase_activa` (recuperación de sesión) y de `tutorialVisto` (onboarding docente); no interfiere con ninguna de las dos.
- Enlace permanente **"❓ Ver guía nuevamente"** dentro del formulario de entrada del alumno, que relanza la guía bajo demanda sin alterar `tutorialAlumnoVisto`.
- Controles Siguiente / Anterior / Omitir / Finalizar, igual que el tour docente.

### Los 5 pasos (contenido exacto a la especificación)
1. 👋 Bienvenido a Control de Aula — propósito de la herramienta.
2. 🔒 Privacidad y funcionamiento — lista de 8 puntos de "no acceso/no modificación".
3. 📚 Uso académico del dispositivo — aclara que no es una herramienta de vigilancia.
4. 📝 Datos para ingresar — los 4 datos necesarios (Código Docente, Nombre, Grupo, Código de Acceso).
5. ✅ Todo listo — cierre, mencionando la recuperación automática de sesión ya existente.

### Explicación de cada paso
Los 5 pasos son puramente informativos (mensaje + lista, sin necesidad de señalar ningún elemento de la pantalla), a diferencia del tour docente que sí resalta elementos reales del panel. Esto se debe a que, en el momento en que un alumno ve esta guía (justo al cargar la pantalla de entrada), el único elemento interactivo disponible es el propio formulario de conexión — no hay paneles, botones de evaluación ni reportes que mostrarle todavía, ya que esos pertenecen a la experiencia del docente.

### Cuándo se dispara
- Automáticamente 500ms después de cargar la pantalla de entrada, solo si `tutorialAlumnoVisto` no es `"true"` — igual de no-invasivo que el disparo del tour docente (700ms tras confirmar autenticación).
- Manualmente, en cualquier momento, desde el enlace "❓ Ver guía nuevamente" en el propio formulario.

### Explícitamente NO modificado
- Firebase, Firestore, `firestore.rules`, recuperación de contraseña (no aplica al alumno, pero se confirma sin tocar), participaciones, evaluaciones, historial, exportación.
- Ninguna función de negocio del alumno (`entrar`, `comprobarSesionExistente`, `escucharClaseMaestro`, `escucharEstrellasTiempoReal`, `reportarAFirebase`, detección de salidas, `textoEvaluacion`, mitigación XSS ya integrada en V7.3).
- El onboarding docente (V8.0/V8.1) — confirmado sin cambios en `panel-docente.html` durante esta entrada.

### Archivos modificados
- `panel-alumno.html` — único archivo tocado. `diff` contra `Version_7_4_Estable` confirma **cero líneas eliminadas o modificadas** del código original; todo el contenido agregado es aditivo (CSS, HTML de la guía, y el motor JS al final del script).

### Validación
- Sintaxis JavaScript verificada sin errores.
- `diff` línea por línea contra `Version_7_4_Estable` confirma que no se tocó ninguna línea preexistente.
- `panel-docente.html`, `login.html`, `index.html`, los 3 manifests y `firestore.rules` confirmados sin cambios en este turno.
- Compatible con dispositivos móviles: tarjeta con `max-width: min(360px, 90vw)` y `max-height: 85vh` con scroll interno para el contenido más largo (Paso 2).

### Compatibilidad con V7.4
- `Version_6_Congelada`, `Version_7_3_Estable`, `Version_7_4_Estable`: no se tocaron.
- Todas las mejoras previas del lado del alumno (pausa visible, evaluación visible, mitigación XSS, recuperación de sesión, PWA) permanecen funcionando exactamente igual.

---

## [V8.2.0] — Onboarding interactivo para alumnos

### Agregado
- **Guía de 5 pasos** en `panel-alumno.html`, mostrada sobre la pantalla de entrada ("Entrar a Clase"), con overlay oscuro y tarjeta centrada tematizada en oscuro (consistente con la interfaz existente del alumno, a diferencia de la tarjeta clara usada en el onboarding docente).
- Persistencia en `localStorage` bajo la clave `tutorialAlumnoVisto` (independiente de `sesion_clase_activa`, que ya usaba la app) — se autoejecuta únicamente si esa clave no es `"true"`.
- Enlace permanente **"❓ Ver guía nuevamente"** dentro del formulario de entrada, que relanza la guía bajo demanda sin alterar `tutorialAlumnoVisto`.
- Todos los mensajes son contenido fijo definido en el código (`mensajeHTML` en `pasosGuiaAlumno[]`), no provienen de ningún dato capturado por el usuario — no aplica ninguna consideración de sanitización adicional a las ya existentes en el resto del archivo.

### Pasos implementados (exactos a la especificación, 5 de 5)
1. 👋 Bienvenido a Control de Aula.
2. 🔒 Privacidad y funcionamiento (lista de 8 puntos de "no acceso").
3. 📚 Uso académico del dispositivo (aclaración de que no es vigilancia).
4. 📝 Datos para ingresar (Código Docente, Nombre, Grupo, Código de Acceso).
5. ✅ Todo listo (incluye la mención de recuperación automática de sesión).

### Diseño: sin necesidad de "spotlight"
A diferencia del onboarding docente, ningún paso de la guía del alumno resalta un elemento específico de la interfaz — los 5 pasos son puramente informativos (bienvenida, privacidad, uso académico, requisitos de acceso, cierre). Por eso esta guía no incluye la lógica de `spotlight`/recorte de overlay del onboarding docente; solo overlay + tarjeta centrada, más simple y con menor huella de código.

### Explícitamente NO modificado
- Firebase, Firestore, `firestore.rules`, recuperación de contraseña, participaciones, evaluaciones, historial, exportación.
- El onboarding docente (`panel-docente.html`) — verificado con `diff`: cero cambios respecto a la entrega anterior.
- `login.html`, `index.html`, los 3 manifests — verificado con `diff`: cero diferencias contra `Version_7_4_Estable`.

### Archivos modificados
- `panel-alumno.html` — único archivo tocado en esta entrada. `diff` contra `Version_7_4_Estable` confirma que el cambio es exclusivamente adición (CSS, HTML y JS de la guía, más el enlace "Ver guía nuevamente" dentro de `mostrarFormulario()`); ninguna línea de `entrar()`, `reportarAFirebase()`, `escucharClaseMaestro()`, `escucharEstrellasTiempoReal()`, ni de la recuperación de sesión existente fue eliminada o alterada.

### Validación
- Sintaxis JavaScript verificada sin errores.
- Balance de llaves y paréntesis verificado (99/99, 208/208).
- `diff` línea por línea contra `Version_7_4_Estable/panel-alumno.html`: cero líneas eliminadas o modificadas, solo adiciones.
- Compatible con dispositivos móviles: tarjeta con `max-width: min(360px, 90vw)` y `max-height: 85vh` con scroll interno para pantallas pequeñas.

### Compatibilidad con V7.4
- `Version_6_Congelada`, `Version_7_3_Estable`, `Version_7_4_Estable`: no se tocaron.
- El onboarding docente (V8.0/V8.1) y todas las mejoras previas de V6/V7 permanecen funcionando exactamente igual.

---



### Agregado
- Nueva pantalla introductoria **"🔒 Privacidad y Funcionamiento"**, mostrada antes del Paso 1 del recorrido ya existente, con el texto exacto solicitado (propósito académico, lista de 8 puntos de "no acceso/no modificación", y aclaración de que no es una herramienta de vigilancia).
- Un único botón **"Continuar"** que cierra esta pantalla e inicia el recorrido normal de 8 pasos, sin alterarlo.

### Cómo se integró (sin tocar el tour ya implementado)
- `iniciarRecorrido(forzado)` ahora llama a `mostrarPantallaPrivacidad()` en vez de saltar directo al Paso 1. Es el único cambio de comportamiento en una función ya existente, y es estrictamente un cambio de secuencia (qué se muestra primero), no de lógica interna.
- `pasosRecorrido[]`, `mostrarPasoRecorrido()`, `siguientePasoRecorrido()`, `pasoAnteriorRecorrido()`, `omitirRecorrido()`, `finalizarRecorrido()`: **sin ningún cambio**. El Paso 1 sigue siendo exactamente el mismo Paso 1 de la versión anterior.
- La pantalla de privacidad se muestra en ambos puntos de entrada del tour (disparo automático la primera vez, y el botón "❓ Ver recorrido nuevamente"), ya que la especificación la define como parte del inicio del recorrido, no como un evento separado con su propia persistencia en `localStorage`.

### Validación
- Sintaxis JavaScript verificada sin errores tras el cambio.
- Confirmado que `pasosRecorrido[]` conserva sus 8 pasos, sin alteración.
- `diff` contra la entrega anterior de V8 muestra únicamente adiciones; la única línea marcada como "eliminada" (`pasoActualRecorrido = 0;`) en realidad fue reubicada a `continuarDesdePrivacidad()`, no borrada.

---



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
Varios elementos de los pasos 2, 4, 5, 6 y 7 viven dentro de `#zona-codigos`, que permanece `display:none` hasta que el docente inicia su primera clase — es decir, en el primer acceso real de un docente nuevo, esos elementos **no existen visualmente todavía**. En vez de forzar el inicio de una clase o modificar esa lógica (fuera de alcance: "no modificar lógica de negocio"), se implementó un modo de **respaldo (fallback) seguro**: si el elemento objetivo de un paso no está actualmente visible (`offsetParent === null`), ese paso se muestra igual, como una tarjeta centrada sin recorte de overlay, en vez de intentar resaltar algo invisible o romper el recorrido. Esto garantiza que los 8 pasos siempre se completen, sin importar si el docente ya inició una clase o no.

### Explícitamente NO modificado
- Firebase, Firestore, `firestore.rules`, autenticación.
- Ninguna función de negocio (`iniciarClase`, `activarRetardo`, `pausarClase`, `reanudarClase`, `agregarParticipacion`, `setEstado`, `exportarCSV`, `finalizarClase`, `escucharAlumnos`, `verificarClaseActiva`, etc.).
- `login.html`, `panel-alumno.html`, `index.html`, los 3 manifests, `firestore.rules` — verificado con `diff`: cero diferencias contra `Version_7_4_Estable`.

### Archivos modificados
- `panel-docente.html` — único archivo tocado. `diff` contra `Version_7_4_Estable` muestra exclusivamente: (a) el HTML/CSS/JS del onboarding agregado, (b) el `<div id="info-usuario">` envuelto en un contenedor flex para alojar el nuevo botón de recorrido, y (c) un atributo `id` agregado al botón de exportar ya existente. Ninguna línea de lógica de negocio fue eliminada ni alterada.

### Validación
- Sintaxis JavaScript verificada sin errores (`new Function()`).
- Balance de llaves y paréntesis verificado (178/178, 336/336).
- `diff` línea por línea contra `Version_7_4_Estable` confirma el alcance exacto del cambio.
- Compatible con dispositivos móviles: la tarjeta usa `max-width: min(340px, 90vw)`, y el spotlight se reposiciona automáticamente en el evento `resize` (rotación de pantalla).
- Sin impacto de rendimiento: el motor del recorrido es JavaScript vanilla sin dependencias externas, y solo se ejecuta activamente mientras el tour está abierto (una vez por docente nuevo, o bajo demanda vía el botón).

### Compatibilidad con V7.4
- `Version_6_Congelada`, `Version_7_3_Estable`, `Version_7_4_Estable`: no se tocaron.
- Todas las mejoras previas (retardos, pausa, orden alfabético, leyenda institucional, historial privado, exportación identificable, evaluación visible, mitigación XSS/CSV, recuperación de contraseña, PWA) permanecen funcionando exactamente igual.
