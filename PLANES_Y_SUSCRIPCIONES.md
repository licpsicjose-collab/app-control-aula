# Planes y Suscripciones — Control de Aula

**Versión del documento:** 1.0 (V8.5) · **Estado:** Modelo comercial aprobado, sin implementación de código todavía.

Este documento es la fuente de verdad del modelo comercial de Control de Aula. Cualquier implementación futura (Firestore, reglas de seguridad, pantallas de pago, panel administrativo) debe construirse a partir de las definiciones aquí descritas, no al revés.

---

## 1. Objetivo del sistema de planes

Dar a Control de Aula una vía de monetización sostenible sin sacrificar lo que hizo viable el producto hasta ahora: adopción simple y sin fricción para un docente individual. El sistema de planes debe:

- Permitir que cualquier docente pruebe el producto completo, sin restricciones, antes de comprometerse.
- Ofrecer una versión gratuita permanente que siga siendo genuinamente útil (no una demo degradada), para sostener la base de usuarios y el boca-a-boca institucional ya identificado en `METRICAS_NEGOCIO.md`.
- Dar un camino de pago simple, de precio fijo y predecible, sin niveles intermedios que compliquen la decisión de compra.
- No requerir intervención manual del equipo para las transiciones de estado (trial → free, pro → free al vencer) — deben ser automáticas y basadas en tiempo.

---

## 2. Definición completa de los planes

### 2.1 Plan Trial

| Atributo | Valor |
|---|---|
| Duración | 20 días naturales |
| Grupos | Ilimitados |
| Alumnos | Ilimitados |
| Funciones | Todas las funciones del producto, sin restricción |
| Costo | Sin costo, sin captura de método de pago |
| Se activa | Automáticamente al registrarse un nuevo docente |
| Termina | Automáticamente, por tiempo, nunca por acción manual del docente |

El Trial existe para que el docente experimente el producto en condiciones reales — varios grupos, sin límite de alumnos — antes de decidir si continúa en el plan gratuito o compra Pro. No es una versión reducida; es el producto completo, con fecha de caducidad.

### 2.2 Plan Free

| Atributo | Valor |
|---|---|
| Duración | Indefinida |
| Grupos | 1 grupo activo (ver definición en sección 10) |
| Alumnos | Máximo 60 alumnos distintos dentro del grupo activo |
| Funciones incluidas | Participaciones, evaluaciones, retardos, historial, exportación, PWA |
| Costo | Sin costo |
| Se activa | Automáticamente al terminar el Trial, o automáticamente al vencer un plan Pro no renovado |
| Patrocinio | Sí — Psicología Aplicada (ver sección 13) |

Free es el estado por defecto y permanente de cualquier docente que no paga. Debe seguir siendo una herramienta real de trabajo diario para un docente con un solo grupo — el límite de 60 alumnos cubre holgadamente un grupo escolar típico.

### 2.3 Plan Pro

| Atributo | Valor |
|---|---|
| Vigencia | 12 meses desde la fecha de activación |
| Precio de lanzamiento | $399 MXN por año (histórico — ver sección 17, punto 3) |
| Precio vigente | $500 MXN por año (desde V8.6.6) |
| Grupos | Ilimitados |
| Alumnos | Ilimitados |
| Funciones | Todas las funciones del producto, sin restricción |
| Patrocinio | No se muestra ningún patrocinio |
| Renovación | No automática en esta versión (ver sección 16) |

"Precio inicial" significa que este es el precio de lanzamiento, no necesariamente el precio futuro — ver el principio de precio bloqueado en la sección 17.

---

## 3. Estados posibles

El sistema reconoce exactamente **tres estados**, mutuamente excluyentes, en el campo `estado` de cada docente:

- `trial`
- `free`
- `pro`

No existe un cuarto estado como `"vencido"` o `"cancelado"` — un Pro que vence transiciona automáticamente a `free` (sección 8); no hay un estado intermedio de "gracia" ni de "suspendido" en esta versión.

---

## 4. Colección sugerida: `suscripciones/{docenteUid}`

Un documento por docente, con el mismo `docenteUid` que ya identifica al docente en `clases/{docenteUid}` y `metricas_docentes/{docenteUid}` — mismo patrón de acceso ya establecido en el resto del sistema (documento propio, solo legible/escribible por su dueño autenticado).

