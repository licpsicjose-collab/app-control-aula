# CHANGELOG — Control de Aula V8

## [V8.6.2] — Enlaces legales + Control de pagos en panel administrativo

### Nota de transparencia
Al empezar esta entrega, `firestore.rules` ya tenía una regla etiquetada
"V8.6.2" (lectura de `suscripciones` para administradores) que no aparecía
en ningún registro de este `CHANGELOG_V8.md`, y `panel-admin.html` seguía
sin usar esa colección en absoluto. Parece trabajo iniciado y no
concluido. Se completa aquí de forma consistente, documentando todo junto
bajo el mismo número de versión que ya estaba en el código.

### Agregado — `panel-docente.html`
- Franja de enlaces, debajo de los banners de suscripción: **Aviso de
  Privacidad**, **Términos de Uso**, **Soporte** — apuntan directamente a
  `AVISO_PRIVACIDAD.md`, `TERMINOS_DE_USO.md`, `POLITICA_SOPORTE.md`.
  El enlace al Consentimiento informado (header, desde V8.6.0) no se tocó.
- `flex-wrap: wrap` agregado al contenedor del header, por precaución, ya
  que ahora hay más elementos y podría desbordar en pantallas angostas.

### Agregado — `firestore.rules`
- `mapeo_codigos` → `allow list`: se agrega `|| esAdmin()`, necesario para
  que el panel administrativo pueda resolver qué correo corresponde a cada
  `docenteUid` al mostrar el control de pagos. La restricción para
  docentes normales (solo pueden listar su propio mapeo) no cambia.
- La regla de lectura de `suscripciones` con `esAdmin()` ya existía
  (encontrada al inicio de esta entrega, ver nota de transparencia arriba)
  — no se modificó, solo se le dio uso real por primera vez.

### Agregado — `panel-admin.html`
- Nueva sección **"Control de pagos (suscripciones)"**, de solo lectura:
  - Lee `suscripciones` (todos los docentes) y `mapeo_codigos` (para
    mostrar el correo en vez del UID).
  - Por cada docente: plan actual (Trial / Free / Pro / Pro Perpetuo),
    días restantes antes de vencer (Trial o Pro sin licencia perpetua), y
    el precio pagado si lo hay.
  - Fila resaltada en rojo y marcada con ⚠️ cuando el Trial vence en 3 días
    o menos, o el Pro (no perpetuo) vence en 7 días o menos — es el
    "recordatorio" pedido: al abrir el panel, lo urgente queda arriba de
    la tabla, ordenado por cercanía al vencimiento.
  - Tarjeta de resumen con el conteo de docentes urgentes, solo si hay al
    menos uno.
  - **No escribe nada en Firestore** — sigue sin existir ningún flujo de
    pago automático; esta tabla solo ayuda a saber a quién le toca
    revisar manualmente, algo que hasta ahora requería entrar
    docente por docente a la consola sin ninguna vista consolidada.
  - Carga de forma independiente del resto del panel (Promise separada,
    con su propio `try/catch`) — si falla, el resto de las secciones
    (adopción, uso, onboarding, escuelas) se siguen mostrando igual.

### NO implementado (fuera de alcance de esta entrega)
- Ningún flujo de pago automático — sigue siendo activación manual desde
  la consola de Firebase, como se decidió en la entrega anterior.
- Ninguna acción desde el panel administrativo (por ejemplo, un botón para
  activar Pro directamente desde ahí) — solo lectura, ninguna escritura.
- Ningún recordatorio proactivo (correo, notificación) — el "recordatorio"
  es visual, y solo aparece cuando el Responsable abre el panel.

### Archivos modificados
- `panel-docente.html`
- `panel-admin.html`
- `firestore.rules`
- `docs/ESTADO_PROYECTO_V8_5.md`

### Validación realizada
- Sintaxis JavaScript de `panel-docente.html` y `panel-admin.html`
  verificada con `node --check` — sin errores.
- Balance de llaves/paréntesis en `panel-admin.html`: 86/86 y 155/155.
- Balance de llaves/paréntesis/corchetes en `firestore.rules`: 47/47,
  132/132, 17/17.
- **No se probó contra un proyecto Firebase real** — mismo motivo que
  siempre en este proyecto. Antes de confiar en el Control de Pagos,
  confirma que las dos reglas nuevas (`suscripciones` con `esAdmin()`, y
  `mapeo_codigos` con `esAdmin()` en `list`) estén desplegadas, o la
  sección mostrará el mensaje de "no se pudo leer".

---

## [V8.6.1] — Minimización de datos: borrado automático a 6 meses (TTL de Firestore)

