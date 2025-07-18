import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig();

const firebaseConfig = publicRuntimeConfig.firebaseConfig as FirebaseOptions;

// Check if all required environment variables are set
if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId ||
    !firebaseConfig.storageBucket ||
    !firebaseConfig.messagingSenderId ||
    !firebaseConfig.appId
) {
    console.error('Firebase config is not set. Please check your .env.local file and next.config.ts.');
}


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
