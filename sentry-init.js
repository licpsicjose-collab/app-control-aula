/* ============================================================
   SENTRY-INIT.JS — SmartProf
   Observabilidad de errores (Error Monitoring únicamente).

   ALCANCE APROBADO:
   ✅ Error Monitoring
   ❌ Session Replay
   ❌ Tracing / Performance
   ❌ Profiling

   Este archivo NO contiene lógica de negocio de SmartProf.
   Solo se encarga de: inicializar Sentry, exponer constantes
   centrales (versión, feature flag, catálogo de eventos) y
   ofrecer funciones auxiliares para registrar breadcrumbs y
   tags desde cada página, sin filtrar datos sensibles.
   ============================================================ */

/* ------------------------------------------------------------
   1) CONSTANTES CENTRALES (pensadas para futuras versiones)
   ------------------------------------------------------------ */

// ✅ Cambiar SOLO este valor en cada nueva versión publicada.
const SMARTPROF_VERSION = "8.6.14";

// ✅ Apagar Sentry por completo (sin quitar código ni scripts)
//    cambiando esta única constante a false.
const SENTRY_ENABLED = true;

// ✅ DSN de Sentry. Sustituir por el DSN real del proyecto antes
//    de publicar. Mientras esté vacío, la inicialización no se
//    ejecuta (ver más abajo) para no generar errores en consola.
const SENTRY_DSN = "https://TU_CLAVE_PUBLICA@oXXXXXX.ingest.us.sentry.io/PROYECTO_ID";

// ✅ Catálogo centralizado de nombres de eventos/breadcrumbs.
//    Usar SIEMPRE SMARTPROF_EVENTOS.X en vez de cadenas literales.
const SMARTPROF_EVENTOS = Object.freeze({
  // --- Alumno ---
  ALUMNO_INGRESO: "alumno_ingreso",
  ALUMNO_ATENCION: "alumno_atencion",
  ALUMNO_PAUSA: "alumno_pausa",
  ALUMNO_MATERIAL: "alumno_material",
  ALUMNO_SMARTTUTOR: "alumno_smarttutor",

  // --- Docente ---
  DOCENTE_CREAR_CLASE: "docente_crear_clase",
  DOCENTE_PAUSA: "docente_pausa",
  DOCENTE_REANUDAR: "docente_reanudar",
  DOCENTE_RETARDO: "docente_retardo",
  DOCENTE_EXPORTACION: "docente_exportacion",
  DOCENTE_FINALIZACION: "docente_finalizacion"
});

// ✅ Tipos de usuario válidos para el tag "tipo_usuario".
const SMARTPROF_TIPOS_USUARIO = Object.freeze({
  ALUMNO: "alumno",
  DOCENTE: "docente",
  ADMIN: "admin"
});

/* ------------------------------------------------------------
   2) INICIALIZACIÓN DE SENTRY (vía Loader Script)
   ------------------------------------------------------------
   El <script> del Loader de Sentry se coloca en el <head> de
   cada página ANTES de este archivo (ver instrucciones al final
   de este archivo / README-SENTRY.md). Este bloque solo
   configura el SDK una vez que "Sentry" ya existe en window,
   y sin activar Replay ni Tracing.
   ------------------------------------------------------------ */