### Contexto
Asesoría legal externa señaló que el historial de clases y los registros de
alumnos se conservaban indefinidamente en Firestore, sin fecha de
caducidad — un riesgo real, ya corregido en `AVISO_PRIVACIDAD.md` §7 (antes
decía "se conservan indefinidamente"). Se decidió explícitamente, por el
Responsable del proyecto: **retención de 6 meses** para el historial
detallado de clases y para `alumnosVistos` (el registro que identifica
alumnos por nombre+grupo); **sin cambio** para `metricas_docentes` (el
documento padre, que solo contiene cifras agregadas del docente, sin datos
identificables de alumnos).

### Agregado — `panel-docente.html`
- `calcularFechaEliminacion(fechaBase)` — nueva función, calcula
  `fechaBase + 6 meses` usando aritmética de fechas real (`Date.setMonth`),
  no una constante fija en milisegundos, para que el cálculo sea correcto
  sin importar la duración de cada mes.
- `finalizarClase()`: se agrega el campo `eliminarEn` tanto al documento
  padre de `historial/{registroId}` como a cada
  `historial/{registroId}/alumnos/{alumnoId}` archivado — 6 meses desde
  `fechaFin`. Ninguna otra lógica de la función cambió.
- `registrarMetricaFinClase()`: se agrega `eliminarEn` (6 meses desde
  ahora) a cada documento de `metricas_docentes/{uid}/alumnosVistos/{id}`.
  Como el `set` usa `merge: true` y se ejecuta cada vez que ese alumno
  vuelve a aparecer en una clase, **la fecha se recalcula cada vez** — un
  alumno que sigue tomando clases activamente nunca alcanza la fecha de
  borrado; solo expira 6 meses después de la última vez que apareció. El
  documento padre `metricas_docentes` (cifras agregadas del docente) no
  recibe este campo — se mantiene sin fecha de expiración.

### Pendiente — configuración fuera de este código (requiere acción manual del usuario)
Agregar el campo `eliminarEn` es solo la mitad del trabajo. Para que
Firestore borre los documentos de verdad, hace falta **configurar la
política TTL desde la consola de Firebase o gcloud CLI** — esto no se
puede hacer desde este entorno de desarrollo (sin acceso de red) ni desde
el código de la aplicación:

1. Firestore → pestaña "Time-to-live" (o `gcloud firestore fields ttls update eliminarEn --collection-group=historial ...`).
2. Configurar una política TTL sobre el campo `eliminarEn` en el grupo de colecciones `historial`.
3. Configurar una **segunda** política TTL, también sobre `eliminarEn`, en el grupo de colecciones `alumnos` — **importante**: por cómo funciona Firestore, borrar un documento padre por TTL **no borra sus subcolecciones automáticamente**, así que esta segunda política es indispensable, no opcional.
4. Configurar una **tercera** política TTL sobre `eliminarEn` en el grupo de colecciones `alumnosVistos`.
5. **Precaución con el grupo de colecciones "alumnos":** ese nombre también lo usa la lista de alumnos de la clase *activa* (`clases/{docenteUid}/alumnos`), no solo el historial archivado. Una política TTL aplica a todos los documentos con ese nombre de colección en toda la base — pero como el código nunca escribe `eliminarEn` en los documentos de la clase activa, esos documentos nunca son elegibles para borrado. Aun así, no agregar ese campo a ninguna escritura de la clase activa en el futuro sin tenerlo presente.

### NO implementado en esta entrega
- No se implementó ningún aviso al docente antes de que sus datos expiren
  (por ejemplo, "tu historial de marzo se borrará en 15 días") — el
  docente debe exportar lo que le interese antes de que pasen los 6 meses.
- No se verificó de forma real si la política TTL respeta las reglas de
  `allow delete: if false` ya existentes en `historial` — la documentación
  de Firestore indica que el borrado por TTL es un proceso interno del
  motor, no una escritura de cliente, por lo que no debería estar sujeto a
  esa regla, pero **esto no se ha probado en el proyecto real**.

### Archivos modificados
- `panel-docente.html`
- `AVISO_PRIVACIDAD.md`

### Validación realizada
- Sintaxis JavaScript de `panel-docente.html` verificada con `node --check`
  tras el cambio — sin errores. Balance de llaves/paréntesis: 209/209 y
  467/467 respectivamente.
- Confirmado por `grep` que ni `historial`, ni
  `historial/{id}/alumnos`, ni `metricas_docentes/{uid}/alumnosVistos`
  tienen restricción `hasOnly()` de campos en `firestore.rules` — agregar
  `eliminarEn` no requiere ningún cambio a las reglas.
- **No se configuró la política TTL en un proyecto Firebase real** —
  paso manual pendiente, descrito arriba. Sin esa configuración, el campo
  `eliminarEn` se escribe pero no borra nada por sí solo.

---

## [V8.6.0] — Consentimiento informado de padres/tutores (solo menores de edad)

### Contexto
Se identificó que la falta de consentimiento parental para el tratamiento
de datos de alumnos menores de edad era el riesgo legal más serio del
proyecto (señalado en la auditoría posterior a `AVISO_PRIVACIDAD.md`). Se
diseñó, entre el usuario y el asistente, un documento imprimible dirigido
específicamente a padres/madres/tutores de alumnos **menores de edad** —
explícitamente no aplica a alumnos mayores de edad, quienes pueden
autorizar el uso de sus propios datos directamente.

