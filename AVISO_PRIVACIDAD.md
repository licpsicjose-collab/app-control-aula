# AVISO DE PRIVACIDAD — CONTROL DE AULA

**Última actualización:** Agosto 2026
**Versión del aviso:** 1.0

---

## 1. Identidad y domicilio del responsable

El responsable del tratamiento de sus datos personales es:

**José Cándido Díaz Hernández**, en adelante "el Responsable".

**Ubicación:** Cuautitlán Izcalli, Estado de México, México.

**Correo de contacto:** licpsicjose@gmail.com

Control de Aula es una plataforma educativa operada de forma independiente. No forma parte de una institución educativa, y su relación jurídica es directamente con la persona docente que crea una cuenta y, de forma indirecta y sin cuenta propia, con las personas alumnas que se conectan a las clases que ese docente administra.

---

## 2. Datos personales que recopila la plataforma

### 2.1 Datos de la persona docente (con cuenta propia)

- Correo electrónico (usado para crear la cuenta en Firebase Authentication y como identificador en la colección `mapeo_codigos`).
- Contraseña — el Responsable **no tiene acceso a su contraseña en texto plano**; su gestión (almacenamiento cifrado, verificación) la realiza Firebase Authentication, servicio de Google.
- Nombre de la escuela, materia y grupo que usted mismo captura al crear una clase.
- Datos de uso de la plataforma: fecha de su primer uso, fecha de su última actividad, fecha de su última clase, número total de clases impartidas, lista de grupos que ha usado, y si completó u omitió el recorrido de bienvenida (onboarding).
- Estado de su plan de suscripción (prueba, gratuito o de pago), fechas asociadas a ese plan, y qué grupo tiene activo o congelado. Actualmente la plataforma **no procesa pagos ni almacena datos de tarjetas o medios de pago** — ver sección 13.

### 2.2 Datos de las personas alumnas (sin cuenta propia)

Las personas alumnas **no crean una cuenta ni se autentican** en la plataforma. Para conectarse a una clase, capturan directamente en su dispositivo:

- Nombre (tal como lo escriben, en texto libre — la plataforma no lo valida contra una identidad oficial).
- Grupo (tal como lo escriben o seleccionan).

A partir de esos dos datos, la plataforma genera un identificador interno combinando nombre y grupo, y registra además:

- Tiempo de conexión y tiempo fuera de la clase.
- Número de salidas registradas durante la clase.
- Número de participaciones.
- Calificación o evaluación asignada por el docente, si aplica.
- Si hubo tardanza y si se usó el código de acceso por retardo.

Estos registros se asocian a la cuenta del docente que administra esa clase, no a una cuenta propia de la persona alumna, ya que esta última nunca se identifica ante la plataforma mediante credenciales.

### 2.3 Información técnica almacenada en su propio dispositivo (no en nuestros servidores)

Ver sección 6.

---

## 3. Finalidades del tratamiento

### 3.1 Finalidades necesarias para el servicio (sin las cuales no podemos operar la plataforma)

- Crear y administrar su cuenta docente.
- Permitir que las personas alumnas se conecten a la clase que usted administra.
- Registrar asistencia, participaciones, tiempos y evaluaciones durante una clase.
- Generar el reporte exportable (CSV) de la clase que tiene activa.
- Aplicar las reglas de su plan de suscripción (por ejemplo, cuántos grupos puede tener activos).
- Enviarle comunicaciones operativas indispensables sobre su cuenta (por ejemplo, avisos de cambio de plan).

### 3.2 Finalidades secundarias (mejora del producto)

- Medir el uso agregado de la plataforma (número de docentes activos, clases impartidas, tasas de finalización del recorrido de bienvenida) para tomar decisiones internas de producto.

Estas métricas se consultan hoy únicamente a través de un panel administrativo interno (`panel-admin.html`), de acceso restringido, y no se comparten con terceros ni se usan con fines publicitarios.

**Nota importante:** esta versión de la plataforma no cuenta todavía con un mecanismo en la interfaz para que usted se oponga específicamente al tratamiento de sus datos para estas finalidades secundarias sin dejar de usar el servicio. Si desea ejercer esa oposición, puede hacerlo por el medio de contacto señalado en la sección 15, y se atenderá caso por caso mientras se incorpora un mecanismo automatizado.

---

## 4. Uso académico de la información

La información capturada durante una clase (asistencia, participaciones, tiempos, evaluaciones) tiene como único propósito apoyar la labor docente dentro del salón de clases: llevar control de asistencia, fomentar la participación y respaldar la evaluación del desempeño de las personas alumnas.

El Responsable de la plataforma **no utiliza esta información con fines distintos al académico** (no se vende, no se usa para publicidad dirigida a las personas alumnas, no se comparte con terceros ajenos a la operación técnica de la plataforma descrita en la sección 5).

