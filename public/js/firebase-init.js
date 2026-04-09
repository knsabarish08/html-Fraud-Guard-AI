
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp, getDocs, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "fraud-guard-ai-8b170",
  appId: "1:466397301285:web:0369d4a737200214948dcc",
  storageBucket: "fraud-guard-ai-8b170.firebasestorage.app",
  apiKey: "AIzaSyBgfjuhf958qk2lhL-mttuMNXAffnglnVU",
  authDomain: "fraud-guard-ai-8b170.firebaseapp.com",
  messagingSenderId: "466397301285",
  measurementId: "G-7VGSN5KMSV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);

export { db, functions, onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp, getDocs, where, Timestamp };
