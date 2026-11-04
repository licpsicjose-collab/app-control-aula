# Casos de prueba — Sistema de suscripciones V8.5

**Método de validación en esta entrega:** este entorno de trabajo no tiene
acceso de red saliente ni Firebase CLI/emulador disponible, por lo que
**no fue posible ejecutar estos casos contra un proyecto Firebase real**
(`app-clase-3a564`). Lo que sí se hizo:

1. Verificación de sintaxis JavaScript (`node --check`) de `login.html` y
   `panel-docente.html` — sin errores.
2. Verificación de balance de llaves/paréntesis/corchetes en los tres
   archivos modificados — correcto.
3. **Trazado manual línea por línea** de cada caso de abajo contra el
   código implementado, verificando que la lógica hace exactamente lo que
   el caso espera.

Los casos marcados con 🔲 requieren ejecución real (login.html, panel-docente.html
y firestore.rules desplegados contra el proyecto de Firebase) antes de
considerar esta entrega lista para producción. Ninguno de estos casos se
ejecutó de verdad todavía.

---

## Grupo 1 — Creación de Trial al registrarse

### Caso 1.1 — Registro nuevo crea documento de suscripción en trial
**Pasos:** un docente nuevo se registra desde `login.html`.
**Esperado:** se crea `suscripciones/{uid}` con `estado:"trial"`,
`trialInicio` = ahora, `trialFin` = ahora + 15 días, el resto en `null`/`[]`.
**Trazado de código:** `registrar()` en `login.html` ejecuta el `set()` de
`suscripciones` inmediatamente después del `set()` de `mapeo_codigos`,
usando el mismo `uid` recién creado y el mismo `ahoraRegistro`. Coincide
con lo esperado. ✅ (trazado) · 🔲 (pendiente ejecución real)

### Caso 1.2 — Falla de red al crear el documento no bloquea el registro
**Esperado:** si `suscripciones.set()` falla, el docente igual entra al panel.
**Trazado de código:** el `.catch(() => {})` explícito absorbe el error sin
detener la ejecución; `window.location.href = "panel-docente.html"` ocurre
después, sin depender del resultado de esa escritura. ✅ (trazado) · 🔲

---

## Grupo 2 — Transición automática trial → free

### Caso 2.1 — Trial vigente no dispara transición
**Esperado:** con `trialFin` en el futuro, `estado` permanece `"trial"`.
**Trazado de código:** `verificarTransicionAutomatica()` compara
`ahora > datosSuscripcion.trialFin`; si es falso, no entra a ninguna rama.
✅ (trazado) · 🔲

### Caso 2.2 — Trial vencido dispara transición a free
**Esperado:** al abrir el panel con `trialFin` en el pasado, `estado` pasa a
`"free"`, se calcula `grupoActivo`/`gruposCongelados`, y se muestra un aviso.
**Trazado de código:** la condición se cumple → `ejecutarTransicionAFree("trial")`
→ consulta `historial` vía `determinarGrupoActivoReciente()` → `suscripcionRef.set(..., {merge:true})`
con `estado:"free"` → `alert()` con el mensaje de trial vencido. ✅ (trazado) · 🔲

### Caso 2.3 — Docente en trial que nunca dio clase, vence el trial
**Esperado:** pasa a `free` igualmente (el trial es tiempo, no uso), con
`grupoActivo: null` (no hay historial).
**Trazado de código:** `determinarGrupoActivoReciente()` devuelve
`{activo: null, congelados: []}` cuando `historial` no tiene documentos
para ese `docenteId` (`vistos.length === 0`). El `set` igual cambia
`estado` a `"free"`. Coincide con la sección 15 de `PLANES_Y_SUSCRIPCIONES.md`.
✅ (trazado) · 🔲

---

## Grupo 3 — Transición automática pro → free

### Caso 3.1 — Pro vencido dispara transición a free
**Esperado:** con `estado:"pro"` y `proVencimiento` en el pasado, pasa a
`free`, recalcula grupo activo/congelados sobre *todos* sus grupos usados
(pudo acumular varios durante el año de Pro).
**Trazado de código:** misma función `ejecutarTransicionAFree("pro")`,
mismo cálculo de `determinarGrupoActivoReciente()` (no distingue el origen
para ese cálculo, correcto según sección 8 punto 2 del documento de
planes). Mensaje de alerta distinto al de trial. ✅ (trazado) · 🔲

### Caso 3.2 — Pro vigente no dispara ninguna transición
**Trazado de código:** `ahora > proVencimiento` es falso → ninguna rama se
ejecuta, `estado` permanece `"pro"`. ✅ (trazado) · 🔲

---

## Grupo 4 — Restricción de grupo activo en Free

### Caso 4.1 — Primera clase en Free sin grupo activo asignado
**Esperado:** el primer grupo con el que el docente inicia clase en Free se
convierte en su grupo activo, sin bloquear la creación de la clase.
**Trazado de código:** en `iniciarClase()`, si `estado === "free"` y
`!datosSuscripcion.grupoActivo`, se escribe `grupoActivo: grp` y el flujo
continúa normalmente hacia `claseActivaRef.set(...)`. ✅ (trazado) · 🔲

