# Métricas de Negocio y Observabilidad — Control de Aula

Este documento diseña el sistema completo de métricas y administración del producto, **antes de escribir cualquier código de instrumentación**. Cubre 7 categorías: adopción, retención, uso, monetización, escalabilidad, costos e institucionales.

Cada métrica se describe con 4 elementos fijos:
- **Qué se mide** — la definición exacta del dato.
- **Cómo se calcula** — la fórmula y la fuente de datos real dentro del modelo actual de Firestore (`mapeo_codigos`, `clases/{docenteUid}`, `clases/{docenteUid}/alumnos`, `historial`, Firebase Auth).
- **Para qué sirve** — qué pregunta de negocio responde.
- **Qué decisiones permite tomar** — la acción concreta que se deriva de observarla.

Donde una métrica requiere infraestructura que **todavía no existe** (por ejemplo, cobros o Analytics/BigQuery), se marca explícitamente como **[Requiere construcción previa]**, en vez de asumir que ya está disponible.

---

## 0. Fuentes de datos disponibles hoy

| Fuente | Qué contiene | Métricas que alimenta |
|---|---|---|
| Firebase Authentication | Cuentas docentes, fecha de creación, último inicio de sesión | Adopción, retención |
| `mapeo_codigos/{codigoCorto}` | Relación código ↔ docenteUid | Adopción (conteo de docentes) |
| `clases/{docenteUid}` | Clase activa: escuela, materia, grupo, inicio, pausada, sensibilidad, modo | Uso, institucionales |
| `clases/{docenteUid}/alumnos/{id}` | Tiempo, salidas, participaciones, evaluación, tardanza por alumno | Uso, retención de alumnos |
| `historial/{id}` y su subcolección `alumnos` | Clases finalizadas y archivadas, con `docenteId` y `fechaFin` | Adopción, retención, uso histórico, institucionales |

**Nota importante:** hoy no existe ningún export a BigQuery ni Google Analytics/Firebase Analytics configurado. Las métricas marcadas como calculables "hoy" requieren consultas directas a Firestore (o una exportación programada); las que requieren agregaciones pesadas sobre grandes volúmenes deberán migrar a BigQuery cuando el volumen de `historial` lo justifique (ver sección 5).

---

## 1. Métricas de adopción

Responden: ¿está creciendo la base de usuarios, y de dónde viene ese crecimiento?

### 1.1 Docentes registrados (total y nuevos por período)
- **Qué se mide:** número total de cuentas docentes, y nuevas altas por semana/mes.
- **Cómo se calcula:** conteo de usuarios en Firebase Authentication filtrado por `metadata.creationTime`; en paralelo, conteo de documentos en `mapeo_codigos` (cada docente tiene exactamente uno) como validación cruzada.
- **Para qué sirve:** mide el volumen bruto de entrada al producto.
- **Qué decisiones permite tomar:** si las altas se estancan, indica un problema de adquisición (canal de ventas, boca-a-boca); si crecen sin retención (ver sección 2), indica un problema de producto, no de marketing.

### 1.2 Tasa de activación (docente que llega a crear su primera clase)
- **Qué se mide:** % de docentes registrados que efectivamente ejecutan `iniciarClase()` al menos una vez.
- **Cómo se calcula:** (docentes con al menos un documento en `historial` con su `docenteId`, o con una clase activa alguna vez en `clases/{docenteUid}`) ÷ (total de docentes registrados).
- **Para qué sirve:** distingue "se registró" de "usó el producto de verdad" — el primer indicador real de que el onboarding (V8.0/V8.1) está cumpliendo su función.
- **Qué decisiones permite tomar:** una activación baja apunta directamente al onboarding o al formulario de creación de clase como punto de fricción, no a la adquisición de usuarios.