### Agregado — `CONSENTIMIENTO_INFORMADO_PADRES.html` (nuevo archivo)
- Documento HTML autocontenido, pensado para imprimirse (botón "Imprimir
  este documento" con `window.print()`, estilos `@media print` que ocultan
  ese botón al imprimir).
- Explica en lenguaje llano: qué es Control de Aula, qué datos del alumno
  se registran (los mismos ya documentados en `AVISO_PRIVACIDAD.md` §2.2 —
  nombre, grupo, tiempos, participaciones, evaluación, retardos), por qué
  cada dato es necesario, y por qué el tratamiento no representa un riesgo
  significativo (mismas medidas de seguridad ya descritas en
  `AVISO_PRIVACIDAD.md` §8).
- Ofrece dos formas de verificación de firma, **ambas a criterio del
  plantel o del docente, ninguna obligatoria**: (a) copia de una
  identificación oficial anexa, o (b) firma recabada en una junta
  presencial informativa. En ambos casos, el documento deja explícito que
  **Control de Aula (la plataforma) nunca recibe ni almacena esa copia de
  identificación** — el resguardo físico queda en manos del plantel o el
  docente, no del Responsable de la plataforma. Esto evita el riesgo de
  custodia centralizada de identificaciones oficiales que se había
  señalado como problemático en una entrega anterior de este mismo
  proyecto.
- Bloque de firma con nombre, parentesco, firma y fecha, más campos para
  llenar a mano (escuela, docente, materia, grupo, nombre del alumno).

### Agregado — `panel-docente.html`
- Nuevo enlace en el header, junto a "Ver recorrido nuevamente": **"📄
  Consentimiento informado (padres)"**, que abre
  `CONSENTIMIENTO_INFORMADO_PADRES.html` en una pestaña nueva
  (`target="_blank"`). Es el primer enlace desde la aplicación hacia
  cualquiera de los documentos legales del proyecto — los otros tres
  (`AVISO_PRIVACIDAD.md`, `TERMINOS_DE_USO.md`, `POLITICA_SOPORTE.md`)
  siguen sin enlazarse, ver "Pendiente" abajo.
- Ninguna otra función, estilo o lógica de `panel-docente.html` se
  modificó.

### NO implementado (fuera de alcance de esta entrega)
- No se enlazaron `AVISO_PRIVACIDAD.md`, `TERMINOS_DE_USO.md` ni
  `POLITICA_SOPORTE.md` — solo el consentimiento de padres, que era lo
  solicitado.
- No se generó una versión para alumnos mayores de edad — se determinó
  explícitamente que no la necesitan.
- No se automatizó ningún flujo de firma digital ni de captura dentro de
  la aplicación — el documento está diseñado para imprimirse y firmarse
  en papel, fuera de la plataforma.
- Ninguna revisión legal profesional de este documento todavía.

### Archivos modificados/creados
- `CONSENTIMIENTO_INFORMADO_PADRES.html` (nuevo)
- `panel-docente.html`
- `docs/ESTADO_PROYECTO_V8_5.md`

### Validación realizada
- Balance de etiquetas `<div>`/`</div>` y `<p>`/`</p>` en
  `CONSENTIMIENTO_INFORMADO_PADRES.html`: 8/8 y 14/14 respectivamente.
- Sintaxis JavaScript de `panel-docente.html` re-verificada con
  `node --check` tras el cambio de header — sin errores (el cambio fue
  puramente HTML, sin tocar ningún `<script>`).
- **No se probó la impresión real en un navegador** — no se revisó cómo
  se ve el documento impreso en papel físico, solo se verificó la
  estructura del HTML y el CSS de impresión.

---

## [V8.5.4] — CORRECCIÓN DE SEGURIDAD CRÍTICA: escritura sin restricción en `suscripciones`

### Contexto
Auditoría externa detectó que la regla `update` de `suscripciones/{docenteUid}`
(desde V8.5.0) solo validaba la **forma** del documento — campos permitidos,
`estado` en el enum, un par de tipos — pero no **quién tiene derecho a
escribir qué valor**. Consecuencia real: cualquier docente autenticado
podía escribir directamente contra el SDK de Firestore (sin pasar por
`panel-docente.html`) y ponerse `estado: "pro"` y `perpetuo: true` por su
cuenta, obteniendo Pro Perpetuo gratis. Confirmado por trazado manual de
la regla anterior — el ataque no requería ninguna vulnerabilidad de la
aplicación, solo conocer la API pública de Firestore, algo estándar en
cualquier app web con Firebase.

