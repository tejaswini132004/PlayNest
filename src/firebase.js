// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCgjaliLx_dCz73MVtT60vjYutHdOHiNDw",
  authDomain: "playnest-3b3ed.firebaseapp.com",
  projectId: "playnest-3b3ed",
  storageBucket: "playnest-3b3ed.firebasestorage.app",
  messagingSenderId: "79450624588",
  appId: "1:79450624588:web:c747e15380ee8a950b9ae9"
};

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);  // database
export const auth = getAuth(app);       // authentication