### 1.3 Alumnos únicos conectados (por docente y agregado)
- **Qué se mide:** número de alumnos distintos que se han conectado a las clases de un docente, o al sistema en general.
- **Cómo se calcula:** conteo de documentos distintos en `clases/{docenteUid}/alumnos` y en las subcolecciones `alumnos` de `historial`, deduplicando por combinación `nombre_grupo` dentro de un mismo docente (con la limitación conocida de colisión de nombres idénticos, documentada desde la auditoría de seguridad).
- **Para qué sirve:** mide el alcance real del producto más allá del docente — cuántos estudiantes están efectivamente expuestos a la herramienta.
- **Qué decisiones permite tomar:** informa el tamaño de mercado ya alcanzado y sirve de insumo directo para negociar con una escuela ("ya tenemos X alumnos de tu plantel usando la herramienta").

### 1.4 Factor de viralidad interna (alumnos por docente)
- **Qué se mide:** promedio de alumnos únicos por docente activo.
- **Cómo se calcula:** (1.3) ÷ (docentes con al menos una clase creada).
- **Para qué sirve:** indica si el producto se está adoptando por grupos completos o solo de forma aislada.
- **Qué decisiones permite tomar:** un número bajo y estable sugiere invertir en facilitar que un docente comparta la herramienta con colegas de su escuela (por ejemplo, un flujo de invitación), en vez de solo adquisición 1 a 1.

### 1.5 Escuelas/planteles distintos (adopción institucional emergente)
- **Qué se mide:** número de valores distintos del campo `escuela` a través de todas las clases.
- **Cómo se calcula:** conteo de valores únicos (normalizados: minúsculas, sin espacios extra) del campo `escuela` en `clases` + `historial`.
- **Para qué sirve:** detecta si el crecimiento viene de una sola institución o se está expandiendo orgánicamente a nuevas escuelas.
- **Qué decisiones permite tomar:** una alta concentración en pocas escuelas sugiere priorizar una venta institucional formal (ver sección 7) antes que seguir invirtiendo en adquisición individual dispersa.

---

## 2. Métricas de retención

Responden: ¿el docente y el alumno siguen volviendo, o prueban una vez y se van?

### 2.1 Docentes activos semanales / mensuales (WAU / MAU)
- **Qué se mide:** número de docentes distintos que crearon o continuaron una clase en los últimos 7 / 30 días.
- **Cómo se calcula:** `docenteUid` distintos con un documento en `clases` con `inicio` dentro de la ventana, unión con `historial.fechaFin` dentro de la ventana.
- **Para qué sirve:** el indicador estándar de salud de un producto de uso recurrente.
- **Qué decisiones permite tomar:** una relación WAU/MAU baja (uso muy esporádico, ej. solo al inicio del ciclo escolar) sugiere que el modelo de precios (si existe) debe ser anual, no mensual, porque el patrón de uso real no es constante.

### 2.2 Retención por cohortes (curva de abandono)
- **Qué se mide:** de los docentes que crearon su primera clase en una semana/mes dado, qué % sigue creando clases 1, 4 y 12 semanas después.
- **Cómo se calcula:** agrupar docentes por semana de su primer registro en `historial` (o primera clase), y calcular el % de ese grupo con actividad en semanas posteriores.
- **Para qué sirve:** distingue un problema de "primera impresión" (caída fuerte en la semana 1) de un problema de "hábito" (caída gradual sostenida).
- **Qué decisiones permite tomar:** una caída abrupta en semana 1 apunta al onboarding o a la primera experiencia de clase; una caída gradual apunta a falta de valor sostenido (features que dejan de usarse, fricción operativa recurrente).

### 2.3 Tasa de abandono de docentes (churn de uso)
- **Qué se mide:** % de docentes activos en un mes que no vuelven a crear clases en los 2 meses siguientes.
- **Cómo se calcula:** (docentes activos en el mes M sin ninguna clase nueva en M+1 y M+2) ÷ (docentes activos en M).
- **Para qué sirve:** cuantifica la fuga de usuarios ya adoptados, la señal más cara de ignorar en cualquier producto.
- **Qué decisiones permite tomar:** dispara una revisión de soporte (¿tuvieron un ticket sin resolver?) o de producto (¿encontraron una limitación bloqueante, como la colisión de nombres o el límite del plan gratuito de Firebase?).

