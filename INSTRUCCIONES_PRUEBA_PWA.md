# Instrucciones de Prueba — Instalación PWA (V7.4)

Estas pruebas deben ejecutarse manualmente en un dispositivo real o emulador, después de publicar los archivos en un servidor con HTTPS (la instalación de PWA requiere HTTPS; no funciona sobre `file://` ni sobre HTTP simple).

---

## Prueba en Android (Chrome)

1. Abre `login.html` (docente) o `panel-alumno.html` (alumno) en Chrome para Android.
2. Espera unos segundos; Chrome debe mostrar automáticamente un banner "Agregar Control de Aula a la pantalla de inicio" o un ícono de instalación (⊕) en la barra de direcciones.
   - Si no aparece automáticamente, abre el menú (⋮) → "Agregar a pantalla de inicio" / "Instalar aplicación".
3. Confirma la instalación.
4. **Verifica:**
   - ☐ El ícono que aparece en la pantalla de inicio es el escudo azul de Control de Aula (no el ícono genérico del navegador).
   - ☐ Al tocar el ícono, la app abre en modo `standalone` (sin barra de direcciones de Chrome visible).
   - ☐ Si instalaste desde `login.html` o `panel-docente.html`, la app abre en la pantalla de login.
   - ☐ Si instalaste desde `panel-alumno.html`, la app abre directamente en la pantalla de conexión del alumno (no en el login docente).
   - ☐ La barra de estado / splash screen inicial usa el color de fondo configurado (`#f3f4f6` para docente, negro para alumno).

---

## Prueba en iPhone (Safari)

iOS no instala PWAs automáticamente ni muestra banners: la instalación es siempre manual, vía el botón de compartir.

1. Abre `login.html` o `panel-alumno.html` en **Safari** (debe ser Safari; Chrome en iOS no soporta "Agregar a inicio" para PWAs de la misma forma).
2. Toca el botón de compartir (el cuadrado con la flecha hacia arriba, en la barra inferior).
3. Selecciona "Agregar a pantalla de inicio" (Add to Home Screen).
4. Confirma el nombre sugerido (debe mostrar "Control de Aula" o "Zona de Clase", tomado de `apple-mobile-web-app-title`) y toca "Agregar".
5. **Verifica:**
   - ☐ El ícono en la pantalla de inicio es el escudo azul de 180×180 (`apple-touch-icon-180.png`), no una captura de pantalla genérica.
   - ☐ Al tocar el ícono, la app abre a pantalla completa, sin la barra de Safari (gracias a `apple-mobile-web-app-capable`).
   - ☐ La barra de estado del iPhone se integra con el color de la app (`apple-mobile-web-app-status-bar-style`).
   - ☐ El nombre bajo el ícono coincide con `apple-mobile-web-app-title`.

---

## Prueba en Escritorio (Chrome / Edge)

1. Abre `login.html` en Chrome o Edge de escritorio.
2. Busca el ícono de instalación (⊕ o el ícono de "computadora con flecha") en la barra de direcciones.
3. Instala la app.
4. **Verifica:**
   - ☐ Se crea un acceso directo/aplicación independiente en el sistema operativo.
   - ☐ El ícono de la ventana y de la barra de tareas corresponde al escudo de Control de Aula.
   - ☐ La ventana abre sin la barra de pestañas/direcciones del navegador.

---

## Verificación técnica adicional (antes de las pruebas anteriores)

Estas ya fueron validadas de forma automatizada durante el desarrollo, pero puedes repetirlas:

```bash
# Validar que ambos manifest son JSON válido
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest.json OK')"
node -e "JSON.parse(require('fs').readFileSync('manifest-alumno.json','utf8')); console.log('manifest-alumno.json OK')"

# Validar que las rutas de íconos referenciadas existen
node -e "
const fs = require('fs');
['manifest.json','manifest-alumno.json'].forEach(f => {
  const j = JSON.parse(fs.readFileSync(f,'utf8'));
  j.icons.forEach(i => console.log(f, i.src, fs.existsSync(i.src) ? 'OK' : 'FALTA'));
});
"
```

También puedes usar el panel **Application → Manifest** en las herramientas de desarrollador de Chrome (F12) para inspeccionar visualmente el manifest detectado, sus íconos, y cualquier advertencia (por ejemplo, íconos faltantes o `start_url` no accesible).

## Nota importante sobre el alcance de V7.4

Esta versión **no incluye Service Worker ni funcionamiento offline**, según lo solicitado explícitamente. Esto significa:
- La app **requiere conexión a internet** para abrir, igual que antes de esta mejora.
- Chrome en Android puede tardar más en mostrar el banner de instalación automático si no detecta un Service Worker (es una señal adicional que Chrome considera, no un requisito estricto); la instalación manual vía menú (⋮ → Instalar aplicación) siempre funciona independientemente de esto.
- Safari en iOS no depende de Service Worker para "Agregar a pantalla de inicio", así que no hay impacto ahí.
