const firebaseConfig = {
  apiKey: "AIzaSyDRjBwW6nueplRNYL-S0sxfliC8taWNZCM",
  authDomain: "app-clase-3a564.firebaseapp.com",
  projectId: "app-clase-3a564",
};

firebase.initializeApp(firebaseConfig);

// ✅ ESTE ES EL MÁS IMPORTANTE
const auth = firebase.auth();
