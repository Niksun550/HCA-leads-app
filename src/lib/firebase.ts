
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FirebaseServices {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    functions: Functions;
    isConfigured: true;
}

interface UnconfiguredFirebaseServices {
    app: null;
    auth: null;
    db: null;
    functions: null;
    isConfigured: false;
}

let services: FirebaseServices | UnconfiguredFirebaseServices | null = null;

function initializeFirebase(): FirebaseServices | UnconfiguredFirebaseServices {
    const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

    if (!isConfigured) {
        console.warn("Firebase configuration is missing or incomplete. Please check your .env.local file. Some features will be disabled.");
        return { app: null, auth: null, db: null, functions: null, isConfigured: false };
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const functions = getFunctions(app);
    return { app, auth, db, functions, isConfigured: true };
}

export function getFirebaseServices(): FirebaseServices | UnconfiguredFirebaseServices {
  if (!services) {
    services = initializeFirebase();
  }
  return services;
}