La responsabilidad sobre el uso pedagógico correcto de esta información (por ejemplo, cómo se traduce una participación registrada en una calificación) corresponde a la persona docente que administra la clase, no al Responsable de la plataforma.

---

## 5. Uso de Firebase

Control de Aula está construida sobre servicios de **Firebase**, propiedad de Google LLC:

- **Firebase Authentication** — gestiona el inicio de sesión de las personas docentes (correo y contraseña). El Responsable no almacena contraseñas por su cuenta.
- **Cloud Firestore** — base de datos donde se almacenan los registros descritos en la sección 2 (clases, historial, métricas, suscripciones).
- **Firebase Hosting** — aloja los archivos de la aplicación web.

Estos servicios implican que sus datos y los de las personas alumnas se procesan y almacenan en la infraestructura de Google, sujeta a los propios términos y políticas de privacidad de Google/Firebase. El Responsable no tiene control sobre la infraestructura física de esos servidores, pero sí sobre qué datos se envían a ellos y bajo qué reglas de acceso (ver sección 8).

---

## 6. Uso de almacenamiento local (localStorage)

Además de los datos guardados en Firestore, la aplicación guarda cierta información directamente en el navegador de cada dispositivo (`localStorage`), **sin enviarla a ningún servidor por ese medio**:

**En el dispositivo de la persona docente:**
- Última escuela, materia y grupo capturados (para no tener que volver a escribirlos en la siguiente clase).
- Si ya completó el recorrido de bienvenida (onboarding), para no mostrárselo de nuevo automáticamente.

**En el dispositivo de la persona alumna:**
- Nombre y grupo capturados al conectarse, junto con el identificador de la clase y la hora de inicio — esto permite que, si la pantalla del dispositivo se bloquea o la aplicación se minimiza, la sesión de esa clase pueda restablecerse sin pedir los datos de nuevo.
- Si ya completó el recorrido de bienvenida para alumnos.

Esta información permanece en el dispositivo hasta que la persona usuaria borra los datos del navegador manualmente, o hasta que la propia aplicación la reemplaza en una sesión posterior. El Responsable no tiene acceso remoto a esta información local.

---

## 7. Conservación de la información

- Los datos de una clase activa se conservan mientras la clase está en curso.
- Al finalizar una clase, sus datos se archivan en el historial de la plataforma, asociados a la cuenta del docente, y se conservan indefinidamente mientras la cuenta docente permanezca activa, salvo solicitud de eliminación (ver secciones 9 y 10).
- Las métricas de uso agregadas (sección 3.2) se conservan mientras la cuenta docente exista, con el mismo tratamiento que el resto de sus datos.
- Sobre la conservación del correo electrónico después de eliminar una cuenta, ver la sección 12 — es un caso distinto, con una finalidad específica y acotada.

---

## 8. Medidas de seguridad generales

El Responsable aplica las siguientes medidas técnicas, sin que esta lista implique una certificación de seguridad de ningún tipo:

- Reglas de acceso a la base de datos (Cloud Firestore) que restringen la lectura y escritura de cada colección a la persona dueña de esos datos (por ejemplo, un docente solo puede leer o modificar sus propios registros), o a cuentas administrativas expresamente autorizadas.
- El acceso al panel administrativo interno requiere autenticación y pertenecer a una lista cerrada de administradores gestionada manualmente, sin ninguna forma de que una cuenta se autoasigne ese acceso.
- Prácticas de codificación orientadas a evitar la inyección de código malicioso (XSS) y la manipulación de los reportes exportables (CSV).
- La gestión de contraseñas de las cuentas docentes está delegada por completo en Firebase Authentication, que aplica sus propios estándares de cifrado y seguridad.

Estas medidas reducen el riesgo de acceso no autorizado, pero **ningún sistema es completamente invulnerable**; el Responsable no garantiza la seguridad absoluta de la información.

---

## 9. Derechos de acceso, rectificación y cancelación

Como titular de sus datos personales (o, en el caso de una persona alumna, a través de la persona docente que administra la clase o de quien legalmente la represente), usted tiene derecho a:

- **Acceder** a los datos personales que la plataforma tiene registrados sobre usted.
- **Rectificar** esos datos cuando sean inexactos o estén desactualizados.
- **Cancelar** (eliminar) sus datos personales cuando considere que no se requieren para las finalidades descritas en este aviso, sujeto a lo señalado en la sección 12 para el caso específico del correo electrónico.

Estos derechos se pueden ejercer por el medio de contacto señalado en la sección 15. Dado que la plataforma no cuenta hoy con un formulario automatizado de solicitud de derechos, cada solicitud se atiende de forma manual (ver procedimiento en la sección 10).

