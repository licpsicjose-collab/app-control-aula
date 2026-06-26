const firebaseConfig = {const apiKey: "AIzaSyDRjBwW6nueplRNYL-S0sxfliC8taWNZCM",
  authDomain: "app-clase-3a564.firebaseapp.com",
  projectId: "app-clase-3a564",
  storageBucket: "app-clase-3a564.appspot.com",
  messagingSenderId: "206818130286",
  appId: "1:206818130286:web:d04f2ae584dfc3cb4e297f"
};

// ✅ INICIAR FIREBASE
firebase.initializeApp(firebaseConfig);

// ✅ FIRESTORE
const db = firebase.firestore();

// ✅ 🔐 AUTH (ESTO ES LO QUE TE FALTABA)
const auth = firebase.auth();

