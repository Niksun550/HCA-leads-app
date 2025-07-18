
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from './firebase-config';

// Check if all required environment variables are set
if (
    !firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY_HERE' ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId ||
    !firebaseConfig.storageBucket ||
    !firebaseConfig.messagingSenderId ||
    !firebaseConfig.appId
) {
    console.error(
`Firebase config is not set. Please check your src/lib/firebase-config.ts file and ensure all values are set correctly.`
    );
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