También se confirmó el hallazgo relacionado: los campos `trialInicio`,
`trialFin`, `proInicio`, `proVencimiento`, `precioPagado`, `grupoActivo` y
`gruposCongelados` no tenían ninguna validación de tipo en `update` (solo
en `create`).

### Corregido — `firestore.rules`
- `suscripciones/{docenteUid}` → `allow update`, reescrita por completo:
  - `perpetuo`, `proInicio`, `proVencimiento`, `precioPagado`,
    `trialInicio`, `trialFin` ahora deben ser **idénticos** al valor ya
    almacenado (`resource.data.*`) — el cliente no puede modificarlos bajo
    ninguna combinación, en ninguna escritura. Solo la consola de Firebase
    (Admin SDK, no sujeta a estas reglas) puede tocarlos.
  - `estado` solo puede: (A) permanecer igual al valor ya almacenado
    (caso real: asignar `grupoActivo` bajo free sin cambiar de plan), o
    (B) pasar a `"free"`, y únicamente si el documento ya almacenado
    prueba que el plan anterior venció de verdad — comparando
    `request.time` (hora del servidor de Firestore, no un dato que el
    cliente controle) contra `trialFin` o `proVencimiento` ya guardados.
  - Se agregó validación de tipo para `grupoActivo` (`string` o `null`) y
    `gruposCongelados` (`list`), cerrando el segundo hallazgo.
  - Resultado: subir a `"pro"` o marcar `perpetuo: true` sigue siendo,
    como siempre, exclusivo de la consola de Firebase. Ningún cliente
    puede lograrlo por su cuenta bajo ninguna secuencia de escrituras.

### Corregido — `docs/ESTADO_PROYECTO_V8_5.md`
- Se detectó y corrigió un **error propio**, sin relación con el hallazgo
  de seguridad: el documento afirmaba "10 pasos declarados / 8 pasos
  implementados en código" sobre el onboarding docente, una discrepancia
  que se escribió sin verificar contra el código en su momento. Conteo
  directo sobre `pasosRecorrido[]` en `panel-docente.html` confirma
  **10 pasos implementados**, consistente con lo que ya documentaba
  `CHANGELOG_V8.md` desde V8.3.1. Corregido para reflejar el conteo real.

### NO modificado (fuera de alcance de esta corrección)
- No se introdujeron Cloud Functions — la corrección se logró íntegramente
  dentro de `firestore.rules`, sin backend adicional.
- Ninguna función de `panel-docente.html` se modificó — los flujos
  legítimos (asignar grupo activo, transición automática a free) siguen
  escribiendo exactamente lo mismo que antes; solo cambiaron las reglas
  que verifican esas escrituras del lado del servidor.
- No se resolvió el pendiente de escalabilidad de `alumnosVistos` en
  `panel-admin.html` (ya documentado como límite conocido desde V8.5.1) —
  el hallazgo se confirmó como cierto, no se atendió en esta entrega.

### Archivos modificados
- `firestore.rules`
- `docs/ESTADO_PROYECTO_V8_5.md`
- `CHANGELOG_V8.md`

### Validación realizada
- Balance de llaves/paréntesis/corchetes en `firestore.rules` tras el
  cambio: 44/44 llaves, 110/110 paréntesis, 14/14 corchetes.
- Trazado manual de los dos flujos legítimos existentes contra la nueva
  regla (asignación de grupo activo bajo free, transición automática a
  free) — ambos siguen pasando sin cambios en su comportamiento.
- Trazado manual del intento de ataque descrito en el contexto — la nueva
  regla lo rechaza: `perpetuo` y `estado: "pro"` ya no son alcanzables
  desde una escritura de cliente bajo ninguna combinación de campos.
- **No se probó contra un proyecto Firebase real** — mismo motivo que en
  entregas anteriores. Este es el pendiente más urgente de todo el
  proyecto: desplegar esta regla y confirmar en el emulador o en el
  proyecto real que (a) los flujos legítimos siguen funcionando y (b) el
  intento de escritura maliciosa descrito arriba ahora es rechazado.

---

## [V8.5.3] — Licencias perpetuas (Pro sin vencimiento)

### Contexto
Se pidió soporte para docentes con acceso Pro permanente, sin fecha de
vencimiento, sin tocar el sistema Trial/Free/Pro existente ni implementar
pagos — asignación exclusivamente manual desde Firestore.

### Agregado — `firestore.rules`
- Campo `perpetuo` (boolean) agregado al esquema cerrado de
  `suscripciones/{docenteUid}`, en `create` y `update`.
- `allow create`: exige `perpetuo == false` — un docente nuevo nunca nace
  con licencia perpetua desde el registro.
- `allow update`: exige `perpetuo is bool` — sin restringir su valor, ya
  que la asignación a `true` ocurre desde la consola de Firebase (que
  opera con privilegios de administrador y no pasa por estas reglas), no
  desde el cliente.

### Agregado — `login.html`
- `registrar()`: el documento de Trial que se crea al registrarse ahora
  incluye `perpetuo: false` explícitamente (requerido por el esquema
  cerrado de las reglas).

### Agregado — `panel-docente.html`
- `verificarTransicionAutomatica()`: primera verificación de la función —
  si `datosSuscripcion.perpetuo === true`, la función retorna de
  inmediato, sin evaluar `trialFin` ni `proVencimiento`, sin importar el
  `estado` guardado. Ningún vencimiento dispara ninguna transición
  mientras `perpetuo` sea `true`.
- `actualizarTarjetaPlan()`: cuando `estado === "pro"` y
  `perpetuo === true`, la tarjeta muestra "Plan Pro Perpetuo" en vez de
  "Plan Pro" (mismo estilo visual `plan-pro`, solo cambia el texto).
- `iniciarClase()` — sin cambios: un docente con licencia perpetua tiene
  `estado: "pro"`, que ya no tenía restricción de grupo activo antes de
  esta entrega.

### Confirmado sin cambios — `panel-admin.html`
- No usa datos de `suscripciones` en ningún punto (fuera de alcance desde
  V8.5.1 — panel administrativo). Verificado con `grep`: la única mención
  de "suscripciones" en ese archivo es un comentario explicando esa
  exclusión. Sin ninguna incompatibilidad que resolver.

### NO implementado (explícitamente fuera de alcance, según instrucción)
- Ningún flujo de pago para licencias perpetuas.
- Ninguna pantalla para asignar `perpetuo` desde la aplicación — es
  exclusivamente manual desde Firestore, igual que `admins/{uid}`.
- Ningún cambio a las reglas comerciales de Trial, Free o Pro para
  docentes sin licencia perpetua.

### Archivos modificados
- `firestore.rules`
- `login.html`
- `panel-docente.html`
- `docs/ESTADO_PROYECTO_V8_5.md`

### Validación realizada
- Sintaxis JavaScript de `login.html` y `panel-docente.html` verificada
  con `node --check` — sin errores.
- Balance de llaves/paréntesis/corchetes en `firestore.rules` tras el
  cambio: 44/44 llaves, 97/97 paréntesis, 15/15 corchetes.
- **No se probó contra un proyecto Firebase real** — mismo motivo que en
  entregas anteriores (sin red ni Firebase CLI/emulador en este entorno).
  Pendiente: asignar manualmente `perpetuo: true` a una cuenta de prueba
  en plan Pro y confirmar que la tarjeta cambia a "Plan Pro Perpetuo" y
  que una fecha de `proVencimiento` en el pasado no dispara la transición
  a Free.

---

## [V8.5.2] — Corrección: mensaje de grupo congelado prometía funcionalidad inexistente

### Contexto
Al probar manualmente el plan Free, se detectó que el aviso de grupo
congelado en `panel-docente.html` decía *"solo consulta/exportación"* y
*"puedes consultarlo y exportarlo"*, dando a entender que existía una
interfaz para revisar o exportar los grupos congelados. **Esa interfaz
nunca se construyó** — no existe ninguna pantalla en el proyecto para
consultar `historial` archivado por grupo; el único botón de exportación
(`exportarCSV()`) exporta la clase activa en pantalla, no historial
archivado. El texto copiaba la descripción de "Grupo Congelado" de
`PLANES_Y_SUSCRIPCIONES.md` (diseño aprobado) como si ya estuviera
implementada, sin serlo.

Corrección de alcance acotado, sin construir la interfaz pendiente: se
corrige únicamente el texto que promete algo inexistente, en tres lugares.

### Corregido — `panel-docente.html`
- Banner `#banner-grupo-congelado`: ya no dice "solo consulta/exportación,
  sin clases nuevas". Ahora dice que esos grupos no pueden iniciar clases
  nuevas, que sus datos permanecen guardados, que **todavía no hay
  pantalla** para consultarlos o exportarlos por separado, y que
  actualizar a Pro es la forma de volver a usarlos.
- Alerta de bloqueo dentro de `iniciarClase()` (cuando el docente intenta
  iniciar clase en un grupo distinto al activo): se quitó la misma
  promesa de "puedes consultarlo y exportarlo"; ahora solo indica que no
  se puede iniciar clase ahí y que los datos permanecen guardados.
- Ninguna otra lógica de `iniciarClase()`, `cargarSuscripcion()`,
  `verificarTransicionAutomatica()` ni `actualizarTarjetaPlan()` se
  modificó — el bloqueo de grupo activo/congelado sigue funcionando
  exactamente igual, solo cambió el texto.

### Corregido — `docs/ESTADO_PROYECTO_V8_5.md`
- Sección "GRUPOS → Grupo Congelado": se separó explícitamente el
  **comportamiento real implementado** (no puede iniciar clases; datos
  guardados; sin interfaz de consulta/exportación todavía; requiere Pro
  para volver a usar esos grupos) del **diseño aprobado y pendiente**
  (consultar / exportar / revisar historial — movidos a 🟡, con referencia
  a `PLANES_Y_SUSCRIPCIONES.md`).
- Se agregó una nota reconociendo que tanto la documentación anterior como
  el mensaje que veía el docente describían esa función como si ya
  existiera, y que ya se corrigió en ambos lugares.

### NO implementado (fuera de alcance de esta corrección, según instrucción)
- Pantalla o vista de historial filtrado por grupo.
- Exportación de historial archivado (de cualquier grupo, activo o
  congelado).
- Cualquier otra pantalla nueva.

### Archivos modificados
- `panel-docente.html`
- `docs/ESTADO_PROYECTO_V8_5.md`
- `CHANGELOG_V8.md`

### Validación realizada
- Revisión de texto únicamente (sin cambios de lógica) — no se requirió
  volver a correr `node --check`, pero se hizo de todas formas por
  consistencia con el resto de la entrega: sin errores de sintaxis.

---

## [V8.5.1] — Panel administrativo (cierre de V8.5)

### Contexto
Antes de continuar con Privacidad, Términos o Mercado Pago (V8.6/V8.7), se
pidió confirmar el estado real de `panel-admin.html`. Verificación:
**no existía** — ni el archivo, ni ninguna referencia a él fuera de
comentarios y documentos que lo listaban como pendiente
(`firestore.rules`, `PLANES_Y_SUSCRIPCIONES.md`, `CHANGELOG_V8.md`,
`docs/ESTADO_PROYECTO_V8_5.md`). Esta entrada lo construye, **usando
exclusivamente las métricas ya implementadas en V8.4** (`metricas_docentes`,
`metricas_docentes/{docenteUid}/alumnosVistos`, `onboarding_alumno_eventos`),
sin tocar `suscripciones` (V8.5) por instrucción explícita de esta entrega.

### Agregado — `panel-admin.html` (nuevo archivo)
- Requiere sesión de Firebase Auth (redirige a `login.html` si no hay
  usuario) **y** que ese UID tenga un documento en la nueva colección
  `admins/{uid}` — si Firestore rechaza la lectura de `metricas_docentes`
  (`permission-denied`), se muestra un aviso de acceso restringido en vez
  de fallar en silencio o mostrar un panel vacío.
- **Adopción y actividad:** docentes activados (con al menos un documento
  en `metricas_docentes`, es decir, que ya dieron su primera clase — se
  documenta explícitamente que esto **no** es "total de docentes
  registrados", dato que requeriría Firebase Auth Admin API y no está
  disponible desde el cliente sin backend); activos en los últimos 7 y 30
  días (`ultimaActividad`).
- **Uso:** total de clases impartidas (suma de `totalClases`); grupos
  distintos vistos (unión de todos los `gruposVistos`); alumnos únicos
  totales y promedio por docente (suma de conteos de la subcolección
  `alumnosVistos`, una lectura por docente).
- **Onboarding docente:** completado vs. omitido vs. sin dato, leído
  directamente de `onboardingDocente`.
- **Onboarding alumno:** total de eventos, % completado, distribución de
  en qué paso se omite la guía, leído de `onboarding_alumno_eventos`.
- **Docentes por escuela:** tabla agrupando `metricas_docentes` por el
  campo `escuela`.
- Todo el cálculo ocurre en el cliente sobre los documentos ya leídos — no
  se usa `count()` de Firestore ni BigQuery (no configurado en el
  proyecto), consistente con las fuentes de datos ya declaradas en
  `METRICAS_NEGOCIO.md` sección 0.

### Agregado — `firestore.rules`
- `function esAdmin()` — verifica `exists(/databases/.../admins/{uid})`
  para el usuario autenticado. `exists()` se evalúa con acceso interno del
  motor de reglas, sin depender de las reglas propias de `admins`.
- `admins/{uid}` — colección nueva, `allow read, write: if false` sin
  excepción: se administra exclusivamente desde la consola de Firebase o
  el Admin SDK. No existe ninguna pantalla ni ruta de código que escriba
  ahí — evita que cualquier cuenta pueda autoasignarse permisos de admin.
- `metricas_docentes/{docenteUid}` — se separó `allow read, write` (una
  sola regla) en `allow read` (dueño **o** `esAdmin()`) y `allow write`
  (dueño únicamente, mismo esquema cerrado de siempre, sin cambios en la
  escritura).
- `metricas_docentes/{docenteUid}/alumnosVistos/{alumnoId}` — mismo
  patrón: lectura para dueño o admin, escritura solo para el dueño.
- `onboarding_alumno_eventos/{eventoId}` — la lectura, antes `if false`
  con el comentario "reservado para un futuro panel-admin autenticado",
  pasa a `if esAdmin()` ahora que ese panel existe. Sin cambios en
  `create`/`update`/`delete`.

### NO implementado (fuera de alcance de esta entrega, según instrucción)
- Cualquier dato de `suscripciones` (trial/free/pro, ARPU, conversión) en
  el panel administrativo — se deja explícitamente para una entrega
  posterior, cuando se retome el trabajo de monetización.
- Total de docentes registrados (requiere Admin SDK/backend).
- Exportación del panel, filtros por rango de fecha, gráficas — el panel
  entrega los números y tablas base; visualizaciones más ricas quedan
  fuera de esta entrega.
- Migración a `collectionGroup` para el conteo de alumnos únicos — se usa
  una lectura por docente a su subcolección `alumnosVistos`, documentado
  como límite conocido si la base de docentes crece considerablemente.

### Archivos modificados/creados
- `panel-admin.html` (nuevo)
- `firestore.rules`
- `docs/ESTADO_PROYECTO_V8_5.md`
- `docs/CASOS_PRUEBA_PANEL_ADMIN_V8_5.md` (nuevo)

### Validación realizada
- Sintaxis JavaScript de `panel-admin.html` verificada con `node --check`
  sobre su bloque `<script>` — sin errores.
- Balance de llaves/paréntesis en `panel-admin.html` (56/56 llaves,
  110/110 paréntesis) y en `firestore.rules` tras los cambios (44/44
  llaves, 94/94 paréntesis, 15/15 corchetes).
- Conteo de `<div>`/`</div>` en `panel-admin.html`: 61/61 (verificación
  aproximada; el HTML se genera parcialmente por JavaScript, ver limitación
  abajo).
- **No se probó contra un proyecto Firebase real** — mismo motivo que en
  V8.5.0: sin acceso de red ni Firebase CLI/emulador en este entorno. Ver
  `docs/CASOS_PRUEBA_PANEL_ADMIN_V8_5.md`.

---

## [V8.5.0] — Sistema de suscripciones (Trial / Free / Pro)

### Contexto
Corrige una inconsistencia detectada entre `# estado del proyecto 8.5.md`
(marcaba el sistema de suscripciones como ✅ completado) y el código real,
que no contenía ninguna referencia a `suscripciones`, `trial`, `free`, `pro`
ni `grupoActivo`. `PLANES_Y_SUSCRIPCIONES.md` confirmaba en su propio
encabezado: *"Modelo comercial aprobado, sin implementación de código
todavía"*. Esta entrada implementa el modelo descrito en ese documento,
tomándolo (junto con la corrección del estado del proyecto) como única
fuente de verdad, sin volver a discutir ni rediseñar las decisiones ya
aprobadas.

### Agregado — `docs/ESTADO_PROYECTO_V8_5.md`
- Nuevo documento maestro que reemplaza a `# estado del proyecto 8.5.md`.
- Separa explícitamente **✅ IMPLEMENTADO** de **🟡 APROBADO Y PENDIENTE DE
  IMPLEMENTACIÓN**. El sistema de suscripciones pasa de estar listado como
  completado a reflejar su estado real en cada punto de esta entrega.
- Documenta tres desviaciones deliberadas respecto a la redacción literal
  de `PLANES_Y_SUSCRIPCIONES.md` (ver sección "NO implementado" abajo).

### Agregado — `login.html`
- `registrar()`: al crear la cuenta, además del mapeo de código docente ya
  existente, se crea `suscripciones/{uid}` con `estado: "trial"`,
  `trialInicio` = fecha de registro (Firebase Auth), `trialFin` =
  `trialInicio + 15 días`, y el resto de campos en `null`/`[]`. No bloquea
  el registro si la escritura falla.

### Agregado — `panel-docente.html`
- `cargarSuscripcion()` — `onSnapshot` sobre `suscripciones/{docenteUid}`,
  llamado desde `onAuthStateChanged` junto a las cargas ya existentes.
  Docentes creados antes de V8.5 (sin documento de suscripción) no reciben
  Trial retroactivo; simplemente no ven tarjeta de plan ni restricciones
  hasta que exista un proceso de migración (fuera de alcance de esta
  entrega).