### 2.4 Retención de alumnos dentro de una misma clase recurrente
- **Qué se mide:** para un docente que usa la app con el mismo grupo repetidamente, qué % de sus alumnos se reconecta en sesiones subsecuentes.
- **Cómo se calcula:** para un mismo `docenteUid` + `grupoClase`, proporción de IDs de alumno (`nombre_grupo`) que aparecen en más de una clase archivada en `historial`.
- **Para qué sirve:** mide si el alumno percibe suficiente valor/costumbre para no evadir la conexión en sesiones futuras.
- **Qué decisiones permite tomar:** una caída en sesiones posteriores a la primera puede indicar que los alumnos aprenden a evitar la herramienta (por ejemplo, si perciben el modo de atención activo como punitivo); es una señal para revisar el tono y la comunicación del onboarding de alumno (V8.2).

---

## 3. Métricas de uso

Responden: ¿cómo se está usando el producto en el día a día, y qué funciones importan de verdad?

### 3.1 Clases activas simultáneas
- **Qué se mide:** número de documentos en `clases` (no en `historial`) en un instante dado.
- **Cómo se calcula:** conteo directo de la colección `clases` (tamaño acotado, ya que cada docente tiene como máximo un documento activo).
- **Para qué sirve:** mide la carga real de uso concurrente del sistema.
- **Qué decisiones permite tomar:** es el insumo directo para dimensionar el plan de Firebase (Spark vs. Blaze) y anticipar picos de costo (sección 6) durante horarios escolares.

### 3.2 Duración promedio de clase
- **Qué se mide:** tiempo entre `inicio` y `fechaFin` de las clases archivadas en `historial`.
- **Cómo se calcula:** promedio de (`fechaFin - inicio`) sobre todos los documentos de `historial`.
- **Para qué sirve:** valida si el uso real coincide con el supuesto de diseño (una sesión de clase, no un uso de todo el día).
- **Qué decisiones permite tomar:** si las clases duran mucho más de lo esperado, revisar si los docentes olvidan finalizar la clase (afecta directamente el costo de lecturas en tiempo real, sección 6).

### 3.3 Alumnos promedio por clase
- **Qué se mide:** número de alumnos conectados por clase.
- **Cómo se calcula:** promedio del tamaño de la subcolección `alumnos` sobre las clases en `historial`.
- **Para qué sirve:** dimensiona el tamaño típico de grupo, insumo para cualquier modelo de precios por alumno o por clase.

### 3.4 Uso de funciones específicas (adopción de features)
- **Qué se mide:** % de clases que usan cada función opcional: modo retardo (`activarRetardo` llamado), pausa (`pausada` alguna vez `true`), exportación CSV, al menos una evaluación asignada, sensibilidad distinta de "normal".
- **Cómo se calcula:** para cada clase en `historial`, verificar la presencia de la señal correspondiente (ej. `modo === "retardo"` en algún punto requeriría un registro de eventos, no solo el estado final — ver limitación abajo).
- **Para qué sirve:** identifica qué funciones son el núcleo real del producto (las que casi todos usan) frente a las que casi nadie toca.
- **Qué decisiones permite tomar:** las funciones de bajo uso son candidatas a simplificarse o a mejorar su descubribilidad en el onboarding; las de alto uso son las que hay que proteger al hacer cualquier cambio futuro (son las que un cliente pagaría por conservar).
- **Limitación honesta:** el modelo actual solo guarda el *estado final* de la clase en `historial`, no un registro de eventos histórico (por ejemplo, no queda huella de que el modo retardo estuvo activo si la clase terminó en modo normal por alguna razón). Medir esto con precisión **[Requiere construcción previa]**: un registro de eventos (ej. una subcolección `eventos` o un campo de auditoría), que hoy no existe.