**No se propone ningún cambio a Firestore ni a las reglas en esta entrega** — esta es la especificación para una implementación futura.

---

## 5. Campos necesarios

| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | string | `"trial"` \| `"free"` \| `"pro"` |
| `trialInicio` | timestamp | Fecha de registro del docente — ancla el conteo de los 20 días (ver Observación de consistencia #1 en la respuesta de esta entrega) |
| `trialFin` | timestamp | `trialInicio` + 20 días, calculado una sola vez y almacenado para no recalcular en cada lectura |
| `proInicio` | timestamp \| null | Fecha en que se activó Pro (null si nunca ha sido Pro) |
| `proVencimiento` | timestamp \| null | `proInicio` + 12 meses |
| `precioPagado` | número \| null | Lo que efectivamente pagó ese docente, en MXN — no el precio vigente actual (ver sección 17) |
| `grupoActivo` | string \| null | El único `grupoClase` permitido para crear clases nuevas bajo Free (null mientras el docente esté en `trial` o `pro`, donde no aplica ninguna restricción) |
| `gruposCongelados` | array de string | Grupos que existieron antes de una restricción a Free y que hoy no pueden usarse para nuevas clases (ver secciones 9-11) |
| `actualizadoEn` | timestamp | Última vez que se modificó este documento, mismo patrón que `ultimaActividad` en `metricas_docentes` |

**Deliberadamente fuera de este documento:** cualquier dato de facturación (número de tarjeta, referencia de pago, etc.) — eso vive en el proveedor de pagos (Stripe/Mercado Pago, no seleccionado todavía), nunca en Firestore.

---

## 6. Flujo completo de vida del usuario

```
Registro del docente
        │
        ▼
   estado: "trial"  ──── (20 días) ────┐
        │                               │
        │ (el docente compra Pro        │ (pasan 20 días
        │  en cualquier momento          │  sin comprar)
        │  durante el Trial)             │
        ▼                               ▼
   estado: "pro"                  estado: "free"
        │                               │
        │ (pasan 12 meses               │ (el docente compra
        │  sin renovar)                 │  Pro en cualquier momento)
        ▼                               │
   estado: "free"  ◄──────────────────┘
   (grupos excedentes                  estado: "pro"
    se congelan)                      (grupos congelados
        │                              se descongelan)
        │
        └──── (el docente compra Pro en cualquier momento) ────► estado: "pro"
```

El docente puede pasar a `pro` desde `trial` o desde `free` en cualquier momento. La única transición **automática** (sin acción del docente) es `trial → free` y `pro → free`. Nunca hay una transición automática hacia `pro` — eso siempre requiere un pago confirmado.

---

## 7. Qué ocurre cuando termina el Trial

1. Al llegar `trialFin`, el `estado` cambia de `trial` a `free` automáticamente.
2. El docente conserva **todo su historial** de clases anteriores, sin excepción — el paso a Free nunca borra datos.
3. Si el docente venía usando más de un grupo durante el Trial, el sistema debe elegir **uno** como grupo activo (ver regla de selección en la sección 15, casos límite) y congelar el resto.
4. Se muestra al docente un aviso claro de que su plan cambió, con la opción de actualizar a Pro.
5. El patrocinio de Psicología Aplicada empieza a mostrarse a partir de este momento (nunca durante el Trial).

---

## 8. Qué ocurre cuando vence Pro

1. Al llegar `proVencimiento` sin una renovación confirmada, el `estado` cambia de `pro` a `free` automáticamente — mismo mecanismo que el fin del Trial.
2. Se aplica la misma lógica de grupo activo/grupos congelados que en la sección 7, ya que un docente Pro pudo haber acumulado más de un grupo activo durante su año de vigencia.
3. El historial completo se conserva sin excepción, igual que en el punto anterior.
4. No hay periodo de gracia en esta versión (ver limitación en la sección 16) — el cambio a Free es inmediato al vencer.
5. El docente puede volver a Pro en cualquier momento posterior, sin penalización.

---

## 9. Qué ocurre con los grupos excedentes

Cuando un docente pasa a `free` (por fin de Trial o vencimiento de Pro) y tenía más de un grupo en uso:

- **Un solo grupo se mantiene activo** (campo `grupoActivo`).
- **El resto pasa a `gruposCongelados`.**
- Los grupos congelados **no pierden ningún dato**: su historial sigue siendo consultable y exportable con normalidad.
- Lo único que un grupo congelado no puede hacer es **iniciar una clase nueva** mientras el docente esté en `free`.
- Si el docente actualiza a Pro más adelante, todos sus grupos congelados vuelven a estar disponibles automáticamente, sin que el docente tenga que hacer nada.

---

## 10. Definición de grupo activo

El **grupo activo** es el único valor de `grupoClase` con el que un docente en plan `free` puede ejecutar `iniciarClase()`. Es un solo valor de texto, almacenado en `suscripciones/{docenteUid}.grupoActivo`, y determina la única restricción de uso funcional que distingue a Free de Trial/Pro (más allá del límite de 60 alumnos).

## 11. Definición de grupo congelado

Un **grupo congelado** es cualquier grupo que el docente usó en el pasado (existe en su `historial`) pero que no coincide con el `grupoActivo` actual, mientras el docente está en plan `free`. Un grupo congelado:

- ✅ Puede consultarse en el historial.
- ✅ Puede exportarse en CSV.
- ❌ No puede usarse para crear una clase nueva.

Un grupo congelado no es una eliminación ni una degradación de datos — es exclusivamente una restricción de **creación de clases nuevas**.

---

## 12. Flujo de actualización a Pro

1. El docente, desde cualquier estado (`trial` o `free`), elige actualizar a Pro.
2. Se le presenta el precio vigente en ese momento ($500 MXN/año desde V8.6.6 — no necesariamente el mismo si el precio vuelve a cambiar en el futuro, ver sección 17).
3. El docente completa el pago a través del proveedor que se seleccione en una versión futura (fuera de alcance de esta entrega).
4. Al confirmarse el pago: `estado = "pro"`, `proInicio = ahora`, `proVencimiento = ahora + 12 meses`, `precioPagado = <precio pagado en esa transacción>`.
5. Si el docente venía de `free` con grupos congelados, `gruposCongelados` se vacía (todos vuelven a estar disponibles) y `grupoActivo` deja de tener efecto restrictivo mientras el estado sea `pro`.

---

## 13. Patrocinio Psicología Aplicada

El plan Free se sostiene, en parte, mediante un patrocinio visible de Psicología Aplicada — la misma identidad institucional detrás del símbolo Ψ ya definido en el trabajo de identidad visual del producto (ícono, pantalla de login). Mientras un docente esté en `estado: "free"`:

- Se muestra una atribución de patrocinio (ubicación exacta y diseño gráfico, pendientes de definir en una futura entrega de diseño — no se especifican aquí para no invadir una decisión visual que corresponde a ese proceso).
- El patrocinio **no se muestra** en `trial` (el docente todavía está evaluando el producto, no es el momento de introducir un patrocinador) ni en `pro` (el docente ya paga por el producto, por lo que no debe convivir con publicidad ni patrocinio de terceros).

---

## 14. Métricas de conversión

Esta sección conecta directamente con la sección 4 ("Métricas de monetización") de `METRICAS_NEGOCIO.md`, que había quedado marcada como **[Requiere construcción previa]** por falta de un sistema de planes. Con `suscripciones/{docenteUid}` definido, esas métricas quedan así:

| Métrica de `METRICAS_NEGOCIO.md` | Cómo se calcula ahora |
|---|---|
| 4.1 — Tasa de conversión free → pro | Docentes con `estado == "pro"` y `proInicio` no nulo ÷ total de docentes que alguna vez tuvieron `estado == "free"` |
| 4.1 (variante) — Tasa de conversión trial → pro | Docentes que llegaron a `pro` con `proInicio` anterior a su `trialFin` ÷ total de docentes que tuvieron `estado == "trial"` |
| 4.2 — ARPU / MRR | ARPU = promedio de `precioPagado` entre docentes con `estado == "pro"`; MRR = suma de `precioPagado` de suscripciones vigentes ÷ 12 (ya anticipado como "normalizado a mensual" en `METRICAS_NEGOCIO.md`, correcto para un plan exclusivamente anual) |
| 4.4 — Churn de pago | Docentes cuyo `proVencimiento` ya pasó y siguen en `estado == "free"` (no renovaron) ÷ docentes cuyo `proVencimiento` ocurrió en el período |
| 4.5 — Proxy de disposición a pagar | Reemplazada por una medición directa: ya no hace falta simular umbrales sobre `historial`, ahora se puede medir con precisión cuántos docentes alcanzan el límite de 60 alumnos o de 1 grupo estando en `free` |

---

## 15. Casos límite

| Caso | Tratamiento propuesto |
|---|---|
| Un docente en `free` con 3 grupos congelados pasa a `pro` y luego vuelve a `free` (Pro no renovado) | Se vuelve a aplicar la regla de un solo grupo activo; **el grupo activo por defecto debe ser el de uso más reciente** (mayor `ultimaClaseEn` entre sus grupos, dato ya disponible vía `metricas_docentes`), no una elección arbitraria |
| El docente quiere cambiar manualmente cuál es su grupo activo en `free` | Debe ser una acción explícita y disponible en el producto (pantalla no diseñada en esta entrega); se recomienda limitar la frecuencia de cambio (p. ej. una vez cada 30 días) para evitar que alguien rote grupos para evadir el límite de alumnos |
| Un docente crea una segunda cuenta con otro correo para obtener un nuevo Trial | Riesgo aceptado en esta versión — no hay verificación de identidad más allá del correo electrónico; se documenta como limitación conocida, no se resuelve aquí |
| El pago de Pro se confirma pero la app no logra escribir `suscripciones/{docenteUid}` (falla de red) | Requiere una fuente de verdad externa (el proveedor de pagos) y un proceso de reconciliación — diseño pendiente para cuando se seleccione el proveedor |
| Un docente en `trial` nunca crea ninguna clase durante los 20 días | El Trial vence de todas formas — es un límite de **tiempo**, no de **uso** (ver Observación de consistencia #1) |
| Un alumno pertenece a un grupo que se congela a mitad de una clase activa | No aplica — la restricción de grupo activo/congelado solo bloquea la **creación** de clases nuevas, nunca interrumpe una clase ya en curso |

---

## 16. Funcionalidades que NO forman parte de esta versión

- Renovación automática o recurrente de Pro (cada renovación es una acción manual del docente).
- Periodo de gracia entre el vencimiento de Pro y el paso a Free.
- Planes mensuales, o cualquier variante de precio distinta a la anual (ver sección 2.3 para el precio vigente).
- Descuentos, cupones o precios promocionales.
- Planes institucionales o facturación por escuela completa (esta versión factura únicamente por docente individual).
- Reembolsos o cancelaciones a mitad de período.
- Notificaciones automáticas por correo (aviso de Trial por vencer, Pro por vencer, etc.).
- Selección del proveedor de pagos (Stripe, Mercado Pago, u otro) — deliberadamente no decidido en este documento.
- Cualquier pantalla o interfaz de usuario para gestionar el plan — este documento es solo la definición del modelo de datos y las reglas de negocio.
- El propio `panel-admin.html` (sigue sin construirse, según la instrucción de V8.4, vigente también aquí).

---

## 17. Principios del modelo comercial

1. **El Trial es tiempo, no uso.** Corre por calendario desde el registro, no desde la primera clase — un docente no puede "pausar" su periodo de prueba por no usarlo.
2. **Ningún cambio de plan borra datos.** Pasar de Pro a Free nunca elimina historial ni información de alumnos — solo restringe qué se puede crear de ahora en adelante.
3. **Precio bloqueado para quien ya pagó.** Si el precio de Pro cambia en el futuro, quienes ya pagaron conservan el precio que pagaron en su próxima renovación, no el nuevo — por eso `precioPagado` se almacena por transacción, no se deriva de un precio global. (Ejemplo real: quienes pagaron $399 MXN en el precio de lanzamiento conservan $399 en su renovación, aunque el precio vigente para nuevas altas sea $500 MXN desde V8.6.6.)
4. **Las transiciones automáticas van siempre hacia el estado más restrictivo, nunca hacia el más permisivo.** El sistema nunca otorga Pro automáticamente; solo retira Pro automáticamente al vencer.
5. **El patrocinio es exclusivo del plan gratuito.** Nunca convive con un plan pagado, y nunca aparece durante la evaluación (Trial).
6. **Simplicidad operativa sobre sofisticación comercial.** Tres estados, un solo precio, sin niveles intermedios — apropiado para la etapa actual de un producto con un solo desarrollador, según ya se discutió en el análisis de viabilidad de negocio.
