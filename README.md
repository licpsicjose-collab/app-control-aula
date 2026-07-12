# Control de Aula

Sistema web de monitoreo de clase en tiempo real. Permite a un docente abrir una sesión de clase y dar seguimiento en vivo a la permanencia, salidas, participaciones y evaluación de sus alumnos, mientras cada alumno se conecta desde su propio dispositivo con un código de acceso.

## Descripción del proyecto

Control de Aula está compuesto por tres páginas independientes que se conectan directamente a Firebase (Authentication + Firestore), sin backend propio:

- **`login.html`** — acceso y registro de docentes, con recuperación de contraseña nativa de Firebase Auth.
- **`panel-docente.html`** — creación y control de la clase: códigos de acceso, modo retardo, pausa, seguimiento de alumnos, participaciones, evaluaciones, exportación de reporte e historial.
- **`panel-alumno.html`** — conexión del alumno a la clase activa, pantalla de "Modo de Atención Activo", reconexión automática de sesión.

A partir de la versión 7.4, el sistema es instalable como **PWA (Progressive Web App)** básica en Android, iPhone y escritorio, conservando el 100% de la lógica de negocio existente.

## Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| HTML5 / CSS3 / JavaScript (vanilla) | Interfaz de las 3 páginas, sin frameworks de frontend |
| Firebase Authentication | Autenticación de docentes (correo/contraseña) |
| Cloud Firestore | Base de datos en tiempo real (clases, alumnos, historial, mapeo de códigos) |
| Firebase SDK compat 9.23.0 | Versión del SDK utilizada en los 3 archivos |
| Web App Manifest | Instalación como PWA en Android/iPhone/escritorio |

No se utiliza ningún framework (React, Vue, etc.), backend propio, ni build system: los archivos son servidos tal cual.

## Instalación

Este proyecto no requiere compilación. Para desplegarlo:

1. Aloja los archivos (`login.html`, `panel-docente.html`, `panel-alumno.html`, `manifest.json`, `manifest-alumno.json`, la carpeta `icons/`, y `firebase.js`) en cualquier servidor de archivos estáticos — se recomienda **Firebase Hosting** por su integración directa con el resto del proyecto.
2. Configura `firestore.rules` en tu proyecto de Firebase (ver sección Seguridad).
3. Comparte con tus docentes la URL de `login.html`, y con tus alumnos la URL de `panel-alumno.html`.

### Firebase

El proyecto requiere un proyecto de Firebase con:
- **Authentication** habilitado con el proveedor de correo/contraseña.
- **Cloud Firestore** habilitado, con las reglas de seguridad de este repositorio aplicadas (`firestore.rules`).
- La configuración (`firebaseConfig`) ya está integrada en `login.html`; `panel-docente.html` y `panel-alumno.html` reutilizan la misma app de Firebase mediante `firebase.js`.

Para desplegar o actualizar las reglas de Firestore:
```bash
firebase deploy --only firestore:rules
```

## Versiones

| Versión | Estado | Contenido principal |
|---|---|---|
| V6 | Congelada (`Version_6_Congelada`) | Base funcional validada en aula: multiusuario, códigos, recuperación de sesión, participaciones, evaluaciones, historial |
| V7.0 – V7.1 | Integrada | Umbral de detección de salidas ajustado (45s → 5s) |
| V7.2 | Integrada | Recuperación de contraseña para docentes vía Firebase Auth |
| V7.3 | Estable (`Version_7_3_Estable`, solo lectura) | Mitigación de XSS y CSV Injection |
| V7.4 | En desarrollo (`Version_7_4_Desarrollo`) | PWA básica instalable (manifest, íconos, meta tags) — **sin service worker ni modo offline todavía** |

Cada versión estable se conserva en su propia carpeta de solo lectura; todo desarrollo nuevo parte de una copia de la última versión estable, nunca se edita directamente sobre ella.

## Seguridad implementada

- **Autenticación**: exclusiva para docentes vía Firebase Authentication; los alumnos no se autentican (decisión de arquitectura, para mantener el flujo de entrada simple).
- **Reglas de Firestore** (`firestore.rules`): acceso restringido por colección, por dueño (`request.auth.uid`) y por esquema de campos; reemplazan una configuración previa sin restricciones (`allow read, write: if true`).
- **Mitigación de XSS**: todo valor controlado por el usuario (`nombre`, `grupo`, `estado`) se escapa antes de insertarse en el DOM (`escaparHTML()`), y los manejadores de clic ya no se construyen concatenando datos del usuario en atributos `onclick`.
- **Mitigación de CSV Injection**: los valores exportados a CSV se sanitizan (`sanitizarCSV()`) para que Excel/Sheets nunca los interprete como fórmulas.
- **Riesgos residuales aceptados y documentados** (ver `Documento_Seguridad_Final.docx`): aislamiento de escritura y de lectura entre alumnos de una misma clase, consecuencia directa de no autenticar alumnos. Impacto acotado a esa clase específica; no compromete el historial ni las clases de otros docentes.

## Historial de versiones

Ver `CHANGELOG_V7.md` para el detalle línea por línea de cada cambio, su justificación y su validación.

## Soporte

Para incidencias, dudas de uso, o para reportar un comportamiento inesperado, sigue el flujo de atención definido en `Sistema_Soporte_Tecnico.docx`: clasificación por categoría (Acceso, Clase, Participaciones, Evaluación, Retardos, Exportación, Historial, Problemas técnicos), respuestas prediseñadas para los casos frecuentes, y escalamiento por severidad cuando el caso no se resuelve con la base de conocimiento.

Antes de reportar un problema, consulta:
- `Manual_Docente_V6.docx` / `Manual_Alumno_V6.docx` — guías de uso paso a paso.
- `100_Preguntas_Frecuentes.docx` — preguntas frecuentes organizadas por categoría.
