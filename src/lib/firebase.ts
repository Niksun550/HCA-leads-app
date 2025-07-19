import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function initializes and returns Firebase services
function initializeFirebase() {
  const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;
  
  if (!isConfigured) {
    console.warn("Firebase configuration is missing or incomplete. Features requiring Firebase will be disabled.");
    return { app: null, auth: null, db: null, functions: null, isConfigured: false };
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app);

  return { app, auth, db, functions, isConfigured: true };
}

// We call the function once and export the services
// This avoids re-initializing on every import
const { app, auth, db, functions, isConfigured } = initializeFirebase();

export { app, auth, db, functions, isConfigured };

// A getter function to be used in components, ensuring they get the initialized services
export const getFirebaseServices = () => {
    return { auth, db, functions, isConfigured };
}