### 3.5 Tasa de finalización correcta de clase
- **Qué se mide:** % de clases que terminan mediante `finalizarClase()` (aparecen en `historial`) frente a las que quedan abandonadas activas.
- **Cómo se calcula:** clases en `historial` ÷ (clases en `historial` + clases actualmente en `clases` con `inicio` de hace más de, por ejemplo, 24 horas, como proxy de "abandonadas").
- **Para qué sirve:** detecta fricción en el cierre del flujo, y también contamina las métricas de duración de clase (3.2) si no se filtra.
- **Qué decisiones permite tomar:** una tasa alta de abandono sin finalizar sugiere reforzar el aviso de "recuerda finalizar tu clase" o considerar un cierre automático por inactividad — pero esto último sería un cambio de lógica de negocio que requeriría su propio ciclo de especificación.

### 3.6 Interacción con el onboarding
- **Qué se mide:** % de docentes/alumnos que completan el recorrido (`finalizarRecorrido`/`finalizarGuiaAlumno`) frente a los que lo omiten (`omitirRecorrido`/`omitirGuiaAlumno`), y en qué paso lo omiten.
- **Cómo se calcula:** **[Requiere construcción previa]** — hoy el onboarding solo escribe `tutorialVisto`/`tutorialAlumnoVisto` en `localStorage` del navegador, sin reportar nada a Firestore. Para medir esto hace falta agregar un evento de telemetría (por ejemplo, una escritura ligera a una colección `metricas_onboarding` al omitir o finalizar, indicando el paso).
- **Para qué sirve:** identifica en qué paso específico se pierde el interés, información que ninguna otra métrica de este documento puede dar.
- **Qué decisiones permite tomar:** rediseñar o acortar el paso exacto donde más se abandona, en vez de adivinar.

---

## 4. Métricas de monetización

**Contexto:** hoy **no existe ningún sistema de cobro** (ni Stripe, ni Mercado Pago, ni límites de uso). Todas las métricas de esta sección están **[Requieren construcción previa]** de la infraestructura de planes/pagos antes de poder calcularse — se documentan aquí para que el modelo de datos de facturación se diseñe pensando en ellas desde el principio, no se agreguen como parche después.

### 4.1 Tasa de conversión free → pago
- **Qué se mide:** % de docentes en el plan gratuito que se convierten a un plan de pago.
- **Cómo se calcularía:** (docentes con una suscripción activa) ÷ (total de docentes registrados en algún momento en el plan gratuito).
- **Para qué sirve:** valida si el valor percibido justifica el precio fijado.
- **Qué decisiones permite tomar:** una conversión baja con alta activación (sección 1.2) sugiere un problema de precio o de propuesta de valor del plan pagado, no de producto en general.

### 4.2 Ingreso promedio por docente (ARPU) e Ingreso Recurrente Mensual (MRR)
- **Qué se mide:** ingreso mensual promedio por docente pagante, y el total recurrente mensual.
- **Cómo se calcularía:** suma de suscripciones activas ÷ número de docentes pagantes (ARPU); suma total normalizada a mensual (MRR).
- **Para qué sirve:** es el indicador estándar de salud financiera de un SaaS.
- **Qué decisiones permite tomar:** determina cuándo el producto puede sostener contratación de soporte dedicado (según el dimensionamiento ya diseñado para 100/500/1,000 docentes) sin depender de capital externo.

### 4.3 Costo de adquisición de cliente (CAC) y Valor de vida del cliente (LTV)
- **Qué se mide:** cuánto cuesta conseguir un docente pagante, y cuánto ingresa ese docente durante toda su relación con el producto.
- **Cómo se calcularía:** CAC = gasto total de adquisición ÷ nuevos docentes pagantes en el período; LTV = ARPU × duración promedio de suscripción antes de cancelar (inverso de la tasa de cancelación, 4.4).
- **Para qué sirve:** el criterio clásico para saber si el crecimiento es rentable (LTV debe superar varias veces al CAC).
- **Qué decisiones permite tomar:** si CAC se acerca o supera a LTV, se debe frenar la inversión en adquisición pagada y enfocarse en retención/referidos antes de escalar el gasto de marketing.