(function inicializarSentrySmartProf() {
  if (!SENTRY_ENABLED) return;
  if (typeof window === "undefined") return;
  if (!SENTRY_DSN || SENTRY_DSN.indexOf("TU_CLAVE_PUBLICA") !== -1) {
    // DSN no configurado todavía: no se inicializa para evitar
    // ruido en consola. Sustituir SENTRY_DSN arriba cuando se
    // tenga el proyecto de Sentry creado.
    return;
  }

  function onSentryListo(cb) {
    if (window.Sentry && typeof window.Sentry.onLoad === "function") {
      // Forma recomendada por el Loader Script de Sentry.
      window.Sentry.onLoad(cb);
    } else if (window.Sentry) {
      cb();
    } else {
      // Reintento breve por si el loader aún no inyectó window.Sentry
      let intentos = 0;
      let temporizador = setInterval(function () {
        intentos++;
        if (window.Sentry) {
          clearInterval(temporizador);
          cb();
        } else if (intentos > 20) {
          clearInterval(temporizador);
        }
      }, 100);
    }
  }

  onSentryListo(function () {
    window.Sentry.init({
      // ✅ SOLO Error Monitoring.
      integrations: [],           // ❌ sin Replay, ❌ sin BrowserTracing
      tracesSampleRate: 0,        // ❌ Tracing desactivado
      replaysSessionSampleRate: 0,// ❌ Session Replay desactivado
      replaysOnErrorSampleRate: 0,// ❌ Session Replay desactivado
      profilesSampleRate: 0,      // ❌ Profiling desactivado

      release: "smartprof@" + SMARTPROF_VERSION,
      environment: (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "desarrollo"
        : "produccion",

      // ✅ Privacidad: nunca enviar IP, cookies ni datos personales
      // por defecto.
      sendDefaultPii: false,

      // ✅ Filtro de breadcrumbs automáticos (clics, fetch, consola,
      // navegación) para eliminar cualquier dato sensible antes de
      // que salga del navegador.
      beforeBreadcrumb: function (breadcrumb, hint) {
        return depurarBreadcrumb(breadcrumb);
      },

      // ✅ Filtro de eventos de error: por si algún mensaje de error
      // llegara a incluir texto libre con datos ingresados por el
      // usuario (nombre, grupo, código, URL de material, etc.)
      beforeSend: function (event) {
        return depurarEvento(event);
      }
    });
  });
})();

/* ------------------------------------------------------------
   3) PRIVACIDAD — depuración de breadcrumbs y eventos
   ------------------------------------------------------------
   No se envían: nombres de alumnos, grupos, códigos de acceso,
   URLs de material, correos ni cualquier valor de formulario.
   Solo se conservan categoría, tipo y metadatos no sensibles.
   ------------------------------------------------------------ */

const SMARTPROF_CAMPOS_SENSIBLES = [
  "nombre", "alumno", "grupo", "codigo", "password", "contrasena",
  "email", "correo", "materialurl", "materialtitulo", "url", "value",
  "token", "uid", "docenteuid"
];

function depurarBreadcrumb(breadcrumb) {
  if (!breadcrumb) return breadcrumb;

  // Los breadcrumbs de tipo "ui.click"/"ui.input" de Sentry pueden
  // incluir selectores con valores de formularios: se limpia el
  // mensaje y los datos, dejando solo la categoría del elemento.
  if (breadcrumb.category === "ui.click" || breadcrumb.category === "ui.input") {
    if (breadcrumb.message) {
      breadcrumb.message = breadcrumb.message.split('[value=')[0].split('[placeholder=')[0];
    }
    if (breadcrumb.data) {
      breadcrumb.data = {}; // no se conservan atributos de inputs
    }
  }

  // Breadcrumbs de red (fetch/xhr hacia Firebase): se conserva solo
  // método y status, nunca el cuerpo de la petición/respuesta.
  if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
    if (breadcrumb.data) {
      let limpio = {};
      if (breadcrumb.data.method) limpio.method = breadcrumb.data.method;
      if (breadcrumb.data.status_code) limpio.status_code = breadcrumb.data.status_code;
      breadcrumb.data = limpio;
    }
  }

  // Breadcrumbs manuales de SmartProf (categoría "smartprof"): se
  // depuran las claves sensibles de "data" por nombre de campo.
  if (breadcrumb.category === "smartprof" && breadcrumb.data) {
    breadcrumb.data = depurarObjeto(breadcrumb.data);
  }

  return breadcrumb;
}

function depurarEvento(event) {
  if (!event) return event;
  if (event.extra) event.extra = depurarObjeto(event.extra);
  if (event.contexts) event.contexts = depurarObjeto(event.contexts);
  return event;
}

function depurarObjeto(obj) {
  let limpio = {};
  Object.keys(obj || {}).forEach(function (clave) {
    let claveNormalizada = clave.toLowerCase();
    let esSensible = SMARTPROF_CAMPOS_SENSIBLES.some(function (campo) {
      return claveNormalizada.indexOf(campo) !== -1;
    });
    limpio[clave] = esSensible ? "[omitido]" : obj[clave];
  });
  return limpio;
}

/* ------------------------------------------------------------
   4) FUNCIONES AUXILIARES — usarlas desde cada página
   ------------------------------------------------------------ */

/**
 * Establece los tags de Sentry para la sesión actual.
 * Llamar UNA VEZ al cargar cada página (tipo_usuario fijo por
 * página) y de nuevo cada vez que cambie la fase actual.
 */
function smartprofSentrySetTags(tipoUsuario, faseActual) {
  if (!SENTRY_ENABLED || !window.Sentry) return;
  try {
    window.Sentry.setTag("version_smartprof", SMARTPROF_VERSION);
    if (tipoUsuario) window.Sentry.setTag("tipo_usuario", tipoUsuario);
    if (faseActual) window.Sentry.setTag("fase_actual", faseActual);
  } catch (e) { /* nunca romper la app por telemetría */ }
}

/**
 * Registra un breadcrumb manual de SmartProf. "datos" es opcional
 * y pasa por depurarObjeto() antes de salir del navegador.
 */
function smartprofSentryBreadcrumb(evento, datos) {
  if (!SENTRY_ENABLED || !window.Sentry) return;
  try {
    window.Sentry.addBreadcrumb({
      category: "smartprof",
      message: evento,
      level: "info",
      data: datos || {}
    });
  } catch (e) { /* nunca romper la app por telemetría */ }
}

/**
 * Combina setTags + breadcrumb para un cambio de fase: uso
 * recomendado en cada punto de transición ya aprobado.
 */
function smartprofRegistrarFase(tipoUsuario, evento) {
  smartprofSentrySetTags(tipoUsuario, evento);
  smartprofSentryBreadcrumb(evento);
}
