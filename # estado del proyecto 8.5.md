# CONTROL DE AULA

## ESTADO MAESTRO DEL PROYECTO

Versión de referencia: V8.5
Fecha: Mayo 2026

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

# FUNCIONALIDADES IMPLEMENTADAS

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

✅ Onboarding docente

10 pasos

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

## Métricas

Implementadas en V8.4.

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

metricas_globales/onboarding_alumno_eventos/{eventoId}

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

En construcción.

Objetivo:

Visualizar:

- adopción
- retención
- uso
- escalabilidad
- crecimiento
- monetización

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

Sin límite de alumnos.

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

Primero:

- métricas
- panel administrativo
- planes

---

# SUSCRIPCIONES

Colección:

suscripciones/{docenteUid}

Campos previstos:

- plan
- estado
- fechaRegistro
- fechaInicioPrueba
- fechaFinPrueba
- fechaInicioPro
- fechaFinPro
- ultimaActualizacion

---

# TRANSICIONES APROBADAS

Registro

↓

Trial

↓

15 días

↓

Free

---

Free

↓

Compra

↓

Pro

---

Pro

↓

Vencimiento

↓

Free

---

# GRUPOS

## Grupo Activo

Puede:

- crear clases
- iniciar sesiones

---

## Grupo Congelado

Puede:

- consultar
- exportar
- revisar historial

No puede:

- crear nuevas clases
- iniciar sesiones

---

# PSICOLOGÍA APLICADA

Psicología Aplicada es la marca institucional principal.

Actualmente:

Patrocinador de:

Control de Aula Free

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

✅ Sistema de suscripciones

✅ Trial

✅ Free

✅ Pro

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