### 4.4 Tasa de cancelación de suscripción (churn de pago)
- **Qué se mide:** % de docentes pagantes que cancelan su suscripción en un período.
- **Cómo se calcularía:** cancelaciones del mes ÷ suscriptores activos al inicio del mes.
- **Para qué sirve:** distinto del churn de uso (2.3) — mide específicamente la pérdida de ingresos, no solo de actividad.
- **Qué decisiones permite tomar:** un churn de pago alto con churn de uso bajo (siguen usando la versión gratuita tras cancelar) indica un problema de precio, no de producto.

### 4.5 Señal de disposición a pagar (proxy, calculable hoy de forma indirecta)
- **Qué se mide:** frecuencia con la que un docente alcanza un límite hipotético de uso (por ejemplo, número de clases por mes, si se definiera un tope en el plan gratuito).
- **Cómo se calcularía:** sobre los datos ya existentes en `historial`, simular distintos umbrales (ej. "más de 8 clases al mes") y contar cuántos docentes ya los superan hoy, sin que exista todavía ningún límite real.
- **Para qué sirve:** permite diseñar el punto de corte del plan gratuito basado en comportamiento real observado, no en una suposición arbitraria.
- **Qué decisiones permite tomar:** define dónde poner la barrera del freemium antes de construir el sistema de cobro, evitando fijar un límite demasiado generoso (nadie paga) o demasiado agresivo (se van antes de activarse).

---

## 5. Métricas de escalabilidad

Responden: ¿qué tan cerca estamos de un límite técnico, y con cuánta anticipación lo vemos venir?

### 5.1 Lecturas y escrituras de Firestore por día
- **Qué se mide:** volumen total de operaciones de lectura/escritura contra Firestore.
- **Cómo se calcula:** directamente desde el panel de uso de Firebase (Firestore → Uso), sin necesidad de instrumentación adicional — ya lo reporta la plataforma.
- **Para qué sirve:** es el principal impulsor de costo variable del producto (sección 6) y el límite duro del plan gratuito (Spark).
- **Qué decisiones permite tomar:** determina cuándo migrar de plan Spark a Blaze, y es la métrica que debe monitorearse con alertas de presupuesto.

### 5.2 Clases concurrentes en hora pico
- **Qué se mide:** el máximo de clases activas simultáneas durante el horario escolar (ej. 8am-2pm hora local).
- **Cómo se calcula:** muestreo periódico (cada minuto) del tamaño de la colección `clases`, agregando el máximo diario.
- **Para qué sirve:** dimensiona el peor caso real, no el promedio — los picos de inicio de ciclo escolar pueden ser 3x el promedio normal, como ya se documentó en el diseño del sistema de soporte.
- **Qué decisiones permite tomar:** informa cuándo reforzar temporalmente el soporte (más agentes N1) y si la arquitectura de un solo proyecto de Firebase compartido sigue siendo sostenible o requiere partición.

### 5.3 Latencia de sincronización en tiempo real
- **Qué se mide:** tiempo entre que el docente registra una participación/evaluación y el alumno la ve reflejada en pantalla.
- **Cómo se calcula:** **[Requiere construcción previa]** — no hay instrumentación de timestamps de cliente hoy; requeriría comparar `ultimaActualizacion` (servidor) contra un timestamp de renderizado en el cliente del alumno, reportado de vuelta.
- **Para qué sirve:** detecta degradación de experiencia antes de que se convierta en un ticket de soporte ("no veo mis participaciones").
- **Qué decisiones permite tomar:** si la latencia crece con el número de clases concurrentes, es la señal más temprana de que el modelo de listeners en tiempo real (`onSnapshot`) necesita revisión antes de que afecte a usuarios reales.

### 5.4 Tasa de errores de permisos (permission-denied)
- **Qué se mide:** frecuencia de rechazos de Firestore por las reglas de seguridad.
- **Cómo se calcula:** Firebase Console → Firestore → métricas de reglas, o instrumentación de los `.catch()` ya presentes en el código (por ejemplo, en `reportarAFirebase()`).
- **Para qué sirve:** detecta desalineación entre el código desplegado y las reglas activas (exactamente el tipo de problema real ya identificado en esta conversación con el registro de docentes).
- **Qué decisiones permite tomar:** un aumento súbito tras un despliegue es la alarma más rápida posible de que el checklist de post-despliegue debió ejecutarse y no se hizo, o de que se necesita un ajuste de reglas como el ya autorizado para `sensibilidad`.

