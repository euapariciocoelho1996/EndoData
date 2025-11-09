// Importe as funções que você precisa
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
// TODO: Adicione os SDKs que você quer usar
import { getFirestore } from "firebase/firestore"; // <-- ADICIONE ISSO
import { getAuth } from "firebase/auth"; // <-- ADICIONE ISSO

// Sua configuração (exatamente como você colou)
const firebaseConfig = {
  apiKey: "AIzaSyBX84pwzVo4J_YMzYAKB06z4OCrRrBYWno",
  authDomain: "pdsi-3.firebaseapp.com",
  projectId: "pdsi-3",
  storageBucket: "pdsi-3.firebasestorage.app",
  messagingSenderId: "235611683304",
  appId: "1:235611683304:web:0b8e0af123422a2d680c5d",
  measurementId: "G-8H15C6N1ZX",
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app); // Você pode manter isso

// --- ADICIONE ESTAS LINHAS ---
// Inicialize os serviços e EXPORTE-OS
export const db = getFirestore(app);
export const auth = getAuth(app);
// -----------------------------
