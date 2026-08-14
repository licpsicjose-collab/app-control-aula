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

✅ Onboarding docente (10 pasos declarados / 8 pasos implementados en código — ver nota)

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

🟡 Métricas de monetización (trial/free/pro, ARPU, conversión) en el panel — explícitamente fuera de esta entrega, pendiente para cuando se retome el trabajo de suscripciones/pagos

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

$500 MXN anuales (vigente desde V8.6.6 — precio de lanzamiento fue $399 MXN, ver `PLANES_Y_SUSCRIPCIONES.md` sección 17)

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

Pendiente:

- Aviso de Privacidad
- Términos de Uso
- Política de Soporte

---

## V8.6.6

✅ Material de Pausa (exclusivo Pro) — campo, reglas de Firestore, UI
docente y UI alumno completos. Ver `CHANGELOG_V8.md` para el detalle
completo del diseño aprobado por partes.

✅ Precio vigente de Plan Pro actualizado a $500 MXN/año (antes $399,
ahora histórico — ver `PLANES_Y_SUSCRIPCIONES.md` sección 2.3 y 17).

🟡 Reporte de campo sin resolver: el material compartido no apareció en
algunos teléfonos al probar en condiciones reales. Causa más probable ya
identificada (condición de carrera entre la carga de la suscripción y el
botón "Compartir material") pero **deliberadamente sin corregir** —
decisión explícita de esperar más reportes antes de intervenir, para
confirmar que es un problema real y no un caso aislado.

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
