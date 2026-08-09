# CHANGELOG — Control de Aula V7

## [V7.4.0] — PWA básica instalable (sin Service Worker, sin offline)

### Adenda — integración de index.html (página selectora de rol)
Se compartió `index.html` (página raíz que ofrece "Entrar como docente" / "Entrar como alumno", nunca vista antes de esta adenda). Se integró con el mismo patrón que los otros 3 archivos:
- Nuevo `manifest-inicio.json` — tercer manifest, con `start_url: "./index.html"` (esta página es neutral, no pertenece a un solo rol, así que el ícono instalado desde aquí regresa al selector, no directo a un rol específico).
- Etiquetas `<link rel="manifest">`, favicon, `apple-touch-icon`, `theme-color` y meta tags `apple-mobile-web-app-*` agregadas dentro de `<head>`.
- Verificado: JSON válido, las 5 rutas de íconos existen, sintaxis JS intacta, `diff` contra el original confirma que **únicamente** se agregaron líneas dentro de `<head>` — cero cambios a los botones `docente()`/`alumno()` ni a la navegación.
- El proyecto ahora tiene 3 manifests: `manifest.json` (docente), `manifest-alumno.json` (alumno), `manifest-inicio.json` (selector de rol) — cada uno con su propio `start_url`, mismo set de íconos compartido.

### Contexto de versionado
- `Version_7_3_Estable` se congeló como copia de solo lectura (permisos 444/555) del contenido final de V7.3.
- `Version_7_4_Desarrollo` se creó a partir de esa copia; todo el trabajo de esta entrada ocurrió exclusivamente ahí.

### Agregado
- `manifest.json` — manifest de la PWA para el flujo docente (`login.html` / `panel-docente.html`), `start_url` apunta a `login.html`.
- `manifest-alumno.json` — manifest independiente para el flujo del alumno (`panel-alumno.html`), `start_url` propio. Ver "Hallazgo de diseño" abajo.
- Carpeta `icons/` con los 8 PNG ya diseñados (favicon 16/32/48, apple-touch-icon 180, Android 192/512 estándar y maskable).
- Etiquetas `<link rel="manifest">`, `<link rel="icon">`, `<link rel="apple-touch-icon">`, `<meta name="theme-color">` y meta tags `apple-mobile-web-app-*` en `login.html`, `panel-docente.html` y `panel-alumno.html`.
- `README.md` profesional del proyecto (descripción, tecnologías, instalación, Firebase, versiones, seguridad implementada, historial, soporte).
- `INSTRUCCIONES_PRUEBA_PWA.md` con los pasos de validación manual para Android, iPhone y escritorio.

### Hallazgo de diseño (importante)
Un solo `manifest.json` no puede servir correctamente a docentes y alumnos a la vez, porque el `start_url` solo puede apuntar a una página: si el alumno instalara la app usando un manifest pensado para el docente, el ícono lo llevaría a la pantalla de login docente en vez de a su propia pantalla de conexión. Se resolvió generando dos manifests (patrón estándar de PWA multi-rol), sin que esto implique ningún cambio de lógica, arquitectura ni Firebase.

### Explícitamente NO implementado (por instrucción)
- Service Worker.
- Funcionamiento offline / caché de assets.
- Cualquier cambio a Firebase, Firestore, `firestore.rules`, autenticación, recuperación de contraseña, XSS/CSV, participaciones, evaluaciones, historial, retardos o pausa.

### Archivos modificados
- `login.html`, `panel-docente.html`, `panel-alumno.html` — únicamente etiquetas agregadas dentro de `<head>`. Verificado con `diff` línea por línea contra `Version_7_3_Estable`: cero cambios en scripts, formularios o cualquier lógica existente.

### Archivos nuevos
- `manifest.json`, `manifest-alumno.json`, `icons/*.png` (8 archivos), `README.md`, `INSTRUCCIONES_PRUEBA_PWA.md`.

