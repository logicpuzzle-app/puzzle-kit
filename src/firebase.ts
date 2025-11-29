// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAlhBuBnALWh2SSlGjKgxfvwZD5rI2-8ww",
  authDomain: "puzzle-kit-24d99.firebaseapp.com",
  projectId: "puzzle-kit-24d99",
  storageBucket: "puzzle-kit-24d99.firebasestorage.app",
  messagingSenderId: "94603539124",
  appId: "1:94603539124:web:9fb6f1a49744810487dde1",
  measurementId: "G-QDBPFYM7GH"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
