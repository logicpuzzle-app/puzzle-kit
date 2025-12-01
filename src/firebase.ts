// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  // Only initialize analytics in browser environment
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} else {
  console.warn('[Firebase] Not configured. Set VITE_FIREBASE_* environment variables to enable Firebase.');
}

export { app, analytics };