### Caso 4.2 — Intento de iniciar clase en grupo congelado
**Esperado:** se bloquea con mensaje claro, la clase no se crea.
**Trazado de código:** si `grupoActivo` existe y `grp !== grupoActivo`, se
muestra `alert()` y `return` antes de cualquier escritura a `clases`. La
clase no se guarda ni se registran métricas. ✅ (trazado) · 🔲

### Caso 4.3 — Iniciar clase en el grupo activo correcto
**Esperado:** funciona exactamente igual que antes de V8.5, sin fricción.
**Trazado de código:** `grp === grupoActivo` → ninguna de las dos ramas de
bloqueo se activa → el resto de `iniciarClase()` no fue modificado. ✅
(trazado) · 🔲

### Caso 4.4 — Docente en Trial o Pro, cualquier grupo
**Esperado:** sin restricción alguna, igual que la funcionalidad ya
existente antes de esta entrega.
**Trazado de código:** el bloque completo de restricción está dentro de
`if (datosSuscripcion && datosSuscripcion.estado === "free")` — para
`"trial"` o `"pro"` esa condición es falsa y el bloque se salta por
completo. ✅ (trazado) · 🔲

---

## Grupo 5 — UI (tarjeta de plan, patrocinio, congelados)

### Caso 5.1 — Tarjeta muestra días restantes en trial
**Trazado de código:** `actualizarTarjetaPlan()` calcula
`Math.ceil((trialFin - Date.now()) / 86400000)` y lo interpola en el texto,
con singular/plural correcto para "día(s)". ✅ (trazado) · 🔲

### Caso 5.2 — Banner de patrocinio solo aparece en Free
**Trazado de código:** `bannerPatrocinio.style.display = (estado === "free") ? "block" : "none"` —
único punto de control, cubre `trial` y `pro` por igual (ambos "none").
Coincide con la sección 13 de `PLANES_Y_SUSCRIPCIONES.md`. ✅ (trazado) · 🔲

### Caso 5.3 — Banner de grupos congelados solo aparece con congelados presentes
**Trazado de código:** condición doble —
`estado === "free" && gruposCongelados.length > 0` — no aparece en
Free sin congelados, ni en trial/pro con el arreglo poblado por una
transición previa. ✅ (trazado) · 🔲

### Caso 5.4 — Docente sin documento de suscripción (cuenta previa a V8.5)
**Esperado:** ninguna tarjeta, ningún banner, ninguna restricción — el panel
funciona exactamente como antes de esta entrega.
**Trazado de código:** `cargarSuscripcion()` deja `datosSuscripcion = null`
si `!doc.exists`; `actualizarTarjetaPlan()` oculta los tres elementos en
ese caso y retorna antes de tocar clases CSS; `iniciarClase()` solo aplica
la restricción `if (datosSuscripcion && ...)`, que es falso con `null`.
✅ (trazado) · 🔲

---

## Grupo 6 — `firestore.rules`

### Caso 6.1 — Un docente no puede crear su suscripción ya en `pro`
**Trazado de reglas:** `allow create` exige `estado == 'trial'` y
`proInicio/proVencimiento/precioPagado == null` — cualquier intento de
crear el documento con otro `estado` es rechazado. ✅ (trazado) · 🔲

### Caso 6.2 — Un docente no puede leer/escribir la suscripción de otro
**Trazado de reglas:** las tres reglas (`read`/`create`/`update`) exigen
`request.auth.uid == docenteUid`, donde `docenteUid` es el segmento de la
ruta — mismo patrón ya usado en `clases/{docenteUid}` y
`metricas_docentes/{docenteUid}`. ✅ (trazado) · 🔲

### Caso 6.3 — Un `update` con un campo fuera del esquema es rechazado
**Trazado de reglas:** `keys().hasOnly([...9 campos...])` rechaza cualquier
escritura que incluya un campo adicional no contemplado. ✅ (trazado) · 🔲

### Caso 6.4 — Un `update` con `estado` inválido es rechazado
**Trazado de reglas:** `estado in ['trial', 'free', 'pro']` rechaza
cualquier otro valor (p. ej. `"vencido"`, `"cancelado"` — coincide con la
sección 3 de `PLANES_Y_SUSCRIPCIONES.md`, que dice explícitamente que no
existe un cuarto estado). ✅ (trazado) · 🔲

### Caso 6.5 — Nadie puede borrar un documento de suscripción desde el cliente
**Trazado de reglas:** `allow delete: if false` incondicional. ✅ (trazado) · 🔲

---

## Pendiente antes de desplegar a producción

- 🔲 Ejecutar el Grupo 1 y 6 contra el proyecto real o el emulador de
  Firestore (requiere `firebase emulators:start` con acceso de red, no
  disponible en este entorno).
- 🔲 Probar manualmente el Grupo 2 y 3 manipulando `trialFin`/`proVencimiento`
  directamente en la consola de Firestore para simular vencimientos sin
  esperar 15 días o 12 meses reales.
- 🔲 Verificar en un navegador real que las clases CSS `plan-trial` /
  `plan-free` / `plan-pro` se ven correctamente (no se revisó renderizado
  visual, solo lógica).
