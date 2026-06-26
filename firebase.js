const firebaseConfig = {
  apiKey: "AIzaSyDRjBwW6nueplRNYL-S0sxfliC8taWNZCM",
  authDomain: "app-clase-3a564.firebaseapp.com",
  projectId: "app-clase-3a564",
  storageBucket: "app-clase-3a564.appspot.com",
  messagingSenderId: "206818130286",
  appId: "1:206818130286:web:d04f2ae584dfc3cb4e297f"
};

firebase.initializeApp(firebaseConfig);

// Base de datos
const db = firebase.firestore();

// Autenticación
const auth = firebase.auth();