---

## 6. Métricas de costos

Responden: ¿cuánto cuesta operar el producto, y cómo cambia ese costo con el crecimiento?

### 6.1 Costo de Firestore (lecturas + escrituras + almacenamiento)
- **Qué se mide:** gasto mensual en Firestore, desglosado por tipo de operación.
- **Cómo se calcula:** directamente del panel de facturación de Firebase (plan Blaze), o proyectado desde 5.1 usando el precio público por operación.
- **Para qué sirve:** es, con diferencia, el mayor costo variable del producto (dado el uso intensivo de `onSnapshot` en tiempo real).
- **Qué decisiones permite tomar:** informa si conviene reducir la frecuencia de escrituras (por ejemplo, el respaldo periódico de 60 segundos en `panel-alumno.html`) a cambio de menor precisión, un trade-off explícito costo/producto.

### 6.2 Costo por docente activo
- **Qué se mide:** costo total de infraestructura (Firestore + Auth + Hosting) dividido entre docentes activos mensuales (2.1).
- **Cómo se calcula:** (6.1 + costo de Auth + costo de Hosting) ÷ MAU.
- **Para qué sirve:** es el número que se compara directamente contra el ARPU (4.2) para saber si el negocio tiene margen positivo por usuario.
- **Qué decisiones permite tomar:** si el costo por docente activo se acerca al precio del plan de pago propuesto, hay que revisar el modelo de precios antes de escalar, no después.

### 6.3 Costo de soporte por docente
- **Qué se mide:** costo del equipo de soporte (según el dimensionamiento ya diseñado para 100/500/1,000 docentes) dividido entre docentes activos.
- **Cómo se calcula:** costo total del equipo de soporte en el período ÷ MAU.
- **Para qué sirve:** el soporte es, junto con Firestore, el segundo costo variable más importante identificado en el diseño del sistema de soporte técnico.
- **Qué decisiones permite tomar:** valida si el ritmo de contratación de agentes (la tabla de escenarios ya diseñada) va en línea con el crecimiento real, o si hay que adelantarlo/atrasarlo.

### 6.4 Margen bruto estimado
- **Qué se mide:** (ingresos − costos variables directos: Firestore + soporte) ÷ ingresos.
- **Cómo se calcula:** (4.2 × docentes pagantes) − (6.1 + costo total de soporte), expresado como % del ingreso.
- **Para qué sirve:** el indicador financiero más resumido de si el negocio es viable a la escala actual.
- **Qué decisiones permite tomar:** determina si se puede invertir en crecimiento (adquisición, sección 4.3) o si primero hay que mejorar la eficiencia de costos (por ejemplo, optimizar lecturas de Firestore).

---

## 7. Métricas institucionales

Responden: ¿qué tan preparado está el producto para venderse a una escuela completa, no solo a un docente individual?

### 7.1 Docentes activos por escuela
- **Qué se mide:** número de docentes distintos usando la app dentro de una misma escuela (campo `escuela`).
- **Cómo se calcula:** agrupar `docenteUid` distintos por valor normalizado de `escuela` en `clases`/`historial`.
- **Para qué sirve:** identifica candidatos naturales para una venta institucional (varios docentes ya usando la herramienta de forma independiente en el mismo plantel).
- **Qué decisiones permite tomar:** dispara el contacto comercial directo con la dirección de esa escuela, en vez de esperar a que llegue orgánicamente.

