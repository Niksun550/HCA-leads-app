
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from 'firebase/functions';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A function to initialize Firebase, but only if the config is valid
function initializeFirebase() {
  if (!firebaseConfig.apiKey) {
    console.error("Firebase API key is missing. Please check your .env.local file.");
    // Return a dummy object or handle this case as needed
    // For now, we'll let it proceed, but auth/db calls will fail.
  }
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

const app = initializeFirebase();
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions };
