# CONTROL DE AULA

## ESTADO MAESTRO DEL PROYECTO

Versión de referencia: V8.5
Fecha de esta corrección: Agosto 2026

Este documento **reemplaza** a `# estado del proyecto 8.5.md` como fuente
oficial de verdad. El documento anterior marcaba como completado (✅) el
sistema de suscripciones (Trial/Free/Pro, grupos activos/congelados,
tarjeta de plan) cuando en realidad ese trabajo era, en ese momento, solo
un **modelo comercial aprobado sin código** (ver `PLANES_Y_SUSCRIPCIONES.md`,
que lo indicaba explícitamente en su encabezado). Esta corrección separa
con claridad qué existe en el código de qué es una decisión aprobada
todavía sin construir, y documenta la implementación realizada a partir de
esta entrega.

---

# PROPÓSITO DEL DOCUMENTO

Este documento es la fuente oficial de verdad del proyecto.

Cualquier IA, desarrollador o colaborador deberá leer este documento antes de realizar cambios.

No reinterpretar decisiones.

No rediseñar funcionalidades ya aprobadas.

Continuar únicamente desde el estado documentado aquí.

---

# VISIÓN DEL PROYECTO

Control de Aula es una plataforma educativa para docentes que busca promover el uso académico de dispositivos móviles dentro del aula mediante:

- Registro de asistencia
- Participaciones
- Evaluaciones
- Seguimiento de actividad
- Control de acceso
- Historiales de clase

El objetivo es ofrecer una herramienta sencilla para docentes de educación media superior y superior.

---

# ✅ IMPLEMENTADO (código funcional en el repositorio)

## Autenticación

✅ Registro docente

✅ Inicio de sesión

✅ Recuperación de contraseña

✅ Cierre de sesión

---

## Aula

✅ Crear clase

✅ Código de acceso

✅ Entrada Normal

✅ Entrada por Retardo

✅ Activación manual del Retardo

✅ Pausar clase

✅ Finalizar clase

---

## Seguimiento

✅ Participaciones

✅ Evaluaciones

✅ Historial

✅ Exportación CSV

✅ Registro de salidas

✅ Registro de interrupciones

---

## Configuración

✅ Sensibilidad configurable

Alta = 3 segundos

Normal = 5 segundos

Baja = 10 segundos

---

## Seguridad

✅ XSS mitigado

✅ CSV Injection mitigado

✅ Firestore Rules endurecidas

✅ Recuperación segura de contraseña

---

## UX

✅ Onboarding docente — 10 pasos, confirmado por conteo directo en `pasosRecorrido[]` dentro de `panel-docente.html` (verificado en V8.5.4; una versión anterior de este documento afirmaba incorrectamente "8 pasos implementados" sin haberlo verificado contra el código — era un error de documentación, no del código, ya corregido)

Incluye:

- Privacidad
- Explicación de códigos
- Explicación de Retardo

✅ Onboarding alumno

5 pasos

✅ PWA

✅ Manifest

✅ Centro de ayuda

---

## Métricas de negocio (V8.4)

✅ `metricas_docentes/{docenteUid}` — primerUso, ultimaActividad, ultimaClaseEn, totalClases, gruposVistos, escuela, onboardingDocente

✅ `metricas_docentes/{docenteUid}/alumnosVistos/{alumnoId}` — subcolección, no array

✅ `onboarding_alumno_eventos/{eventoId}` — eventos independientes, sin contador compartido

---

## Sistema de suscripciones (V8.5 — implementado en esta entrega)

✅ Colección `suscripciones/{docenteUid}`

✅ Creación automática de Trial al registrarse (`login.html` → `registrar()`)

✅ Transición automática `trial → free` al vencer los 15 días (verificada del lado del cliente al cargar `panel-docente.html`)

✅ Transición automática `pro → free` al vencer `proVencimiento` (mismo mecanismo)

✅ Grupo activo / grupos congelados — selección automática del grupo más reciente al pasar a `free`, con base en `historial` (ver nota de implementación abajo)

✅ Restricción funcional: en plan `free`, `iniciarClase()` rechaza grupos distintos al grupo activo

✅ Tarjeta de plan visible en el panel del docente

✅ Patrocinio "Psicología Aplicada" mostrado únicamente en plan `free`

✅ `firestore.rules` actualizado con reglas para `suscripciones/{docenteUid}`

**Nota de implementación — transiciones automáticas:** el proyecto no tiene
backend propio ni Cloud Functions desplegadas; toda la lógica ocurre en el
cliente (`panel-docente.html`), disparada al iniciar sesión el docente. Esto
significa que la transición `trial → free` o `pro → free` ocurre la
**primera vez que el docente abre el panel después de vencer su plazo**, no
exactamente en el instante en que vence. Es una limitación conocida y
aceptable para esta versión (sin servidor), documentada aquí para que no se
asuma erróneamente un cron o una Cloud Function inexistente.

**Nota de implementación — selección de grupo activo:** `PLANES_Y_SUSCRIPCIONES.md`
(sección 15) especifica elegir el grupo de `ultimaClaseEn` más reciente
"dato ya disponible vía `metricas_docentes`". En la práctica,
`metricas_docentes.gruposVistos` es un arreglo sin marca de tiempo por
grupo, por lo que no permite esa ordenación directamente. Se implementó en
su lugar una consulta a `historial` (ordenada por `fechaFin` descendente,
filtrada por `docenteId`) para determinar el grupo usado más recientemente.
El resultado es equivalente en la práctica, pero se documenta la
desviación respecto a la redacción literal del documento de planes.

**Nota de implementación — límite de alumnos en Free:** `PLANES_Y_SUSCRIPCIONES.md`
(sección 2.2) especifica un máximo de 60 alumnos distintos en el grupo
activo. La instrucción de esta entrega, dada directamente en la
conversación, especifica Free como "1 grupo activo, sin límite de
alumnos" — sin el tope de 60. Se implementó **sin límite de alumnos**,
seg��n la instrucción más reciente. Esto es una divergencia real respecto a
`PLANES_Y_SUSCRIPCIONES.md` que debe resolverse explícitamente (actualizar
ese documento o revertir la implementación) para que ambos vuelvan a
coincidir.

---

# 🟡 APROBADO Y PENDIENTE DE IMPLEMENTACIÓN

## Pagos y facturación

🟡 Integración con proveedor de pago (Mercado Pago / Stripe — no seleccionado)

🟡 Flujo de compra de Pro (pantalla de pago, confirmación, `precioPagado`)

🟡 Renovación de Pro

🟡 Facturación, descuentos, cupones, licencias institucionales — explícitamente fuera de alcance de todas las versiones previstas

## Panel administrativo

✅ `panel-admin.html` — construido en V8.5.1, exclusivamente sobre métricas V8.4

✅ Control de pagos (suscripciones) — agregado en V8.6.2: plan actual, días restantes y aviso visual de vencimiento próximo por docente. Solo lectura, no reemplaza ningún flujo de pago.

🟡 ARPU, tasa de conversión trial→pro, y otras métricas de monetización más allá del estado actual por docente — todavía no calculadas

🟡 Gráficas, filtros por fecha, exportación del panel

## Otros

🟡 Cambio manual de grupo activo por el docente (pantalla no diseñada)

🟡 Aviso de Privacidad, Términos de Uso, Política de Soporte (V8.6)

---

# DECISIONES IMPORTANTES

## Modo Retardo

NO eliminar.

NO automatizar.

NO reemplazar por código único.

Se conserva:

✅ Código Normal

✅ Código Retardo

✅ Activación manual

Motivo:

Evitar uso posterior del código inicial por alumnos ausentes.

---

## Sensibilidad

Se conserva.

Campo:

sensibilidad

aprobado en firestore.rules.

---

# ARQUITECTURA DE MÉTRICAS

## Colección

metricas_docentes/{docenteUid}

Campos:

- primerUso
- ultimaActividad
- ultimaClaseEn
- totalClases
- gruposVistos
- escuela
- onboardingDocente
- onboardingDocentePasoOmitido

---

## Subcolección

metricas_docentes/{docenteUid}/alumnosVistos/{alumnoId}

Decisión:

NO usar arrays.

Motivo:

Evitar crecimiento indefinido del documento principal.

---

## Eventos globales

onboarding_alumno_eventos/{eventoId}

Campos:

- tipo
- paso
- timestamp

Decisión:

NO usar contadores compartidos.

Motivo:

Evitar contención de escrituras.

---

# PANEL ADMINISTRATIVO

Estado:

✅ Implementado (`panel-admin.html`, V8.5.1) — exclusivamente sobre métricas V8.4.

Acceso:

Requiere sesión de Firebase Auth + documento en `admins/{uid}` (gestionado solo desde la consola de Firebase, sin ruta de escritura desde el cliente).

Visualiza (con datos ya disponibles):

- adopción (docentes activados, activos 7/30 días)
- uso (clases impartidas, grupos vistos, alumnos únicos)
- onboarding docente y alumno
- distribución por escuela

Pendiente:

- monetización (trial/free/pro) — fuera de esta entrega por instrucción explícita
- retención, escalabilidad, crecimiento en el sentido pleno de `METRICAS_NEGOCIO.md` — requieren series de tiempo/BigQuery, no solo el snapshot actual

---

# MODELO COMERCIAL APROBADO

## TRIAL

Duración:

15 días

Incluye:

- Grupos ilimitados
- Todas las funciones

Inicia:

Fecha de registro Firebase Auth.

NO usar primerUso.

---

## FREE

Incluye:

- 1 grupo activo
- Sin límite de alumnos (instrucción de esta entrega — ver nota de implementación arriba sobre la divergencia con el tope de 60 de `PLANES_Y_SUSCRIPCIONES.md`)

Mantiene:

- Participaciones
- Evaluaciones
- Historial
- Exportaciones

Incluye patrocinio:

Psicología Aplicada

---

## PRO

Precio:

$399 MXN anuales

Incluye:

- Grupos ilimitados
- Sin patrocinio
- Todas las funciones

---

# DECISIONES DE MONETIZACIÓN

NO implementar todavía:

- Stripe
- Mercado Pago
- Facturación
- Descuentos
- Cupones
- Licencias institucionales

---

# SUSCRIPCIONES

Colección:

suscripciones/{docenteUid}

Campos (implementados):

- estado ("trial" | "free" | "pro")
- trialInicio
- trialFin
- proInicio
- proVencimiento
- precioPagado
- grupoActivo
- gruposCongelados
- actualizadoEn
- perpetuo (boolean — V8.5.3, licencias Pro sin vencimiento; ver sección "Licencias perpetuas")

---

# LICENCIAS PERPETUAS (V8.5.3)

Campo `perpetuo` (boolean) en `suscripciones/{docenteUid}`, nace siempre en
`false` al registrarse.

Cuando `perpetuo == true`:

- Se ignoran `trialFin` y `proVencimiento` por completo — sin importar la
  fecha, no dispara ninguna transición automática.
- Se ignora la transición `trial → free` y `pro → free`.
- Se mantienen los beneficios de Pro (sin restricción de grupo activo,
  sin patrocinio) mientras `estado == "pro"`.
- La tarjeta de plan muestra "Plan Pro Perpetuo" en vez de "Plan Pro".

Asignación: **exclusivamente manual, desde la consola de Firebase**,
editando directamente el documento `suscripciones/{docenteUid}` de un
docente y poniendo `estado: "pro"` y `perpetuo: true`. No existe ninguna
pantalla ni ruta de código dentro de la aplicación que asigne esto —
tal como con `admins/{uid}` (V8.5.1, panel administrativo), esta también es una
capacidad exclusivamente operativa.

No implica ningún cambio en el flujo de pago (sigue sin existir) ni en las
reglas comerciales de Trial/Free/Pro para el resto de los docentes.

`panel-admin.html` no se modificó — no usa datos de `suscripciones` (fuera
de alcance desde V8.5.1, sección "Panel administrativo"), por lo que no
hay ninguna incompatibilidad que resolver ahí.

---

# TRANSICIONES APROBADAS

Registro → Trial (15 días) → Free

Free → Compra → Pro

Pro → Vencimiento → Free

Estado del código: las transiciones automáticas (`trial → free`, `pro → free`)
están implementadas. La transición manual `free/trial → pro` depende de un
flujo de pago que todavía no existe (ver sección de pendientes).

---

# GRUPOS

## Grupo Activo

Puede:

- crear clases
- iniciar sesiones

## Grupo Congelado

**Comportamiento real implementado (V8.5.0):**

No puede:

- crear nuevas clases
- iniciar sesiones

Sus datos permanecen almacenados, pero **no existe todavía una interfaz
dedicada para consultarlos o exportarlos individualmente**. Para volver a
utilizar grupos adicionales se requiere actualizar al Plan Pro.

**Diseño aprobado, pendiente de implementación** (`PLANES_Y_SUSCRIPCIONES.md`,
sección Grupo Congelado — no confundir con lo anterior):

- 🟡 Consultar
- 🟡 Exportar
- 🟡 Revisar historial

Nota: una entrega anterior de esta documentación y el mensaje que veía el
docente en la app describían "consultar/exportar" como si ya existiera.
Era incorrecto — se corrigió en ambos lugares para no prometer una
funcionalidad que todavía no está construida.

---

# PSICOLOGÍA APLICADA

Psicología Aplicada es la marca institucional principal.

Actualmente:

Patrocinador de:

Control de Aula Free (implementado — banner visible solo en `estado: "free"`)

En el futuro podrá conectar otros productos educativos.

---

# PROYECTOS FUTUROS

## Asistencia Escolar

Objetivo:

Pase de lista automático.

Usuarios:

- Docentes
- Administración escolar

---

## Escuela y Familia

Objetivo:

Apoyo gratuito para padres.

Contenido:

- participación familiar
- hábitos de estudio
- acompañamiento escolar

---

# PENDIENTES ACTUALES

## V8.5

✅ Sistema de suscripciones (implementado en esta entrega, sin flujo de pago)

✅ Trial (automático)

✅ Free (automático, con grupo activo/congelado)

🟡 Pro (modelo de datos y reglas listos; sin flujo de compra)

✅ Tarjeta de plan

✅ Grupos activos

✅ Grupos congelados

---

## V8.6

✅ Aviso de Privacidad — redactado (`AVISO_PRIVACIDAD.md`)

✅ Términos de Uso — redactado (`TERMINOS_DE_USO.md`)

✅ Política de Soporte — redactado (`POLITICA_SOPORTE.md`)

✅ Los tres anteriores enlazados desde `panel-docente.html` en V8.6.2 (franja de enlaces debajo de los banners de suscripción).

✅ Consentimiento informado para padres/tutores de alumnos **menores de edad** — `CONSENTIMIENTO_INFORMADO_PADRES.html`, documento imprimible con bloque de firma, generado en V8.6. Enlazado desde el header de `panel-docente.html` ("📄 Consentimiento informado (padres)"). No aplica a alumnos mayores de edad — para ellos no se requiere firma de tutor. Ni la firma ni una eventual copia de identificación anexa se reciben o almacenan por la plataforma; quedan en resguardo físico del plantel/docente.

✅ Borrado automático de datos de alumnos a 6 meses (TTL de Firestore) — decidido y agregado en el código en V8.6.1; **falta configurar las 3 políticas TTL en la consola de Firebase**, ver `CHANGELOG_V8.md`.

✅ Control de pagos en `panel-admin.html` — agregado en V8.6.2.

Pendiente:

- Configurar las políticas TTL en Firestore (paso manual, no es código — ver `CHANGELOG_V8.md` V8.6.1).
- Revisión legal profesional de los cuatro documentos — ninguno ha sido revisado por un abogado.

---

## V8.7

Pendiente:

- Mercado Pago

---

# REGLA PRINCIPAL

No rediseñar funcionalidades ya aprobadas.

No eliminar:

- Retardo
- Sensibilidad
- Métricas
- Modelo Trial/Free/Pro

Continuar siempre desde este estado.
