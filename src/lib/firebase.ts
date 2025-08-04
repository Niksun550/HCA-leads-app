
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initializeFirebaseServices() {
  const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

  if (!isConfigured) {
    return {
      isConfigured: false,
      app: null,
      auth: null,
      db: null,
      storage: null,
      functions: null,
    };
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '127.0.0.1';
      console.log(`Using Firebase Emulators at ${host}`);
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
      connectStorageEmulator(storage, host, 9199);
      connectFunctionsEmulator(functions, host, 5001);
  }

  return { isConfigured: true, app, auth, db, storage, functions };
}

// Memoize the result
const firebaseServices = initializeFirebaseServices();

export const getFirebaseServices = () => firebaseServices;