### 7.2 Densidad de adopción dentro de una escuela
- **Qué se mide:** % de docentes de una escuela que usan la herramienta, sobre el total de su plantilla docente.
- **Cómo se calcula:** **[Requiere dato externo]** — el numerador se tiene (7.1), pero el denominador (plantilla total de la escuela) no existe en el sistema; requeriría que la escuela lo proporcione al momento de una conversación comercial.
- **Para qué sirve:** distingue "unos pocos docentes entusiastas" de "adopción real de la institución", un argumento de venta mucho más fuerte para el segundo caso.
- **Qué decisiones permite tomar:** prioriza qué escuelas abordar primero para una licencia institucional (mayor densidad = venta más fácil).

### 7.3 Tickets de soporte por escuela
- **Qué se mide:** volumen de tickets de soporte generados por docentes de una misma escuela.
- **Cómo se calcula:** **[Requiere construcción previa]** — el sistema de soporte diseñado no está todavía integrado con un identificador de escuela por ticket; habría que capturarlo en el flujo de atención.
- **Para qué sirve:** una escuela con volumen de tickets desproporcionado a su tamaño puede indicar una necesidad de capacitación grupal, no de soporte reactivo uno a uno.
- **Qué decisiones permite tomar:** justifica ofrecer una sesión de capacitación institucional en vez de seguir resolviendo el mismo tipo de duda repetidamente en tickets individuales.

### 7.4 Diversidad de materias/grupos por escuela (profundidad de uso institucional)
- **Qué se mide:** cuántas materias y grupos distintos de una misma escuela usan la herramienta.
- **Cómo se calcula:** conteo de combinaciones únicas de `materia` + `grupoClase` dentro de una misma `escuela`.
- **Para qué sirve:** distingue el uso limitado a una sola materia/grupo de una adopción transversal en la escuela.
- **Qué decisiones permite tomar:** una baja diversidad, incluso con muchos docentes (7.1), sugiere que el caso de uso todavía se percibe como específico de una materia — información relevante para ajustar el discurso de venta institucional (generalizar el valor más allá del área original de Psicología Aplicada).

### 7.5 Cumplimiento de aviso de privacidad institucional
- **Qué se mide:** % de escuelas con las que existe un aviso de privacidad firmado (o aceptado) formalmente, frente al total de escuelas detectadas por uso (7.1).
- **Cómo se calcula:** **[Requiere construcción previa]** — hoy no existe ningún registro formal de aceptación de privacidad por escuela; el análisis de riesgos existente es interno, no un documento firmable por el cliente.
- **Para qué sirve:** mide el riesgo legal acumulado del crecimiento no gestionado (escuelas usando el producto sin un marco formal de tratamiento de datos de menores).
- **Qué decisiones permite tomar:** si esta métrica se aleja de 7.1 (muchas escuelas usando, pocas con aviso firmado), es una señal para priorizar la formalización legal antes de seguir creciendo, no después.

---

## Resumen: qué se puede medir hoy vs. qué requiere construcción previa

| Categoría | Calculable hoy con Firestore/Auth | Requiere construcción previa |
|---|---|---|
| 1. Adopción | 1.1, 1.2, 1.3, 1.4, 1.5 | — |
| 2. Retención | 2.1, 2.2, 2.3, 2.4 | — |
| 3. Uso | 3.1, 3.2, 3.3, 3.5 | 3.4 (parcial), 3.6 |
| 4. Monetización | 4.5 (proxy) | 4.1, 4.2, 4.3, 4.4 (todo el sistema de cobro) |
| 5. Escalabilidad | 5.1, 5.2, 5.4 | 5.3 |
| 6. Costos | 6.1, 6.2, 6.3, 6.4 | — (depende de 4, si hay ingresos que restar) |
| 7. Institucionales | 7.1, 7.4 | 7.2 (dato externo), 7.3, 7.5 |

**Prioridad recomendada de construcción, en este orden:** (a) un evento ligero de telemetría de onboarding (3.6), por ser la más barata de construir y la que más directamente informa una mejora ya en marcha; (b) un registro de aceptación de aviso de privacidad por escuela (7.5), por ser el riesgo de mayor costo si se ignora; (c) la infraestructura de planes/cobro completa (sección 4), solo después de validar con las métricas de adopción y retención ya disponibles hoy que existe una base de usuarios activa suficiente para justificar la inversión.
