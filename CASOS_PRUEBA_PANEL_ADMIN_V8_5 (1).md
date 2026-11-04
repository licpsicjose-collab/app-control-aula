# Casos de prueba — Panel administrativo V8.5.1

**Método de validación en esta entrega:** igual que en
`CASOS_PRUEBA_SUSCRIPCIONES_V8_5.md` — sin red ni Firebase CLI/emulador en
este entorno, no fue posible ejecutar contra un proyecto real. Se hizo
verificación de sintaxis (`node --check`, sin errores), balance de
llaves/paréntesis, y trazado manual de cada caso contra el código.

---

## Grupo 1 — Control de acceso

### Caso 1.1 — Usuario sin sesión
**Esperado:** redirige a `login.html`.
**Trazado de código:** `onAuthStateChanged` — si `!user`, `window.location.href = "login.html"` inmediato, sin intentar ninguna lectura. ✅ (trazado) · 🔲 (pendiente ejecución real)

### Caso 1.2 — Docente autenticado sin documento en `admins/{uid}`
**Esperado:** ve un aviso claro de "Acceso restringido", no un panel vacío ni un error de consola sin explicación.
**Trazado de código:** `cargarPanelAdmin()` intenta `db.collection("metricas_docentes").get()`; con las reglas nuevas (`esAdmin()` falso y `request.auth.uid != docenteUid` para *todos* los documentos, porque el listado no filtra por dueño), Firestore rechaza el `list` completo → excepción capturada → se oculta "Cargando…" y se muestra el bloque de acceso denegado con el correo de la cuenta. ✅ (trazado) · 🔲

### Caso 1.3 — Cuenta con documento en `admins/{uid}`
**Esperado:** el panel carga con todos los datos.
**Trazado de reglas:** `esAdmin()` evalúa `exists(admins/{uid})` = true → la condición `... || esAdmin()` de `allow read` en `metricas_docentes` se cumple para cada documento devuelto por el `list`, sin necesidad de ser el dueño. ✅ (trazado) · 🔲

### Caso 1.4 — Nadie puede autoasignarse admin desde la app
**Trazado de reglas:** `admins/{uid}` tiene `allow read, write: if false` sin excepción — ninguna combinación de autenticación logra escribir ahí desde el cliente. Solo la consola de Firebase / Admin SDK puede hacerlo. ✅ (trazado) · 🔲

---

## Grupo 2 — Cálculo de métricas (adopción y uso)

### Caso 2.1 — Cero docentes activados (proyecto nuevo)
**Esperado:** el panel no falla; todas las tarjetas muestran 0 en vez de `NaN` o `undefined`.
**Trazado de código:** `docentes = []` → `totalDocentes = 0`; `reduce` sobre arreglo vacío devuelve `0` (valor inicial explícito en ambos `reduce`); `activos7d`/`activos30d` = `0` por `filter` vacío; `promedioAlumnosPorDocente` tiene guarda explícita `alumnosConDato.length > 0 ? ... : 0`, evita división por cero. ✅ (trazado) · 🔲

### Caso 2.2 — Docente sin campo `escuela`
**Esperado:** se agrupa bajo una etiqueta clara, no bajo `undefined` ni se pierde del conteo.
**Trazado de código:** `d.escuela && d.escuela.trim() ? d.escuela.trim() : "(sin escuela registrada)"`. ✅ (trazado) · 🔲

### Caso 2.3 — Falla la lectura de `alumnosVistos` para un docente específico
**Esperado:** el panel completo no se cae; ese docente queda excluido del promedio con una nota visible.
**Trazado de código:** cada promesa de `Promise.all` tiene su propio `try/catch`; en caso de error, `d._alumnosUnicos = null`, y `alumnosConDato` lo filtra (`d._alumnosUnicos !== null`) tanto para la suma como para el promedio. La tarjeta muestra la nota "`Calculado sobre N de M docentes`" cuando `alumnosConDato.length < totalDocentes`. ✅ (trazado) · 🔲

### Caso 2.4 — Falla la lectura de `onboarding_alumno_eventos` (p. ej. reglas mal desplegadas)
**Esperado:** el resto del panel se muestra igual; solo esa sección indica que no está disponible.
**Trazado de código:** `eventosOnboardingAlumno = null` en el `catch` de esa lectura específica; `renderPanel` recibe ese `null` y en la rama `if (eventosOnboardingAlumno === null)` renderiza una tarjeta de aviso en vez de intentar iterar sobre `null` (lo que habría lanzado una excepción y roto todo el render). ✅ (trazado) · 🔲

---

## Grupo 3 — Onboarding docente y alumno

### Caso 3.1 — Docente con `onboardingDocente` ausente (cuenta anterior a V8.0)
**Esperado:** cuenta como "sin dato", no como omitido ni como completado.
**Trazado de código:** `obDocPendiente = totalDocentes - obDocCompletado - obDocOmitido` — cualquier valor distinto de `"completado"`/`"omitido"` (incluido `undefined`) cae en este resto. ✅ (trazado) · 🔲

### Caso 3.2 — Ningún evento de onboarding de alumno todavía
**Esperado:** 0 eventos, 0% completado (no división por cero ni `NaN`).
**Trazado de código:** `pctCompletado = totalEventos > 0 ? Math.round(...) : 0` — guarda explícita. La tabla de "paso donde se omitió" no se renderiza si `pasosOrdenados.length === 0` (operador ternario en el template). ✅ (trazado) · 🔲

---

## Grupo 4 — `firestore.rules`

### Caso 4.1 — Un docente normal intenta leer las métricas de otro docente directamente (`get` puntual, no `list`)
**Esperado:** rechazado.
**Trazado de reglas:** `allow read` en `metricas_docentes/{docenteUid}` exige `auth.uid == docenteUid || esAdmin()`; un docente normal no cumple ninguna de las dos condiciones para un `docenteUid` ajeno. ✅ (trazado) · 🔲

### Caso 4.2 — La escritura de `metricas_docentes` sigue funcionando igual que antes para el propio docente
**Esperado:** sin regresión — `registrarMetricaInicioClase()` y `registrarMetricaFinClase()` en `panel-docente.html` no se tocaron.
**Trazado de reglas:** `allow write` quedó con exactamente la misma condición y el mismo `hasOnly([...])` que antes de este cambio, solo se separó de `read` sintácticamente. ✅ (trazado) · 🔲

### Caso 4.3 — Un admin puede leer `onboarding_alumno_eventos`, un docente normal no
**Trazado de reglas:** `allow read: if esAdmin();` — sin la disyunción de "dueño" que sí existe en otras colecciones, porque estos eventos no tienen dueño (el alumno no se autentica). Un docente normal, sin documento en `admins`, no cumple `esAdmin()`. ✅ (trazado) · 🔲

---

## Pendiente antes de producción

- 🔲 Crear manualmente un documento en `admins/{uid}` (vía consola de
  Firebase) con el UID de una cuenta docente real, y verificar que
  `panel-admin.html` carga correctamente con esa cuenta.
- 🔲 Verificar con una cuenta *sin* ese documento que el aviso de acceso
  restringido aparece y no expone ningún dato.
- 🔲 Probar con al menos 2-3 docentes con datos reales en `metricas_docentes`
  para confirmar que las sumas, promedios y agrupaciones por escuela son
  correctas (no solo el caso vacío).
- 🔲 Confirmar visualmente que las tablas y tarjetas se ven correctamente en
  un navegador real — no se revisó renderizado visual, solo lógica.
