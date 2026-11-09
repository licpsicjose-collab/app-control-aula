/* ============================================================
   SW-REGISTRO.JS — SmartProf
   Registra el Service Worker (sw.js) sin competir con la carga de
   la página (se ejecuta hasta el evento "load") y sin poder romper
   la app: cualquier fallo se ignora.

   ✅ INTERRUPTOR DE EMERGENCIA: cambiar SMARTPROF_SW_ENABLED a false
   y publicar. Al abrir cualquier página, cada dispositivo desregistra
   el Service Worker y borra sus cachés (solo los de SmartProf).
   La versión (SMARTPROF_VERSION) viene de sentry-init.js.
   ============================================================ */
(function () {
  var SMARTPROF_SW_ENABLED = true;

  if (!('serviceWorker' in navigator)) return; // navegador sin soporte: no pasa nada

  function ejecutar() {
    try {
      var alcance = new URL('./', document.baseURI).href;

      if (!SMARTPROF_SW_ENABLED) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { if (r.scope === alcance) r.unregister(); });
        }).catch(function () {});
        if (window.caches) {
          caches.keys().then(function (keys) {
            keys.forEach(function (k) { if (k.indexOf('smartprof-aula-') === 0) caches.delete(k); });
          }).catch(function () {});
        }
        return;
      }

      var version = (typeof SMARTPROF_VERSION === 'string') ? SMARTPROF_VERSION : 'dev';
      navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(version), { updateViaCache: 'none' })
        .catch(function (e) { console.warn('[SmartProf] Service Worker no registrado:', e); });
    } catch (e) { /* nunca romper la app */ }
  }

  if (document.readyState === 'complete') ejecutar();
  else window.addEventListener('load', ejecutar);
})();
