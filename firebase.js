// ✅ CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDRjBwW6nueplRNYL-S0sxfliC8taWNZCM",
  authDomain: "app-clase-3a564.firebaseapp.com",
  projectId: "app-clase-3a564",
  storageBucket: "app-clase-3a564.appspot.com",
  messagingSenderId: "206818130286",
  appId: "1:206818130286:web:d04f2ae584dfc3cb4e297f"
};

// ✅ INICIALIZAR FIREBASE (UNA SOLA VEZ EN TODA LA APP)
firebase.initializeApp(firebaseConfig);

// ✅ BASE DE DATOS (LO QUE USA TODO EL SISTEMA)
const db = firebase.firestore();

// ✅ V8.6.17 — Algunos navegadores/redes (iPhone, Xiaomi/Oppo, navegadores integrados,
// filtros de contenido o proxies) bloquean el canal de streaming de Firestore y la
// lectura falla con "unavailable" (en entrar(): "Error de conexión"). Con esta opción
// el SDK detecta el bloqueo y cambia solo a long polling; si el streaming funciona,
// no cambia nada. Va dentro de try/catch: si el SDK no la reconoce, la app sigue igual.
try {
  db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
} catch (errSettingsFirestore) {
  console.warn("[SmartProf] No se pudo configurar la detección de long polling:", errSettingsFirestore);
}