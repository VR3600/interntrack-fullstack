import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ⚠️ YAHAN STEP 1 WALA APNA firebaseConfig PASTE KARO:
const firebaseConfig = {
  apiKey: "AIzaSyBacIxXOMs7Mv18mhYapimhkGQivLo740U",
  authDomain: "smart-interntrack-app.firebaseapp.com",
  projectId: "smart-interntrack-app",
  storageBucket: "smart-interntrack-app.firebasestorage.app",
  messagingSenderId: "13116857062",
  appId: "1:13116857062:web:d45391b096047d9a61f927"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};