---

## 10. Procedimiento para solicitar eliminación de datos

1. Envíe un correo a **licpsicjose@gmail.com** desde la cuenta de correo asociada a su cuenta docente (o, si es una persona alumna o su representante, indicando el nombre y grupo con el que se conectó, y el docente/plantel bajo el cual tomó la clase, para poder localizar el registro).
2. Indique claramente qué desea: acceso a sus datos, corrección de un dato específico, o cancelación total de su información.
3. El Responsable confirmará la recepción de la solicitud y, en caso de requerir verificar su identidad para proteger la información de terceros, podrá solicitarle datos adicionales antes de proceder.
4. El Responsable dará respuesta a la solicitud dentro de un plazo razonable a partir de su recepción.

Este es un procedimiento manual, atendido directamente por el Responsable; no existe todavía un flujo automatizado dentro de la aplicación para ejercer estos derechos.

---

## 11. Política de eliminación de cuenta

Al solicitar la eliminación de una cuenta docente:

- Se elimina el acceso de inicio de sesión (Firebase Authentication) asociado a esa cuenta.
- Se elimina el código de enlace docente (`mapeo_codigos`) correspondiente.
- Se elimina la información de suscripción, métricas de uso y el historial de clases asociado a esa cuenta, salvo que exista una obligación legal aplicable que requiera su conservación por un plazo distinto, o salvo lo indicado en la sección 12.
- Esta eliminación es un proceso manual solicitado por correo (sección 10); actualmente no existe un botón de autoservicio dentro de la aplicación para eliminar la propia cuenta.

---

## 12. Conservación del correo electrónico tras la eliminación de una cuenta

Aun cuando se elimine una cuenta docente conforme a la sección 11, **el Responsable podrá conservar el correo electrónico asociado a esa cuenta** (sin el resto de los datos de uso, historial o métricas) durante un periodo posterior a la eliminación.

**Justificación de esta conservación:** evitar que una misma persona registre cuentas nuevas de forma repetida con el único propósito de reiniciar el periodo de prueba (Trial) gratuito de la plataforma, lo cual afecta la viabilidad del modelo comercial descrito en la documentación interna del producto.

Este tratamiento se limita estrictamente al correo electrónico como identificador para esa verificación, y no implica conservar el resto de los datos personales ya eliminados conforme a la sección 11.

---

## 13. Posible integración futura de Mercado Pago

La plataforma **no tiene integrado actualmente ningún medio de pago**. El plan de pago (Pro) existe como concepto comercial y en el modelo de datos interno, pero no hay ningún flujo funcional para comprarlo dentro de la aplicación al momento de este aviso.

En caso de integrarse en el futuro un proveedor de pagos como **Mercado Pago**, ese tratamiento de datos de pago (por ejemplo, datos de tarjeta) sería realizado directamente por el proveedor de pagos correspondiente, conforme a su propio aviso de privacidad, y el Responsable actualizaría este documento antes de activar esa integración para describir con precisión qué datos se comparten con ese proveedor y con qué finalidad.

---

## 14. Procedimiento de actualización de este aviso

Este aviso de privacidad puede modificarse para reflejar cambios en la plataforma (por ejemplo, la integración de un medio de pago, sección 13), en la normativa aplicable, o en las prácticas internas de tratamiento de datos.

Cuando se realice un cambio relevante, el Responsable actualizará la fecha de "Última actualización" al inicio de este documento. Se recomienda a las personas usuarias consultar este aviso periódicamente. Mientras la plataforma no cuente con un mecanismo automatizado de notificación de cambios dentro de la aplicación, los cambios relevantes se podrán comunicar también por correo electrónico a la cuenta registrada.

---

## 15. Información de contacto

Para cualquier duda, solicitud o ejercicio de derechos relacionados con este aviso de privacidad:

**José Cándido Díaz Hernández**
Cuautitlán Izcalli, Estado de México, México
Correo: **licpsicjose@gmail.com**

---

## Nota sobre el marco legal aplicable

Este aviso se redactó tomando como referencia la **Ley Federal de Protección de Datos Personales en Posesión de los Particulares** (LFPDPPP), publicada en el Diario Oficial de la Federación el 20 de marzo de 2025 y vigente desde el 21 de marzo de 2025, cuya autoridad de supervisión es actualmente la **Secretaría Anticorrupción y Buen Gobierno** (que asumió esa función tras la extinción del INAI).

Este documento **no constituye una certificación de cumplimiento normativo** ni sustituye una revisión legal profesional. Se recomienda que un abogado especializado en protección de datos revise este aviso antes de considerarlo definitivo — ver las observaciones y riesgos jurídicos entregados junto con este documento.