- `verificarTransicionAutomatica()` — evalúa en cada carga del panel si
  `trialFin` o `proVencimiento` ya pasaron, y dispara la transición a
  `free` correspondiente. Siempre hacia el estado más restrictivo, nunca
  hacia `pro` (principio #4 de `PLANES_Y_SUSCRIPCIONES.md`).
- `determinarGrupoActivoReciente()` — consulta `historial` (filtrado por
  `docenteId`, ordenado por `fechaFin` descendente) para elegir el grupo de
  uso más reciente como nuevo grupo activo al pasar a `free`; el resto de
  grupos vistos se archivan en `gruposCongelados`.
- `ejecutarTransicionAFree(origen)` — escribe el nuevo estado en
  `suscripciones/{docenteUid}` y notifica al docente con un aviso claro
  (distinto según venga de `trial` o de `pro`), conservando siempre el
  historial completo sin excepción.
- `actualizarTarjetaPlan()` — renderiza la tarjeta de plan en el header
  (`Trial · N días restantes` / `Plan Free` / `Plan Pro`), el banner de
  patrocinio de Psicología Aplicada (solo visible en `free`), y un aviso de
  grupo activo/congelados (solo en `free` con congelados presentes).
- `iniciarClase()` — se agrega la restricción de grupo activo: en plan
  `free`, si el docente aún no tiene `grupoActivo` asignado, el primer
  grupo con el que inicia clase se convierte automáticamente en su grupo
  activo; si ya tiene uno asignado y el grupo elegido es distinto, la
  creación de la clase se bloquea con un mensaje explicativo. `trial` y
  `pro` no tienen esta restricción. Ningún otro comportamiento de
  `iniciarClase()` se modificó.

### Agregado — `firestore.rules`
- `suscripciones/{docenteUid}` — lectura/escritura exclusiva del propio
  docente autenticado, mismo patrón que `clases/{docenteUid}` y
  `metricas_docentes/{docenteUid}`.
- `allow create` — exige que todo documento nuevo nazca exactamente en
  `estado: "trial"`, sin `proInicio`/`proVencimiento`/`precioPagado`, sin
  `grupoActivo` y con `gruposCongelados` vacío — impide que un cliente
  malicioso se autoasigne `pro` o un grupo activo arbitrario al crear el
  documento.
- `allow update` — esquema cerrado a los mismos 9 campos, `estado`
  restringido a los tres valores válidos (`trial`/`free`/`pro`).
- `allow delete: if false` — el historial de plan de un docente nunca se
  borra desde el cliente.

### NO implementado (explícitamente fuera de alcance, según instrucción)
- Mercado Pago, Stripe, facturación, descuentos, cupones, licencias
  institucionales.
- Pantalla o flujo de compra de Pro — no existe ningún botón ni ruta de
  código que escriba `estado: "pro"` todavía; las reglas de Firestore ya
  lo permiten para cuando se construya ese flujo.
- Cambio manual del grupo activo por el docente (pantalla no diseñada, ver
  sección 15 de `PLANES_Y_SUSCRIPCIONES.md`).
- `panel-admin.html`.

### Desviaciones documentadas respecto a `PLANES_Y_SUSCRIPCIONES.md`
1. **Transiciones automáticas:** el proyecto no tiene Cloud Functions ni
   backend propio; la transición ocurre quando el docente abre el panel
   después de vencer su plazo, no en el instante exacto del vencimiento.
2. **Selección de grupo activo al pasar a Free:** el documento sugiere
   basarse en `ultimaClaseEn` por grupo "vía `metricas_docentes`", pero esa
   colección no guarda una marca de tiempo por grupo individual. Se usa
   `historial` (ordenado por `fechaFin`) como equivalente práctico.
3. **Límite de alumnos en Free:** `PLANES_Y_SUSCRIPCIONES.md` (sección 2.2)
   especifica un máximo de 60 alumnos distintos. La instrucción de esta
   entrega definió Free como "1 grupo activo, sin límite de alumnos". Se
   implementó sin el tope de 60, siguiendo la instrucción más reciente.
   **Esta divergencia entre ambos documentos queda sin resolver** y debe
   decidirse explícitamente (actualizar `PLANES_Y_SUSCRIPCIONES.md` o
   agregar el límite de 60 en una entrega posterior).

### Archivos modificados
- `login.html`
- `panel-docente.html`
- `firestore.rules`
- `docs/ESTADO_PROYECTO_V8_5.md` (nuevo, reemplaza a `# estado del proyecto 8.5.md`)

### Validación realizada
- Sintaxis JavaScript de `login.html` y `panel-docente.html` verificada con
  `node --check` sobre el contenido de sus bloques `<script>` — sin
  errores.
- Balance de llaves/paréntesis verificado en `panel-docente.html` (208/208
  llaves, 455/455 paréntesis) y en `firestore.rules` (37/37 llaves, 77/77
  paréntesis, 15/15 corchetes).
- **No se ejecutaron pruebas contra un proyecto Firebase real** — este
  entorno no tiene acceso de red saliente ni Firebase CLI/emulador
  disponible. Ver `docs/CASOS_PRUEBA_SUSCRIPCIONES_V8_5.md` para el plan de
  pruebas manual que debe ejecutarse contra el proyecto real
  (`app-clase-3a564`) antes de desplegar `firestore.rules`.

### Impacto en lecturas/escrituras (estimado, sobre la base ya calculada en V8.4)
| Concepto | Adicional |
|---|---|
| Lecturas | +1 por carga de panel (`onSnapshot` de `suscripciones`, se mantiene abierto, no se repite por acción) |
| Escrituras | +1 única al registrarse (creación de Trial); +1 solo en el momento de cada transición automática (no por clase) |
| Almacenamiento | Un documento pequeño y fijo por docente (`suscripciones/{docenteUid}`) — no crece con el uso |

---

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
