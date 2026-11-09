# SERVICE WORKER — SmartProf V8.6.16 (CANDIDATO, pendiente de aprobación)

## Qué es y qué NO es
Guarda en el teléfono SOLO archivos estáticos (HTML, JS, íconos, SDK de Firebase y Sentry) para que la app abra más rápido y estable en redes saturadas. **No** da funcionamiento offline real: Firestore sigue requiriendo conexión.

## Garantías de compatibilidad (no cambia lo establecido)
| Aspecto | Comportamiento |
|---|---|
| Firestore / Auth / Sentry (envío) / Gemini | El SW NO los intercepta; pasan directo a la red |
| `get({source:"server"})` en `entrar()` | Intacto |
| Reglas de Firestore, datos, métricas | Sin cambios; el SW no guarda datos de usuarios |
| Manifests (3), `scope` y `start_url` | Sin cambios; un solo SW cubre `./` |
| Flujo de clase | El SW nunca recarga páginas por su cuenta |
| Versión anterior / navegadores sin SW | La app funciona igual (registro con `try/catch` y verificación de soporte) |
| Aviso de Privacidad | Sin cambios: no se almacenan datos personales |

## Estrategias de caché
- **HTML / JS / JSON propios:** red primero, con límite de 5 s; si la red tarda y hay copia, se usa la copia mientras se actualiza en segundo plano. Sin copia, se espera a la red.
- **Íconos:** caché primero.
- **Firebase 9.23.0 y Sentry 10.70.0 (URL con versión):** caché primero, en caché aparte (`smartprof-aula-cdn`) para no volver a descargarlos en cada versión. Si cambia la versión del SDK en los HTML, el SW la aprende solo.
- **No se guardan** errores (404/500) ni respuestas redirigidas ni respuestas opacas.
- **Sin red y sin copia:** páginas muestran un aviso "Sin conexión".
- **Precarga (instalación):** index, login, panel-alumno, firebase.js, sentry-init.js, sw-registro.js, 3 manifests, 4 íconos y los 3 SDK. `panel-docente.html` y `panel-admin.html` se guardan al visitarlos. La precarga tolera fallos (no impide la instalación).

## Versionado
`sw-registro.js` registra `sw.js?v=SMARTPROF_VERSION`. **Basta con cambiar `SMARTPROF_VERSION` en `sentry-init.js`** (como ya se hacía): el navegador instala el SW nuevo, que renombra el caché y borra los anteriores (solo los de prefijo `smartprof-aula-`, porque Cache Storage se comparte con todo el origen).

## Interruptor de emergencia
En `sw-registro.js` cambiar `SMARTPROF_SW_ENABLED` a `false` y publicar: al abrir cualquier página, cada dispositivo desregistra el SW y borra sus cachés. Verificado en prueba.

## Riesgos residuales (conocidos)
1. **Mezcla de versiones:** si hubo un despliegue y un teléfono tiene red muy lenta (>5 s), puede cargar el HTML de la versión anterior desde caché junto con JS nuevo (o al revés). Mitigación: se refresca en segundo plano y la siguiente carga ya es coherente; evitar cambiar nombres de funciones compartidas entre `sentry-init.js` y los HTML sin subir versión.
2. **Navegadores integrados (WhatsApp, etc.):** pueden no soportar SW; en ese caso todo sigue como antes, sin beneficio.
3. **iOS:** el almacenamiento de SW puede ser purgado por el sistema tras días sin uso; solo se pierde el beneficio.
4. **Primer ingreso:** sin beneficio (el SW se instala después de `load`); el beneficio llega desde la segunda visita.

## Verificación realizada (Chromium headless, localhost)
1. Registro y precarga: 14 archivos en `smartprof-aula-8.6.16`.
2. Recarga sin conexión: `panel-alumno.html` carga desde caché; página no guardada muestra aviso "Sin conexión".
3. Subir versión: caché nuevo creado y anterior borrado.
4. Interruptor en `false`: 0 registros y 0 cachés.
No se pudo probar con los CDN reales (el entorno de pruebas no tiene Internet): **probar en un dispositivo real** que la 2.ª carga use el SDK desde caché (DevTools → Application → Cache Storage → `smartprof-aula-cdn` debe tener 3 entradas).

## Prueba en el aula (checklist)
- [ ] Android Chrome: 1.ª carga normal; 2.ª carga rápida; `smartprof-aula-cdn` con 3 entradas.
- [ ] iPhone Safari: entrar a clase, salir/volver (conteo de salidas igual que antes).
- [ ] Publicar una versión nueva y confirmar que el alumno recibe el cambio en la siguiente apertura.
- [ ] Docente: iniciar, pausar, compartir material y finalizar clase sin diferencias.