### Validación
- Ambos manifests verificados como JSON válido mediante `JSON.parse()`.
- Las 5 rutas de íconos de cada manifest verificadas contra el sistema de archivos: las 10 existen.
- Sintaxis JavaScript de los 3 archivos HTML verificada sin errores tras la integración.
- Instalación real en dispositivos Android/iPhone **pendiente de ejecución manual** por el usuario, siguiendo `INSTRUCCIONES_PRUEBA_PWA.md` — no fue posible ejecutarla desde este entorno de desarrollo.

### Compatibilidad con V6 y V7
- `Version_6_Congelada`: no se tocó.
- `Version_7_3_Estable`: no se tocó (solo lectura).
- Ninguna funcionalidad existente (login, registro, recuperación de contraseña, panel docente, panel alumno, Firestore, reglas, XSS/CSV) fue alterada.

---



### Corregido
1. **XSS (Cross-Site Scripting)** — `nombre`, `grupo` y `estado` se insertaban sin escapar dentro de `innerHTML` (texto visible) y dentro de atributos `onclick` construidos por concatenación de strings, en `panel-docente.html`. El campo `estado` también se insertaba sin escapar en `panel-alumno.html`.
2. **CSV Injection** — `nombre`, `grupo` y `estado` se exportaban en `exportarCSV()` sin verificar si comenzaban con `=`, `+`, `-` o `@`, lo que permitía que Excel/Sheets los interpretara como fórmulas al abrir el reporte.

### Agregado
- `escaparHTML(texto)` — en `panel-docente.html` y `panel-alumno.html`. Convierte `& < > " '` en sus entidades HTML antes de insertar cualquier valor controlado por el usuario en el DOM.
- `adjuntarEventosAcciones(contenedor)` — en `panel-docente.html`. Sustituye los `onclick="..."` que concatenaban `nombre`/`grupo` directamente en el marcado por atributos `data-nombre`/`data-grupo`/`data-estado` (texto plano, nunca ejecutado como código) más `addEventListener`, eliminando por completo el vector de fuga de comillas en atributos inline.
- `sanitizarCSV(valor)` — en `panel-docente.html`. Antepone un apóstrofe cuando el valor comienza con `=`, `+`, `-` o `@`, y escapa comillas internas para no romper el formato de campo CSV.

### Archivos modificados
- `panel-docente.html` — `renderAlumnos()` ahora escapa nombre/grupo/estado y usa `data-*` + event listeners en vez de `onclick` inline; `exportarCSV()` ahora sanitiza nombre/grupo/estado antes de exportar.
- `panel-alumno.html` — `textoEvaluacion()` ahora escapa el valor de `estado` antes de asignarlo a `innerHTML`.

### Explicación técnica de la mitigación
El riesgo real no estaba solo en el texto visible: `onclick="setEstado('${a.nombre}',...)"` era explotable incluso con escape de comillas, porque el navegador decodifica las entidades HTML del atributo *antes* de interpretar su contenido como JavaScript — es decir, escapar `'` como `&#39;` no impide que, una vez decodificado, vuelva a ser una comilla real dentro del código del manejador de eventos. La única mitigación correcta para ese vector es no construir código ejecutable a partir de datos del usuario: por eso se reemplazó el patrón `onclick` por `data-*` (que nunca se interpreta como código, solo se lee como texto) + `addEventListener` (que asigna la función real, no una cadena a evaluar).

Para el texto visible (`innerHTML` de `<h3>`, `<div class="estado-actual">`, y la evaluación en `panel-alumno.html`), `escaparHTML()` convierte los caracteres especiales de HTML en sus entidades, de modo que `<script>alert(1)</script>` se muestra literalmente como esa cadena de texto en pantalla, sin que el navegador la interprete como una etiqueta.

Para el CSV, `sanitizarCSV()` sigue la mitigación estándar (OWASP) de anteponer un apóstrofe a cualquier valor que comience con un carácter que Excel/Sheets interprete como inicio de fórmula, forzando su tratamiento como texto plano.

