/* ============================================================
   SW.JS — SmartProf (Service Worker)
   ------------------------------------------------------------
   OBJETIVO: que la app abra más rápido y de forma más estable en
   redes saturadas (aula), guardando SOLO archivos estáticos
   (HTML, JS, íconos, SDK de Firebase y Sentry).

   LO QUE NO HACE (por diseño):
   ❌ No intercepta Firestore, Firebase Auth, Sentry (envío de
      errores), Gemini/SmartTutor ni ninguna otra petición: esas
      pasan directo a la red, igual que sin Service Worker.
   ❌ No guarda datos de alumnos, docentes, clases ni suscripciones.
   ❌ No toca source:"server" de entrar() ni ninguna regla.
   ❌ No recarga páginas por su cuenta (nunca interrumpe una clase).
   ❌ No da funcionamiento offline real: Firestore sigue requiriendo
      conexión. Solo acelera/estabiliza la CARGA de la app.

   VERSIÓN: se toma de la URL de registro (sw.js?v=SMARTPROF_VERSION),
   así que basta con cambiar SMARTPROF_VERSION en sentry-init.js.
   ============================================================ */
'use strict';

var VERSION = 'dev';
try { VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'; } catch (e) {}

// Prefijo propio: Cache Storage es compartido por todo el origen (p. ej.
// usuario.github.io), así que solo se borran cachés que empiecen con este prefijo.
var PREFIJO = 'smartprof-aula-';
var CACHE = PREFIJO + VERSION;      // código de la app (se renueva en cada versión)
var CACHE_CDN = PREFIJO + 'cdn';    // SDK con versión en la URL (inmutables)
var TIMEOUT_RED_MS = 5000;          // SOLO para HTML (navegación): red lenta → se usa la copia guardada si existe

var BASE = new URL('./', self.location.href).href;

// Núcleo precargado. panel-docente.html y los demás se guardan al visitarlos.
var LOCALES = [
  './', 'index.html', 'login.html', 'panel-alumno.html',
  'firebase.js', 'sentry-init.js', 'sw-registro.js',
  'manifest.json', 'manifest-inicio.json', 'manifest-alumno.json',
  'icons/favicon-16.png', 'icons/favicon-32.png',
  'icons/apple-touch-icon-180.png', 'icons/android-icon-192.png'
].map(function (u) { return new URL(u, BASE).href; });

// Semilla de SDK. Si cambia la versión de Firebase/Sentry en los HTML, el SW
// la aprende solo en la primera carga (ver manejarCdn), esta lista es opcional.
var CDN_SEMILLA = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://browser.sentry-cdn.com/10.70.0/bundle.min.js'
];

function ignorar() {}

function esCdnPermitido(url) {
  return (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) ||
         (url.hostname === 'browser.sentry-cdn.com');
}

/* ---------- INSTALACIÓN: precarga tolerante a fallos ---------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE).then(function (c) {
        return Promise.all(LOCALES.map(function (u) {
          // cache:'reload' → copia fresca (no la del caché HTTP), coherente entre archivos
          return c.add(new Request(u, { cache: 'reload' })).catch(ignorar);
        }));
      }),
      caches.open(CACHE_CDN).then(function (c) {
        return Promise.all(CDN_SEMILLA.map(function (u) { return precargarCors(c, u); }));
      })
    ]).then(function () { return self.skipWaiting(); })
  );
});

/* ---------- ACTIVACIÓN: limpia versiones anteriores propias ---------- */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf(PREFIJO) === 0 && k !== CACHE && k !== CACHE_CDN;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  if (url.origin === self.location.origin) {
    if (url.pathname.slice(-6) === '/sw.js') return; // el SW nunca se sirve desde caché
    event.respondWith(manejarLocal(req, url, event));
    return;
  }

  if (esCdnPermitido(url)) {
    event.respondWith(manejarCdn(req, url, event));
    return;
  }
  // Todo lo demás (Firestore, Auth, Sentry ingest, Gemini, etc.): sin tocar.
});

function manejarLocal(req, url, event) {
  // Íconos: inmutables en la práctica → caché primero.
  if (url.pathname.indexOf('/icons/') !== -1) {
    return caches.open(CACHE).then(function (cache) {
      return cache.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (resp) {
          if (resp && resp.ok && resp.type === 'basic' && !resp.redirected) cache.put(req, resp.clone());
          return resp;
        });
      });
    });
  }
  // HTML: red primero con tiempo límite (evita pantalla en blanco en redes lentas).
  // JS / JSON propios: red primero SIN tiempo límite — solo se usa la copia si la
  // red FALLA. Así, un HTML nuevo nunca se mezcla con un JS viejo por lentitud
  // (el caso inverso, HTML viejo + JS nuevo, es seguro mientras los JS compartidos
  // solo AGREGUEN funciones; ver SERVICE_WORKER.md).
  return redPrimero(req, event);
}

function redPrimero(req, event) {
  var esNavegacion = req.mode === 'navigate';
  return caches.open(CACHE).then(function (cache) {
    var red = fetch(req).then(function (resp) {
      // No se guardan errores (404/500) ni respuestas redirigidas.
      if (resp && resp.ok && resp.type === 'basic' && !resp.redirected) cache.put(req, resp.clone());
      return resp;
    });
    // Mantiene vivo el SW para que la actualización del caché termine aunque se
    // haya respondido ya con la copia guardada.
    event.waitUntil(red.catch(ignorar));

    return new Promise(function (resolve) {
      var resuelto = false;
      function responder(r) { if (!resuelto && r) { resuelto = true; resolve(r); } }
      function desdeCache() { return cache.match(req, { ignoreSearch: true }); }

      var temporizador = esNavegacion ? setTimeout(function () {
        desdeCache().then(responder); // si no hay copia, se sigue esperando a la red
      }, TIMEOUT_RED_MS) : null;

      red.then(function (r) {
        clearTimeout(temporizador);
        responder(r);
      }, function () {
        clearTimeout(temporizador);
        desdeCache().then(function (c) {
          responder(c || respuestaSinConexion(esNavegacion));
        });
      });
    });
  });
}

function respuestaSinConexion(esNavegacion) {
  if (!esNavegacion) return new Response('', { status: 503, statusText: 'Sin conexión' });
  var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Sin conexión — SmartProf</title></head>' +
    '<body style="margin:0;background:#111827;color:#fff;font-family:sans-serif;' +
    'display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;">' +
    '<div><h2>📡 Sin conexión</h2><p style="color:#9ca3af;">Revisa tus datos móviles o el Wi-Fi y vuelve a abrir la app.</p></div>' +
    '</body></html>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ---------- CDN (Firebase / Sentry): caché primero, URLs con versión ---------- */
function manejarCdn(req, url, event) {
  return caches.open(CACHE_CDN).then(function (cache) {
    return cache.match(url.href).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (resp) {
        if (resp && resp.ok && resp.type === 'cors') {
          cache.put(url.href, resp.clone());
        } else if (resp && resp.type === 'opaque') {
          // <script> sin crossorigin devuelve una respuesta opaca (no se puede
          // inspeccionar ni guardar con seguridad). Se aprende en segundo plano
          // con una petición CORS para que la próxima vez salga del caché.
          event.waitUntil(precargarCors(cache, url.href));
        }
        return resp;
      });
    });
  });
}

function precargarCors(cache, href) {
  return cache.match(href).then(function (hit) {
    if (hit) return;
    return fetch(href, { mode: 'cors', credentials: 'omit' }).then(function (r) {
      if (r && r.ok && r.type === 'cors') return cache.put(href, r);
    }).catch(ignorar);
  });
}