### Validación (verificada, ver salida de consola en la conversación)
| Entrada | En pantalla (`h3`) | En CSV exportado |
|---|---|---|
| `Juan Perez` | `Juan Perez` (sin cambios) | `"Juan Perez"` (sin cambios) |
| `<script>alert(1)</script>` | `&lt;script&gt;alert(1)&lt;/script&gt;` → se ve como texto literal, no se ejecuta | se exporta como texto, entre comillas, sin ejecutarse en Excel |
| `=SUM(A1:A10)` | se muestra literalmente | `"'=SUM(A1:A10)"` → Excel lo trata como texto, no como fórmula |
| `x>` (ejemplo adicional) | `x&gt;` | `x>` (no afecta la estructura del CSV) |
| `');alert(1);//` (ejemplo adicional, ruptura de `onclick`) | `&#39;);alert(1);//` — y ya no aplica de todas formas, porque el valor nunca vuelve a interpretarse como código (ver explicación técnica) | `');alert(1);//` (texto sin efecto) |

### Confirmación de compatibilidad con V6 y V7
- **Version_6_Congelada**: no se modificó, según instrucción explícita.
- **Version_7_Desarrollo**: verificado mediante `diff` línea por línea que el único contenido agregado corresponde a las funciones de mitigación y sus puntos de uso; ninguna función de negocio (`setEstado`, `agregarParticipacion`, `finalizarClase`, `iniciarClase`, `pausarClase`, `reanudarClase`, `activarRetardo`, recuperación de sesión, recuperación de contraseña, login, registro) fue tocada.
- No se modificaron Firestore Rules, ni el modelo de datos, ni la arquitectura, ni la experiencia funcional visible para docentes o alumnos — los botones de evaluación/participación se ven y se comportan exactamente igual que antes; el cambio es puramente interno a cómo se construye y vincula el HTML.

---



### Estado
Integrado sobre el archivo real `login.html`, provisto por el usuario. Verificado mediante `diff` línea por línea contra el original: **solo se agregó código, ninguna línea existente de `registrar()` ni `entrar()` fue modificada o eliminada**.

### Agregado
- Enlace visible "¿Olvidaste tu contraseña?" debajo de los botones "Registrarse"/"Entrar" existentes.
- Función `recuperarPassword()`, que reutiliza el campo `#correo` ya existente en el formulario (no se agregó ningún input nuevo), y usa `auth.sendPasswordResetEmail(correo)` — exactamente la misma instancia `auth` ya inicializada por el archivo original.
- Mensajes de éxito y error mostrados en un párrafo `#mensaje-recuperacion` nuevo, sin usar `alert()` para no interferir con el patrón de errores existente de `registrar()`/`entrar()` (que sí usan `alert()`).

### Archivos afectados
- `login.html` — modificado (2 inserciones: HTML del enlace + función `recuperarPassword()`).

### Nota de control de calidad
Durante la integración, un primer intento de edición insertó por error la función `recuperarPassword()` dentro del cuerpo de `entrar()` (llave de cierre mal ubicada). Se detectó de inmediato mediante verificación de sintaxis (`new Function()`), se corrigió, y se confirmó la corrección con una segunda verificación de sintaxis y un `diff` completo contra el original antes de entregar el archivo.

---

### Explicación del flujo
1. El docente hace clic en "¿Olvidaste tu contraseña?" bajo el formulario de login.
2. Se despliega un campo para capturar su correo electrónico (sin tocar el formulario de login/registro existente, que permanece oculto/intacto).
3. Al enviar, se llama a `firebase.auth().sendPasswordResetEmail(correo)`.
4. Firebase Authentication se encarga, de forma nativa, de verificar si el correo está registrado y de enviar el correo de restablecimiento — Control de Aula no almacena, valida ni procesa el correo por su cuenta más allá de pasarlo a esta función.
5. Se muestra un mensaje de éxito o de error según la respuesta de Firebase, sin exponer detalles técnicos innecesarios al docente.

### Explícitamente NO implementado (por instrucción)
- Recuperación automática de correo olvidado.
- Almacenamiento de correos adicionales o de respaldo.
- Preguntas secretas.
- Recuperación vía SMS.
- Cualquier backend o sistema de correo propio.
- Si un docente olvida el correo con el que se registró, la recuperación sigue siendo exclusivamente vía soporte técnico, sin cambios respecto al proceso actual.

### Compatibilidad con V6 y V7
- **Version_6_Congelada**: no se modifica en absoluto; esta mejora es exclusiva de `Version_7_Desarrollo`, como se ha hecho con cada mejora anterior de V7.
- **Version_7_Desarrollo**: la integración está diseñada para no tocar el formulario de login ni de registro existentes (permanecen con su lógica y IDs intactos); el bloque de recuperación es un elemento adicional, oculto por defecto, que no interfiere con el flujo actual de inicio de sesión.
- No se crean colecciones nuevas en Firestore; el cambio vive enteramente dentro de Firebase Authentication, que ya es la base del sistema de login docente.

### Archivo modificado
- `login.html` — confirmado modificado y verificado (ver sección "Estado" y "Nota de control de calidad" arriba).
- Ningún otro archivo (`panel-docente.html`, `panel-alumno.html`, `firestore.rules`) requirió cambios para esta mejora.

---

## [V7.0.0] — Primer cambio oficial sobre Version_7_Desarrollo

### Cambiado
- **Umbral de detección de salidas de la aplicación**: reducido de `45000` ms (45 segundos) a `5000` ms (5 segundos).

### Archivos afectados
- `panel-alumno.html`
  - Detector de evento `focus` (línea ~445).
  - Detector de evento `visibilitychange` (línea ~462).

### Archivos explícitamente NO modificados
- `panel-docente.html` — no contenía ninguna ocurrencia del valor `45000`; se verificó y se dejó intacto.
- `Version_6_Congelada/` — se conserva como respaldo sin ningún cambio. Todo el trabajo de esta versión se realizó exclusivamente sobre `Version_7_Desarrollo/`.

### Alcance del cambio
Se localizaron y reemplazaron **únicamente** las dos ocurrencias del valor `45000` presentes en los detectores de salida (`window.addEventListener("focus", ...)` y `document.addEventListener("visibilitychange", ...)`). No se modificó ninguna otra función, campo, colección, evento, temporizador o consulta. Verificado mediante `diff` línea por línea contra `Version_6_Congelada`.

---

## Justificación pedagógica

El umbral de 45 segundos fue diseñado originalmente como una **tolerancia amplia** para evitar que interrupciones breves e involuntarias (una notificación, un cambio accidental de pantalla, un vistazo rápido a otra ventana) se registraran como una salida real de atención. Esa tolerancia priorizaba evitar falsos positivos sobre la sensibilidad de detección.

La reducción a 5 segundos responde a un cambio de criterio pedagógico: **45 segundos es tiempo suficiente para que un alumno revise varios mensajes, responda una conversación corta o navegue en otra aplicación sin que el sistema lo registre**, lo cual diluye el valor del indicador de atención como señal confiable para el docente. Un umbral de 5 segundos:

- Distingue con mayor precisión entre una interrupción verdaderamente momentánea (por ejemplo, un parpadeo de pantalla al recibir una llamada) y una salida intencional de la aplicación.
- Da al docente una métrica de permanencia neta y de conteo de salidas que refleja de forma más fiel el comportamiento real de atención durante la clase.
- Refuerza el propósito original del "Modo de Atención Activo": que el alumno permanezca genuinamente enfocado en la pantalla de la clase, no solo técnicamente conectado.

### Riesgo conocido de este cambio
Un umbral más estricto incrementa la probabilidad de registrar salidas por eventos verdaderamente accidentales y de muy corta duración (por ejemplo, ciertos gestos del sistema operativo que disparan brevemente `visibilitychange` sin que el alumno haya salido realmente de la app). Se recomienda observar el comportamiento en aula durante la primera semana de uso de V7 y evaluar si 5 segundos es el punto de equilibrio correcto, o si conviene ajustar a un valor intermedio en una futura versión.

### Estado
Cambio aplicado sobre `Version_7_Desarrollo`. Pendiente de validación en aula antes de considerar su congelación como V7 definitiva.
